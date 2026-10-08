#!/usr/bin/env node
// PreToolUse hook (Bash | PowerShell): keeps database access read-only when
// Claude answers questions about the DB.
//
// Blocks (exit 2, reason on stderr — Claude sees it and the call never runs):
//   1. The db-query tool invoked with SQL containing a write/DDL keyword.
//   2. Direct SQL clients (psql, pg_dump/pg_restore, createdb/dropdb, pgcli) and
//      `docker exec` into the Postgres container — DB questions go through
//      .claude/tools/db-query instead.
//   3. Inline scripts (node -e, tsx -e, python -c, heredocs into node) that load a
//      DB client (pg, Prisma client, psycopg) or run raw SQL.
// Everything else passes, including the Prisma CLI (migrate/seed/generate),
// which stays allowed for normal development work.
// Malformed input fails open (exit 0) so a hook bug can't brick the session.

import { findForbiddenKeywords } from '../tools/db-query/sql-guard.mjs';

const TOOL_GUIDANCE =
  'For questions about the database use the read-only tool: ' +
  'node .claude/tools/db-query/query.mjs "<SELECT ...>" (see .claude/tools/db-query/README.md).';

const DB_QUERY_TOOL = /\.claude[\\/]+tools[\\/]+db-query[\\/]+query\.mjs/;

const SQL_CLIENT =
  /(^|[\s;&|(`'"\\/])(psql|pg_dump|pg_dumpall|pg_restore|createdb|dropdb|pgcli)(\.exe)?(?=$|[\s;&|)`'"])/i;

const DOCKER_INTO_DB =
  /\bdocker(\.exe)?\s+(exec|compose\s+exec|container\s+exec)\b[^\n]*\b(tshirt-store-db|postgres)\b/i;

const INLINE_SCRIPT =
  /\b(node|tsx|ts-node|bun|deno|python3?|py)(\.exe)?\b[^\n]*?(\s(-e|--eval|-p|--print|-c)\b|\s--input-type\b|\s-\s*(<<|$)|\s*<<)/i;

const DB_CLIENT_IN_SCRIPT =
  /(['"]pg['"]|\bPrismaClient\b|\bPrismaPg\b|@prisma\/(client|adapter-pg)|generated\/prisma|\$executeRaw|\$queryRaw|\bpsycopg2?\b|\bsqlalchemy\b)/i;

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(''));
  });
}

function block(reason) {
  process.stderr.write(`Blocked by db-readonly-guard: ${reason}\n`);
  process.exit(2);
}

export function evaluate(command) {
  if (typeof command !== 'string' || command.trim() === '') return null;

  const toolMatch = DB_QUERY_TOOL.exec(command);
  if (toolMatch) {
    // Scan everything after the tool path. Literals are NOT stripped here (the SQL
    // is wrapped in shell quoting), so this errs on the side of blocking; the tool
    // itself applies the precise, literal-aware check.
    const afterTool = command.slice(toolMatch.index + toolMatch[0].length);
    const forbidden = findForbiddenKeywords(afterTool);
    if (forbidden.length > 0) {
      return `the db-query tool is read-only; the command contains ${forbidden.join(', ')}.`;
    }
  }

  if (SQL_CLIENT.test(command)) {
    return `direct SQL clients are not allowed. ${TOOL_GUIDANCE}`;
  }

  if (DOCKER_INTO_DB.test(command)) {
    return `running commands inside the Postgres container is not allowed. ${TOOL_GUIDANCE}`;
  }

  if (INLINE_SCRIPT.test(command) && DB_CLIENT_IN_SCRIPT.test(command)) {
    return `inline scripts that open a database connection are not allowed. ${TOOL_GUIDANCE}`;
  }

  return null;
}

const raw = await readStdin();
let input;
try {
  input = JSON.parse(raw);
} catch {
  process.exit(0);
}

if (input?.tool_name !== 'Bash' && input?.tool_name !== 'PowerShell') {
  process.exit(0);
}

const reason = evaluate(input?.tool_input?.command);
if (reason) block(reason);
process.exit(0);
