// Read-only SQL rules shared by the db-query tool (query.mjs) and the
// PreToolUse hook (.claude/hooks/db-readonly-guard.mjs), so the two can't drift.

export const ALLOWED_FIRST_KEYWORDS = [
  'SELECT',
  'WITH',
  'EXPLAIN',
  'SHOW',
  'TABLE',
  'VALUES',
];

// Any of these anywhere in a statement means it can write, change schema,
// change session/transaction state, or execute arbitrary code.
export const FORBIDDEN_KEYWORDS = [
  'INSERT',
  'UPDATE',
  'DELETE',
  'MERGE',
  'UPSERT',
  'TRUNCATE',
  'DROP',
  'ALTER',
  'CREATE',
  'GRANT',
  'REVOKE',
  'COPY',
  'CALL',
  'DO',
  'VACUUM',
  'ANALYZE',
  'ANALYSE',
  'REINDEX',
  'CLUSTER',
  'LOCK',
  'REFRESH',
  'COMMENT',
  'SET',
  'RESET',
  'BEGIN',
  'START',
  'COMMIT',
  'ROLLBACK',
  'SAVEPOINT',
  'RELEASE',
  'PREPARE',
  'EXECUTE',
  'DEALLOCATE',
  'LISTEN',
  'NOTIFY',
  'UNLISTEN',
  'IMPORT',
  'SECURITY',
  'REASSIGN',
  'DISCARD',
  'CHECKPOINT',
  'LOAD',
  'INTO',
];

// Functions that have side effects even inside a SELECT.
const FORBIDDEN_FUNCTION_PATTERNS = [
  /\bnextval\s*\(/i,
  /\bsetval\s*\(/i,
  /\bset_config\s*\(/i,
  /\bpg_terminate_backend\s*\(/i,
  /\bpg_cancel_backend\s*\(/i,
  /\bpg_reload_conf\s*\(/i,
  /\bpg_rotate_logfile\s*\(/i,
  /\bpg_advisory\w*\s*\(/i,
  /\bpg_\w*file\w*\s*\(/i,
  /\blo_\w+\s*\(/i,
  /\bdblink\w*\s*\(/i,
];

/**
 * Removes comments, string literals (incl. E'' and $tag$ dollar-quoting) and
 * quoted identifiers, so keywords inside them don't count as SQL keywords.
 */
export function stripLiteralsAndComments(sql) {
  let out = '';
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (ch === '-' && next === '-') {
      const end = sql.indexOf('\n', i);
      i = end === -1 ? sql.length : end;
      out += ' ';
      continue;
    }
    if (ch === '/' && next === '*') {
      const end = sql.indexOf('*/', i + 2);
      i = end === -1 ? sql.length : end + 2;
      out += ' ';
      continue;
    }
    if (ch === "'") {
      i++;
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          i += 2;
        } else if (sql[i] === "'") {
          i++;
          break;
        } else {
          i++;
        }
      }
      out += " '' ";
      continue;
    }
    if (ch === '"') {
      const end = sql.indexOf('"', i + 1);
      i = end === -1 ? sql.length : end + 1;
      out += ' "ident" ';
      continue;
    }
    if (ch === '$') {
      const tag = /^\$[A-Za-z_]*\$/.exec(sql.slice(i));
      if (tag) {
        const end = sql.indexOf(tag[0], i + tag[0].length);
        i = end === -1 ? sql.length : end + tag[0].length;
        out += " '' ";
        continue;
      }
    }
    out += ch;
    i++;
  }
  return out;
}

/** Forbidden keywords present in `text` (whole words, case-insensitive). */
export function findForbiddenKeywords(text) {
  const upper = text.toUpperCase();
  return FORBIDDEN_KEYWORDS.filter((keyword) =>
    new RegExp(`\\b${keyword}\\b`).test(upper),
  );
}

/**
 * Validates that `sql` is a single read-only statement.
 * Returns { ok: true } or { ok: false, reason }.
 */
export function validateReadOnlySql(sql) {
  if (typeof sql !== 'string' || sql.trim() === '') {
    return { ok: false, reason: 'No SQL provided.' };
  }

  const stripped = stripLiteralsAndComments(sql)
    .trim()
    .replace(/;\s*$/, '');

  if (stripped.includes(';')) {
    return {
      ok: false,
      reason: 'Only a single statement is allowed (found ";" between statements).',
    };
  }

  const firstKeyword = (/^[\s(]*([A-Za-z]+)/.exec(stripped)?.[1] ?? '').toUpperCase();
  if (!ALLOWED_FIRST_KEYWORDS.includes(firstKeyword)) {
    return {
      ok: false,
      reason: `Statement must start with one of ${ALLOWED_FIRST_KEYWORDS.join(', ')} (got "${firstKeyword || stripped.slice(0, 20)}").`,
    };
  }

  const forbidden = findForbiddenKeywords(stripped);
  if (forbidden.length > 0) {
    return {
      ok: false,
      reason: `Read-only tool: forbidden keyword(s) ${forbidden.join(', ')}.`,
    };
  }

  const fn = FORBIDDEN_FUNCTION_PATTERNS.find((pattern) => pattern.test(stripped));
  if (fn) {
    return {
      ok: false,
      reason: `Read-only tool: side-effecting function call matched ${fn}.`,
    };
  }

  return { ok: true };
}
