#!/usr/bin/env bash

# ─────────────────────────────────────────────────────────────
# get-commit-scope.sh
#
# Maps changed files to commit scopes based on the nearest workspace
# package.json name. GitHub workflow/action files map to `action`.
# Repo-level files fall back to `root`.
#
# Usage (standalone):
#  pnpm exec scope-commit
#  pnpm exec scope-commit  --all
#  pnpm exec scope-commit  --message chore autofix
#  pnpm exec scope-commit  path/to/file.ts
#
# Usage (sourced):
#   source packages/workspace-tools/bin/shell/get-commit-scope.sh
#   SCOPE="$(get_commit_scope --staged)"
#
# Output:
#   Prints a comma-separated scope list to stdout, e.g:
#     action
#     workspace-tools
#     config, workspace-tools
#     root
# ─────────────────────────────────────────────────────────────

# Needs function callable like    Pnpm exec scope-commit <type> <subject>
# ^ mode for that
# ^ commit mode type(scope): subject - ideally it should throw if not a type from the commitlint type list
#- Csv mode
# - List mode ( maybe option to colorize w logger sh functions?
# So then I can call it like I do pnpm commit:sh <type> <subject>
# this currently works.

# TODO this needs to have flag to get scope from staged files
get_commit_scope() {
    local mode="staged"
    local output_mode="scope"
    local commit_type=""
    local commit_subject=""
    local repo_root=""
    local -a input_paths=()

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --staged | --cached)
                mode="staged"
                shift
                ;;
            --all)
                mode="all"
                shift
                ;;
            --message | --m)
                output_mode="message"
                if [[ $# -lt 3 ]]; then
                    echo "Error: --message requires <type> and <subject>." >&2
                    return 1
                fi
                commit_type="$2"
                commit_subject="$3"
                shift 3
                ;;
            --help | -h)
                cat << 'EOF'
Usage:
  pnpm exec scope-commit [--staged|--all] [file ...]
 pnpm exec scope-commit  --message <type> <subject> [--staged|--all] [file ...]

Examples:
 pnpm exec scope-commit 
 pnpm exec scope-commit  --all
 pnpm exec scope-commit  --message chore autofix
 pnpm exec scope-commit  packages/workspace-tools/bin/shell/get-affected-scope.sh
EOF
                return 0
                ;;
            --*)
                echo "Unknown argument: $1" >&2
                return 1
                ;;
            *)
                input_paths+=("$1")
                shift
                ;;
        esac
    done

    repo_root="$(git rev-parse --show-toplevel 2> /dev/null || pwd)"

    read_package_name() {
        local package_json="$1"
        sed -n 's/^[[:space:]]*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$package_json" \
            | head -n 1
    }

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

    normalize_repo_path() {
        local path="$1"

        if [[ -z "$path" ]]; then
            return 1
        fi

        path="${path#./}"

        case "$path" in
            "$repo_root"/*)
                printf '%s\n' "${path#"$repo_root"/}"
                ;;
            *)
                printf '%s\n' "$path"
                ;;
        esac
    }

    scope_for_path() {
        local raw_path="$1"
        local rel_path=""
        local search_dir=""
        local candidate=""
        local package_name=""

        rel_path="$(normalize_repo_path "$raw_path")" || return 1

        if [[ "$rel_path" == .github/workflows/* || "$rel_path" == .github/actions/* ]]; then
            printf '%s\n' "actions"
            return 0
        fi

        if [[ "$rel_path" == notes/* ]]; then
            printf '%s\n' "notes"
            return 0
        fi

        if [[ -d "$repo_root/$rel_path" ]]; then
            search_dir="$repo_root/$rel_path"
        else
            search_dir="$(dirname "$rel_path")"
            if [[ "$search_dir" == "." ]]; then
                search_dir="$repo_root"
            else
                search_dir="$repo_root/$search_dir"
            fi
        fi

        while [[ "$search_dir" == "$repo_root"* ]]; do
            candidate="$search_dir/package.json"

            if [[ -f "$candidate" ]]; then
                if [[ "$search_dir" == "$repo_root" ]]; then
                    printf '%s\n' "root"
                    return 0
                fi

                package_name="$(read_package_name "$candidate")"
                if [[ -n "$package_name" ]]; then
                    if [[ "$package_name" == "@snailicid3/root" ]]; then
                        printf '%s\n' "root"
                        return 0
                    fi
                    shorten_scope_name "$package_name"
                    return 0
                fi
            fi

            if [[ "$search_dir" == "$repo_root" ]]; then
                break
            fi

            search_dir="$(dirname "$search_dir")"
        done

        printf '%s\n' "root"
    }

    collect_changed_paths() {
        case "$mode" in
            staged)
                git diff --cached --name-only 2> /dev/null || true
                ;;
            all)
                {
                    git diff --cached --name-only 2> /dev/null
                    git diff --name-only 2> /dev/null
                    git ls-files --others --exclude-standard 2> /dev/null
                } | sed '/^$/d' || true
                ;;
        esac
    }

    local -a paths=()
    local -a scopes=()
    local path=""
    local scope=""
    local result=""

    if [[ "${#input_paths[@]}" -gt 0 ]]; then
        paths=("${input_paths[@]}")
    else
        mapfile -t paths < <(collect_changed_paths)
    fi

    if [[ "${#paths[@]}" -eq 0 ]]; then
        printf '%s\n' "root"
        return 0
    fi

    while IFS= read -r scope; do
        [[ -n "$scope" ]] || continue
        scopes+=("$scope")
    done < <(
        for path in "${paths[@]}"; do
            scope_for_path "$path"
        done | sort -u
    )

    if [[ "${#scopes[@]}" -eq 0 ]]; then
        result="root"
    else
        result="$(printf '%s\n' "${scopes[@]}" | paste -sd ',' - | sed 's/,/, /g')"
    fi

    if [[ "$output_mode" == "message" ]]; then
        printf '%s(%s): %s\n' "$commit_type" "$result" "$commit_subject"
        return 0
    fi

    printf '%s\n' "$result"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    get_commit_scope "$@"
fi
