---
name: verify-and-commit
description: Verifies a completed unit of work is actually green (via a scripted lint+test gate, fixing real failures found along the way) and then commits it using this repo's own commit conventions. Never pushes or opens a PR — that's `/pr`. Use when the user asks to "do the work", "submit this work", "commit this unit of work", "wrap up this task", or "finish and commit" once a change is already implemented.
metadata:
  type: workflow
---

# Verify and Commit

Picks up after a change is already implemented (by the user directly, or by `backend-engineer`/`test-engineer` per this repo's `CLAUDE.md`) and carries it through verification to a committed state. It is the "prove it works, then commit it" tail end of a task — **not** the implementation step, and **not** pushing or opening a PR (that's `/pr`).

## Steps

1. **Confirm there's something to work with.** Run `git status`. If nothing changed, say so and stop — there's no unit of work to submit.
2. **Check the baseline.** Run `bash .claude/skills/verify-and-commit/scripts/verify.sh` and read only its final `VERIFY_RESULT=` line as the verdict — don't eyeball the lint/test output yourself or take the script's own prose output as the verdict. If it prints `VERIFY_RESULT=PASS`, skip straight to step 4 — don't invoke a Ralph loop for work that doesn't need fixing.
3. **If it printed `VERIFY_RESULT=FAIL:...`, fix-and-retry via a Ralph loop** instead of manually looping tool calls in one turn — see "Fix-and-retry via Ralph Loop" below. Hand the loop's prompt the script's actual output (not a paraphrase) so it has the real lint/test errors to diagnose from.
4. **Commit — gated on a fresh `PASS`.** Once you believe the work is green, re-run `bash .claude/skills/verify-and-commit/scripts/verify.sh` one more time in this same turn, from a clean invocation. Only if that fresh run prints `VERIFY_RESULT=PASS` do you proceed: follow `.claude/skills/commit/SKILL.md` (`/commit`) exactly for staging and committing — logical grouping, this repo's Conventional Commits style, the "new dependency must be committed too" check, letting the husky pre-commit hook run uninterrupted, never `--no-verify`, and confirming `git status` afterward. (`/commit`'s own steps end there — it never pushes — so following it "exactly" here cannot smuggle in a push regardless of how `/commit` changes later.) If the fresh run instead prints any `VERIFY_RESULT=FAIL:...`, do **not** commit — treat it exactly like step 3's failed case: continue the Ralph loop if it still has budget, or if `--max-iterations` is already exhausted, follow the exhaustion-reporting rule below instead of committing.
5. **Report** what got committed — or, if the baseline was already `PASS` with nothing to fix, note that and proceed straight to committing.

## Fix-and-retry via Ralph Loop

When step 2's baseline check fails, drive the fix/rerun cycle with the `ralph-loop` plugin (`ralph-loop:ralph-loop` skill / `/ralph-loop` command) rather than iterating manually within one turn — its Stop hook forces an actual rerun each cycle instead of trusting your own judgment that a fix worked.

**Why not just retry manually in one turn?** Each Ralph Loop iteration is a fresh Stop-hook-triggered re-invocation that re-reads the real current state from disk (git diff, `verify.sh` output) rather than continuing to reason inside one increasingly long turn. That matters because a wrong fix doesn't compound: if iteration 2's fix resolves the original test failure but introduces a new lint error, iteration 3 discovers that from `verify.sh`'s actual fresh output, not from trusting iteration 2's own belief that it had succeeded. **At `--max-iterations` exhaustion**, the Stop hook checks `iteration >= max_iterations` *before* checking the completion-promise text — so a cap-exhausted loop always exits silently, with no promise ever verified, regardless of whether the work is actually done. That's exactly why step 3/4 above require checking `.claude/ralph-loop.local.md` and `verify.sh`'s last real result rather than trusting silence-means-success.

