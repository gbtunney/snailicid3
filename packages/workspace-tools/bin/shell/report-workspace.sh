#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel 2> /dev/null || pwd)"

cd "$ROOT_DIR"

snail_sh() {
    pnpm exec snail-sh "$@"
}

snail_sh section "Workspace"

if ! command -v pnpm > /dev/null 2>&1; then
    snail_sh status_pair "pnpm" "not installed" "error"
    exit 0
fi

if output="$(pnpm outdated -r 2>&1)"; then
    snail_sh status_pair "dependencies" "current" "success"
    if [[ -n "$output" ]]; then
        snail_sh log "$output" grey
    fi
else
    snail_sh status_pair "dependencies" "outdated or unavailable" "warn"
    if [[ -n "$output" ]]; then
        snail_sh log "$output" grey
    fi
fi
