#!/usr/bin/env bash

# ─────────────────────────────────────────────────────────────
# Maps changed files to commit scopes based on the nearest workspace
# package.json name. GitHub workflow/action files map to `action`.
# Repo-level files fall back to `root`.
#
# Usage (standalone):
#  pnpm exec scope-commit
#  pnpm exec scope-commit --all
#  pnpm exec scope-commit --list
#  pnpm exec scope-commit --csv --keep-prefix
#  pnpm exec scope-commit --message chore autofix
#  pnpm exec scope-commit --commit --dry-run chore autofix
#  pnpm exec scope-commit --commit chore autofix
#  pnpm exec scope-commit path/to/file.ts
#
# Usage (sourced):
#   source packages/config/bin/scope/commit.sh
#   SCOPE="$(get_commit_scope --staged)"
#
# Output:
#   Prints a comma-separated scope list to stdout, e.g:
#     action
#     workspace-tools
#     config, workspace-tools
#     root
# ─────────────────────────────────────────────────────────────

get_commit_scope() {
    local mode="staged"
    local output_mode="scope"
    local scope_format="csv"
    local keep_prefix="false"
    local dry_run="false"
    local commit_type=""
    local commit_subject=""
    local repo_root=""
    local -a input_paths=()
    local -a positionals=()
    local -a allowed_commit_types=()

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
            --dry-run | --dry | -n)
                dry_run="true"
                shift
                ;;
            --message | --m)
                output_mode="message"
                shift
                ;;
            --commit | --c)
                output_mode="commit"
                shift
                ;;
            --help | -h)
                cat << 'EOF'
Usage:
  pnpm exec scope-commit [--staged|--all] [--csv|--list] [--keep-prefix] [file ...]
  pnpm exec scope-commit --message <type> <subject> [--staged|--all] [--keep-prefix] [file ...]
  pnpm exec scope-commit --commit <type> <subject> [--staged|--all] [--keep-prefix] [--dry-run] [file ...]

Examples:
  pnpm exec scope-commit
  pnpm exec scope-commit --all
  pnpm exec scope-commit --list
  pnpm exec scope-commit --csv --keep-prefix
  pnpm exec scope-commit --message chore autofix
  pnpm exec scope-commit --commit --dry-run chore autofix
  pnpm exec scope-commit --commit chore autofix
  pnpm exec scope-commit .github/workflows/pipeline.yml
EOF
                return 0
                ;;
            --*)
                echo "Unknown argument: $1" >&2
                return 1
                ;;
            *)
                positionals+=("$1")
                shift
                ;;
        esac
    done

    if [[ "$output_mode" == "message" || "$output_mode" == "commit" ]]; then
        if [[ "${#positionals[@]}" -lt 2 ]]; then
            echo "Error: --$output_mode requires <type> and <subject>." >&2
            return 1
        fi

        commit_type="${positionals[0]}"
        commit_subject="${positionals[1]}"

        if [[ "${#positionals[@]}" -gt 2 ]]; then
            input_paths=("${positionals[@]:2}")
        fi
    else
        input_paths=("${positionals[@]}")
    fi

    load_commit_types() {
        local output=""

        output="$(
            pnpm exec node --input-type=module -e "
                import config_conventional from '@commitlint/config-conventional';
                const commitTypes = Object.keys(config_conventional.prompt.questions.type.enum || {});
                process.stdout.write(commitTypes.join('\n'));
            " 2> /dev/null || true
        )"

        if [[ -z "$output" ]]; then
            return 1
        fi

        mapfile -t allowed_commit_types < <(printf '%s\n' "$output" | sed '/^$/d')
        [[ "${#allowed_commit_types[@]}" -gt 0 ]]
    }

    validate_commit_type() {
        local requested_type="$1"
        local allowed_type=""

        load_commit_types || {
            echo "Error: unable to load commitlint commit types for validation." >&2
            return 1
        }

        for allowed_type in "${allowed_commit_types[@]}"; do
            if [[ "$allowed_type" == "$requested_type" ]]; then
                return 0
            fi
        done

        {
            echo "Error: invalid commit type '$requested_type'."
            echo "Allowed types: $(printf '%s' "${allowed_commit_types[0]}")$(printf ', %s' "${allowed_commit_types[@]:1}")"
        } >&2
        return 1
    }

    if [[ "$output_mode" == "message" || "$output_mode" == "commit" ]]; then
        validate_commit_type "$commit_type" || return 1
    fi

    repo_root="$(git rev-parse --show-toplevel 2> /dev/null || pwd)"

    read_package_name() {
        local package_json="$1"
        sed -n 's/^[[:space:]]*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$package_json" \
            | head -n 1
    }

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

        if [[ "$rel_path" == .github/workflows/* || "$rel_path" == .github/actions/* || "$rel_path" == .github/scripts/* ]]; then
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
    local inline_result=""

    format_inline_scopes() {
        local -a values=("$@")

        if [[ "${#values[@]}" -eq 0 ]]; then
            printf '%s\n' "root"
            return 0
        fi

        printf '%s\n' "${values[@]}" | paste -sd ',' - | sed 's/,/, /g'
    }

    format_scope_output() {
        local -a values=("$@")

        if [[ "${#values[@]}" -eq 0 ]]; then
            values=("root")
        fi

        case "$scope_format" in
            list)
                printf '%s\n' "${values[@]}"
                ;;
            *)
                format_inline_scopes "${values[@]}"
                ;;
        esac
    }

    if [[ "${#input_paths[@]}" -gt 0 ]]; then
        paths=("${input_paths[@]}")
    else
        mapfile -t paths < <(collect_changed_paths)
    fi

    if [[ "${#paths[@]}" -eq 0 ]]; then
        inline_result="root"
        case "$output_mode" in
            message)
                printf '%s(%s): %s\n' "$commit_type" "$inline_result" "$commit_subject"
                return 0
                ;;
            commit)
                if [[ "$dry_run" == "true" ]]; then
                    printf '%s(%s): %s\n' "$commit_type" "$inline_result" "$commit_subject"
                    return 0
                fi
                git commit -m "$(printf '%s(%s): %s' "$commit_type" "$inline_result" "$commit_subject")"
                return 0
                ;;
            *)
                format_scope_output "root"
                return 0
                ;;
        esac
    fi

    while IFS= read -r scope; do
        [[ -n "$scope" ]] || continue
        scopes+=("$scope")
    done < <(
        for path in "${paths[@]}"; do
            scope_for_path "$path"
        done | sort -u
    )

    inline_result="$(format_inline_scopes "${scopes[@]}")"

    case "$output_mode" in
        message)
            printf '%s(%s): %s\n' "$commit_type" "$inline_result" "$commit_subject"
            ;;
        commit)
            if [[ "$dry_run" == "true" ]]; then
                printf '%s(%s): %s\n' "$commit_type" "$inline_result" "$commit_subject"
                return 0
            fi
            git commit -m "$(printf '%s(%s): %s' "$commit_type" "$inline_result" "$commit_subject")"
            ;;
        *)
            format_scope_output "${scopes[@]}"
            ;;
    esac
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    get_commit_scope "$@"
fi
