#!/usr/bin/env bash

get_current_branch() {
    git rev-parse --abbrev-ref HEAD
}

get_workflow_environment() {
    pnpm exec snail-package environment "$1"
}

run_package_binary() {
    pnpm exec snail-package exec "$@"
}

check_protected_branch() {
    operation="$1"
    branch="$(get_current_branch)"
    protected_branches="$(get_workflow_environment PROTECTED_BRANCHES)" || return $?

    case ",$protected_branches," in
        *",$branch,"*)
            printf "\nDirect %s on protected branch '%s' is not allowed.\n\n" "$operation" "$branch" >&2
            return 1
            ;;
    esac
}

validate_branch_name() {
    branch="$(get_current_branch)"

    if printf '%s\n' "$branch" | grep -Eq '^[a-zA-Z0-9]+([/-][a-zA-Z0-9]+)*$'; then
        return
    fi

    printf "\nBranch name must be alphanumeric and may contain '/' or '-': %s\n\n" "$branch" >&2
    return 1
}

check_staged_filenames() {
    bad_filename_pattern='[^A-Za-z0-9._/@ +\-]'
    bad_files="$(
        git diff --cached --name-only \
            | LC_ALL=C grep -nE "$bad_filename_pattern" || true
    )"

    if [ -z "$bad_files" ]; then
        return
    fi

    printf '\nBad characters found in staged filenames.\n' >&2
    printf 'Allowed: A-Z a-z 0-9 space . _ - + @ /\n' >&2
    printf 'Rename these files:\n%s\n\n' "$bad_files" >&2
    return 1
}

run_lint_staged_if_needed() {
    skip_lint_staged="$(get_workflow_environment SKIP_LINT_STAGED)" || return $?

    if [ "$skip_lint_staged" = 'true' ]; then
        printf 'lint-staged skipped (SKIP_LINT_STAGED=true).\n'
        return
    fi

    pnpm run lint:staged
}
