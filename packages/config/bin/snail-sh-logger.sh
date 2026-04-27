#!/usr/bin/env bash
# Combined logging helpers for shell scripts.
#
# Exposes colour constants, style helpers, horizontal rule helpers, and
# higher-level logging functions. This file can be sourced from other bash
# scripts or executed directly as a tiny CLI dispatcher:
#
#   snail-sh info "hello"
#   snail-sh header "Build" 6 reverse-magenta "="

if [ -z "${BASH_VERSION:-}" ]; then
    echo "Error: snail-sh-logger.sh requires bash." >&2
    return 1 2> /dev/null || exit 1
fi

###############################################################################
## Colour definitions

BLACK=$'\033[0;30m'
WHITE=$'\033[0;37m'
GREY=$'\033[0;90m'
MID_GREY=$'\033[0;38;5;187;49m'
MAGENTA=$'\033[0;35m'
BLUE=$'\033[0;34m'
CYAN=$'\033[0;36m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[1;33m'
DIM_YELLOW=$'\033[2;33m'
ORANGE=$'\033[38;5;208m'
RED=$'\033[0;31m'

BRIGHT_WHITE=$'\033[0;97m'
BRIGHT_GREY=$'\033[0;37m'
BRIGHT_MAGENTA=$'\033[0;95m'
BRIGHT_BLUE=$'\033[0;94m'
BRIGHT_CYAN=$'\033[0;96m'
BRIGHT_GREEN=$'\033[0;92m'
BRIGHT_YELLOW=$'\033[0;93m'
BRIGHT_ORANGE=$'\033[38;5;214m'
BRIGHT_RED=$'\033[0;91m'

BG_BLACK=$'\033[48;5;232m'
BG_WHITE=$'\033[48;5;255m'
BG_GREY=$'\033[100m'
BG_MAGENTA=$'\033[45m'
BG_BLUE=$'\033[44m'
BG_CYAN=$'\033[46m'
BG_GREEN=$'\033[42m'
BG_YELLOW=$'\033[43m'
BG_ORANGE=$'\033[48;5;208m'
BG_RED=$'\033[41m'

BG_BRIGHT_BLACK=$'\033[100m'
BG_BRIGHT_WHITE=$'\033[107m'
BG_BRIGHT_GREY=$'\033[48;5;250m'
BG_BRIGHT_MAGENTA=$'\033[105m'
BG_BRIGHT_BLUE=$'\033[104m'
BG_BRIGHT_CYAN=$'\033[106m'
BG_BRIGHT_GREEN=$'\033[102m'
BG_BRIGHT_YELLOW=$'\033[103m'
BG_BRIGHT_ORANGE=$'\033[48;5;214m'
BG_BRIGHT_RED=$'\033[101m'

FG_BLACK=$'\033[38;5;232m'
FG_DARK_GREY=$'\033[38;5;238m'
FG_MID_GREY=$'\033[38;5;244m'
FG_LIGHT_GREY=$'\033[38;5;250m'
FG_WHITE=$'\033[38;5;255m'

BG_DARK_GREY=$'\033[48;5;238m'
BG_MID_GREY=$'\033[48;5;244m'
BG_LIGHT_GREY=$'\033[48;5;250m'

GRAY="$GREY"
BG_GRAY="$BG_GREY"
BRIGHT_GRAY="$BRIGHT_GREY"
BG_BRIGHT_GRAY="$BG_BRIGHT_GREY"
BRIGHT_BLACK="$GREY"

###############################################################################
## Style attributes

BOLD=$'\033[1m'
UNDERLINE=$'\033[4m'
REVERSE=$'\033[7m'
RESET=$'\033[0m'

###############################################################################
## Style resolver

