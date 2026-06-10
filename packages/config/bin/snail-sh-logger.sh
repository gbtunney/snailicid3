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

FG_DARK_GRAY="$FG_DARK_GREY"
FG_MID_GRAY="$FG_MID_GREY"
FG_LIGHT_GRAY="$FG_LIGHT_GREY"
BG_DARK_GRAY="$BG_DARK_GREY"
BG_MID_GRAY="$BG_MID_GREY"
BG_LIGHT_GRAY="$BG_LIGHT_GREY"
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
        grey | gray) printf '%s' "$GREY" ;;
        magenta) printf '%s' "$MAGENTA" ;;
        blue) printf '%s' "$BLUE" ;;
        cyan) printf '%s' "$CYAN" ;;
        green) printf '%s' "$GREEN" ;;
        yellow) printf '%s' "$YELLOW" ;;
        dim-yellow) printf '%s' "$DIM_YELLOW" ;;
        orange) printf '%s' "$ORANGE" ;;
        red) printf '%s' "$RED" ;;

        bright-white) printf '%s' "$BRIGHT_WHITE" ;;
        bright-grey | bright-gray) printf '%s' "$BRIGHT_GREY" ;;
        bright-magenta) printf '%s' "$BRIGHT_MAGENTA" ;;
        bright-blue) printf '%s' "$BRIGHT_BLUE" ;;
        bright-cyan) printf '%s' "$BRIGHT_CYAN" ;;
        bright-green) printf '%s' "$BRIGHT_GREEN" ;;
        bright-yellow) printf '%s' "$BRIGHT_YELLOW" ;;
        bright-orange) printf '%s' "$BRIGHT_ORANGE" ;;
        bright-red) printf '%s' "$BRIGHT_RED" ;;

        bg-black) printf '%s' "$BG_BLACK" ;;
        bg-white) printf '%s' "$BG_WHITE" ;;
        bg-grey | bg-gray) printf '%s' "$BG_GREY" ;;
        bg-dark-grey | bg-dark-gray) printf '%s' "$BG_DARK_GREY" ;;
        bg-mid-grey | bg-mid-gray) printf '%s' "$BG_MID_GREY" ;;
        bg-light-grey | bg-light-gray) printf '%s' "$BG_LIGHT_GREY" ;;
        bg-magenta) printf '%s' "$BG_MAGENTA" ;;
        bg-blue) printf '%s' "$BG_BLUE" ;;
        bg-cyan) printf '%s' "$BG_CYAN" ;;
        bg-green) printf '%s' "$BG_GREEN" ;;
        bg-yellow) printf '%s' "$BG_YELLOW" ;;
        bg-orange) printf '%s' "$BG_ORANGE" ;;
        bg-red) printf '%s' "$BG_RED" ;;

        bg-bright-white) printf '%s' "$BG_BRIGHT_WHITE" ;;
        bg-bright-grey | bg-bright-gray) printf '%s' "$BG_BRIGHT_GREY" ;;
        bg-bright-magenta) printf '%s' "$BG_BRIGHT_MAGENTA" ;;
        bg-bright-blue) printf '%s' "$BG_BRIGHT_BLUE" ;;
        bg-bright-cyan) printf '%s' "$BG_BRIGHT_CYAN" ;;
        bg-bright-green) printf '%s' "$BG_BRIGHT_GREEN" ;;
        bg-bright-yellow) printf '%s' "$BG_BRIGHT_YELLOW" ;;
        bg-bright-orange) printf '%s' "$BG_BRIGHT_ORANGE" ;;
        bg-bright-red) printf '%s' "$BG_BRIGHT_RED" ;;

        reverse-black) printf '%s' "$BG_BLACK$BRIGHT_WHITE" ;;
        reverse-white) printf '%s' "$BG_WHITE$FG_BLACK" ;;
        reverse-grey | reverse-gray) printf '%s' "$BG_GREY$BRIGHT_WHITE" ;;
        reverse-dark-grey | reverse-dark-gray) printf '%s' "$BG_DARK_GREY$FG_WHITE" ;;
        reverse-mid-grey | reverse-mid-gray) printf '%s' "$BG_MID_GREY$FG_WHITE" ;;
        reverse-light-grey | reverse-light-gray) printf '%s' "$BG_LIGHT_GREY$FG_BLACK" ;;
        reverse-magenta) printf '%s' "$BG_MAGENTA$BRIGHT_WHITE" ;;
        reverse-blue) printf '%s' "$BG_BLUE$BRIGHT_WHITE" ;;
        reverse-cyan) printf '%s' "$BG_CYAN$FG_BLACK" ;;
        reverse-green) printf '%s' "$BG_GREEN$FG_BLACK" ;;
        reverse-yellow) printf '%s' "$BG_YELLOW$FG_BLACK" ;;
        reverse-orange) printf '%s' "$BG_ORANGE$FG_BLACK" ;;
        reverse-red) printf '%s' "$BG_RED$BRIGHT_WHITE" ;;
        reverse-bright-black) printf '%s' "$BG_BRIGHT_BLACK$BRIGHT_WHITE" ;;
        reverse-bright-white) printf '%s' "$BG_BRIGHT_WHITE$FG_BLACK" ;;
        reverse-bright-grey | reverse-bright-gray) printf '%s' "$BG_BRIGHT_GREY$FG_BLACK" ;;
        reverse-bright-magenta) printf '%s' "$BG_BRIGHT_MAGENTA$FG_BLACK" ;;
        reverse-bright-blue) printf '%s' "$BG_BRIGHT_BLUE$FG_BLACK" ;;
        reverse-bright-cyan) printf '%s' "$BG_BRIGHT_CYAN$FG_BLACK" ;;
        reverse-bright-green) printf '%s' "$BG_BRIGHT_GREEN$FG_BLACK" ;;
        reverse-bright-yellow) printf '%s' "$BG_BRIGHT_YELLOW$FG_BLACK" ;;
        reverse-bright-orange) printf '%s' "$BG_BRIGHT_ORANGE$FG_BLACK" ;;
        reverse-bright-red) printf '%s' "$BG_BRIGHT_RED$FG_BLACK" ;;

        bold-black) printf '%s' "$BOLD$BLACK" ;;
        bold-white) printf '%s' "$BOLD$WHITE" ;;
        bold-grey | bold-gray) printf '%s' "$BOLD$GREY" ;;
        bold-dark-grey | bold-dark-gray) printf '%s' "$BOLD$FG_DARK_GREY" ;;
        bold-mid-grey | bold-mid-gray) printf '%s' "$BOLD$FG_MID_GREY" ;;
        bold-light-grey | bold-light-gray) printf '%s' "$BOLD$FG_LIGHT_GREY" ;;
        bold-magenta) printf '%s' "$BOLD$MAGENTA" ;;
        bold-blue) printf '%s' "$BOLD$BLUE" ;;
        bold-cyan) printf '%s' "$BOLD$CYAN" ;;
        bold-green) printf '%s' "$BOLD$GREEN" ;;
        bold-yellow) printf '%s' "$BOLD$YELLOW" ;;
        bold-orange) printf '%s' "$BOLD$ORANGE" ;;
        bold-red) printf '%s' "$BOLD$RED" ;;

        fg-black) printf '%s' "$FG_BLACK" ;;
        fg-white) printf '%s' "$FG_WHITE" ;;
        fg-dark-grey | fg-dark-gray) printf '%s' "$FG_DARK_GREY" ;;
        fg-mid-grey | fg-mid-gray) printf '%s' "$FG_MID_GREY" ;;
        fg-light-grey | fg-light-gray) printf '%s' "$FG_LIGHT_GREY" ;;

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
    local line=''
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

    if ! [[ "$width" =~ ^[0-9]+$ ]] || ((width < 0)); then
        width=40
    fi

    if ((width == 0)); then
        return
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

