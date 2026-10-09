#!/usr/bin/env node
// PreToolUse hook (Read | Grep | Bash | PowerShell): keeps Claude from reading
// the real .env file (secrets, DB credentials) and points it to .env.example,
// which documents the same variables with placeholder values.
//
// Blocks (exit 2, reason on stderr — Claude sees it and the call never runs):
//   1. Read of a .env / .env.<name> file (anything but .env.example).
//   2. Grep whose path or glob targets such a file.
//   3. Shell commands that reference such a file together with a command that
//      reads, prints, copies or loads it (cat, Get-Content, grep, source, cp, ...).
// Writing to .env from the shell (e.g. `cp .env.example .env`) stays allowed.
// Malformed input fails open (exit 0) so a hook bug can't brick the session.

const GUIDANCE =
  'Reading .env is forbidden (it holds real secrets). ' +
  'Read .env.example instead — it lists the same variables with placeholder values.';

const ALLOWED_ENV_FILES = new Set(['.env.example']);

// A `.env` or `.env.<suffix>` path token. The leading boundary keeps
// `process.env` / `$env:` from matching.
const ENV_FILE_TOKEN =
  /(?:^|[\s'"`/\\=<(,])(\.env(?:\.[\w.-]+)?)(?=$|[\s'"`;|&)>,])/gi;

const READ_COMMAND =
  /(^|[\s;&|(`'"])(cat|head|tail|less|more|bat|type|gc|get-content|sed|awk|grep|egrep|rg|findstr|select-string|sls|strings|xxd|od|hexdump|base64|source|\.|cp|copy|copy-item|mv|move|move-item|import-csv|readfilesync|readfile|dotenv|node|python3?|py|tsx|bun|deno)(\.exe)?(?=$|[\s;&|)`'"(])/i;

function isForbiddenEnvName(name) {
  const lower = name.toLowerCase();
  return /^\.env(\..+)?$/.test(lower) && !ALLOWED_ENV_FILES.has(lower);
}

function basename(path) {
  return String(path).split(/[\\/]/).pop() ?? '';
}

function forbiddenTokens(command) {
  const tokens = [];
  for (const match of command.matchAll(ENV_FILE_TOKEN)) {
    if (isForbiddenEnvName(match[1])) tokens.push(match[1]);
  }
  return tokens;
}

// `cp .env.example .env` / `> .env`: the .env token is only a write target.
function onlyWritesEnv(command) {
  const stripped = command
    .replace(/(>>?|\|\s*tee\s+(-a\s+)?)\s*['"]?[^\s'"]*\.env['"]?/gi, ' ')
    .replace(
      /\b(cp|copy|copy-item)\b\s+['"]?\S*\.env\.example['"]?\s+['"]?\S*\.env['"]?/gi,
      ' ',
    );
  return forbiddenTokens(stripped).length === 0;
}

export function evaluate(toolName, input) {
  if (!input || typeof input !== 'object') return null;

  if (toolName === 'Read') {
    return isForbiddenEnvName(basename(input.file_path ?? '')) ? GUIDANCE : null;
  }

  if (toolName === 'Grep') {
    const targetsEnv =
      isForbiddenEnvName(basename(input.path ?? '')) ||
      (typeof input.glob === 'string' &&
        /(^|[\\/{,])\.env(\*|\.\*|$|[,}])/i.test(input.glob) &&
        !/^\.env\.example$/i.test(input.glob));
    return targetsEnv ? GUIDANCE : null;
  }

  if (toolName === 'Bash' || toolName === 'PowerShell') {
    const command = input.command;
    if (typeof command !== 'string' || command.trim() === '') return null;
    if (forbiddenTokens(command).length === 0) return null;
    if (onlyWritesEnv(command)) return null;
    return READ_COMMAND.test(command) ? GUIDANCE : null;
  }

  return null;
}

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(''));
  });
}

async function main() {
  let payload;
  try {
    payload = JSON.parse(await readStdin());
  } catch {
    process.exit(0);
  }

  const reason = evaluate(payload?.tool_name, payload?.tool_input);
  if (reason) {
    process.stderr.write(`Blocked by env-file-guard: ${reason}\n`);
    process.exit(2);
  }
  process.exit(0);
}

main();