- **Bound it.** Always pass `--max-iterations` (default to `8` unless the user specifies otherwise) so a genuinely unfixable failure can't loop forever. Never start it with no bound and no promise.
- **Scope the prompt to the whole remaining unit of work, not just "fix it".** The Stop hook only re-triggers on the *same* prompt when the loop continues, and once the completion promise is judged true the turn is simply allowed to end — nothing auto-continues afterward. So the prompt handed to `/ralph-loop` must cover: rerun `bash .claude/skills/verify-and-commit/scripts/verify.sh`, keep fixing real root causes until it prints `VERIFY_RESULT=PASS`, then carry out step 4 (commit, following `/commit`'s conventions, gated on that same fresh `PASS`) and step 5 (report) **in that same final iteration**, only outputting the completion promise once `verify.sh` has actually printed `PASS` and the commit is done.
- **Pick a completion promise that encodes full completion**, e.g. `--completion-promise "VERIFY_RESULT=PASS, WORK COMMITTED"` — and never output it unless it's genuinely true, per Ralph Loop's own strict rule. A `FAIL` result or an uncommitted tree means it isn't true yet.
- **Gate the commit on a fresh, successful `verify.sh` run in that exact turn.** Before running step 4, re-run `bash .claude/skills/verify-and-commit/scripts/verify.sh` and require its output to end in `VERIFY_RESULT=PASS` right then — never commit off an earlier iteration's result, an assumption that "it's probably fixed now," the loop's own self-reported success, or pressure from an approaching iteration cap. If that fresh run prints any `VERIFY_RESULT=FAIL:...`, do **not** commit; let the loop continue (or exhaust) instead.
- **Watch for the loop exhausting `--max-iterations` without reaching `PASS`.** The Stop hook allows the turn to end as soon as `iteration >= max_iterations`, *before* it even checks for a completion promise — so a cap-exhausted loop ends silently, without your final message ever confirming what happened, unless you account for it. Each iteration, check `iteration:`/`max_iterations:` in `.claude/ralph-loop.local.md`; if this is (or is about to be) the last one and the most recent `verify.sh` run did not print `VERIFY_RESULT=PASS`, explicitly report that result (which reason: lint, test, or both) and that nothing was committed — don't let it end quietly, and never commit an unresolved state just because the budget is running out.
- **If truly stuck** (the failure hinges on a product/requirements decision, not a code bug), don't force a false promise to escape — run `ralph-loop:cancel-ralph` (`/cancel-ralph`) to end the loop cleanly, then stop and ask the user, matching step 3's original "ask instead of guessing" rule.

## Boundary

- Doesn't implement the change itself — that's already done by the time this skill applies.
- Doesn't push or open a PR — that's `/pr`, a separate step after one or more `verify-and-commit` commits land.
- Doesn't invent its own staging/commit-message logic — it defers to `/commit` for that so the two stay in sync; if `/commit`'s conventions change, this skill doesn't need to change with them. `/commit` never pushes (verified: it has no push step), so deferring to it "exactly" is safe by construction, not by convention.
- Doesn't reach for a Ralph loop when the baseline is already `PASS` (step 2) — that's pure overhead for work that needs no fixing.

## Common pitfalls

- Committing before a fresh `verify.sh` run prints `VERIFY_RESULT=PASS`, or bypassing a failure with `--no-verify` — the pre-commit hook exists precisely to catch what step 2/3 should have already caught.
- Silencing a lint error inline instead of fixing what it's flagging.
- Guessing at a fix for a test failure that's actually surfacing an ambiguous or wrong requirement — stop and ask instead (via `cancel-ralph` first, if a loop is active).
- Starting a Ralph loop with no `--max-iterations` and no way for the promise to become true — it runs forever with no manual stop.
- Outputting the completion promise before actually re-running `verify.sh` and committing — the promise must be verified true by the script's real output, not asserted optimistically.
- Committing on the strength of an earlier iteration's `verify.sh` result instead of a fresh rerun in the same turn — a fix believed to work two iterations ago may not still apply cleanly.
- Letting `--max-iterations` exhaust silently: the Stop hook allows exit as soon as the cap is hit, without checking the promise — if the last `verify.sh` run wasn't `PASS` when the budget runs out, say so (and which of lint/test failed) and confirm nothing was committed, rather than leaving the user to notice on their own.
