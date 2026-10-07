---
name: add-endpoint
description: Orchestrates adding a complete REST endpoint end-to-end in this repo — a new domain module or an addition to an existing one, spanning controller down to repository/Prisma. Gathers the requirements the implementer can't infer on their own (resource shape, routes, per-route access, schema changes) into a single delegation contract, delegates via the default backend-engineer/test-engineer split (or an opt-in `reviewed` implementer/reviewer trial mode), then independently re-verifies lint/build/test. Use when the user asks to "add an endpoint", "add a new endpoint", "create a new resource/domain", or wants a full feature built from controller to repository.
argument-hint: "[optional: \"reviewed\" to trial the implementer+reviewer delegation mode instead of the default backend-engineer/test-engineer split]"
metadata:
  type: workflow
---

# Add Endpoint

Owns the arc from "user wants a new endpoint" to "endpoint exists, is tested, and is green." It's the front-half orchestration companion to `verify-and-commit` (the tail-end verify+commit skill): this skill stops once the result is verified but uncommitted.

## Boundary

- Doesn't implement code or write `*.spec.ts` itself — that's the delegated implementer role (`backend-engineer` by default, or `implementer` in `reviewed` mode; see "Delegation mode" below).
- Doesn't commit, push, or open a PR. Committing, pushing, and PR creation require separate authorization from the user — this skill's last step is a report and a pointer to `verify-and-commit`, never an invocation of it.
- Doesn't restate the Onion-layer architecture pattern or CASL plumbing internals — see CLAUDE.md's Architecture section, `.claude/project/architecture.md`, and `src/authorization/ability/casl-ability.factory.ts` for how layers and authorization actually wire together. This skill only decides *what* to build and *what access each route needs*; how the layers or CASL guard/policy machinery work internally is `backend-engineer.md`'s (or `implementer.md`'s) job to already know.

## Steps

1. **Gather requirements before delegating anything.** Neither downstream role has any memory of this conversation, so nail these down first — ask via `AskUserQuestion` if any are unclear rather than guessing:
   - Resource/domain name.
   - Which CRUD operations/HTTP verbs and routes are needed.
   - The field list and validation rules for request/response DTOs.
   - **Per-route access, classified into exactly one of the three shapes this repo actually uses** — don't invent a fourth:
     1. **Public** — no `@UseGuards`, `@CheckPolicies`, or `@ApiBearerAuth()` at all (e.g. `src/categories/presentation/controllers/categories.controller.ts` GET handlers).
     2. **Authenticated + CASL-checked** — `@UseGuards(JwtAuthGuard, PoliciesGuard)` + `@CheckPolicies((ability) => ability.can(Action.<Verb>, '<Subject>'))` + `@ApiBearerAuth()` (e.g. `src/roles/presentation/controllers/roles.controller.ts`). **If any route needs this shape, resolve the CASL wiring now, not during delegation:**
        - Does `AppSubjects` in `src/authorization/ability/casl-ability.factory.ts` already include this domain's subject? If not, it needs a new union member.
        - Which `can(Action.<Verb>, '<Subject>')` grant does each existing role (`manager`, `client`) need inside `CaslAbilityFactory.createForUser()`? If a role should have no access to this route, say so explicitly rather than leaving it implicit.
     3. **Authenticated-only, manually ownership-checked** — `@UseGuards(JwtAuthGuard, PoliciesGuard)` + `@CheckPolicies(() => true)`, with real authorization done in the use-case against `req.user.sub` (e.g. self-service routes like `PATCH /users/password`, cart items, liked product variants).
     - **Decide GET access independently of write-route access — never infer one from the other.** This repo runs public-GET domains (`categories`, `products`) and guarded-GET domains side by side; ask explicitly, per route, which shape applies. If it's genuinely unresolved even after asking, record it under `unresolved` in the delegation contract (step 4) instead of guessing — guessing here is exactly how the `promos` GET routes shipped guarded and had to be fixed in a follow-up commit.
   - Whether this is a brand-new top-level domain or an addition to an existing module.

