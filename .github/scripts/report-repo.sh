#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$(git rev-parse --show-toplevel 2> /dev/null || pwd)}"
timestamp="$(date -u '+%Y-%m-%d %H:%M:%S UTC')"

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

snail_sh section "Repository"

if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    snail_sh status_pair "git" "not a repository" "error"
    exit 0
fi

branch="$(git_output branch --show-current)"
origin="$(git_output remote get-url origin)"
staged="$(git_output diff --cached --name-only)"
unstaged="$(git_output diff --name-only)"
untracked="$(git_output ls-files --others --exclude-standard)"
tracked="$(git_output ls-files)"

if git diff --quiet && git diff --cached --quiet; then
    repo_status="clean"
else
    repo_status="dirty"
fi

snail_sh kv_pair "branch" "${branch:-detached}"
snail_sh kv_pair "origin" "${origin:-none}"
snail_sh kv_pair "timestamp" "$timestamp"
snail_sh status_pair "repo status" "$repo_status"
snail_sh kv_pair "total tracked files" "$(printf '%s\n' "$tracked" | grep -c '.' || true)"
snail_sh kv_pair "staged files" "$(printf '%s\n' "$staged" | grep -c '.' || true)"
snail_sh kv_pair "unstaged files" "$(printf '%s\n' "$unstaged" | grep -c '.' || true)"
snail_sh kv_pair "untracked files" "$(printf '%s\n' "$untracked" | grep -c '.' || true)"

upstream="$(git_output rev-parse --abbrev-ref --symbolic-full-name '@{u}')"
if [[ -n "$upstream" ]]; then
    ahead_behind="$(git_output rev-list --left-right --count "$upstream...HEAD")"
    read -r behind ahead <<< "${ahead_behind:-? ?}"
    snail_sh kv_pair "upstream" "$upstream"
    snail_sh kv_pair "ahead" "${ahead:-?}"
    snail_sh kv_pair "behind" "${behind:-?}"
else
    snail_sh kv_pair "upstream" "not set"
fi

last_commit="$(git_output log -1 --pretty=format:'%h %ad %s' --date=iso)"
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