# Resolve style names like "magenta", "bg-magenta", "reverse-magenta", or
# "bold-bright-cyan" to ANSI. Unknown values pass through unchanged so callers
# may still provide raw ANSI escapes.
resolve_style() {
    local style="${1:-reset}"
    local style_key

    style_key="$(printf '%s' "$style" | tr '[:upper:]_' '[:lower:]-')"

    case "$style_key" in
        '') printf '%s' "$RESET" ;;
        reset) printf '%s' "$RESET" ;;
        bold) printf '%s' "$BOLD" ;;
        underline) printf '%s' "$UNDERLINE" ;;
        reverse) printf '%s' "$REVERSE" ;;

        black) printf '%s' "$BLACK" ;;
        white) printf '%s' "$WHITE" ;;
        grey|gray) printf '%s' "$GREY" ;;
        magenta) printf '%s' "$MAGENTA" ;;
        blue) printf '%s' "$BLUE" ;;
        cyan) printf '%s' "$CYAN" ;;
        green) printf '%s' "$GREEN" ;;
        yellow) printf '%s' "$YELLOW" ;;
        dim-yellow) printf '%s' "$DIM_YELLOW" ;;
        orange) printf '%s' "$ORANGE" ;;
        red) printf '%s' "$RED" ;;

        bright-white) printf '%s' "$BRIGHT_WHITE" ;;
        bright-grey|bright-gray) printf '%s' "$BRIGHT_GREY" ;;
        bright-magenta) printf '%s' "$BRIGHT_MAGENTA" ;;
        bright-blue) printf '%s' "$BRIGHT_BLUE" ;;
        bright-cyan) printf '%s' "$BRIGHT_CYAN" ;;
        bright-green) printf '%s' "$BRIGHT_GREEN" ;;
        bright-yellow) printf '%s' "$BRIGHT_YELLOW" ;;
        bright-orange) printf '%s' "$BRIGHT_ORANGE" ;;
        bright-red) printf '%s' "$BRIGHT_RED" ;;

        bg-black) printf '%s' "$BG_BLACK" ;;
        bg-white) printf '%s' "$BG_WHITE" ;;
        bg-grey|bg-gray) printf '%s' "$BG_GREY" ;;
        bg-magenta) printf '%s' "$BG_MAGENTA" ;;
        bg-blue) printf '%s' "$BG_BLUE" ;;
        bg-cyan) printf '%s' "$BG_CYAN" ;;
        bg-green) printf '%s' "$BG_GREEN" ;;
        bg-yellow) printf '%s' "$BG_YELLOW" ;;
        bg-orange) printf '%s' "$BG_ORANGE" ;;
        bg-red) printf '%s' "$BG_RED" ;;

        bg-bright-white) printf '%s' "$BG_BRIGHT_WHITE" ;;
        bg-bright-grey|bg-bright-gray) printf '%s' "$BG_BRIGHT_GREY" ;;
        bg-bright-magenta) printf '%s' "$BG_BRIGHT_MAGENTA" ;;
        bg-bright-blue) printf '%s' "$BG_BRIGHT_BLUE" ;;
        bg-bright-cyan) printf '%s' "$BG_BRIGHT_CYAN" ;;
        bg-bright-green) printf '%s' "$BG_BRIGHT_GREEN" ;;
        bg-bright-yellow) printf '%s' "$BG_BRIGHT_YELLOW" ;;
        bg-bright-orange) printf '%s' "$BG_BRIGHT_ORANGE" ;;
        bg-bright-red) printf '%s' "$BG_BRIGHT_RED" ;;

        reverse-black) printf '%s' "$BG_BLACK$BRIGHT_WHITE" ;;
        reverse-white) printf '%s' "$BG_WHITE$FG_BLACK" ;;
        reverse-grey|reverse-gray) printf '%s' "$BG_GREY$BRIGHT_WHITE" ;;
        reverse-magenta) printf '%s' "$BG_MAGENTA$BRIGHT_WHITE" ;;
        reverse-blue) printf '%s' "$BG_BLUE$BRIGHT_WHITE" ;;
        reverse-cyan) printf '%s' "$BG_CYAN$FG_BLACK" ;;
        reverse-green) printf '%s' "$BG_GREEN$FG_BLACK" ;;
        reverse-yellow) printf '%s' "$BG_YELLOW$FG_BLACK" ;;
        reverse-orange) printf '%s' "$BG_ORANGE$FG_BLACK" ;;
        reverse-red) printf '%s' "$BG_RED$BRIGHT_WHITE" ;;
        reverse-bright-black) printf '%s' "$BG_BRIGHT_BLACK$BRIGHT_WHITE" ;;
        reverse-bright-white) printf '%s' "$BG_BRIGHT_WHITE$FG_BLACK" ;;
        reverse-bright-grey|reverse-bright-gray) printf '%s' "$BG_BRIGHT_GREY$FG_BLACK" ;;
        reverse-bright-magenta) printf '%s' "$BG_BRIGHT_MAGENTA$FG_BLACK" ;;
        reverse-bright-blue) printf '%s' "$BG_BRIGHT_BLUE$FG_BLACK" ;;
        reverse-bright-cyan) printf '%s' "$BG_BRIGHT_CYAN$FG_BLACK" ;;
        reverse-bright-green) printf '%s' "$BG_BRIGHT_GREEN$FG_BLACK" ;;
        reverse-bright-yellow) printf '%s' "$BG_BRIGHT_YELLOW$FG_BLACK" ;;
        reverse-bright-orange) printf '%s' "$BG_BRIGHT_ORANGE$FG_BLACK" ;;
        reverse-bright-red) printf '%s' "$BG_BRIGHT_RED$FG_BLACK" ;;

        bold-black) printf '%s' "$BOLD$BLACK" ;;
        bold-white) printf '%s' "$BOLD$WHITE" ;;
        bold-grey|bold-gray) printf '%s' "$BOLD$GREY" ;;
        bold-magenta) printf '%s' "$BOLD$MAGENTA" ;;
        bold-blue) printf '%s' "$BOLD$BLUE" ;;
        bold-cyan) printf '%s' "$BOLD$CYAN" ;;
        bold-green) printf '%s' "$BOLD$GREEN" ;;
        bold-yellow) printf '%s' "$BOLD$YELLOW" ;;
        bold-orange) printf '%s' "$BOLD$ORANGE" ;;
        bold-red) printf '%s' "$BOLD$RED" ;;

        *) printf '%s' "$style" ;;
    esac
}

