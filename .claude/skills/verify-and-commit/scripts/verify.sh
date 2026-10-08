#!/usr/bin/env bash
# .claude/skills/verify-and-commit/scripts/verify.sh
#
# Read-only verification gate for the `verify-and-commit` skill. Runs this
# repo's lint and test commands, captures their real exit codes, and prints
# a single machine-checkable VERIFY_RESULT line as the last line of output.
#
# It never modifies anything and never attempts to fix a failure —
# diagnosis and fixing stay with the calling agent (or a bounded Ralph
# Loop iteration). Run it from the repo root:
#
#   bash .claude/skills/verify-and-commit/scripts/verify.sh
#
# Exit code is 0 only when VERIFY_RESULT=PASS; non-zero on any prereq
# problem or FAIL, so callers can gate on $? as well as parsing the line.

set -u

fail() {
  # $1: short machine-readable reason, printed as VERIFY_RESULT=FAIL:$1
  echo ""
  echo "VERIFY_RESULT=FAIL:$1"
  exit 1
}

# --- 1. Prerequisites --------------------------------------------------

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "verify.sh: not inside a git repository" >&2
  fail "prereq-not-a-git-repo"
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "verify.sh: pnpm not found on PATH" >&2
  fail "prereq-no-pnpm"
fi

if [ -z "$(git status --porcelain)" ]; then
  echo "verify.sh: working tree is clean — nothing to verify" >&2
  fail "prereq-no-changes"
fi

# --- 2. Run lint and test, always both, capturing real exit codes ------
#
# Deliberately not short-circuited on a lint failure the way the husky
# pre-commit hook is: every Ralph Loop iteration costs a full turn, so
# surfacing every failure class up front avoids discovering lint and test
# failures one bounded iteration apart.

echo "=== pnpm lint ==="
pnpm lint
lint_status=$?

echo ""
echo "=== pnpm test ==="
pnpm test
test_status=$?

# --- 3. Unambiguous, machine-checkable result line ----------------------

echo ""
if [ "$lint_status" -eq 0 ] && [ "$test_status" -eq 0 ]; then
  echo "VERIFY_RESULT=PASS"
  exit 0
elif [ "$lint_status" -ne 0 ] && [ "$test_status" -ne 0 ]; then
  echo "VERIFY_RESULT=FAIL:lint,test"
  exit 1
elif [ "$lint_status" -ne 0 ]; then
  echo "VERIFY_RESULT=FAIL:lint"
  exit 1
else
  echo "VERIFY_RESULT=FAIL:test"
  exit 1
fi
