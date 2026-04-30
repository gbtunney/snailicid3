#!/usr/bin/env bash
set -euo pipefail

BASE_BRANCH="${BASE_BRANCH:-main}"
PREFIX="${PREFIX:-changesets}"

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

CURRENT_BRANCH="$(git branch --show-current)"

if [[ -z "$CURRENT_BRANCH" ]]; then
    echo "Error: detached HEAD; cannot create changeset branch."
    exit 1
fi

if [[ "$CURRENT_BRANCH" == "$BASE_BRANCH" ]]; then
    echo "Error: do not run this from $BASE_BRANCH."
    echo "Start from a feature branch first."
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

RAW_SLUG="${1:-$CURRENT_BRANCH}"

SAFE_SLUG="$(
    printf '%s' "$RAW_SLUG" \
        | tr '[:upper:]' '[:lower:]' \
        | sed 's#^refs/heads/##' \
        | sed "s#^${PREFIX}/##" \
        | sed 's#[^a-z0-9._/-]#-#g; s#//*#/#g; s#-\+#-#g; s#^/##; s#/$##'
)"

BRANCH="${PREFIX}/${SAFE_SLUG}"

if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
    echo "Error: local branch already exists: $BRANCH"
    echo
    echo "Use a different name:"
    echo "  pnpm changeset:branch my-other-name"
    echo
    echo "Or delete it:"
    echo "  git branch -D $BRANCH"
    exit 1
fi

if git ls-remote --exit-code --heads origin "$BRANCH" > /dev/null 2>&1; then
    echo "Error: remote branch already exists: origin/$BRANCH"
    echo
    echo "Use a different name:"
    echo "  pnpm changeset:branch my-other-name"
    exit 1
fi

git checkout -b "$BRANCH"

echo "Created branch: $BRANCH"
echo
echo "Now run:"
echo "  pnpm changeset"
