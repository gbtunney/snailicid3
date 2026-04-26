#!/usr/bin/env bash
# Combined logging helpers for shell scripts.
#
# This module consolidates the original `sh‑logger.sh` with the legacy
# `sh‑logger‑old.sh` API.  It exposes colour constants, style helpers,
# horizontal rule helpers and higher‑level logging functions (log,
# success, info, warn, critical, err, header, subheader, line, hrule,
# kv_pair, etc.).  It can be sourced from other bash scripts or
# executed directly to dispatch defined functions.

if [ -z "${BASH_VERSION:-}" ]; then
    echo "Error: sh-logger.sh requires bash." >&2
    return 1 2> /dev/null || exit 1
fi

###############################################################################
## Colour definitions
##
## All colour variables use the ANSI escape sequences wrapped in `$'...'` to
## ensure proper interpretation of backslash escapes.  Both foreground and
## background variants are provided along with bright versions where
## appropriate.  A small grey ramp is included for building gradients.

# Primary foreground colours
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

# Bright foreground variants
BRIGHT_WHITE=$'\033[0;97m'
BRIGHT_GREY=$'\033[0;37m'
BRIGHT_MAGENTA=$'\033[0;95m'
BRIGHT_BLUE=$'\033[0;94m'
BRIGHT_CYAN=$'\033[0;96m'
BRIGHT_GREEN=$'\033[0;92m'
BRIGHT_YELLOW=$'\033[0;93m'
BRIGHT_ORANGE=$'\033[38;5;214m'
BRIGHT_RED=$'\033[0;91m'

# Background colours
BG_BLACK=$'\033[40m'
BG_WHITE=$'\033[47m'
BG_GREY=$'\033[100m'
BG_MAGENTA=$'\033[45m'
BG_BLUE=$'\033[44m'
BG_CYAN=$'\033[46m'
BG_GREEN=$'\033[42m'
BG_YELLOW=$'\033[43m'
BG_ORANGE=$'\033[48;5;208m'
BG_RED=$'\033[41m'

# Bright background colours
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

## Aliases for convenience and backwards compatibility
# In previous implementations GREY/GRAY were spelt differently and some
# variables were missing.  These aliases make the API more tolerant of
# existing scripts.
GRAY="$GREY"
BG_GRAY="$BG_GREY"
BRIGHT_GRAY="$BRIGHT_GREY"
BG_BRIGHT_GRAY="$BG_BRIGHT_GREY"
BRIGHT_BLACK="$GREY"

###############################################################################
## Style attributes
##
# Additional attributes for styling output.  These can be combined with
# colours when printing.
BOLD=$'\033[1m'
UNDERLINE=$'\033[4m'
REVERSE=$'\033[7m'
RESET=$'\033[0m'

###############################################################################
## Ramp definitions
##
# Additional greyscale ramps for backgrounds and foregrounds.  Useful for
# building gradients or boxes with subtle shading.
BG_BLACK=$'\033[48;5;232m'
BG_DARK_GREY=$'\033[48;5;238m'
BG_MID_GREY=$'\033[48;5;244m'
BG_LIGHT_GREY=$'\033[48;5;250m'
BG_WHITE=$'\033[48;5;255m'

FG_BLACK=$'\033[38;5;232m'
FG_DARK_GREY=$'\033[38;5;238m'
FG_MID_GREY=$'\033[38;5;244m'
FG_LIGHT_GREY=$'\033[38;5;250m'
FG_WHITE=$'\033[38;5;255m'

###############################################################################
## Terminal width helpers
##
# Utility to detect the current terminal width.  Falls back to 80 columns
# if the width cannot be determined.
get_terminal_width() {
    local width="${COLUMNS:-}"
    if [[ "$width" =~ ^[0-9]+$ ]] && ((width > 0)); then
        printf '%s\n' "$width"
        return
    fi
    width="$(tput cols 2> /dev/null)"
    if [[ "$width" =~ ^[0-9]+$ ]] && ((width > 0)); then
        printf '%s\n' "$width"
        return
    fi
    printf '80\n'
}

# Normalise and resolve a requested width specification.  Accepts:
#   - blank or "auto" for full terminal width
#   - numeric values (e.g. 40)
#   - percentages (e.g. 50%)
resolve_width() {
    local width="$1"
    local term_width
    # trim leading/trailing whitespace
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

###############################################################################
## Core horizontal rule generator
##
# `rule` prints one or more horizontal lines composed of a specified marker.
# The width can be a number, a percentage of terminal width or "auto" for
# full width.  A repeat count and newline control can also be specified.
# Examples:
#   rule                    # full width line of = characters
#   rule "-" 40 2          # 2 lines of 40 dashes
#   rule "*" 25% 3 false   # 3 lines at 25% width printed consecutively
rule() {
    local marker="${1:-=}"
    local requested_width="${2:-auto}"
    local repeat="${3:-1}"
    local newline="${4:-true}"
    local width
    local line=''
    local i

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
        if [[ "$newline" == "true" || $i -lt $((repeat - 1)) ]]; then
            printf '%b\n' "$line"
        else
            printf '%b' "$line"
        fi
    done
}

###############################################################################
## Legacy logging functions
##
# The following functions mirror the API exposed by the previous
# `sh‑logger‑old.sh`.  They leverage the colour variables defined above and
# allow logging to stdout or stderr.  Additional helpers implement
# spacers, repeated patterns and key/value formatting.

# Print a coloured message.  The third argument can be "stderr" to
# redirect output to stderr.
log() {
    local message="$1"
    local color="${2:-$RESET}"
    local output="${3:-stdout}"
    if [[ "$output" == "stderr" ]]; then
        printf '%b\n' "${color}${message}${RESET}" >&2
        return
    fi
    printf '%b\n' "${color}${message}${RESET}"
}

# High‑level log wrappers
success() { log "[success] OK $1" "$GREEN"; }
info() { log "[info] i $1" "$GRAY"; }
warn() { log $'\n'"[warn] $1" "$YELLOW"; }
critical() { log $'\n'"[critical] $1" "$BG_RED"; }
err() { log "[error] $1" "$RED" "stderr"; }
# synonyms and additional wrappers
warning() { warn "$1"; }
created() { printf '%b  OK created:%b %s\n' "$GREEN" "$RESET" "$1"; }
skipped() { printf '%b  - skipped:%b %s\n' "$GRAY" "$RESET" "$1"; }

# Step indicator
step() {
    local message="$1"
    local style="${2:-$BOLD}"
    log "  -> $message" "$style"
}

# Print a stable section header used by report scripts.
section() {
    local title="$1"
    local color="${2:-$CYAN}"
    printf '\n%b=== %s ===%b\n' "$color" "$title" "$RESET"
}

status_color_for_value() {
    local value="$1"
    case "$value" in
        clean)
            printf '%s' "$GREEN"
            ;;
        dirty)
            printf '%s' "$YELLOW"
            ;;
        'command failed (non-blocking)')
            printf '%s' "$YELLOW"
            ;;
        'pnpm not installed')
            printf '%s' "$RED"
            ;;
        *)
            printf '%s' "$GRAY"
            ;;
    esac
}

