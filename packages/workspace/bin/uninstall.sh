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

COMMAND_NAME="${COMMAND_NAME:-gbt-uninstall}"
REPO_DIR="${GBT_UNINSTALL_TEST_REPO_DIR:-$REPO_DIR}"
REPAIR_LOCKFILE="false"
RESET_LOCKFILE="false"

usage() {
    log "Remove generated builds, dependency installs, and caches from a repository." "grey"
    spacer 1
    log "Usage: $COMMAND_NAME [--repair-lockfile | --reset-lockfile]" "white"
    spacer 1
    log "  (default)           remove node_modules and caches; keep pnpm-lock.yaml so the" "grey"
    log "                      next install restores the locked dependency graph" "grey"
    log "  --repair-lockfile   reconcile pnpm-lock.yaml with the current manifests without" "grey"
    log "                      deleting it first" "grey"
    log "  --reset-lockfile    delete pnpm-lock.yaml so the next install resolves a new" "grey"
    log "                      dependency graph" "grey"
}

while [[ "$#" -gt 0 ]]; do
    case "$1" in
        -h | --help)
            usage
            exit 0
            ;;
        --repair-lockfile)
            REPAIR_LOCKFILE="true"
            ;;
        --reset-lockfile)
            RESET_LOCKFILE="true"
            ;;
        *)
            err "unknown option: $1"
            spacer 1
            usage
            exit 1
            ;;
    esac

    shift
done

if [[ "$REPAIR_LOCKFILE" == "true" && "$RESET_LOCKFILE" == "true" ]]; then
    die "--repair-lockfile and --reset-lockfile cannot be combined"
fi

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

section "lockfile"

if [[ "$RESET_LOCKFILE" == "true" ]]; then
    warn "resetting pnpm-lock.yaml; the next install resolves a new dependency graph"
    remove_if_exists "$REPO_DIR/pnpm-lock.yaml"
elif [[ -f "$REPO_DIR/pnpm-lock.yaml" ]]; then
    success "preserved: $REPO_DIR/pnpm-lock.yaml"
else
    info "no pnpm-lock.yaml found"
fi

remove_if_exists "$REPO_DIR/package-lock.json"
remove_if_exists "$REPO_DIR/yarn.lock"

if [[ "$REPAIR_LOCKFILE" == "true" ]]; then
    section "repair lockfile"

    if command -v pnpm > /dev/null 2>&1; then
        step "reconciling pnpm-lock.yaml with current manifests"
        (
            cd "$REPO_DIR"
            pnpm install --lockfile-only || warn "lockfile repair failed"
        )
    else
        warn "pnpm not found; skipping lockfile repair"
    fi
fi

section "done"
success "uninstall cleanup complete"
