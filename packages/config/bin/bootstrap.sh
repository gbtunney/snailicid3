#!/usr/bin/env bash
# START SH BOOTSTRAP BLOCK
set -euo pipefail

# Variable overview:
# - SCRIPT_DIR: absolute directory containing this script file.
# - PACKAGE_DIR: nearest package directory containing package.json and bin/snail-sh-logger.sh.
# - REPO_DIR: repository root resolved from PACKAGE_DIR via git.
# - LOGGER_PATH: absolute path to bin/snail-sh-logger.sh within PACKAGE_DIR.

# TURN ON DEBUG PATHS WITH: `DEBUG_PATHS=true pnpm run <script>`
DEBUG_PATHS="${DEBUG_PATHS:-false}"
SCRIPT_SOURCE_PATH="${BOOTSTRAP_CALLER_SOURCE:-${BASH_SOURCE[1]:-${BASH_SOURCE[0]}}}"
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$SCRIPT_SOURCE_PATH")" && pwd)"

resolve_package_dir() {
    local current_dir="${1:-$SCRIPT_DIR}"

    while [[ "$current_dir" != "/" ]]; do
        if [[ -f "$current_dir/package.json" && -f "$current_dir/bin/snail-sh-logger.sh" ]]; then
            printf '%s\n' "$current_dir"
            return 0
        fi

        current_dir="$(dirname "$current_dir")"
    done

    return 1
}

PACKAGE_DIR="$(resolve_package_dir "$SCRIPT_DIR" || true)"
[[ -n "$PACKAGE_DIR" ]] || {
    printf '\n\033[41m[CRITICAL] unable to determine package root!\033[0m\n' >&2
    printf '\033[90m%s\033[0m\n' "script dir: $SCRIPT_DIR" >&2
    exit 1
}

REPO_DIR="$(git -C "$PACKAGE_DIR" rev-parse --show-toplevel 2> /dev/null || pwd)"
LOGGER_PATH="$PACKAGE_DIR/bin/snail-sh-logger.sh"

if [[ "$DEBUG_PATHS" == "true" || "$DEBUG_PATHS" == "1" ]]; then
    printf 'SCRIPT_DIR=%s\n' "$SCRIPT_DIR"
    printf 'PACKAGE_DIR=%s\n' "$PACKAGE_DIR"
    printf 'REPO_DIR=%s\n' "$REPO_DIR"
    printf 'LOGGER_PATH=%s\n' "$LOGGER_PATH"
fi

[[ -f "$LOGGER_PATH" ]] || {
    printf '\n\033[41m[CRITICAL] snail-sh logger not found!\033[0m\n' >&2
    printf '\033[90m%s\033[0m\n' "missing file: $LOGGER_PATH" >&2
    exit 1
}
# shellcheck source=/dev/null
. "$LOGGER_PATH"
# END SH BOOTSTRAP BLOCK
