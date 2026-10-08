---
name: writing-prds
description: Guides drafting a Product Requirements Document for a new feature or change in this repo — gathers a detailed problem description and proposed solution(s) from the user, verifies claims against the actual codebase, suggests better alternatives when warranted, interviews the user until every open question is resolved, and writes the result to plans/<prd-name>.md. Use when the user asks to "write a PRD", "create a PRD", "draft a PRD for X", or wants to plan out a feature's requirements before implementation begins.
---

# Writing PRDs

A PRD here is a requirements document — what problem is being solved, for whom, and what the accepted solution looks like — written *before* implementation starts. It is not an implementation plan (no file-by-file steps, no task breakdown) and not an architecture decision record. It exists so that by the time implementation begins (via the `backend-engineer`/`test-engineer` agents, plan mode, or otherwise), there are no open questions left to resolve mid-build.

## Boundary

- Not for turning an already-agreed PRD into a step-by-step implementation plan — that's `Plan`/`EnterPlanMode`, done afterward, separately.
- Not for recording an architectural decision in isolation (e.g. "why we chose X pattern") — that belongs with `domain-modeling`.
- Don't skip straight to writing the document from one paragraph of user input. The interview is the point; a PRD written without it is guessing.

## Process

Work through these phases in order. Don't collapse them — each depends on the previous one's output.

### 1. Get the detailed problem description

Ask the user for a long-form description covering:
- What's broken, missing, or needed, and who is affected.
- Current behavior vs. desired behavior.
- Any solution(s) they already have in mind, even rough ones.

If the answer comes back thin (a one-liner, a vague ask), push back and ask for more before moving on — don't backfill missing detail with assumptions.

### 2. Verify assertions against the repo

Before taking the user's description of "how it currently works" or "what's missing" at face value, check it against the actual code — use `Grep`/`Glob`/`Read`, or delegate to the `Explore` agent for broader searches. Specifically verify:
- Claims about current behavior (does the code actually do what the user says it does?).
- Feasibility of their proposed solution against this repo's conventions (Onion layering, existing domain modules under `src/<domain>/`, Prisma schema shape — see `CLAUDE.md` and `.claude/rules/`).
- Whether a similar problem was already solved elsewhere in the codebase (a pattern to reuse or extend rather than reinvent).

If something doesn't hold up, surface the discrepancy to the user before proceeding — don't quietly correct it and don't quietly proceed on a false premise either.

### 3. Evaluate and, if warranted, propose alternatives

If repo exploration reveals the user's proposed solution conflicts with existing patterns, is more complex than necessary, or a simpler/more consistent approach exists, present it as an alternative alongside their original idea with a concrete tradeoff comparison (complexity, consistency with existing domains, migration cost). Use `AskUserQuestion` when it comes down to a small number of concrete options. Never silently substitute your own solution for theirs — always let them decide.

### 4. Interview until fully understood

Keep asking clarifying questions — this is normally more than one round — until there is no remaining ambiguity about:
- Goals and explicit non-goals.
- Edge cases and error conditions.
- Which domains/modules are affected (new domain vs. extending an existing one).
- Data model changes (new Prisma models/fields, migrations).
- API surface (new endpoints, DTO shape, response shape).
- Success criteria — how you'd know this is done and working.
- Anything explicitly out of scope for this iteration.

Use `AskUserQuestion` for discrete decisions with a handful of options; use plain open-ended questions for anything that needs free-form detail. Do not proceed to writing until the user confirms there's nothing left unresolved.

### 5. Write the PRD

- Create the `plans/` directory at the repo root if it doesn't exist yet.
- Check whether `plans/<prd-name>.md` already exists before writing — if it does, confirm with the user whether to overwrite or pick a different name, rather than clobbering silently.
- Name the file in kebab-case matching the feature (e.g. `plans/add-cart-discount-codes.md`).
- Use the structure in `assets/prd-template.md` as the skeleton. Fill in every section with real content from the interview — leave no placeholder text or `<!-- -->` comments in the final file.

### 6. Confirm

After writing, summarize what was captured and ask the user to confirm it matches their understanding before treating the PRD as final.

## Common pitfalls

- Writing from a single vague prompt without interviewing — defeats the purpose of the skill.
- Trusting the user's description of "how it works today" without checking the code.
- Producing a task/implementation breakdown instead of a requirements document — save that for a follow-up planning step.
- Overwriting an existing PRD file without checking first.
- Staying silent about a conflict between the user's proposed solution and this repo's architecture conventions instead of surfacing it as an alternative.