strip_ansi() {
    local value="${1:-}"
    local ansi_pattern=$'\033\\[[0-9;]*[[:alpha:]]'

    while [[ "$value" =~ $ansi_pattern ]]; do
        value="${value//${BASH_REMATCH[0]}/}"
    done

    printf '%s' "$value"
}

visible_length() {
    local value="${1:-}"
    value="$(strip_ansi "$value")"
    printf '%s\n' "${#value}"
}

resolve_kabob_side_widths() {
    local width_spec="${1:-auto}"
    local available_width="${2:-0}"
    local left_width=0
    local right_width=0
    local total_rule_width=0

    if ! [[ "$available_width" =~ ^-?[0-9]+$ ]]; then
        available_width=0
    fi

    if ((available_width < 0)); then
        available_width=0
    fi

    width_spec="${width_spec#"${width_spec%%[![:space:]]*}"}"
    width_spec="${width_spec%"${width_spec##*[![:space:]]}"}"

    case "$width_spec" in
        '' | auto)
            total_rule_width="$available_width"
            ;;
        *%)
            if [[ "$width_spec" =~ ^([0-9]+)%$ ]]; then
                total_rule_width=$((available_width * ${BASH_REMATCH[1]} / 100))
            else
                total_rule_width="$available_width"
            fi
            ;;
        *)
            if [[ "$width_spec" =~ ^[0-9]+$ ]]; then
                left_width="$width_spec"
                right_width="$width_spec"
                printf '%s %s\n' "$left_width" "$right_width"
                return
            fi
            total_rule_width="$available_width"
            ;;
    esac

    if ((total_rule_width < 0)); then
        total_rule_width=0
    fi

    if ((total_rule_width > available_width)); then
        total_rule_width="$available_width"
    fi

    left_width=$((total_rule_width / 2))
    right_width=$((total_rule_width - left_width))
    printf '%s %s\n' "$left_width" "$right_width"
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