###############################################################################
## Terminal width helpers

get_terminal_width() {
    local width="${COLUMNS:-}"

    if [[ "$width" =~ ^[0-9]+$ ]] && ((width > 0)); then
        printf '%s\n' "$width"
        return
    fi

    width="$(tput cols 2> /dev/null || true)"

    if [[ "$width" =~ ^[0-9]+$ ]] && ((width > 0)); then
        printf '%s\n' "$width"
        return
    fi

    printf '80\n'
}

resolve_width() {
    local width="${1:-auto}"
    local term_width

    width="${width#"${width%%[![:space:]]*}"}"
    width="${width%"${width##*[![:space:]]}"}"
    term_width="$(get_terminal_width)"

    if [[ -z "$width" || "$width" == "auto" ]]; then
        printf '%s\n' "$term_width"
        return
    fi

    if [[ "$width" =~ ^[0-9]+$ ]] && ((width > 0)); then
        printf '%s\n' "$width"
        return
    fi

    if [[ "$width" =~ ^([0-9]+)%$ ]]; then
        printf '%s\n' $((term_width * ${BASH_REMATCH[1]} / 100))
        return
    fi

    printf '%s\n' "$term_width"
}

is_width_spec() {
    local width="${1:-}"

    width="${width#"${width%%[![:space:]]*}"}"
    width="${width%"${width##*[![:space:]]}"}"

    [[ -z "$width" || "$width" == "auto" || "$width" =~ ^[0-9]+$ || "$width" =~ ^[0-9]+%$ ]]
}

###############################################################################
## Rules and repeaters

rule() {
    local marker="${1:-=}"
    local requested_width="${2:-auto}"
    local repeat='1'
    local newline='true'
    local style=''
    local width
    local      line=''
    local i

       if [[ "${3:-}" =~ ^[0-9]+$ ]]; then
        repeat="$3"
        newline="${4:-true}"
        style="${5:-}"
    else
        style="${3:-}"
        newline="${4:-true}"
    fi

    width="$(resolve_width "$requested_width")"

    if ! [[ "$repeat" =~ ^[0-9]+$ ]] || ((repeat < 1)); then
        repeat=1
    fi

    if [[ "$newline" != "true" && "$newline" != "false" ]]; then
        newline="true"
    fi

    if [[ ${#marker} -eq 1 ]]; then
        line="$(printf '%*s' "$width" '' | tr ' ' "$marker")"
    else
        while ((${#line} < width)); do
            line+="$marker"
        done
        line="${line:0:width}"
    fi

    for ((i = 0; i < repeat; i++)); do
        if [[ -n "$style" ]]; then
            printf '%b' "$(resolve_style "$style")"
        fi

        if [[ "$newline" == "true" || $i -lt $((repeat - 1)) ]]; then
            printf '%b' "$line"
            if [[ -n "$style" ]]; then
                printf '%b' "$RESET"
            fi
            printf '\n'
        else
            printf '%b' "$line"
            if [[ -n "$style" ]]; then
                printf '%b' "$RESET"
            fi
        fi
    done
}

build_rule() {
    local marker="${1:--}"
    local width="${2:-40}"
    local built_rule=''

    if ! [[ "$width" =~ ^[0-9]+$ ]] || ((width < 1)); then
        width=40
    fi

    if [[ ${#marker} -eq 1 ]]; then
        printf -v built_rule '%*s' "$width" ''
        printf '%s' "${built_rule// /$marker}"
        return
    fi

    while ((${#built_rule} < width)); do
        built_rule+="$marker"
    done

    printf '%s' "${built_rule:0:width}"
}

hrepeater() {
    local marker="${1:--}"
    local width="${2:-40}"
    local height="${3:-1}"
    local repeated_line=''
    local output=''
    local index

    if ! [[ "$height" =~ ^[0-9]+$ ]] || ((height < 1)); then
        height=1
    fi

    repeated_line="$(build_rule "$marker" "$width")"

    for ((index = 0; index < height; index++)); do
        output+="$repeated_line"
        if ((index < height - 1)); then
            output+=$'\n'
        fi
    done

    printf '%s' "$output"
}

###############################################################################
## Logging helpers

log() {
    local message="${1:-}"
    local color
    local output="${3:-stdout}"

    color="$(resolve_style "${2:-reset}")"

    if [[ "$output" == "stderr" ]]; then
        printf '%b\n' "${color}${message}${RESET}" >&2
        return
    fi

    printf '%b\n' "${color}${message}${RESET}"
}

success() { log "[success] OK ${1:-}" green; }
info() { log "[info] i ${1:-}" grey; }
warn() { log $'\n'"[warn] ${1:-}" yellow; }
critical() { log $'\n'"[critical] ${1:-}" bg-red; }
err() { log "[error] ${1:-}" red stderr; }
warning() { warn "${1:-}"; }
created() { printf '%b  OK created:%b %s\n' "$(resolve_style green)" "$RESET" "${1:-}"; }
skipped() { printf '%b  - skipped:%b %s\n' "$(resolve_style grey)" "$RESET" "${1:-}"; }

step() {
    local message="${1:-}"
    local style

    style="$(resolve_style "${2:-bold}")"
    log "  -> $message" "$style"
}

section() {
    local title="${1:-}"
    local color

    color="$(resolve_style "${2:-cyan}")"
    printf '\n%b=== %s ===%b\n' "$color" "$title" "$RESET"
}

subheader() {
    log $'\n'"${1:-}" "${2:-bold}"
}

status_color_for_value() {
    local value="${1:-}"

    case "$value" in
        clean) printf '%s' green ;;
        dirty) printf '%s' yellow ;;
        'command failed (non-blocking)') printf '%s' yellow ;;
        'pnpm not installed') printf '%s' red ;;
        *) printf '%s' grey ;;
    esac
}

status_pair() {
    local key="${1:-}"
    local value="${2:-}"
    local value_color

    value_color="$(status_color_for_value "$value")"
    kv_pair "$key" "$value" ':' "$value_color" grey
}

spacer() {
    local height="${1:-1}"
    local index

    if ! [[ "$height" =~ ^[0-9]+$ ]] || ((height < 1)); then
        height=1
    fi

    for ((index = 0; index < height; index++)); do
        printf '\n'
    done
}

header() {
    local message="${1:-}"
    local width="${2:-3}"
    local color="${3:-cyan}"
    local marker="${4:-=}"
    local height="${5:-1}"
    local resolved_width
    local header_rule

    if [[ $# -eq 3 && ${#color} -eq 1 ]]; then
        marker="$color"
        color='cyan'
    fi

    resolved_width="$(resolve_width "$width")"
    header_rule="$(hrepeater "$marker" "$resolved_width" "$height")"
    log $'\n'"${header_rule} ${message} ${header_rule}" "$color"
}

line() {
    local marker_or_text="${1:--}"
    local width="${2:-40}"
    local color="${3:-cyan}"
    local height='1'
    local include_newline='false'
    local fourth_arg="${4:-}"
    local resolved_width
    local output=''

    if [[ "$fourth_arg" == "true" || "$fourth_arg" == "false" ]]; then
        include_newline="$fourth_arg"
    else
        height="${4:-1}"
        include_newline="${5:-false}"
    fi

    if [[ ${#marker_or_text} -gt 1 ]] && { [[ $# -eq 1 ]] || ! is_width_spec "${2:-}"; }; then
        output="$marker_or_text"
        color="${2:-cyan}"
    else
        resolved_width="$(resolve_width "$width")"
        output="$(hrepeater "$marker_or_text" "$resolved_width" "$height")"
    fi

    if [[ "$include_newline" == "true" ]]; then
        log $'\n'"$output" "$color"
        return
    fi

    log "$output" "$color"
}

hrule() {
    line "${1:--}" "${2:-40}" "${3:-cyan}" "${4:-1}" true
}

kv_pair() {
    local key="${1:-}"
    local value="${2:-}"
    local delimiter="${3:-:}"
    local value_color
    local key_color

    value_color="$(resolve_style "${4:-reset}")"
    key_color="$(resolve_style "${5:-grey}")"

    printf '%b%-24s%b %b%b%b\n' "$key_color" "${key}${delimiter}" "$RESET" "$value_color" "$value" "$RESET"
}

###############################################################################
## Command dispatcher

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
    cmd="${1:-}"
    shift || true

    if [[ -z "$cmd" ]]; then
        echo "Usage: snail-sh <function> [...args]" >&2
        exit 2
    fi

    if declare -F "$cmd" > /dev/null; then
        "$cmd" "$@"
    else
        echo "Unknown command: $cmd" >&2
        exit 1
    fi
fi
