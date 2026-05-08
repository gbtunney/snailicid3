#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2> /dev/null || pwd)"
LOGGER_PATH="$SCRIPT_DIR/snail-sh-logger.sh"

# shellcheck source=/dev/null
. "$LOGGER_PATH"

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
        find "$ROOT_DIR" \
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

    find "$ROOT_DIR" \
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
kv_pair "root" "$ROOT_DIR"

section "preflight"

if [[ ! -d "$ROOT_DIR/node_modules" ]]; then
    critical "repo does not appear to be installed"
    info "continuing anyway"
else
    success "node_modules found"
fi

section "reset nx cache"

if command -v pnpm > /dev/null 2>&1; then
    pnpm exec nx reset || warn "nx reset failed"
else
    warn "pnpm not found; skipping nx reset"
fi

section "clean builds"

if [[ -f "$ROOT_DIR/package.json" ]] && command -v pnpm > /dev/null 2>&1; then
    (
        cd "$ROOT_DIR"
        pnpm run clean || warn "pnpm clean failed"
    )
else
    skipped "package clean"
fi

section "remove node_modules"
remove_node_modules

section "remove lockfiles"
remove_if_exists "$ROOT_DIR/pnpm-lock.yaml"
remove_if_exists "$ROOT_DIR/package-lock.json"
remove_if_exists "$ROOT_DIR/yarn.lock"

section "done"
success "uninstall cleanup complete"
