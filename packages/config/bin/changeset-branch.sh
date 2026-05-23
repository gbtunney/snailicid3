#!/usr/bin/env bash
set -euo pipefail

detect_default_branch() {
    # Prefer origin/HEAD if available
    git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2> /dev/null \
        | sed 's#^origin/##' \
        || true
}

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2> /dev/null || pwd)"
LOGGER_PATH="$SCRIPT_DIR/snail-sh-logger.sh"

PREFIX="${PREFIX_OVERRIDE:-${PREFIX:-changeset}}"
ALLOW_DIRTY="${ALLOW_DIRTY:-false}"
cd "$ROOT_DIR"

[[ -f "$LOGGER_PATH" ]] || {
    printf 'Error: logger not found: %s\n' "$LOGGER_PATH" >&2
    exit 1
}

# shellcheck source=/dev/null
. "$LOGGER_PATH"

die() {
    critical "$@"
    spacer 2
    exit 1
}

spacer 1
line "-" "50%" cyan
spacer 1
current_branch="$(git branch --show-current || true)"
[[ -n "$current_branch" ]] || die "detached HEAD; cannot proceed."

if [[ -z "${BASE_BRANCH:-}" ]]; then
    BASE_BRANCH="$(detect_default_branch)"
    BASE_BRANCH="${BASE_BRANCH:-main}"
fi

[[ "$current_branch" == "$BASE_BRANCH" ]] || die "run from $BASE_BRANCH (git switch $BASE_BRANCH)."

working_tree_status="clean"
if [[ -n "$(git status --porcelain)" ]]; then
    working_tree_status="dirty"
    err "Working tree is dirty:"
    git status --short

    if [[ "$ALLOW_DIRTY" == "true" || "$ALLOW_DIRTY" == "1" ]]; then
        warn "ALLOW_DIRTY=$ALLOW_DIRTY; continuing anyway."
    else
        die "commit/stash changes first. Set ALLOW_DIRTY=true to override."
    fi
fi

if [[ "$working_tree_status" == "clean" ]]; then
    success "On $BASE_BRANCH with clean working tree."
else
    warn "On $BASE_BRANCH with dirty working tree."
fi

info "...Fetching origin/$BASE_BRANCH..."
spacer 1

git fetch origin "$BASE_BRANCH" --prune
local_main="$(git rev-parse "$BASE_BRANCH")"
remote_main="$(git rev-parse "origin/$BASE_BRANCH")"
[[ "$local_main" == "$remote_main" ]] || die "$BASE_BRANCH not up to date (run: git pull --ff-only)."

# Snapshot existing changeset files
before="$(mktemp)"
after="$(mktemp)"
trap 'rm -f "$before" "$after"' EXIT
find .changeset -maxdepth 1 -type f -name '*.md' -print | sort > "$before"
spacer 1
section "Launching Changesets CLI..."
spacer 1
pnpm changeset add

# Find the new file
find .changeset -maxdepth 1 -type f -name '*.md' -print | sort > "$after"
new_file="$(comm -13 "$before" "$after" | head -n 1 || true)"
new_count="$(comm -13 "$before" "$after" | wc -l | tr -d ' ')"

[[ "$new_count" == "1" && -n "$new_file" ]] || {
    success "New changeset files detected:"
    comm -13 "$before" "$after" || true
    die "expected exactly 1 new changeset file, found $new_count."
}

slug="$(basename "$new_file" .md)"
branch="${PREFIX}/${slug}"
scope="$(pnpm exec scope-affected --changeset-only "$new_file")"

kv_pair "New changeset" "$new_file"
kv_pair "Commit scope" "$scope"
kv_pair "Proposed branch" "$branch"

git show-ref --verify --quiet "refs/heads/$branch" && die "local branch exists: $branch"
git ls-remote --exit-code --heads origin "$branch" > /dev/null 2>&1 && die "remote branch exists: $branch"

kabob "Creating branch..."
spacer 1
git switch -c "$branch"

log "Committing changeset..."
spacer 1
git add "$new_file"
pnpm exec scope-commit --checked-commit chore "$slug" --scope "$scope"

success "Done."
kv_pair "Branch" "$branch"
kv_pair "Next" "git push -u origin $branch"