status_pair() {
    local key="$1"
    local value="$2"
    local value_color
    value_color="$(status_color_for_value "$value")"
    kv_pair "$key" "$value" ":" "$value_color" "$GRAY"
}

# Vertical spacer.  Prints a number of blank lines (default 1).
spacer() {
    local height="${1:-1}"
    if ! [[ "$height" =~ ^[0-9]+$ ]] || [[ "$height" -lt 1 ]]; then
        height=1
    fi
    for ((index = 0; index < height; index++)); do
        printf '\n'
    done
}

# Build a repeated character string of a given width.
build_rule() {
    local marker="${1:--}"
    local width="${2:-40}"
    local rule=""
    if ! [[ "$width" =~ ^[0-9]+$ ]] || [[ "$width" -lt 1 ]]; then
        width=40
    fi
    printf -v rule '%*s' "$width" ''
    printf '%s' "${rule// /$marker}"
}

# Create a horizontal repeater (multiple lines) using the build_rule helper.
hrepeater() {
    local marker="${1:--}"
    local width="${2:-40}"
    local height="${3:-1}"
    local repeated_line=""
    local output=""
    if ! [[ "$height" =~ ^[0-9]+$ ]] || [[ "$height" -lt 1 ]]; then
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

# Print a header with markers on either side.
header() {
    local message="$1"
    local width="${2:-3}"
    local color="${3:-$CYAN}"
    local marker="${4:-=}"
    local height="${5:-1}"
    if ! [[ "$width" =~ ^[0-9]+$ ]] || [[ "$width" -lt 1 ]]; then
        width=3
    fi
    local rule="$(hrepeater "$marker" "$width" "$height")"
    log $'\n'"${rule} ${message} ${rule}" "$color"
}

# Print a subheader (message only, optional colour).
subheader() {
    log $'\n'"$1" "${2:-$BOLD}"
}

# Draw a line or print a literal string.  Arguments:
#   line [marker_or_text] [width] [color] [height] [include_newline]
# If the marker_or_text is longer than one character and width is omitted,
# the text is printed verbatim in the given colour.
line() {
    local marker_or_text="${1:--}"
    local width="${2:-40}"
    local color="${3:-$CYAN}"
    local height="1"
    local include_newline="false"
    local fourth_arg="${4:-}"
    if [[ "$fourth_arg" == "true" || "$fourth_arg" == "false" ]]; then
        include_newline="$fourth_arg"
    else
        height="${4:-1}"
        include_newline="${5:-false}"
    fi
    local output=""
    if [[ ${#marker_or_text} -gt 1 ]] && { [[ $# -eq 1 ]] || ! [[ "$2" =~ ^[0-9]+$ ]]; }; then
        output="$marker_or_text"
        color="${2:-$CYAN}"
    else
        output="$(hrepeater "$marker_or_text" "$width" "$height")"
    fi
    if [[ "$include_newline" == "true" ]]; then
        log $'\n'"$output" "$color"
        return
    fi
    log "$output" "$color"
}

# Draw a horizontal rule and always prefix with a newline.  Alias for line().
hrule() { line "${1:--}" "${2:-40}" "${3:-$CYAN}" "${4:-1}" true; }

# Print a padded key/value pair on a single line.  Parameters:
#   kv_pair <key> <value> [delimiter] [value_color] [key_color]
# Defaults: delimiter=" :", value_color="$RESET", key_color="$GRAY".
kv_pair() {
    local key="$1"
    local value="$2"
    local delimiter="${3:-:}"
    local value_color="${4:-$RESET}"
    local key_color="${5:-$GRAY}"
    printf '%b%-24s%b %b%b%b\n' "$key_color" "${key}${delimiter}" "$RESET" "$value_color" "$value" "$RESET"
}

###############################################################################
## Command dispatcher
##
# When this script is executed directly (rather than sourced), dispatch a
# function based on the first argument.  This mirrors the behaviour of
# the original implementation, allowing usage such as:
#   ./sh-logger.sh rule "=" 40 2
# or
#   ./sh-logger.sh header "Title" 4 "$GREEN"
if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
    cmd="$1"
    shift
    if declare -F "$cmd" > /dev/null; then
        "$cmd" "$@"
    else
        echo "Unknown command: $cmd" >&2
        exit 1
    fi
fi
