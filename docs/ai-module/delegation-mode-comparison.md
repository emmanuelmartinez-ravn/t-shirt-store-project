# `add-endpoint` delegation-mode comparison: `split` vs. `reviewed`

One-time comparison, run as part of issue #52 / `plans/issue-52-ai-module-skills-review.md`, to inform (not decide) whether the `reviewed` trial mode should ever become `add-endpoint`'s default. `split` (`backend-engineer` → `test-engineer`) remains the default regardless of this note's outcome.

## Setup

Both modes were given the **identical** delegation contract (per §4 of the PRD, requirements-gathering is shared between modes so any outcome difference is attributable to the delegation split itself) for a small, deliberately `promos`-shaped feature: a `newsletter-subscriptions` domain with a genuinely mixed access surface —

- `POST /newsletter-subscriptions` — public (no guards)
- `GET /newsletter-subscriptions` — CASL-checked, manager-only (`Action.Read`, new subject `NewsletterSubscription`)
- `DELETE /newsletter-subscriptions/:id` — CASL-checked, manager-only (`Action.Delete`, same subject)

Each mode ran in its own isolated git worktree, branched from the same commit (`9740abc`), so the runs couldn't collide or see each other's work. No live Postgres was available in this environment (Docker wasn't running), so both modes were scoped to schema + `pnpm prisma generate` only, with `pnpm prisma migrate dev` explicitly deferred — this affected both modes equally and is noted, not scored.

- **`split`**: `backend-engineer` implemented the domain; `test-engineer` then wrote its spec coverage from `backend-engineer`'s handoff summary.
- **`reviewed`**: `implementer` implemented the domain and its own spec coverage in one pass; `reviewer` then checked the diff against the original contract directly (not `implementer`'s handoff summary), plus the coordinator's own independent lint/build/test results.

(Both `implementer` and `reviewer` had to be run as `general-purpose` agents with the new agent files' personas pasted into the prompt, since this session's Agent-tool registry hadn't yet picked up the two newly-created `.claude/agents/*.md` files at the time the trial ran — an artifact of running the trial in the same session that authored the files, not of the design itself.)

## What actually happened

**Both modes correctly resolved every route's access shape and CASL wiring identically** — `POST` public, `GET`/`DELETE` guarded with the right `Action`/subject, `AppSubjects` extended, manager-only grants, no client grant. Neither reproduced anything resembling the original `promos` defect (a route guarded/public against the brief's intent). This is itself a meaningful result: it suggests the PRD's §3 fix (forcing the three-way access classification into an explicit, pre-resolved delegation contract before delegation) is what prevents that failure mode — and it prevents it **regardless of which delegation mode is used**, because neither implementer had any ambiguity left to get wrong.

**The trial's actual finding showed up somewhere else.** Both `backend-engineer` and `implementer` independently made the same choice: no uniqueness constraint on the new `email` column in `prisma/schema.prisma`, relying purely on catching Prisma's `P2002` error code for the contract's required 409-on-duplicate-email behavior. Both even disclosed this in their own handoff prose, framing it as "matching this repo's existing pattern" (pointing at the partial-unique-index migration used by `Role`/`Category`/`Promo`).

The two modes diverged in what happened **next**:

- In `split` mode, `test-engineer` wrote (correctly, per this repo's conventions) unit tests that mock a `P2002` throw and assert it maps to `ConflictException` — which pass, because they never touch a real database — and reported "no implementation gaps found."
- In `reviewed` mode, `reviewer` treated the implementer's "matches existing pattern" framing as a claim to verify, not a fact to accept, checked it against the actual schema, and found: no `@unique`/`@@unique` exists on `email` at all (not even the plain, soft-delete-incompatible kind), and the referenced partial-unique-index migration was never actually created for this new model in either worktree. It reported this as a **High/Critical** finding tied directly to acceptance case #2, with the concrete fix (`@@unique([email, deletedAt])` or an equivalent partial index), and — as a supporting claim — suggested the identical latent gap already exists in this repo's real `src/auth/` `User.email` field.

That supporting claim was checked (by the PRD implementer, after the trial) against the actual repo and turned out to be **incorrect**: `User.email` has no `@unique` in `schema.prisma` either, but `prisma/migrations/20260828153140_partial_unique_soft_delete/migration.sql` does create `CREATE UNIQUE INDEX "User_email_key" ON "User"("email") WHERE "deleted_at" IS NULL` as a hand-written raw-SQL migration — exactly the pattern both implementers correctly described in the abstract but neither one actually executed for the new `NewsletterSubscription` model. So the core finding stands (this trial's artifact genuinely lacks that migration), but the reviewer's specific cross-reference to a live repo-wide bug does not — it's noted here as a reminder that a reviewer's claims need the same verification discipline applied to them as anything else, not as a discredit of the finding itself.

Neither mode caught this via its own repo-modeling instinct; both implementers made the same schema choice. The difference was entirely in the second role: `test-engineer` is scoped to write tests to what was built, `reviewer` is scoped to check what was built against the brief and verify self-reported claims — and only the latter behavior surfaced a real, actionable gap here.

## Comparison against the criteria

| Criterion | `split` | `reviewed` |
|---|---|---|
| **Defects found** | 0 escalated to the coordinator as a defect (the same information existed in `backend-engineer`'s handoff prose, but `test-engineer` didn't treat it as a finding to verify or escalate) | 1: unreachable 409-Conflict path, correctly severity-rated and traced to a specific acceptance case (a supporting cross-reference to `src/auth/` turned out to be inaccurate on independent verification — see below) |
| **False positives** | n/a | 0 — the one non-contract addition found (`410 Gone` on double-delete) was explicitly separated out as a reasonable enhancement, not misreported as a defect |
| **Cost** | 2 agent round-trips, ~163.5k subagent tokens, ~634s combined wall-clock | 2 agent round-trips, ~269.2k subagent tokens (~65% more), ~724s combined wall-clock |
| **Coverage parity** | 92 suites / 590 tests, all acceptance cases claimed covered | 91 suites / 586 tests, all acceptance cases claimed covered (near-identical; the difference is just how the domain-model spec was split) |
| **Actionability** | The schema gap existed only as a sentence inside a handoff summary the coordinator would have had to notice and independently chase down | File path, exact defect, why it matters against the contract, and a concrete fix — actionable without further investigation |

## Takeaway for the adopt/reject decision

`reviewed` mode cost roughly 65% more tokens for this run and did **not** catch a different class of bug than the trial was originally designed around (route-access misclassification) — that specific failure mode is now prevented at the requirements-gathering layer (§3) for both modes equally. What it did catch was a self-reported "this is fine, matches convention" claim that turned out not to hold up against the actual schema and the contract's explicit acceptance criteria — a genuinely different, valuable check that this repo's `test-engineer` role isn't designed to perform (it writes tests to the implementation, not audits the implementation against the brief).

This is one data point, not a verdict: one run, one feature shape, no live database to exercise the defect end-to-end. It's presented here for the user's own adopt/reject call, not as a recommendation either way. `split` stays the default.

## Note on verifying a reviewer's own claims

The `reviewer` agent's finding included a supporting claim that `src/auth/infrastructure/repositories/prisma-user.repository.ts`'s identical `P2002`-catch pattern is similarly broken in production, since `User.email` also has no `@unique` in `schema.prisma`. Checked independently after the trial: `User.email` genuinely lacks a `schema.prisma`-level `@unique`, but a real, working constraint exists anyway via a hand-written raw-SQL migration (`prisma/migrations/20260828153140_partial_unique_soft_delete/migration.sql`: `CREATE UNIQUE INDEX "User_email_key" ON "User"("email") WHERE "deleted_at" IS NULL`) — Prisma's schema DSL can't express a partial/filtered unique index directly, so this repo's convention is to hand-write it as a follow-up migration, which was done for `User` (and `Role`/`Category`/`Promo`) but never done for the trial's `NewsletterSubscription` model in either worktree.

The core finding — this trial's `newsletter-subscriptions` artifact is missing that migration — stands. The specific claim that it mirrors a live bug elsewhere in the repo does not. This is left in the writeup as a reminder that adopting a `reviewer` role doesn't remove the need to verify its claims before acting on them — the same discipline this whole PRD applies to the original issue's own claims.
