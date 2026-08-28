---
description: Push the current branch and open (or update) a PR into main
argument-hint: [optional target branch, defaults to main]
---

Open a pull request for the current branch, following the conventions established in this project:

1. Run `git status` and `git branch --show-current`. If there are uncommitted changes, stop and suggest running `/commit` first rather than pushing a dirty or partial state.
2. Refuse to run this from `main` itself — a PR needs a feature branch. If currently on `main`, stop and ask which branch to use or whether to create one.
3. Check whether the branch is fully self-contained: does it depend on files, modules, or dependency changes that only exist uncommitted, or only on another branch? If the branch would fail to build/lint/test on its own when checked out fresh (e.g. code imports a module or package not present in this branch's own commit history), fix that first — don't open a PR for a branch that can't build.
4. Run `pnpm lint`, `pnpm test`, and `pnpm build` locally as a sanity check before pushing.
5. Push: `git push -u origin <branch>` if no upstream is set yet, otherwise `git push`.
6. Check `gh pr list` for an existing open PR from this branch — if one exists, the push already updated it; report that instead of creating a duplicate.
7. Otherwise create the PR: `gh pr create --base main --head <branch> --title "..." --body "..."`.
   - Title: short, imperative, matches this repo's commit style (e.g. `feat: add roles module`), under 70 characters.
   - Body via heredoc with a `## Summary` (bullet points of what changed and why) and a `## Test plan` (checklist — lint/test/build, and anything manually verified).
   - Never include a Claude attribution/co-authorship line in the PR body.
8. If the target is anything other than `main` (or `$ARGUMENTS` names a different base), use that base instead — but confirm with the user first if it wasn't explicit, since `main` is the default integration branch here.
9. If this PR's changes overlap with or supersede another currently-open PR, flag that to the user explicitly rather than silently leaving two competing PRs open.

Report the PR URL (new or existing) at the end.