grey_ramp() {
    local marker="${1:- }"
    local segment_width="${2:-5}"
    local newline="${3:-true}"
    local segment=''

    if ! [[ "$segment_width" =~ ^[0-9]+$ ]] || ((segment_width < 1)); then
        segment_width=5
    fi

    if [[ "$newline" != "true" && "$newline" != "false" ]]; then
        newline="true"
    fi

    segment="$(build_rule "$marker" "$segment_width")"

    printf '%b' "${RESET}${BG_BRIGHT_WHITE}${FG_BLACK}${segment}${RESET}"
    printf '%b' "${BG_WHITE}${FG_BLACK}${segment}${RESET}"
    printf '%b' "${BG_LIGHT_GREY}${FG_BLACK}${segment}${RESET}"
    printf '%b' "${BG_MID_GREY}${FG_WHITE}${segment}${RESET}"
    printf '%b' "${BG_DARK_GREY}${FG_WHITE}${segment}${RESET}"
    printf '%b' "${BG_BLACK}${FG_WHITE}${segment}${RESET}"

    if [[ "$newline" == "true" ]]; then
        printf '\n'
    fi
}

gray_ramp() {
    grey_ramp "$@"
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

success() { log "[success] ✓ ${1:-}" green; }
info() { log "[info] i ${1:-}" grey; }
warn() { log $'\n'"[warn] ${1:-}" yellow; }
critical() { log $'\n'"[critical] ${1:-}" bg-red; }
err() { log "[error] ${1:-}" red stderr; }
warning() { warn "${1:-}"; }
created() { printf '%b  OK created:%b %s\n' "$(resolve_style green)" "$RESET" "${1:-}"; }
skipped() { printf '%b  - skipped:%b %s\n' "$(resolve_style grey)" "$RESET" "${1:-}"; }
die() {
    critical "${1:-}"
    spacer 2
    exit 1
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

status_color_for_level() {
    local level="${1:-}"

    case "$level" in
        success | ok | pass | passed) printf '%s' green ;;
        info) printf '%s' grey ;;
        warn | warning) printf '%s' yellow ;;
        error | err | failed | fail) printf '%s' red ;;
        critical | fatal) printf '%s' bg-red ;;
        *) printf '%s' "$level" ;;
    esac
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
kabob() {
    local text="${1:-}"
    local width="${2:-auto}"
    local color="${3:-cyan}"
    local invert="${4:-false}"
    local marker="${5:--}"
    local padding="${6:-2}"
    local newline="${7:-true}"
    local text_style="${8:-}"
    local resolved_width
    local text_width
    local middle_width
    local available_width
    local left_width
    local right_width
    local side_widths
    local outer_style
    local inner_style=''
    local term_width

    if ! [[ "$padding" =~ ^[0-9]+$ ]]; then
        padding=2
    fi

    if [[ "$invert" != "true" && "$invert" != "false" ]]; then
        text_style="$invert"
        invert='false'
    fi

    if [[ "$newline" != "true" && "$newline" != "false" ]]; then
        text_style="$newline"
        newline='true'
    fi

    term_width="$(resolve_width auto)"
    text_width="$(visible_length "$text")"
    middle_width=$((text_width + (padding * 2)))
    available_width=$((term_width - middle_width))
    if ((available_width < 0)); then
        available_width=0
    fi

    side_widths="$(resolve_kabob_side_widths "$width" "$available_width")"
    left_width="${side_widths%% *}"
    right_width="${side_widths##* }"
    outer_style="$(resolve_style "$color")"

    if [[ "$invert" == "true" ]]; then
        inner_style+="$REVERSE"
    fi

    if [[ -n "$text_style" ]]; then
        inner_style+="$(resolve_style "$text_style")"
    fi

    printf '%b' "${outer_style}$(build_rule "$marker" "$left_width")"
    printf '%*s' "$padding" ''

    if [[ -n "$inner_style" ]]; then
        printf '%b%s%b' "${outer_style}${inner_style}" "$text" "${RESET}${outer_style}"
    else
        printf '%s' "$text"
    fi

    printf '%*s' "$padding" ''
    printf '%b' "$(build_rule "$marker" "$right_width")${RESET}"

    if [[ "$newline" == "true" ]]; then
        printf '\n'
    fi
}

