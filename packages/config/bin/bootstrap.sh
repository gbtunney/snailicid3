#!/usr/bin/env bash
# START SH BOOTSTRAP BLOCK
set -euo pipefail

# Variable overview:
# - SCRIPT_DIR: absolute directory containing this script file.
# - PACKAGE_DIR: nearest package directory containing package.json and bin/snail-sh-logger.sh.
# - REPO_DIR: repository root resolved from PACKAGE_DIR via git.
# - LOGGER_PATH: absolute path to bin/snail-sh-logger.sh within PACKAGE_DIR.
# - Test shell with `echo "SHELL=$SHELL  argv0=$0  pid=$$  proc=$(ps -p $$ -o comm=)" && DEBUG_PATHS=true <script> && echo "SHELL=$SHELL  argv0=$0  pid=$$  proc=$(ps -p $$ -o comm=)" `
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

[[ -f "$LOGGER_PATH" ]] || {
    printf '\n\033[41m[CRITICAL] snail-sh logger not found!\033[0m\n' >&2
    printf '\033[90m%s\033[0m\n' "missing file: $LOGGER_PATH" >&2
    exit 1
}
# shellcheck source=/dev/null
. "$LOGGER_PATH"

debug_paths_enabled() {
    [[ "$DEBUG_PATHS" == "true" || "$DEBUG_PATHS" == "1" ]]
}

if debug_paths_enabled; then
    printf 'SCRIPT_DIR=%s\n' "$SCRIPT_DIR"
    printf 'PACKAGE_DIR=%s\n' "$PACKAGE_DIR"
    printf 'REPO_DIR=%s\n' "$REPO_DIR"
    printf 'LOGGER_PATH=%s\n' "$LOGGER_PATH"

    # Debugging: Log the current shell
    kv_pair "Current shell" "$SHELL"

    kv_pair "ZSH_VERSION: ${ZSH_VERSION:-not set}"
    kv_pair "BASH_VERSION: ${BASH_VERSION:-not set}"

fi

resolve_preferred_shell() {
    local preferred_shell="${SHELL:-}"
    local process_id="$$"
    local parent_process_id
    local process_name
    local process_base_name
    local detected_shell=""

    while [[ -n "$process_id" && "$process_id" != "1" ]]; do
        parent_process_id="$(ps -p "$process_id" -o ppid= 2> /dev/null | tr -d ' ' || true)"
        [[ -n "$parent_process_id" ]] || break

        process_name="$(ps -p "$parent_process_id" -o comm= 2> /dev/null | tr -d ' ' || true)"
        process_base_name="${process_name##*/}"

        case "$process_base_name" in
            zsh | bash)
                detected_shell="$process_base_name"
                break
                ;;
        esac

        process_id="$parent_process_id"
    done

    if [[ -n "$detected_shell" ]]; then
        preferred_shell="$(command -v "$detected_shell" 2> /dev/null || true)"
        if [[ -z "$preferred_shell" ]]; then
            preferred_shell="/bin/$detected_shell"
        fi
    elif [[ -z "$preferred_shell" ]]; then
        preferred_shell="$(getent passwd "$USER" 2> /dev/null | cut -d: -f7 || true)"
    fi

    printf '%s\n' "$preferred_shell"
}

reload_preferred_shell() {
    local preferred_shell
    local tty_stdin="false"
    local tty_stdout="false"

    preferred_shell="$(resolve_preferred_shell)"

    if [[ -t 0 ]]; then
        tty_stdin="true"
    fi

    if [[ -t 1 ]]; then
        tty_stdout="true"
    fi

    if debug_paths_enabled; then
        kv_pair "reload_preferred_shell:SHELL" "${SHELL:-unset}"
        kv_pair "reload_preferred_shell:tty stdin" "$tty_stdin"
        kv_pair "reload_preferred_shell:tty stdout" "$tty_stdout"
        kv_pair "reload_preferred_shell:target" "${preferred_shell:-unset}"
    fi

    if [[ ! -t 0 || ! -t 1 ]]; then
        warn "Non-interactive session; skipping shell reload."
        log "Run manually: source ~/.zshrc or source ~/.bashrc"
        return 0
    fi

    case "$preferred_shell" in
        */zsh)
            exec zsh -il
            ;;
        */bash)
            exec bash -il
            ;;
        *)
            warn "Unknown preferred shell: ${preferred_shell:-unset}"
            log "Run manually: exec zsh -il or exec bash -il"
            ;;
    esac
}
# END SH BOOTSTRAP BLOCK
