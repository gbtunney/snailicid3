#!/usr/bin/env bash

# ─────────────────────────────────────────────────────────────
# Derives a conventional commit scope string from:
# - nx affected projects
# - repo-level dirty paths that should map to scopes even outside Nx
#
# Usage (standalone):
#   pnpm exec scope-affected
#   pnpm exec scope-affected --list
#   pnpm exec scope-affected --since v1.0.0
#   pnpm exec scope-affected --keep-prefix --base v1.0.0 --head HEAD
#   pnpm exec scope-affected --nx-only --base main
#
# Usage (sourced):
#   source packages/config/bin/scope/affected.sh
#   SCOPE=$(get_affected_scope)
#
# Output:
#   Prints the scope string to stdout, e.g:
#     workspace-tools, playground
#     scripts
#     workspace
# ─────────────────────────────────────────────────────────────

get_affected_scope() {
    local scope_format="csv"
    local keep_prefix="false"
    local include_repo_scopes="true"
    local nx_base="main"
    local nx_head=""

    shorten_scope_name() {
        local scope_name="$1"

        if [[ "$keep_prefix" == "true" ]]; then
            printf '%s\n' "$scope_name"
            return 0
        fi

        case "$scope_name" in
            @snailicid3/*)
                printf '%s\n' "${scope_name#@snailicid3/}"
                ;;
            *)
                printf '%s\n' "$scope_name"
                ;;
        esac
    }

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --csv)
                scope_format="csv"
                shift
                ;;
            --list)
                scope_format="list"
                shift
                ;;
            --keep-prefix | --full-scope)
                keep_prefix="true"
                shift
                ;;
            --nx-only)
                include_repo_scopes="false"
                shift
                ;;
            --include-repo-scopes)
                include_repo_scopes="true"
                shift
                ;;
            --base | --since)
                if [[ $# -lt 2 ]]; then
                    echo "Error: $1 requires a ref." >&2
                    return 1
                fi
                nx_base="$2"
                shift 2
                ;;
            --head)
                if [[ $# -lt 2 ]]; then
                    echo "Error: --head requires a ref." >&2
                    return 1
                fi
                nx_head="$2"
                shift 2
                ;;
            --help | -h)
                cat << 'EOF'
Usage:
  pnpm exec scope-affected [--csv|--list] [--keep-prefix] [--nx-only|--include-repo-scopes] [--base <ref>|--since <ref>] [--head <ref>]

Examples:
  pnpm exec scope-affected
  pnpm exec scope-affected --list
  pnpm exec scope-affected --since v1.0.0
  pnpm exec scope-affected --keep-prefix
  pnpm exec scope-affected --nx-only
  pnpm exec scope-affected
  pnpm exec scope-affected --base v1.0.0 --head HEAD
EOF
                return 0
                ;;
            --*)
                echo "Unknown argument: $1" >&2
                return 1
                ;;
            *)
                echo "Unknown argument: $1" >&2
                return 1
                ;;
        esac
    done

    # ── nx affected projects (Nx decides base/head) ──────────────
    local AFFECTED=""
    local -a nx_args=(show projects --affected)

    nx_args+=(--base "$nx_base")

    if [[ -n "$nx_head" ]]; then
        nx_args+=(--head "$nx_head")
    fi

    AFFECTED="$(pnpm nx "${nx_args[@]}" 2> /dev/null || true)"

    # ── extra dirty path scopes (include local dirty/untracked) ─────
    local extra_output=""
    if [[ "$include_repo_scopes" == "true" ]]; then
        local EXTRA_SCOPES=""
        EXTRA_SCOPES="$(
            git diff --name-only --cached 2> /dev/null
            git diff --name-only 2> /dev/null
            git ls-files --others --exclude-standard 2> /dev/null
        )"

        if printf '%s\n' "$EXTRA_SCOPES" | grep -q '^scripts/'; then
            extra_output="${extra_output}scripts"$'\n'
        fi

        if printf '%s\n' "$EXTRA_SCOPES" | grep -Eq '^\.github/(workflows|actions|scripts)/'; then
            extra_output="${extra_output}actions"$'\n'
        fi

        if printf '%s\n' "$EXTRA_SCOPES" | grep -q '^notes/'; then
            extra_output="${extra_output}notes"$'\n'
        fi
    fi

    # ── Combine and deduplicate ──────────────────────────────────
    local ALL
    ALL="$(
        printf '%s\n%s' "$AFFECTED" "$extra_output" \
            | sed 's/\r$//' \
            | while IFS= read -r scope_name; do
                [[ -n "$scope_name" ]] || continue
                shorten_scope_name "$scope_name"
            done \
            | sort -u \
            | grep -v '^$' || true
    )"

    # ── Build scope string ───────────────────────────────────────
    if [[ -z "$ALL" ]]; then
        case "$scope_format" in
            list)
                printf '%s\n' "workspace"
                ;;
            *)
                printf '%s\n' "workspace"
                ;;
        esac
        return 0
    fi

    case "$scope_format" in
        list)
            printf '%s\n' "$ALL"
            ;;
        *)
            printf '%s\n' "$ALL" | paste -sd ',' - | sed 's/,/, /g'
            ;;
    esac
}
# ── Run directly if not being sourced ─────────────────────────
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    get_affected_scope "$@"
fi
