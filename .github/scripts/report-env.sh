#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$(git rev-parse --show-toplevel 2> /dev/null || pwd)}"

command_version() {
    local command_name="$1"
    local version_flag="${2:---version}"
    local output

    if ! command -v "$command_name" > /dev/null 2>&1; then
        printf 'not installed\n'
        return
    fi

    output="$("$command_name" "$version_flag" 2>&1 | sed -n '1p' || true)"
    printf '%s\n' "${output:-unknown}"
}

snail_sh() {
    pnpm exec snail-sh "$@"
}

timestamp="$(date -u '+%Y-%m-%d %H:%M:%S UTC')"

snail_sh section "Environment"
snail_sh kv_pair "timestamp" "$timestamp"
snail_sh kv_pair "cwd" "$(pwd)"
snail_sh kv_pair "os" "$(uname -a)"
snail_sh kv_pair "shell" "${SHELL:-unknown}"

snail_sh section "Tool Versions"
snail_sh kv_pair "node" "$(command_version node -v)"
snail_sh kv_pair "pnpm" "$(command_version pnpm -v)"
snail_sh kv_pair "git" "$(command_version git --version)"
snail_sh kv_pair "gh" "$(command_version gh --version)"
snail_sh kv_pair "python" "$(command_version python3 --version)"

snail_sh spacer 1
