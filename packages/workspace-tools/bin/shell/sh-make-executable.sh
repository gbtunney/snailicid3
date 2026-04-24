#!/usr/bin/env bash
# Makes a shell script executable (chmod +x).
# Usage: bash scripts/lib/sh-make-executable.sh <path/to/script.sh|path/to/directory|glob> [...]
set -euo pipefail

print_usage() {
    cat << 'EOF'
Usage:
  ./scripts/lib/sh-make-executable.sh <path/to/script.sh|path/to/directory|glob> [...]

Examples:
  ./scripts/lib/sh-make-executable.sh ./scripts/lib
  ./scripts/lib/sh-make-executable.sh ./scripts/lib/shell-utilities.ts
  ./scripts/lib/sh-make-executable.sh './scripts/lib/*.sh'
  ./scripts/lib/sh-make-executable.sh ./scripts/lib './scripts/lib/*.sh'

Notes:
  Quote glob patterns so this script can expand them consistently.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    print_usage
    exit 0
fi

if [[ $# -eq 0 ]]; then
    echo "Error: no target specified." >&2
    print_usage >&2
    exit 1
fi

changed_count=0
had_error=0

make_executable() {
    local file_path="$1"

    if [[ ! -f "$file_path" ]]; then
        return 0
    fi

    ls -l "$file_path"
    chmod +x "$file_path"
    ls -l "$file_path"
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

        while IFS= read -r script_path; do
            matched_files=1
            make_executable "$script_path"
        done < <(find "$target" -maxdepth 1 -type f -name '*.sh' | sort)

        if [[ "$matched_files" -eq 0 ]]; then
            echo "No .sh files found in directory: $target" >&2
            print_usage >&2
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
            echo "No files matched glob: $target" >&2
            print_usage >&2
            had_error=1
            return 0
        fi

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

    echo "Error: target not found or unsupported type: $target" >&2
    print_usage >&2
    had_error=1
}

for target in "$@"; do
    handle_target "$target"
done

if [[ "$had_error" -eq 1 ]]; then
    exit 1
fi

if [[ "$changed_count" -eq 0 ]]; then
    echo "No files were changed."
fi

exit 0
