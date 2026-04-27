#!/usr/bin/env bash
set -euo pipefail

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
PROTECTED_BRANCHES="^(master|main)$"

if echo "$BRANCH" | grep -Eq "$PROTECTED_BRANCHES"; then
    printf "\n❌  Cannot commit directly to '%s'.\n\n" "$BRANCH"
    exit 1
fi

if echo "$BRANCH" | grep -Eq '^[a-zA-Z0-9]+([/-][a-zA-Z0-9]+)*$'; then
    printf "✅  Branch name is valid: %s\n" "$BRANCH"
else
    printf "\n❌  Branch name must be alphanumeric with '/' or '-' separators: %s\n\n" "$BRANCH"
    exit 1
fi
