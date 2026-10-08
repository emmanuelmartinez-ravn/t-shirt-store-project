#!/usr/bin/env node
// Read-only Postgres query tool for answering questions about the database.
//
//   node .claude/tools/db-query/query.mjs [--url <postgres-url>] [--json] "<SQL>"
//   node .claude/tools/db-query/query.mjs [--url <postgres-url>] --schema [Table]
//
// Safety layers (see README.md):
//   1. validateReadOnlySql() rejects anything but a single SELECT-style statement.
//   2. The session is read-only at the Postgres level (default_transaction_read_only
//      + BEGIN READ ONLY ... ROLLBACK), so a write that slipped past (1) still fails.
// SQL is only accepted inline as an argument (never from a file or stdin) so the
// PreToolUse hook can see it too.

import pg from 'pg';
import { validateReadOnlySql } from './sql-guard.mjs';

// Local dev DB from docker/docker-compose.yaml (POSTGRES_USER/PASSWORD/DB, port 5432).
// Deliberately not read from .env: without --url this always targets the Docker DB.
const DEFAULT_URL = 'postgresql://user:password@localhost:5432/tshirt_store';
const MAX_ROWS = 200;
const STATEMENT_TIMEOUT_MS = 10000;

function parseArgs(argv) {
  const args = { url: DEFAULT_URL, json: false, schema: null, sql: null };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--url') {
      args.url = argv[++i];
    } else if (arg === '--json') {
      args.json = true;
    } else if (arg === '--schema') {
      args.schema = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : '';
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else {
      rest.push(arg);
    }
  }
  if (rest.length > 1) {
    throw new Error('Pass the SQL as a single quoted argument.');
  }
  args.sql = rest[0] ?? null;
  return args;
}

function schemaQuery(table) {
  if (table === '') {
    return {
      text: `SELECT table_name, (SELECT count(*) FROM information_schema.columns c
               WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name) AS columns
             FROM information_schema.tables t
             WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
             ORDER BY table_name`,
      values: [],
    };
  }
  return {
    text: `SELECT column_name, data_type, is_nullable, column_default
           FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = $1
           ORDER BY ordinal_position`,
    values: [table],
  };
}

function formatValue(value) {
  if (value === null || value === undefined) return 'NULL';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function printTable(fields, rows) {
  const headers = fields.map((field) => field.name);
  const cells = rows.map((row) => headers.map((h) => formatValue(row[h])));
  const widths = headers.map((h, i) =>
    Math.min(60, Math.max(h.length, ...cells.map((r) => r[i].length))),
  );
  const fit = (s, w) => (s.length > w ? s.slice(0, w - 1) + '…' : s.padEnd(w));
  console.log(headers.map((h, i) => fit(h, widths[i])).join(' | '));
  console.log(widths.map((w) => '-'.repeat(w)).join('-+-'));
  for (const row of cells) {
    console.log(row.map((c, i) => fit(c, widths[i])).join(' | '));
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || (args.sql === null && args.schema === null)) {
    console.log(
      'Usage: node .claude/tools/db-query/query.mjs [--url <postgres-url>] [--json] "<SELECT ...>"\n' +
        '       node .claude/tools/db-query/query.mjs [--url <postgres-url>] --schema [Table]',
    );
    process.exitCode = args.help ? 0 : 1;
    return;
  }

  let query;
  if (args.schema !== null) {
    query = schemaQuery(args.schema);
  } else {
    const verdict = validateReadOnlySql(args.sql);
    if (!verdict.ok) {
      console.error(`Rejected: ${verdict.reason}`);
      process.exitCode = 1;
      return;
    }
    query = { text: args.sql, values: [] };
  }

  const client = new pg.Client({
    connectionString: args.url,
    options: `-c default_transaction_read_only=on -c statement_timeout=${STATEMENT_TIMEOUT_MS}`,
    application_name: 'claude-db-query (read-only)',
  });

  await client.connect();
  try {
    await client.query('BEGIN READ ONLY');
    const result = await client.query(query);
    const rows = result.rows ?? [];
    const shown = rows.slice(0, MAX_ROWS);

    if (args.json) {
      console.log(JSON.stringify(shown, null, 2));
    } else if (result.fields?.length) {
      printTable(result.fields, shown);
    }
    const note = rows.length > MAX_ROWS ? ` (showing first ${MAX_ROWS})` : '';
    console.error(`(${rows.length} row${rows.length === 1 ? '' : 's'}${note})`);
  } finally {
    await client.query('ROLLBACK').catch(() => {});
    await client.end();
  }
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
