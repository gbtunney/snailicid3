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

exec node "$PACKAGE_DIR/dist/scope/affected.js" "$@"
