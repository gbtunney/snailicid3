#!/usr/bin/env bash

if [[ -z "${BASH_VERSION:-}" ]]; then
    printf 'snail-sh bootstrap logging requires bash.\n' >&2
    return 1 2> /dev/null || exit 1
fi

RESET=$'\033[0m'
BOLD=$'\033[1m'
GREY=$'\033[0;90m'
WHITE=$'\033[0;97m'
MAGENTA=$'\033[0;35m'
CYAN=$'\033[0;36m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[1;33m'
RED=$'\033[0;31m'
BG_RED=$'\033[41m\033[0;97m'
FG_DARK_GREY=$'\033[38;5;238m'
FG_MID_GREY=$'\033[38;5;244m'

resolve_style() {
    local style="${1:-reset}"
    local normalized_style

    normalized_style="$(printf '%s' "$style" | tr '[:upper:]_' '[:lower:]-')"

    case "$normalized_style" in
        '' | reset) printf '%s' "$RESET" ;;
        bold) printf '%s' "$BOLD" ;;
        grey | gray | info) printf '%s' "$GREY" ;;
        white) printf '%s' "$WHITE" ;;
        magenta) printf '%s' "$MAGENTA" ;;
        cyan) printf '%s' "$CYAN" ;;
        green | success) printf '%s' "$GREEN" ;;
        yellow | warn | warning) printf '%s' "$YELLOW" ;;
        red | err | error) printf '%s' "$RED" ;;
        bg-red | critical | fatal) printf '%s' "$BG_RED" ;;
        fg-dark-grey | fg-dark-gray) printf '%s' "$FG_DARK_GREY" ;;
        fg-mid-grey | fg-mid-gray | bold-mid-grey | bold-mid-gray)
            printf '%s' "$BOLD$FG_MID_GREY"
            ;;
        *) printf '%s' "$style" ;;
    esac
}

get_terminal_width() {
    local width="${COLUMNS:-}"

    if [[ ! "$width" =~ ^[0-9]+$ ]] || ((width < 1)); then
        width="$(tput cols 2> /dev/null || true)"
    fi

    if [[ ! "$width" =~ ^[0-9]+$ ]] || ((width < 1)); then
        width=80
    fi

    printf '%s\n' "$width"
}

resolve_width() {
    local requested_width="${1:-auto}"
    local terminal_width

    terminal_width="$(get_terminal_width)"

    case "$requested_width" in
        '' | auto) printf '%s\n' "$terminal_width" ;;
        *%)
            if [[ "$requested_width" =~ ^([0-9]+)%$ ]]; then
                printf '%s\n' $((terminal_width * ${BASH_REMATCH[1]} / 100))
            else
                printf '%s\n' "$terminal_width"
            fi
            ;;
        *)
            if [[ "$requested_width" =~ ^[0-9]+$ ]] && ((requested_width > 0)); then
                printf '%s\n' "$requested_width"
            else
                printf '%s\n' "$terminal_width"
            fi
            ;;
    esac
}

is_width_spec() {
    local requested_width="${1:-}"
    [[ -z "$requested_width" || "$requested_width" == "auto" || "$requested_width" =~ ^[0-9]+%?$ ]]
}

build_rule() {
    local marker="${1:--}"
    local width="${2:-40}"
    local output=''

    while ((${#output} < width)); do
        output+="$marker"
    done

    printf '%s' "${output:0:width}"
}

rule() {
    local marker="${1:-=}"
    local requested_width="${2:-auto}"
    local repeat=1
    local newline=true
    local style=''
    local index
    local rendered_rule

    if [[ "${3:-}" =~ ^[0-9]+$ ]]; then
        repeat="$3"
        newline="${4:-true}"
        style="${5:-}"
    else
        style="${3:-}"
        newline="${4:-true}"
    fi

    rendered_rule="$(build_rule "$marker" "$(resolve_width "$requested_width")")"

    for ((index = 0; index < repeat; index++)); do
        printf '%b%s%b' "$(resolve_style "$style")" "$rendered_rule" "$RESET"
        if [[ "$newline" == "true" || "$index" -lt $((repeat - 1)) ]]; then
            printf '\n'
        fi
    done
}

log() {
    local message="${1:-}"
    local style="${2:-reset}"
    local output="${3:-stdout}"

    if [[ "$output" == "stderr" ]]; then
        printf '%b%s%b\n' "$(resolve_style "$style")" "$message" "$RESET" >&2
        return
    fi

    printf '%b%s%b\n' "$(resolve_style "$style")" "$message" "$RESET"
}

success() { log "[success] ✓ ${1:-}" green; }
info() { log "[info] i ${1:-}" grey; }
warn() { log "[warn] ${1:-}" yellow; }
critical() { log "[critical] ${1:-}" bg-red stderr; }
err() { log "[error] ${1:-}" red stderr; }
skipped() { log "[-] skipped: ${1:-}" grey; }

die() {
    critical "${1:-}"
    exit 1
}

spacer() {
    local height="${1:-1}"
    local index

    if [[ ! "$height" =~ ^[0-9]+$ ]] || ((height < 1)); then
        height=1
    fi

    for ((index = 0; index < height; index++)); do
        printf '\n'
    done
}

line() {
    local marker="${1:--}"
    local width="${2:-40}"
    local style="${3:-cyan}"

    rule "$marker" "$width" "$style"
}

kabob() {
    local text="${1:-}"
    local width
    local style="${3:-cyan}"
    local marker="${5:--}"
    local padding=2
    local available_width
    local left_width
    local right_width

    width="$(resolve_width "${2:-auto}")"
    available_width=$((width - ${#text} - (padding * 2)))

    if ((available_width < 2)); then
        log "$text" "$style"
        return
    fi

    left_width=$((available_width / 2))
    right_width=$((available_width - left_width))
    printf '%b%s%*s%s%*s%s%b\n' \
        "$(resolve_style "$style")" \
        "$(build_rule "$marker" "$left_width")" \
        "$padding" '' \
        "$text" \
        "$padding" '' \
        "$(build_rule "$marker" "$right_width")" \
        "$RESET"
}

header() {
    local message="${1:-}"
    local style="${3:-cyan}"

    spacer 1
    log "$message" "$style"
}

section() {
    local title="${1:-}"
    local width=auto
    local style=cyan
    local marker='='

    if is_width_spec "${2:-}"; then
        width="${2:-auto}"
        style="${3:-cyan}"
        marker="${4:-=}"
    else
        style="${2:-cyan}"
        marker="${3:-=}"
    fi

    spacer 1
    kabob "$title" "$width" "$style" false "$marker"
    spacer 1
}

step() { log "  -> ${1:-}" "${2:-bold}"; }

status_pair() {
    local key="${1:-}"
    local value="${2:-}"
    local level="${3:-info}"

    kv_pair "$key" "$value" ' ' "$level"
}

kv_pair() {
    local key="${1:-}"
    local value="${2:-}"
    local delimiter="${3:- }"
    local value_style="${4:-grey}"

    printf '%b%-24s%b%s%b%s%b\n' \
        "$BOLD$FG_MID_GREY" "$key" "$RESET" "$delimiter" \
        "$(resolve_style "$value_style")" "$value" "$RESET"
}
