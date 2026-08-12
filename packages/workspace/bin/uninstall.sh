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

remove_if_exists() {
    local target="$1"

    if [[ -e "$target" ]]; then
        warn "removing: $target"
        rm -rf -- "$target"
        success "removed: $target"
        return
    fi

    skipped "$target"
}

run_if_available() {
    local command_name="$1"
    local label="$2"
    shift 2

    if command -v "$command_name" > /dev/null 2>&1; then
        step "$label"
        "$@" || warn "$label failed"
        return
    fi

    skipped "$command_name not found"
}

remove_node_modules() {
    local count

    count="$(
        find "$REPO_DIR" \
            -type d \
            -name node_modules \
            -prune \
            2> /dev/null \
            | wc -l \
            | tr -d '[:space:]'
    )"

    if [[ "$count" == "0" ]]; then
        info "no node_modules found"
        return
    fi

    kv_pair "node_modules dirs" "$count"

    find "$REPO_DIR" \
        -type d \
        -name node_modules \
        -prune \
        -print0 \
        2> /dev/null \
        | while IFS= read -r -d '' dir; do
            remove_if_exists "$dir"
        done
}

header "Snailicid3 uninstall"
kv_pair "root" "$REPO_DIR"

section "preflight"

if [[ ! -d "$REPO_DIR/node_modules" ]]; then
    critical "repo does not appear to be installed :("
    info "continuing anyway"
else
    success "repository installation found!"
fi

section "clean builds"

if [[ -f "$REPO_DIR/package.json" ]] && command -v pnpm > /dev/null 2>&1; then
    (
        cd "$REPO_DIR"
        pnpm run clean || warn "pnpm clean failed"
    )
else
    skipped "package clean"
fi

section "reset nx cache"

if command -v pnpm > /dev/null 2>&1; then
    pnpm exec nx reset || warn "nx reset failed"
else
    warn "pnpm not found; skipping nx reset"
fi

section "remove node_modules"
remove_node_modules

section "remove lockfiles"
remove_if_exists "$REPO_DIR/pnpm-lock.yaml"
remove_if_exists "$REPO_DIR/package-lock.json"
remove_if_exists "$REPO_DIR/yarn.lock"

section "done"
success "uninstall cleanup complete"
