#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"

NODE_SCRIPT="$PACKAGE_ROOT/dist/export.prettier.ignore.js"

if [[ ! -f "$NODE_SCRIPT" ]]; then
    echo "missing: $NODE_SCRIPT" >&2
    exit 1
fi

pnpm exec node "$NODE_SCRIPT" \
    --repo-root "$REPO_ROOT" \
    --gitignore ".gitignore" \
    --out ".prettierignore.generated"

echo "🐌 merged prettier ignores > .gitignored to .prettierignore.generated"
