#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$(git rev-parse --show-toplevel 2> /dev/null || pwd)}"
timestamp="$(date -u '+%Y-%m-%d %H:%M:%S UTC')"
report_print="${REPORT_PRINT:-true}"

cd "$ROOT_DIR"

git_output() {
    git "$@" 2> /dev/null || true
}

snail_sh() {
    pnpm exec snail-sh "$@"
}

log_lines() {
    local style="${1:-grey}"
    local content="${2:-}"
    local line

    while IFS= read -r line; do
        snail_sh log "$line" "$style"
    done <<< "$content"
}

github_output() {
    local key="$1"
    local value="$2"

    if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
        printf '%s=%s\n' "$key" "$value" >> "$GITHUB_OUTPUT"
    fi
}

logRepoReport() {
    snail_sh section "Repository"

    snail_sh kv_pair "branch" "${branch:-detached}"
    snail_sh kv_pair "origin" "${origin:-none}"
    snail_sh kv_pair "timestamp" "$timestamp"
    snail_sh status_pair "repo status" "$repo_status"

    snail_sh kv_pair "total tracked files" "$tracked_file_count"
    snail_sh kv_pair "staged files" "$staged_file_count"
    snail_sh kv_pair "unstaged files" "$unstaged_file_count"
    snail_sh kv_pair "untracked files" "$untracked_file_count"

    if [[ -n "$upstream" ]]; then
        snail_sh kv_pair "upstream" "$upstream"
        snail_sh kv_pair "ahead" "${ahead:-?}"
        snail_sh kv_pair "behind" "${behind:-?}"
    else
        snail_sh kv_pair "upstream" "not set"
    fi

    snail_sh kv_pair "last commit" "${last_commit:-none}"

    if [[ "$repo_status" == "dirty" ]]; then
        snail_sh section "Dirty File Preview"

        dirty_preview="$(git status --short | sed -n '1,20p')"

        if [[ -n "$dirty_preview" ]]; then
            log_lines grey "$dirty_preview"
        else
            snail_sh log "working tree changed, but no preview was available" grey
        fi
    fi

    snail_sh spacer 1
}

if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    github_output "repo_status" "not-a-repository"
    github_output "is_repo_dirty" "false"

    if [[ "$report_print" == "true" ]]; then
        snail_sh section "Repository"
        snail_sh status_pair "git" "not a repository" "error"
    fi

    exit 0
fi

branch="$(git_output branch --show-current)"
origin="$(git_output remote get-url origin)"

staged="$(git_output diff --cached --name-only)"
unstaged="$(git_output diff --name-only)"
untracked="$(git_output ls-files --others --exclude-standard)"
tracked="$(git_output ls-files)"

tracked_file_count="$(printf '%s\n' "$tracked" | grep -c '.' || true)"
staged_file_count="$(printf '%s\n' "$staged" | grep -c '.' || true)"
unstaged_file_count="$(printf '%s\n' "$unstaged" | grep -c '.' || true)"
untracked_file_count="$(printf '%s\n' "$untracked" | grep -c '.' || true)"

repo_status="clean"
is_repo_dirty="false"

if [[ "$staged_file_count" -gt 0 ]] \
    || [[ "$unstaged_file_count" -gt 0 ]] \
    || [[ "$untracked_file_count" -gt 0 ]]; then
    repo_status="dirty"
    is_repo_dirty="true"
fi

upstream="$(git_output rev-parse --abbrev-ref --symbolic-full-name '@{u}')"
ahead=""
behind=""

if [[ -n "$upstream" ]]; then
    ahead_behind="$(git_output rev-list --left-right --count "$upstream...HEAD")"
    read -r behind ahead <<< "${ahead_behind:-? ?}"
fi

last_commit="$(git_output log -1 --pretty=format:'%h %ad %s' --date=iso)"

github_output "branch" "${branch:-detached}"
github_output "origin" "${origin:-none}"
github_output "timestamp" "$timestamp"
github_output "repo_status" "$repo_status"
github_output "is_repo_dirty" "$is_repo_dirty"
github_output "tracked_file_count" "$tracked_file_count"
github_output "staged_file_count" "$staged_file_count"
github_output "unstaged_file_count" "$unstaged_file_count"
github_output "untracked_file_count" "$untracked_file_count"
github_output "upstream" "${upstream:-not set}"
github_output "ahead_count" "${ahead:-}"
github_output "behind_count" "${behind:-}"
github_output "last_commit" "${last_commit:-none}"

if [[ "$report_print" == "true" ]]; then
    logRepoReport
fi