kebab() {
    kabob "$@"
}

# what is the difference bwetween header and section?
#can an element be centered?
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

section() {
    local title="${1:-}"
    local width='auto'
    local color='cyan'
    local marker='='
    local invert='false'
    local padding='1'
    local newline='true'
    local text_style=''

    if [[ $# -ge 2 ]]; then
        if is_width_spec "${2:-}"; then
            width="${2:-auto}"
            color="${3:-cyan}"
            marker="${4:-=}"
            invert="${5:-false}"
            padding="${6:-1}"
            newline="${7:-true}"
            text_style="${8:-}"
        else
            color="${2:-cyan}"
            marker="${3:-=}"
            invert="${4:-false}"
            padding="${5:-1}"
            newline="${6:-true}"
            text_style="${7:-}"
        fi
    fi

    printf '\n'
    kabob "$title" "$width" "$color" "$invert" "$marker" "$padding" "$newline" "$text_style"
    spacer 1
}

# todo see test file
subheader() {
    log $'\n'"${1:-}" "${2:-bold}"
}

step() {
    local message="${1:-}"
    local style

    style="$(resolve_style "${2:-bold}")"
    log "  -> $message" "$style"
}

status_pair() {
    local key="${1:-}"
    local value="${2:-}"
    local level="${3:-}"
    local delimiter="${4:- }"
    local value_color

    if [[ -n "$level" ]]; then
        value_color="$(status_color_for_level "$level")"
    else
        value_color="$(status_color_for_value "$value")"
    fi

    kv_pair "$key" "$value" "$delimiter" "$value_color" grey
}
# TODO maybe add align option or dim? or bold? idk
kv_pair() {
    local key="${1:-}"
    local value="${2:-}"
    local delimiter="${3:- }"
    local value_color
    local key_color

    value_color="$(resolve_style "${4:-grey}")"
    key_color="$(resolve_style "${5:-bold-mid-grey}")"

    printf '%b%-24s%b %b%b%b\n' "$key_color" "${key}" "$RESET" "${delimiter}${value_color}" "$value" "$RESET"
}

###############################################################################
## Command dispatcher

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
    cmd="${1:-}"
    cmd_alias=''
    shift || true

    if [[ -z "$cmd" ]]; then
        echo "Usage: snail-sh <function> [...args]" >&2
        exit 2
    fi

    if declare -F "$cmd" > /dev/null; then
        "$cmd" "$@"
    else
        cmd_alias="${cmd//-/_}"
        if declare -F "$cmd_alias" > /dev/null; then
            "$cmd_alias" "$@"
        else
            echo "Unknown command: $cmd" >&2
            exit 1
        fi
    fi
fi
