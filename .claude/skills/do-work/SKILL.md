---
name: do-work
description: Verifies a completed unit of work is actually green (pnpm lint && pnpm test, fixing real failures found along the way) and then commits it using this repo's own commit conventions. Use when the user asks to "do the work", "submit this work", "commit this unit of work", "wrap up this task", or "finish and commit" once a change is already implemented.
metadata:
  type: workflow
---

# Do Work

Picks up after a change is already implemented (by the user directly, or by `backend-engineer`/`test-engineer` per this repo's `CLAUDE.md`) and carries it through verification to a committed state. It is the "prove it works, then commit it" tail end of a task — **not** the implementation step, and **not** pushing or opening a PR (that's `/pr`).

## Steps

1. **Confirm there's something to work with.** Run `git status`. If nothing changed, say so and stop — there's no unit of work to submit.
2. **Check the baseline.** Run `pnpm lint && pnpm test`. If both are already green, skip straight to step 4 — don't invoke a Ralph loop for work that doesn't need fixing.
3. **If either failed, fix-and-retry via a Ralph loop** instead of manually looping tool calls in one turn — see "Fix-and-retry via Ralph Loop" below.
4. **Commit.** Once lint and test are both green, follow `.claude/skills/commit/SKILL.md` (`/commit`) exactly for staging and committing: logical grouping, this repo's Conventional Commits style, the "new dependency must be committed too" check, letting the husky pre-commit hook run uninterrupted, never `--no-verify`, and confirming `git status` afterward.
5. **Report** what got committed — or, if lint/test were already green with nothing to fix, note that and proceed straight to committing.

## Fix-and-retry via Ralph Loop

When step 2's baseline check fails, drive the fix/rerun cycle with the `ralph-loop` plugin (`ralph-loop:ralph-loop` skill / `/ralph-loop` command) rather than iterating manually within one turn — its Stop hook forces an actual rerun each cycle instead of trusting your own judgment that a fix worked.

- **Bound it.** Always pass `--max-iterations` (default to `8` unless the user specifies otherwise) so a genuinely unfixable failure can't loop forever. Never start it with no bound and no promise.
- **Scope the prompt to the whole remaining unit of work, not just "fix it".** The Stop hook only re-triggers on the *same* prompt when the loop continues, and once the completion promise is judged true the turn is simply allowed to end — nothing auto-continues afterward. So the prompt handed to `/ralph-loop` must cover: rerun `pnpm lint && pnpm test`, keep fixing real root causes until both pass, then carry out step 4 (commit, following `/commit`'s conventions) and step 5 (report) **in that same final iteration**, only outputting the completion promise once the fix is verified green *and* the commit is done.
- **Pick a completion promise that encodes full completion**, e.g. `--completion-promise "LINT AND TESTS PASS, WORK COMMITTED"` — and never output it unless it's genuinely true, per Ralph Loop's own strict rule. A red test suite or an uncommitted tree means it isn't true yet.
- **Gate the commit on a fresh, successful verification in that exact turn.** Before running step 4, re-run `pnpm lint && pnpm test` and confirm both actually pass right then — never commit off an earlier iteration's result, an assumption that "it's probably fixed now," or pressure from an approaching iteration cap. If that fresh rerun still fails, do **not** commit; let the loop continue (or exhaust) instead.
- **Watch for the loop exhausting `--max-iterations` without reaching green.** The Stop hook allows the turn to end as soon as `iteration >= max_iterations`, *before* it even checks for a completion promise — so a cap-exhausted loop ends silently, without your final message ever confirming what happened, unless you account for it. Each iteration, check `iteration:`/`max_iterations:` in `.claude/ralph-loop.local.md`; if this is (or is about to be) the last one and lint/test still aren't green, explicitly report the remaining failures and that nothing was committed — don't let it end quietly, and never commit an unresolved state just because the budget is running out.
- **If truly stuck** (the failure hinges on a product/requirements decision, not a code bug), don't force a false promise to escape — run `ralph-loop:cancel-ralph` (`/cancel-ralph`) to end the loop cleanly, then stop and ask the user, matching step 3's original "ask instead of guessing" rule.

## Boundary

- Doesn't implement the change itself — that's already done by the time this skill applies.
- Doesn't push or open a PR — that's `/pr`, a separate step after one or more `do-work` commits land.
- Doesn't invent its own staging/commit-message logic — it defers to `/commit` for that so the two stay in sync; if `/commit`'s conventions change, this skill doesn't need to change with them.
- Doesn't reach for a Ralph loop when the baseline is already green (step 2) — that's pure overhead for work that needs no fixing.

## Common pitfalls

- Committing before both lint and test are green, or bypassing a failure with `--no-verify` — the pre-commit hook exists precisely to catch what step 2/3 should have already caught.
- Silencing a lint error inline instead of fixing what it's flagging.
- Guessing at a fix for a test failure that's actually surfacing an ambiguous or wrong requirement — stop and ask instead (via `cancel-ralph` first, if a loop is active).
- Starting a Ralph loop with no `--max-iterations` and no way for the promise to become true — it runs forever with no manual stop.
- Outputting the completion promise before actually re-running `pnpm lint && pnpm test` and committing — the promise must be verified true, not asserted optimistically.
- Committing on the strength of an earlier iteration's result instead of a fresh rerun in the same turn — a fix believed to work two iterations ago may not still apply cleanly.
- Letting `--max-iterations` exhaust silently: the Stop hook allows exit as soon as the cap is hit, without checking the promise — if lint/test are still red when the budget runs out, say so and confirm nothing was committed, rather than leaving the user to notice on their own.
