---
name: commit
description: Stage and commit pending changes using this repo's conventions. Use when the user asks to "commit", "commit this", or runs `/commit`.
argument-hint: [optional focus, e.g. "roles folder only" or "one commit per file"]
metadata:
  type: workflow
---

Commit the repo's pending changes, following the conventions established in this project's history:

0. Run `git branch --show-current` before anything else and check that the branch fits the change:
   - On `main`: stop. Never commit directly to `main` — ask which feature branch to use, or offer to create one (`git switch -c <branch>`), stashing nothing and discarding nothing.
   - On `claude-refactoring` (or a branch created from it): that branch is reserved for upgrades/refactoring only. If the pending changes are feature work (new endpoints, new domains, new dependencies or config for a new capability), stop and ask whether to move them to a new feature branch before committing.
   - Otherwise, proceed.
1. Run `git status` and `git diff` (staged + unstaged) to see what's pending. If `$ARGUMENTS` narrows the scope (a path, folder, or file), only touch that scope — leave everything else pending exactly as-is.
2. Check `git log --oneline -20` for message style. This repo uses plain **Conventional Commits** with no scope: `feat:`, `fix:`, `chore:`, `test:`, `docs:` — never `feat(scope):`.
3. Group changes into logically coherent commits:
   - Don't lump unrelated concerns (e.g. dependency bumps, app wiring, and a new module) into one commit.
   - Default to one commit per logical unit of work. If `$ARGUMENTS` explicitly asks for finer granularity (e.g. "one commit per file"), honor that instead.
   - New/renamed/moved files: `feat:` or the fitting verb for what they add. Test files (`*.spec.ts`): `test:`. Config-only or dependency-only changes: `chore:`. Docs: `docs:`. Bug fixes: `fix:`.
   - Order commits so the history reads sensibly (e.g. domain model before the service that uses it, dependencies before the code that needs them).
4. Before committing code that references a new package (e.g. `@nestjs/swagger`, `class-validator`), verify that package is actually present in a **committed** `package.json`/`pnpm-lock.yaml` on this branch — not just in the working tree. If it isn't, commit the dependency change first (or flag this to the user) so the branch doesn't end up broken for anyone who checks it out fresh.
5. Each `git commit` here triggers the husky pre-commit hook (`pnpm lint && pnpm test`). Let it run — don't bypass with `--no-verify`. If it fails, fix the actual issue (or ask the user) rather than working around it.
6. Never add a `Co-Authored-By: Claude` trailer or similar attribution to commit messages.
7. After committing, run `git status` to confirm the working tree matches what you intended (nothing left over, nothing accidentally swept in).
8. If the scope or grouping is genuinely ambiguous (e.g. changes span multiple unrelated concerns and it's unclear whether they belong on the same branch), ask before committing rather than guessing.

This skill never pushes to a remote — pushing only happens as part of `/pr` (`.claude/skills/pr/SKILL.md`), which requires separate authorization to open a pull request.
