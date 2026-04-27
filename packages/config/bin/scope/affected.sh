#!/usr/bin/env bash

# ─────────────────────────────────────────────────────────────
# get-affected-scope.sh
#
# Derives a conventional commit scope string from:
# - nx affected projects
# - scripts/ directory (if any changes live there: committed, staged, unstaged, or untracked)
#
# Usage (standalone):
#   bash packages/workspace-tools/bin/shell/get-affected-scope.sh
#
# Usage (sourced):
#   source packages/workspace-tools/bin/shell/get-affected-scope.sh
#   SCOPE=$(get_affected_scope)
#
# Output:
#   Prints the scope string to stdout, e.g:
#     workspace-tools, playground
#     scripts
#     workspace
# ─────────────────────────────────────────────────────────────

get_affected_scope() {
    shorten_scope_name() {
        local scope_name="$1"

        case "$scope_name" in
            @snailicid3/*)
                printf '%s\n' "${scope_name#@snailicid3/}"
                ;;
            *)
                printf '%s\n' "$scope_name"
                ;;
        esac
    }

    # ── Parse args ──────────────────────────────────────────────
    if [[ $# -gt 0 ]]; then
        echo "Unknown argument: $1" >&2
        return 1
    fi

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
            | while IFS= read -r scope_name; do
                [[ -n "$scope_name" ]] || continue
                shorten_scope_name "$scope_name"
            done \
            | sort -u \
            | grep -v '^$' || true
    )"

    # ── Build scope string ───────────────────────────────────────
    local SCOPE=""
    if [[ -z "$ALL" ]]; then
        SCOPE="workspace"
    else
        SCOPE="$(printf '%s\n' "$ALL" | paste -sd ',' - | sed 's/,/, /g')"
    fi

    printf '%s\n' "$SCOPE"
}
# ── Run directly if not being sourced ─────────────────────────
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    get_affected_scope "$@"
fi
