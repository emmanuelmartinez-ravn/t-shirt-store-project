---
name: writing-skills
description: Guidance for authoring, reviewing, or restructuring a Claude Code skill (a SKILL.md file under .claude/skills/) — naming, frontmatter, description/trigger wording, when to split content into references/scripts/assets, and common failure modes. Use when the user asks to "create a skill", "write a skill", "add a SKILL.md", "make this a skill", or wants an existing skill reviewed, renamed, or split up.
metadata:
  type: authoring-reference
---

# Writing Skills

A skill is a packaged, on-demand set of instructions for a recurring kind of task. It is loaded into context only when its `description` matches the task at hand, so the whole system depends on that one line being accurate and specific — get it wrong and the skill either never fires or fires for the wrong tasks.

## Before writing anything

1. **Gather requirements from the user first.** Don't infer scope, use cases, or trigger phrasing from a one-line request. Ask what recurring task the skill should cover, concrete example scenarios/inputs where it should (and shouldn't) fire, who/what will use it (the user directly, or an agent invoked on their behalf), and how detailed the guidance needs to be (a short checklist vs. a fuller reference doc). Skip only what the user has already stated unambiguously in their request — don't re-ask for something they already gave you.
2. **Check for an existing skill first.** List `.claude/skills/` (and note any global skills already shown in context) and skim their `description` lines. Prefer extending or fixing an existing skill over creating a near-duplicate — two overlapping skills compete for the same trigger and neither wins reliably.
3. **Scope it to one capability.** If the task description needs "and" to explain what the skill covers ("reviews code and deploys it"), it's two skills. A skill should answer one question: "how do I do X in this repo/domain?"
4. **Decide where it lives.** Project-specific know-how (this repo's conventions, its own workflows) goes in `.claude/skills/<name>/`, checked into the repo so every contributor and agent gets it. Cross-project reference material (a vendored library's CLI/API docs, like this repo's `prisma-*` skills) follows the same shape but is closer to vendored documentation than project convention — don't blend the two in one skill.

## File layout

```
.claude/skills/<name>/
  SKILL.md              # required — frontmatter + body, loaded whenever the skill triggers
  references/*.md       # optional — detailed material loaded only when SKILL.md points to it
  scripts/*              # optional — runnable helpers the skill body tells the agent to invoke
  assets/*               # optional — templates/boilerplate meant to be copied into the user's output, not read
```

Only `SKILL.md` is loaded automatically. Everything else is loaded lazily — the body must explicitly tell the agent when to open a given reference file (e.g. "see `references/checklist.md` for the full rule list"), otherwise that content is dead weight nobody reads.

## The frontmatter

```yaml
---
name: kebab-case-matching-directory-name
description: One sentence, third person, stating what it does AND when to use it, ending with concrete trigger phrases.
---
```

- `name` must exactly match the directory name (`writing-skills/SKILL.md` → `name: writing-skills`). This is how the skill is invoked (`/writing-skills` or referenced by name).
- `description` is the *entire* signal used to decide relevance before the skill is loaded — nothing else in the file is scanned for that decision. Write it to do two jobs at once:
  1. **What it does** — one clause, plain enough that a reader skimming a list of thirty skills understands the scope immediately.
  2. **When to use it** — trigger conditions, and ideally literal phrases a user might type ("Use when the user asks to create a skill, write a skill, add a SKILL.md..."). Copy the pattern from this repo's existing skills, e.g. `prisma-cli`'s description ends with `Triggers on "prisma init", "prisma generate", ...`.
- Optional frontmatter: `license`, `metadata` (freeform key/value — this repo's vendored skills use it for `author`/`version`; a project-authored skill can use it for a `type` tag instead, as this file does).
- Don't editorialize in the description ("a great skill for...") — it's matched against real task text, not read for tone.

## The body

- Open with a one-paragraph statement of what the skill is for — the reader (a fresh agent, or a human skimming) should understand the boundary before reading further.
- Prefer imperative steps, checklists, and short concrete examples over narrative prose. The body is instructions to follow, not documentation to admire.
- State the boundary explicitly when the skill sits near a similar one — see how `prisma-cli`'s "Boundary" section tells the agent not to confuse it with `prisma-compute`/`prisma-postgres`. A skill that doesn't say what it *isn't* for tends to get invoked for adjacent tasks it handles badly.
- Keep `SKILL.md` itself short — a few hundred lines at most. Anything longer (full API tables, long worked examples, a large checklist) belongs in `references/*.md`, with a pointer in the body telling the agent when to open it. This mirrors why the skill system exists at all: load only what the current task needs.
- If the skill produces a runnable artifact (a script, a generated file), put the script under `scripts/` and have the body describe when and how to invoke it, rather than inlining a large script in the markdown.

## Common failure modes

- **Description too vague to trigger reliably.** "Helps with database stuff" will never beat a more specific skill's description in the matching decision, and won't fire for the phrasing users actually type. Test it: would this exact sentence plausibly appear in a system reminder next to nine other skills, and still stand out for the right prompts?
- **Description too broad, over-triggers.** A skill whose description could describe half the codebase's tasks gets invoked for things it doesn't actually help with. Narrow the trigger conditions rather than the capability.
- **Duplicating content that already lives elsewhere.** Don't restate this project's `CLAUDE.md` or `.claude/rules/*.md` conventions inside a skill — link to them or assume they're already loaded (they're always-on context here), and keep the skill focused on the parts of the task those files don't cover.
- **One skill trying to do two jobs.** If half the body only applies in one scenario and half only in another, split it into two skills with distinct descriptions.
- **Everything crammed into SKILL.md.** If the file is long enough that a reader has to scroll past irrelevant detail to find the step they need, that detail belongs in `references/`.
- **Forgetting the name/directory must match.** A mismatched `name` field silently breaks direct invocation by name even though trigger-based matching may still work.

## Reviewing or editing an existing skill

Apply the same lens in reverse:
1. Read the `description` alone — would it fire for the tasks this skill is meant to cover, and stay silent for tasks it isn't? If not, rewrite it first; that's almost always the highest-leverage fix.
2. Check `SKILL.md` length and content against "Common failure modes" above.
3. Confirm any `references/`/`scripts/`/`assets/` the body points to actually exist and are named consistently.
4. If the skill has drifted from a source it's meant to track (e.g. a vendored doc skill whose upstream API changed), verify against the current source before trusting its content — see `references/checklist.md` for the full pre-publish checklist.

## After drafting: confirm with the user

Writing the file is not the last step — a skill's `description` and level of detail are judgment calls the user is better positioned to validate than you are.

1. **Present the full `SKILL.md`** (and summarize any `references/`/`scripts/`/`assets/` files you created alongside it) to the user before treating the skill as done.
2. **Ask explicitly, don't assume silence means approval:**
   - Does this cover your use cases — including the trigger scenarios and any edge cases discussed while gathering requirements?
   - Is anything missing or unclear?
   - Is the level of detail right, or should it be more concise (move detail into `references/`) or more thorough (fill a gap)?
3. **Revise based on the answer** and loop back to step 2 if the changes are non-trivial, rather than declaring it final on the first pass.

This applies to new skills and material rewrites alike; a small, obvious fix (typo in the description, a broken file reference) doesn't need a full requirements-and-confirm round trip.

See `references/checklist.md` for a condensed pre-publish checklist and a minimal SKILL.md template to copy from.
