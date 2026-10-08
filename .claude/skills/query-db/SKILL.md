---
name: query-db
description: Answers questions about the current contents/state of this repo's Postgres database by running read-only SQL through .claude/tools/db-query (local Docker DB unless the user gives credentials); never creates, updates, or deletes data. Use when the user asks things like "how many users exist", "does the seeded user exist", "how many products/orders are there", "is there a promo with code X", "what roles are in the db", or "check the database for …".
metadata:
  type: workflow
---

# Query DB

This skill answers questions about what's currently in the database by running read-only queries through `.claude/tools/db-query/query.mjs`. It is strictly read-only. The tool, Postgres's own read-only session, and a PreToolUse hook all enforce that. Read `.claude/tools/db-query/README.md` for usage details and schema gotchas before your first query in a session.

## Boundary

- **Not for changing data or schema.** If the user asks to insert, fix, or delete rows, say this tool is read-only. Changes go through the app's API or a Prisma migration or seed, which the user runs or explicitly asks for as separate work.
- **Not for designing schema.** For questions about how the schema should look, read `prisma/schema.prisma` instead.
- **Never work around the guard.** Don't fall back to `psql`, `docker exec`, or ad hoc `node -e` scripts; the hook blocks those. If the tool can't answer something, explain why instead.

## Steps

1. **Pick the target.** Use the local Docker DB by default. Pass `--url` only if the user supplied credentials or a connection string. Never take one from `.env` on your own.
2. **Confirm the shape if you're unsure.** Run `--schema`, or `--schema <Table>`. Tables are quoted PascalCase (`"User"`), and columns are snake_case (`deleted_at`).
3. **Write one read-only statement** that answers the question directly: `count(*)`, `EXISTS`, or a narrow `SELECT` with `LIMIT`. Decide how to treat soft deletes. Default to active rows (`deleted_at IS NULL`). If deleted rows exist and matter, report them separately.
4. **Run it:** `node .claude/tools/db-query/query.mjs '<SQL>'`. If the tool rejects the query, rewrite it as a pure read. Never try to get around a rejection.
5. **Answer in plain language** with the number or the row, the condition used (for example "active, i.e. not soft-deleted"), and which database it came from. If the connection fails, say so, and suggest `docker compose -f docker/docker-compose.yaml up -d`.

## Examples

- "How many users exist?" → `SELECT count(*) FILTER (WHERE deleted_at IS NULL) AS active, count(*) FILTER (WHERE deleted_at IS NOT NULL) AS deleted FROM "User"`
- "Does the seeded user exist?" → `SELECT u.email, r.name AS role, u.disabled, u.deleted_at FROM "User" u JOIN "Role" r ON r.id = u.role_id WHERE u.email = 'manager@tshirt-store.com'`
