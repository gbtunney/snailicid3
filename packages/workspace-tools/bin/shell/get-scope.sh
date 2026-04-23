#!/usr/bin/env bash

# ─────────────────────────────────────────────────────────────
# get-scope.sh
#
# Derives a conventional commit scope string from:
# - nx affected projects
# - scripts/ directory (if any changes live there: committed, staged, unstaged, or untracked)
#
# Usage (standalone):
#   bash scripts/get-scope.sh
#   bash scripts/get-scope.sh --max 3
#
# Usage (sourced):
#   source scripts/get-scope.sh
#   SCOPE=$(get_scope)
#
# Output:
#   Prints the scope string to stdout, e.g:
#     operator-core, operator-ui
#     scripts
#     workspace
# ─────────────────────────────────────────────────────────────

get_scope() {
    local MAX_NAMED=3

    # ── Parse args ──────────────────────────────────────────────
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --max)
                MAX_NAMED="$2"
                shift 2
                ;;
            *)
                echo "Unknown argument: $1" >&2
                return 1
                ;;
        esac
    done

    # ── nx affected projects (Nx decides base/head) ──────────────
    local AFFECTED=""
    AFFECTED="$(pnpm nx show projects --affected 2> /dev/null || true)"

    # ── scripts/ directory changes (include local dirty/untracked) ─
    local SCRIPTS_DIRTY=""
    if (
        git diff --name-only --cached 2> /dev/null
        git diff --name-only 2> /dev/null
        git ls-files --others --exclude-standard 2> /dev/null
    ) | grep -q '^scripts/'; then
        SCRIPTS_DIRTY="scripts"
    fi

    # ── Combine and deduplicate ──────────────────────────────────
    local ALL
    ALL="$(
        printf '%s\n%s\n' "$AFFECTED" "$SCRIPTS_DIRTY" \
            | sed 's/\r$//' \
            | sort -u \
            | grep -v '^$' || true
    )"

    local COUNT
    COUNT="$(printf '%s\n' "$ALL" | grep -c '.' || true)"

    # ── Build scope string ───────────────────────────────────────
    local SCOPE=""
    if [[ "$COUNT" -eq 0 ]]; then
        SCOPE="workspace"
    elif [[ "$COUNT" -le "$MAX_NAMED" ]]; then
        SCOPE="$(printf '%s\n' "$ALL" | paste -sd ',' - | sed 's/,/, /g')"
    else
        SCOPE="workspace"
    fi

    printf '%s\n' "$SCOPE"
}
# ── Run directly if not being sourced ─────────────────────────
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    get_scope "$@"
fi