2. **Check for reuse first.** Grep `src/*` for an existing domain/module that already covers or overlaps this resource before assuming a new one is needed. A resource that's conceptually a sub-piece of an existing domain (e.g. another use-case/route on an existing controller) should extend that module, not spawn a parallel one.

3. **Work out the Prisma-schema angle — resolve this now, not during delegation.** Apply this rule to the resource identified in steps 1-2:
   - **Reuse an existing model** — the requirement is the *same entity with the same lifecycle* as an existing model (same identity; you're adding a route/use-case against data that already exists as-is). No schema change.
   - **Extend an existing model** — the requirement adds *new attributes to that same entity's lifecycle* (fields created/updated/deleted in lockstep with the existing model's own rows). Add fields to the existing Prisma model rather than spinning up a satellite table for 1:1, co-owned data.
   - **Create a new model** — the requirement is a *separate persisted entity*: it has its own lifecycle (created/updated/deleted independently of any existing model's rows), even if it relates to one. New model: UUID `id`, nullable `deletedAt`, snake_case `@map`-ed columns, per every existing model in `prisma/schema.prisma`.
   - Whichever applies, **resolve ownership and cardinality before delegating**: which side owns the foreign key, is the relation 1:1 / 1:many / many:many, and does a delete cascade or soft-delete independently. The implementer starts fresh each time and won't infer this from a route list alone.

4. **Compile steps 1-3 into a single delegation contract** — this, not ad hoc prompt prose, is what gets handed to both downstream roles, verbatim:

   ```yaml
   outcome: "<user-visible behavior to deliver>"
   scope:
     included: ["<requested changes>"]
     excluded: ["<relevant boundaries>"]
   routes:
     - method: "<HTTP method>"
       path: "<route>"
       access: "<public | authenticated-ownership-checked | CASL:<Action>,<Subject>>"
       casl_wiring: "<none | add '<Subject>' to AppSubjects + can(Action.<Verb>, '<Subject>') grants per role: manager: <...>, client: <...>>"
       input: "<fields and validation rules>"
       success: "<status and response shape>"
       failures: ["<condition -> expected status/behavior>"]
   persistence:
     decision: "<reuse | extend | new model | no change>"
     reason: "<entity/lifecycle requirement behind the choice>"
     relations: "<ownership and cardinality, or not applicable>"
   acceptance_cases:
     - "<given a condition, when an action occurs, expect an outcome>"
   references: ["<closest existing analog file paths, e.g. src/roles/ or src/categories/>"]
   unresolved: []
   ```

   - `access` must be exactly one of step 1's three shapes per route — never blank.
   - `casl_wiring` is `none` for public/ownership-checked routes; for CASL-checked routes it names the concrete `AppSubjects` change (or confirms none needed) and each role's grant.
   - `unresolved` is a real list, not a default-empty box to make the contract look complete — anything steps 1-3 couldn't pin down (even after asking) goes here. An empty list is a claim that everything was actually resolved, not a formality.
   - `references` points the implementer at a proven shape to copy rather than inventing one.

5. **Delegate implementation**, passing the full step 4 contract as the Agent prompt (not a paraphrase). Default mode: `backend-engineer`. See "Delegation mode" below for the `reviewed` trial alternative.

6. **Delegate coverage/review**, once the implementer reports back. Default mode: `test-engineer`, given the implementer's handoff summary and the step 4 contract. See "Delegation mode" below for the `reviewed` trial alternative.

7. **Independently re-verify.** Rerun `pnpm lint && pnpm build && pnpm test` yourself — don't trust either role's self-report at face value.
   - **Smoke-test when the specs don't already cover it end-to-end.** If the new/updated `*.spec.ts` files only exercise the use-case/repository through mocks — nothing actually drives the HTTP layer, the guard stack, or DTO validation — start the app and check directly:
     - **Check port 3000 before starting anything.** Run `netstat -ano | findstr :3000` (Git Bash on this Windows box). If something's already listening, don't kill it blind: either start this app on another port — `PORT=3001 pnpm start:dev` (`src/main.ts` calls `app.listen(process.env.PORT ?? 3000)`, so `PORT` is honored) — or ask the user before touching the existing process.
     - Hit each new route via `/docs` or a direct request: confirm the **success** case matches the contract's `success` field, plus at least one **unauthorized** case (missing/invalid token on an authenticated route) and one **invalid-input** case (a request that should trip DTO validation) return the expected status.
     - **During cleanup, stop only the process this workflow itself started** — never a pre-existing process found occupying the port, symmetric with CLAUDE.md's "kill anything you start on port 3000" rule.
   - If the specs already assert this end-to-end, skip the manual smoke test — it'd be redundant.

8. **Report and stop.** Summarize what was built (files, routes, access shapes, any CASL wiring changes) and which delegation mode ran. Suggest running `verify-and-commit` next to commit, then `pr` to open a pull request — don't invoke either yourself; committing, pushing, and PR creation require separate authorization from the user.

## Delegation mode

Two modes exist. Both share steps 1-4 unchanged — only steps 5-6 differ. Keeping requirements-gathering identical is what makes the two modes comparable: any difference in outcome traces to the delegation split itself, not to different requirements.

- **`split` (default).** Step 5 → `backend-engineer`. Step 6 → `test-engineer`, given the implementer's handoff summary verbatim (as today).
- **`reviewed` (trial — issue #52's proposed alternative; not yet the default).** Step 5 → `implementer` (`.claude/agents/implementer.md`), which owns both implementation and its own test coverage. Step 6 → `reviewer` (`.claude/agents/reviewer.md`) instead of test-engineer, given the step 4 contract, a diff of everything `implementer` changed, and this skill's own step 7 check results — deliberately *not* `implementer`'s handoff summary, so the reviewer checks the diff against the brief rather than against the implementer's account of its own work.

Default to `split`; use `reviewed` only if the user explicitly asks to trial it (or passes `reviewed` as `$ARGUMENTS`). Report which mode ran in step 8.

**One-time comparison** (do this once, to decide whether `reviewed` should ever become the default — not on every run): run `add-endpoint` twice, once per mode, against the same small representative endpoint addition — pick one with a genuine mixed public/CASL-guarded route set, similar in shape to the `promos` incident, so the comparison actually exercises the failure mode the trial exists to catch — each in its own branch/worktree so the runs don't collide. Compare:
- **Defects found** — did `reviewed` catch a brief-vs-implementation mismatch (e.g. a wrongly-guarded GET) that `split` didn't?
- **False positives** — did the reviewer flag anything that wasn't actually wrong?
- **Cost** — Agent-tool round-trips and wall-clock time per mode.
- **Coverage** — do both end up with equivalent lint/build/test-passing spec coverage?
- **Actionability** — are the reviewer's findings concrete enough (file, expected, actual) to act on without further investigation?

Write the comparison up as a short note for the user's decision. This is a one-time evaluation, not a new standing process — don't fold it into every future `add-endpoint` run.

## Common pitfalls

- Delegating with only the user's original one-line ask instead of the full step 4 contract — the implementer has no memory of this conversation and will guess at routes, fields, or access shape if not told explicitly.
- Assuming `GET` routes should be guarded because the write routes are (or vice versa) instead of asking explicitly per route — this repo has public-GET domains (`categories`, `products`) and CASL-guarded-GET domains side by side, so there's no safe default to infer from.
- Choosing the CASL-checked access shape without also resolving whether `AppSubjects`/`casl-ability.factory.ts` needs a new subject or grant — this is a distinct wiring step from writing the controller decorators, and skipping it is exactly how the `promos` incident happened.
- Skipping the reuse check and creating a duplicate domain for something that belongs as an addition to an existing module.
- Treating the delegation contract's `unresolved: []` as a formality instead of an honest list — an empty list is a claim that everything was actually resolved, not a default.
- Trusting the implementer's or reviewer/test-engineer's self-reported "lint/test passed" instead of an independent final rerun.
- Doing the implementation or test-writing yourself instead of delegating — this violates CLAUDE.md's explicit delegation mandate and duplicates the delegated role's own instructions.
- Continuing into commit/PR — that's out of scope; stop at a verified, uncommitted state and point to `verify-and-commit`.
