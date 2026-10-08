# db-query — read-only database tool

Answers questions about the database's current state ("How many users exist?", "Does the seeded manager exist?") without ever changing it. Used by the `query-db` skill.

## Usage

```bash
# one read-only statement, passed inline as a single quoted argument
node .claude/tools/db-query/query.mjs 'SELECT count(*) FROM "User" WHERE deleted_at IS NULL'

# JSON output instead of a table
node .claude/tools/db-query/query.mjs --json 'SELECT id, email FROM "User" LIMIT 5'

# list tables / describe one table
node .claude/tools/db-query/query.mjs --schema
node .claude/tools/db-query/query.mjs --schema User

# a different database (only when the user supplies credentials)
node .claude/tools/db-query/query.mjs --url 'postgresql://u:p@host:5432/db' 'SELECT 1'
```

- **Default connection:** `postgresql://user:password@localhost:5432/tshirt_store`, the local Docker DB from `docker/docker-compose.yaml`. `.env` is deliberately not read, so without `--url` it never points anywhere else.
- **Output:** a table on stdout, capped at 200 rows, with the row count on stderr. A rejected query or an error exits with code 1.
- **SQL is accepted only as an argument**, never from a file or stdin, so the guard hook can see it.

## Safety layers

1. **Static check (`sql-guard.mjs`).** The query must be a single statement that starts with `SELECT`, `WITH`, `EXPLAIN`, `SHOW`, `TABLE` or `VALUES`.
   - It rejects write, DDL and transaction keywords anywhere in the statement, so a CTE like `WITH x AS (DELETE …)` is caught. It also rejects `SELECT … INTO`, `EXPLAIN ANALYZE`, `FOR UPDATE`, and side-effecting functions (`nextval`, `set_config`, `pg_terminate_backend`, `lo_*`, `dblink*`, …).
   - Comments, string literals and quoted identifiers are stripped first, so `SELECT 'delete me'` is fine.
2. **Postgres-enforced read-only session.** The tool connects with `default_transaction_read_only=on` and `statement_timeout=10s`, and runs each query inside `BEGIN READ ONLY … ROLLBACK`. Anything that slips past layer 1 still fails with `cannot execute … in a read-only transaction`.
3. **PreToolUse hook (`.claude/hooks/db-readonly-guard.mjs`, registered in `.claude/settings.json`).**
   - It blocks tool calls whose SQL contains a write keyword.
   - It blocks direct SQL clients (`psql`, `pg_dump`, `pg_restore`, `createdb`, `dropdb`, `pgcli`) and `docker exec` into the Postgres container.
   - It blocks inline scripts (`node -e`, heredocs, `python -c`, …) that load `pg`, the Prisma client, or psycopg.
   - The Prisma CLI (`prisma migrate`, `db seed`, `generate`) is intentionally **not** blocked; it stays available for normal development.
   - **Limit:** the hook inspects commands only. It can't see a DB script written to a file and then run. A read-only Postgres role used for `--url` would close that gap, if you want that stronger guarantee.

## Schema gotchas

- Tables are PascalCase and must be quoted: `"User"`, `"Role"`, `"ProductVariant"`. Columns are snake_case: `deleted_at`, `role_id`, `created_at`.
- Every model soft-deletes. "Active" rows are `deleted_at IS NULL`, and soft-deleted rows are `deleted_at IS NOT NULL`. Say which one an answer counts.
- `prisma/seed.ts` seeds the roles `manager` and `client` (`prisma/seed-roles.ts`), plus one manager user, `manager@tshirt-store.com` (`prisma/seed-users.ts`).
- If you're unsure of the tables or columns, run `--schema` / `--schema <Table>` first. `prisma/schema.prisma` is the source of truth for relations.
