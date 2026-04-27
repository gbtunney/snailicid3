#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel 2> /dev/null || pwd)"

cd "$ROOT_DIR"

snail_sh() {
    pnpm exec snail-sh "$@"
}

snail_sh section "Prettier"

if output="$(pnpm exec prettier "**/*" '!**/docs/**' '!**/*.{py,jpg,jpeg,gif,webp,bin,codex}' --no-error-on-unmatched-pattern --check 2>&1)"; then
    snail_sh status_pair "status" "clean" "success"
    snail_sh spacer 1
else
    snail_sh status_pair "status" "needs formatting" "warn"
    snail_sh spacer 1
    if [[ -n "$output" ]]; then
        snail_sh log "$output" "dim-yellow"
    fi
fi
snail_sh spacer 1
