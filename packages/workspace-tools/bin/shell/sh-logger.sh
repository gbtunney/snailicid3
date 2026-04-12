#!/usr/bin/env bash
# sh-logger.sh — sourced in GitHub Actions run: blocks. Do not rewrite.
# Source: gbt-schema-form/scripts/lib/sh-logger.sh (bootstrap-actions branch)

# ── ANSI colors ──────────────────────────────────────────────────────────────
BLACK='\033[0;30m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[0;37m'
BBLACK='\033[1;30m'
BRED='\033[1;31m'
BGREEN='\033[1;32m'
BYELLOW='\033[1;33m'
BBLUE='\033[1;34m'
BMAGENTA='\033[1;35m'
BCYAN='\033[1;36m'
BWHITE='\033[1;37m'
BGBLACK='\033[40m'
BGRED='\033[41m'
BGGREEN='\033[42m'
BGYELLOW='\033[43m'
BGBLUE='\033[44m'
BGMAGENTA='\033[45m'
BGCYAN='\033[46m'
BGWHITE='\033[47m'
BOLD='\033[1m'
UNDERLINE='\033[4m'
REVERSE='\033[7m'
RESET='\033[0m'
GRAY="$BBLACK"
GREY="$BBLACK" # aliases

get_terminal_width() {
    local width
    if [ -n "${COLUMNS:-}" ] && [ "$COLUMNS" -gt 0 ] 2> /dev/null; then
        width="$COLUMNS"
    elif command -v tput > /dev/null 2>&1; then
        width="$(tput cols 2> /dev/null || echo 80)"
    else
        width=80
    fi
    echo "$width"
}

rule() {
    local marker="${1:-=-}"
    local width_spec="${2:-auto}"
    local term_width
    term_width="$(get_terminal_width)"
    local width
    if [ "$width_spec" = "auto" ]; then
        width="$term_width"
    elif echo "$width_spec" | grep -qE '^[0-9]+%$'; then
        local pct="${width_spec%\%}"
        width=$((term_width * pct / 100))
    else
        width="$width_spec"
    fi
    printf '%*s\n' "$width" '' | tr ' ' "${marker:0:1}"
}

hrule() { rule "${1:-=-}" "${2:-auto}"; }
spacer() {
    local n="${1:-1}"
    for _ in $(seq 1 "$n"); do echo ""; done
}

header() {
    spacer
    echo -e "${BOLD}${BWHITE}$*${RESET}"
    rule "=" auto
}
subheader() {
    echo -e "${BOLD}${CYAN}$*${RESET}"
    rule "-" auto
}
section() {
    spacer
    echo -e "${BOLD}${BYELLOW}── $* ──${RESET}"
}

kv_pair() { printf "  ${CYAN}%-20s${RESET} %s\n" "$1:" "$2"; }
status_pair() {
    local key="$1" val="$2"
    if [ "$val" = "clean" ] || [ "$val" = "ok" ] || [ "$val" = "pass" ]; then
        printf "  ${CYAN}%-20s${RESET} ${GREEN}%s${RESET}\n" "$key:" "$val"
    else
        printf "  ${CYAN}%-20s${RESET} ${RED}%s${RESET}\n" "$key:" "$val"
    fi
}

log() { echo -e "${WHITE}$*${RESET}"; }
success() { echo -e "${GREEN}✔ $*${RESET}"; }
info() { echo -e "${CYAN}ℹ $*${RESET}"; }
warn() { echo -e "${YELLOW}⚠ $*${RESET}"; }
err() { echo -e "${RED}✖ $*${RESET}" >&2; }
critical() { echo -e "${BRED}‼ $*${RESET}" >&2; }
step() { echo -e "${MAGENTA}→ $*${RESET}"; }
created() { echo -e "${GREEN}+ $*${RESET}"; }
skipped() { echo -e "${GRAY}~ $*${RESET}"; }

# Dispatch when run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    cmd="${1:-}"
    shift || true
    case "$cmd" in
        rule) rule "$@" ;;
        hrule) hrule "$@" ;;
        section) section "$@" ;;
        header) header "$@" ;;
        subheader) subheader "$@" ;;
        kv_pair) kv_pair "$@" ;;
        status_pair) status_pair "$@" ;;
        log) log "$@" ;;
        success) success "$@" ;;
        info) info "$@" ;;
        warn) warn "$@" ;;
        err) err "$@" ;;
        step) step "$@" ;;
        created) created "$@" ;;
        skipped) skipped "$@" ;;
        spacer) spacer "$@" ;;
        *)
            echo "Unknown command: $cmd" >&2
            exit 1
            ;;
    esac
fi
