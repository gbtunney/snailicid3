#!/usr/bin/env bash
set -euo pipefail

BASE_BRANCH="${BASE_BRANCH:-main}"
PREFIX="${PREFIX:-changeset}"
SLUG="${1:-manual}"

CURRENT_BRANCH="$(git branch --show-current)"
REPO_ROOT="$(git rev-parse --show-toplevel)"

cd "$REPO_ROOT"

if [[ "$CURRENT_BRANCH" == "$BASE_BRANCH" ]]; then
    echo "Error: do not run this from $BASE_BRANCH."
    echo "Create/use a feature branch first."
    exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
    echo "Error: repo is not clean."
    git status --short
    exit 1
fi

git fetch origin "$BASE_BRANCH"

BASE="$(git merge-base HEAD "origin/${BASE_BRANCH}")"
MAIN="$(git rev-parse "origin/${BASE_BRANCH}")"

if [[ "$BASE" != "$MAIN" ]]; then
    echo "Error: current branch is not up to date with origin/${BASE_BRANCH}."
    echo
    echo "Run one of:"
    echo "  git merge origin/${BASE_BRANCH}"
    echo "  git rebase origin/${BASE_BRANCH}"
    exit 1
fi

SAFE_SLUG="$(
    printf '%s' "$SLUG" \
        | tr '[:upper:]' '[:lower:]' \
        | sed 's/[^a-z0-9._-]/-/g; s/-\+/-/g; s/^-//; s/-$//'
)"

if [[ "$SAFE_SLUG" == "$PREFIX/"* ]]; then
    BRANCH="$SAFE_SLUG"
else
    BRANCH="${PREFIX}/${SAFE_SLUG}"
fi

git checkout -b "$BRANCH"

echo "Created branch: $BRANCH"
echo
echo "Now run:"
echo "  pnpm changeset"
