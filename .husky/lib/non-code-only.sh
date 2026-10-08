#!/usr/bin/env sh
# Reads newline-separated repo-relative paths on stdin.
# Exit 0 when EVERY path is non-code (docs / Claude config / approved borderline
# files) — lint and test can't be affected, so callers may skip them.
# Exit 1 as soon as one path is code (anything not on the allowlist below).
# An empty list exits 0.
#
# Single source of truth for this list, used by:
#   .husky/pre-commit, the /pr skill, and verify-and-commit's verify.sh.
# eslint only covers {src,apps,libs,test}/**/*.ts and jest's rootDir is src/,
# so nothing below can change their result. Keep the list fail-safe: when in
# doubt, leave a path OFF it so it keeps running the full checks.

while IFS= read -r path || [ -n "$path" ]; do
  path=${path%"$(printf '\r')"}
  [ -z "$path" ] && continue
  case "$path" in
    *.md) ;;                         # documentation anywhere
    docs/*|plans/*) ;;               # documentation folders
    .claude/*|skills-lock.json) ;;   # Claude Code configuration
    .env.example|.gitignore) ;;      # env var docs, ignore rules
    docker/*) ;;                     # local Postgres/Redis compose files
    *)
      echo "non-code-only: code change detected: $path" >&2
      exit 1
      ;;
  esac
done

exit 0
