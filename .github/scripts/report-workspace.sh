#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$(git rev-parse --show-toplevel 2> /dev/null || pwd)}"

cd "$ROOT_DIR"

snail_sh() {
    pnpm exec snail-sh "$@"
}

count_lines() {
    local value="${1:-}"
    printf '%s\n' "$value" | grep -c '.' || true
}

workspace_package_count() {
    if [[ ! -d packages ]]; then
        printf '0\n'
        return
    fi

    find packages -name package.json -not -path '*/node_modules/*' 2> /dev/null | wc -l | tr -d ' '
}

workspace_app_count() {
    if [[ ! -d apps ]]; then
        printf '0\n'
        return
    fi

    find apps -name package.json -not -path '*/node_modules/*' 2> /dev/null | wc -l | tr -d ' '
}

workspace_changed_scope() {
    local command_name="$1"
    shift
    local output=""
    output="$(pnpm exec "$command_name" "$@" 2> /dev/null || true)"

    if printf '%s\n' "$output" | grep -Eq 'Failed to load [0-9]+ default Nx plugin|Plugin worker|Pass --verbose'; then
        if [[ "$command_name" == "scope-affected" ]]; then
            printf '%s\n' "workspace"
        else
            printf '%s\n' "root"
        fi
        return 0
    fi

    printf '%s\n' "$output" | sed '/^$/d' | tail -n 1
}

snail_sh section "Workspace"

if ! command -v pnpm > /dev/null 2>&1; then
    snail_sh status_pair "pnpm" "not installed" "error"
    exit 0
fi

tracked_workspace_packages="$(workspace_package_count)"
tracked_workspace_apps="$(workspace_app_count)"
staged_files="$(git diff --cached --name-only 2> /dev/null || true)"
unstaged_files="$(git diff --name-only 2> /dev/null || true)"
untracked_files="$(git ls-files --others --exclude-standard 2> /dev/null || true)"
staged_scope="$(workspace_changed_scope scope-commit --staged)"
all_changed_scope="$(workspace_changed_scope scope-commit --all)"
affected_scope="$(workspace_changed_scope scope-affected)"
affected_scope_base_main="$(workspace_changed_scope scope-affected --base main)"

snail_sh kv_pair "packages" "${tracked_workspace_packages:-0}"
snail_sh kv_pair "apps" "${tracked_workspace_apps:-0}"
snail_sh kv_pair "staged files" "$(count_lines "$staged_files")"
snail_sh kv_pair "unstaged files" "$(count_lines "$unstaged_files")"
snail_sh kv_pair "untracked files" "$(count_lines "$untracked_files")"
snail_sh kv_pair "staged scopes" "${staged_scope:-root}"
snail_sh kv_pair "changed scopes" "${all_changed_scope:-root}"
snail_sh kv_pair "affected scopes" "${affected_scope:-workspace}"
snail_sh kv_pair "affected from main" "${affected_scope_base_main:-workspace}"

snail_sh spacer 2
if pnpm -r outdated; then
    snail_sh status_pair "dependencies" "current" "success"
else
    snail_sh status_pair "dependencies" "outdated" "warn"
fi
snail_sh spacer 1
