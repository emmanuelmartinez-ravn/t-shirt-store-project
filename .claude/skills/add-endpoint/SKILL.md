---
name: add-endpoint
description: Orchestrates adding a complete REST endpoint end-to-end in this repo — a new domain module or an addition to an existing one, spanning controller down to repository/Prisma. Gathers the requirements backend-engineer/test-engineer can't infer on their own (resource shape, routes, auth policy, schema changes), delegates implementation to backend-engineer and test coverage to test-engineer in sequence, then independently re-verifies lint/build/test. Use when the user asks to "add an endpoint", "add a new endpoint", "create a new resource/domain", or wants a full feature built from controller to repository.
metadata:
  type: workflow
---

# Add Endpoint

Owns the arc from "user wants a new endpoint" to "endpoint exists, is tested, and is green." It's the front-half orchestration companion to `do-work` (the tail-end verify+commit skill): this skill stops once the result is verified but uncommitted — it does not commit, push, or open a PR.

## Boundary

- Doesn't implement code itself — that's `backend-engineer` (`.claude/agents/backend-engineer.md`).
- Doesn't write `*.spec.ts` — that's `test-engineer`.
- Doesn't commit, push, or open a PR — that's `commit`/`do-work`/`pr`; this skill's last step is a report and a pointer to `do-work`, not an invocation of it.
- Doesn't restate the Onion-layer pattern (domain/application/infrastructure/presentation, `src/roles/` as reference shape) — that lives in CLAUDE.md's Architecture section and `backend-engineer.md`. This skill only decides *what* to build; the layer shape is already someone else's job.

## Steps

1. **Gather requirements before delegating anything.** Neither downstream agent has any memory of this conversation, so nail these down first — ask via `AskUserQuestion` if any are unclear rather than guessing:
   - Resource/domain name.
   - Which CRUD operations/HTTP verbs and routes are needed.
   - The field list and validation rules for request/response DTOs.
   - The auth requirement per route — which CASL action/subject, or explicitly public (see `src/auth/`'s unguarded sign-up/sign-in routes for that precedent). **Never default `GET` routes to guarded just because the write routes are.** This repo has both shapes in active use (`src/categories/`/`src/products/` GETs are fully public with no guard at all; other domains guard reads too) — ask explicitly, per GET route, whether it should be open to any caller or require auth/a specific policy. Don't infer it from the write routes' policy.
   - Whether this is a brand-new top-level domain or an addition to an existing module.

2. **Check for reuse first.** Grep `src/*` for an existing domain/module that already covers or overlaps this resource before assuming a new one is needed. A resource that's conceptually a sub-piece of an existing domain (e.g. another use-case/route on an existing controller) should extend that module, not spawn a parallel one.

3. **Work out the Prisma-schema angle.** Decide whether this needs a new model (UUID `id`, nullable `deletedAt`, snake_case `@map`-ed columns, per every existing model in `prisma/schema.prisma`) or reuses/extends an existing one, and whether it needs a relation to an existing model. Decide this now — `backend-engineer` starts fresh and won't know the target shape otherwise.

4. **Delegate to `backend-engineer`.** Spawn it via the Agent tool with a prompt that explicitly includes everything gathered in steps 1–3: resource name, new-module-vs-extend decision, routes + verbs, DTO fields/validation, per-route auth policy, and any schema changes — plus the file paths of the closest existing analog (e.g. `src/roles/`) to copy the shape from. Don't rely on it to infer scope from a one-line ask.

5. **Delegate to `test-engineer`** once backend-engineer reports back, passing its handoff summary (files changed, what needs coverage, edge cases it noticed) through verbatim.

6. **Independently re-verify.** After test-engineer reports its Jest summary, rerun `pnpm lint && pnpm build && pnpm test` yourself rather than trusting either agent's self-report at face value. Optionally start `pnpm start:dev`, sanity-check the new route(s) via `/docs`, then kill it and anything else left on port 3000.

7. **Report and stop.** Summarize what was built (files, routes, auth policy) and suggest running `do-work` next to commit, then `pr` to open a pull request — don't invoke either yourself.

## Common pitfalls

- Delegating to `backend-engineer` with only the user's original one-line ask — it has no memory of this conversation and will guess at routes, fields, or auth policy if not told explicitly.
- Assuming `GET` routes should be guarded because the write routes are (or vice versa) instead of asking explicitly per route — this repo has public-GET domains (`categories`, `products`) and would-be-guarded-GET domains side by side, so there's no safe default to infer from.
- Skipping the reuse check and creating a duplicate domain for something that belongs as an addition to an existing module.
- Trusting `backend-engineer`'s or `test-engineer`'s self-reported "lint/test passed" instead of an independent final rerun.
- Doing the implementation or test-writing yourself instead of delegating — this violates CLAUDE.md's explicit delegation mandate and duplicates `backend-engineer`/`test-engineer`'s own instructions.
- Continuing into commit/PR — that's out of scope; stop at a verified, uncommitted state and point to `do-work`.
