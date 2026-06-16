#!/usr/bin/env bash
set -euo pipefail

# START SH BOOTSTRAP LOADER
SCRIPT_SOURCE_PATH="${BASH_SOURCE[0]}"
LOADER_DIR="$(CDPATH= cd -- "$(dirname -- "$SCRIPT_SOURCE_PATH")" && pwd)"

resolve_bootstrap_path() {
    local current_dir="${1:-$LOADER_DIR}"

    while [[ "$current_dir" != "/" ]]; do
        if [[ -f "$current_dir/bin/bootstrap.sh" ]]; then
            printf '%s\n' "$current_dir/bin/bootstrap.sh"
            return 0
        fi

        current_dir="$(dirname "$current_dir")"
    done

    return 1
}

BOOTSTRAP_PATH="$(resolve_bootstrap_path "$LOADER_DIR" || true)"
[[ -n "$BOOTSTRAP_PATH" ]] || {
    printf '\n\033[41m[CRITICAL] unable to locate bootstrap.sh!\033[0m\n' >&2
    printf '\033[90m%s\033[0m\n' "loader dir: $LOADER_DIR" >&2
    exit 1
}

BOOTSTRAP_CALLER_SOURCE="$SCRIPT_SOURCE_PATH"
# shellcheck source=/dev/null
. "$BOOTSTRAP_PATH"
unset BOOTSTRAP_CALLER_SOURCE
# END SH BOOTSTRAP LOADER
PREFIX="${PREFIX_OVERRIDE:-${PREFIX:-changeset}}"
ALLOW_DIRTY="${ALLOW_DIRTY:-false}"

detect_default_branch() {
    # Prefer origin/HEAD if available
    git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2> /dev/null \
        | sed 's#^origin/##' \
        || true
}

cd "$REPO_DIR"
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
pnpm exec scope-commit --checked-commit changeset "$slug" --scope "$scope"

success "Done."
kv_pair "Branch" "$branch"
kv_pair "Next" "git push -u origin $branch"
