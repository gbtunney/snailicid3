#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(pwd)"
source "$(dirname "$0")/sh-logger.sh"

remove_if_exists() {
    local target="$1"

    if [ -e "$target" ]; then
        printf '%bRemoving%b %s\n' "$RED" "$RESET" "$target"
        rm -rf "$target"
    else
        info "not found: $target"
    fi
}

# ============================================================================
# Repo Status Check
# ============================================================================

section "uninstall: start"
if [ ! -d "node_modules" ]; then
    critical "repo not installed"
fi

# ============================================================================
# Reset NX Cache
# ============================================================================

section "reset nx cache"
if command -v nx &> /dev/null; then
    pnpm exec nx reset || warn "nx reset failed"
else
    warn "nx not found"
fi

# ============================================================================
# Clean Build
# ============================================================================

section "clean builds"
if command -v tsc &> /dev/null; then
    pnpm run clean || warn "pnpm clean failed"
else
    warn "tsc not found"
fi

# ============================================================================
# Remove node_modules
# ============================================================================

section "remove node_modules"
MODULE_COUNT=$(find "$ROOT_DIR" -type d -name node_modules 2> /dev/null | wc -l)
if [ "$MODULE_COUNT" -gt 0 ]; then
    find "$ROOT_DIR" -type d -name node_modules -prune -print0 | while IFS= read -r -d '' dir; do
        printf '%bRemoving%b %s\n' "$RED" "$RESET" "$dir"
        rm -rf "$dir"
    done
else
    info "no node_modules found"
fi

# ============================================================================
# Remove Lockfiles
# ============================================================================

section "remove lockfiles"
remove_if_exists "$ROOT_DIR/pnpm-lock.yaml"
remove_if_exists "$ROOT_DIR/package-lock.json"
remove_if_exists "$ROOT_DIR/yarn.lock"

success "done"
