# Pre-publish checklist and template

## Checklist

- [ ] Requirements gathered from the user — use cases, trigger scenarios (including what should NOT trigger it), intended audience, and desired level of detail — rather than inferred from a one-line request.
- [ ] No existing skill already covers this — checked `.claude/skills/` (and any global skills visible in context) for overlap first.
- [ ] Scoped to exactly one capability — the description doesn't need "and" to explain it.
- [ ] `name` in frontmatter matches the directory name exactly (kebab-case).
- [ ] `description` states both *what it does* and *when to use it*, and ends with concrete trigger phrases a user would plausibly type.
- [ ] `description` is specific enough it wouldn't misfire for an adjacent, similarly-worded task — and wouldn't stay silent for the tasks it's meant to cover.
- [ ] Body opens with a one-paragraph scope statement.
- [ ] Body has an explicit boundary/"not for" note if a similar skill exists nearby.
- [ ] `SKILL.md` is short (a few hundred lines max); anything longer moved to `references/*.md` with an explicit pointer in the body.
- [ ] Every `references/`, `scripts/`, or `assets/` file mentioned in the body actually exists at that path.
- [ ] Nothing in the body duplicates content already covered by this project's always-loaded `CLAUDE.md` or `.claude/rules/*.md` — it either links to that or assumes it and covers the remaining gap.
- [ ] No editorializing in the description ("a great skill for...", "powerful", "comprehensive") — plain, matchable language only.
- [ ] Full `SKILL.md` presented back to the user with an explicit ask: does it cover their use cases, is anything missing/unclear, is the detail level right?

## Minimal template

```markdown
---
name: my-new-skill
description: One sentence — what it does, when to use it, ending with literal trigger phrases users would type.
---

# My New Skill

One paragraph: what this skill is for and its boundary (what it is NOT for, if relevant).

## When to apply

- Bullet list of concrete trigger scenarios.

## Steps / guidance

1. Imperative, concrete steps — not narrative prose.
2. Point to `references/*.md` for any detail long enough to not belong here.

## Common pitfalls

- Anything a fresh agent following this skill would predictably get wrong.
```
