#!/usr/bin/env bash
# Makes shell scripts executable.
# Usage: sh-make-executable <path/to/script.sh|path/to/directory|glob> [...]
set -euo pipefail

# START SH BOOTSTRAP LOADER
SCRIPT_SOURCE_PATH="${BASH_SOURCE[0]}"
LOADER_DIR="$(CDPATH= cd -- "$(dirname -- "$SCRIPT_SOURCE_PATH")" && pwd)"
COMMAND_NAME="${COMMAND_NAME:-gbt-exec}"
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

print_usage() {

    log "Make shell scripts executable." "grey"
    spacer 1
    log "$COMMAND_NAME <path/to/script.sh|path/to/directory|glob> [...]" "white"
    spacer 1
    section "examples" "magenta" "-" false 1 true
    kv_pair "directory" "$COMMAND_NAME ./scripts/lib"
    kv_pair "single file" "$COMMAND_NAME ./scripts/lib/sh-make-executable.sh"
    kv_pair "glob" "$COMMAND_NAME './scripts/lib/*.sh'"
    kv_pair "mixed" "$COMMAND_NAME ./scripts/lib './scripts/lib/*.sh'"

    section "notes" "magenta" "-" false 1 true
    log "  Quote glob patterns so this script can expand them consistently." "grey"
    spacer 1
}
spacer 2
section "$COMMAND_NAME"

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    print_usage
    exit 0
fi

if [[ $# -eq 0 ]]; then
    err "no target specified."
    spacer 1
    print_usage >&2
    # exit 1
fi

changed_count=0
had_error=0

make_executable() {
    local file_path="$1"

    if [[ ! -f "$file_path" ]]; then
        return 0
    fi

    step "making executable: $file_path"
    spacer 1
    kv_pair "before" "$(ls -l "$file_path")"
    chmod +x "$file_path"
    kv_pair "after" "$(ls -l "$file_path")"

    changed_count=$((changed_count + 1))
}

handle_target() {
    local target="$1"

    if [[ -f "$target" ]]; then
        make_executable "$target"
        return 0
    fi

    if [[ -d "$target" ]]; then
        local matched_files=0
        section "directory"
        kv_pair "target" "$target"

        while IFS= read -r script_path; do
            matched_files=1
            make_executable "$script_path"
        done < <(find "$target" -maxdepth 1 -type f -name '*.sh' | sort)

        if [[ "$matched_files" -eq 0 ]]; then
            warn "no .sh files found in directory: $target"
            had_error=1
        fi

        return 0
    fi

    local has_glob=0
    if [[ "$target" == *"*"* || "$target" == *"?"* || "$target" == *"["* ]]; then
        has_glob=1
    fi

    if [[ "$has_glob" -eq 1 ]]; then
        mapfile -t expanded_paths < <(compgen -G "$target" || true)

        if [[ "${#expanded_paths[@]}" -eq 0 ]]; then
            warn "no files matched glob: $target"
            had_error=1
            return 0
        fi

        section "glob"
        kv_pair "target" "$target"
        kv_pair "matches" "${#expanded_paths[@]}"

        local expanded_path
        for expanded_path in "${expanded_paths[@]}"; do
            if [[ -f "$expanded_path" ]]; then
                make_executable "$expanded_path"
            elif [[ -d "$expanded_path" ]]; then
                handle_target "$expanded_path"
            fi
        done

        return 0
    fi

    warn "target not found or unsupported type: $target"
    had_error=1
}

for target in "$@"; do
    handle_target "$target"
done

section "summary"
kv_pair "changed" "$changed_count"
spacer 1
if [[ "$had_error" -eq 1 ]]; then
    critical "completed with errors"
    exit 1
fi

if [[ "$changed_count" -eq 0 ]]; then
    skipped "no files were changed"
else
    success "updated executable permissions"
fi
spacer 2

exit
