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

#TODO: reverse kabob like >>>>---- WORD ------<<< with styles on center  , someday maybe do a flexible padding
#TODO FULL WIDTH kabob  TERMINAL (((total width- length of word ) / 2 ) - padd*2 ) - length of word  OR width padd word padd width
#TODO: fill line Like "Section 1:Here --------------rest of line----------------------"
# TODO a text heading: with an $underline tht is automatic ( ie just a space )
echo ${RED}----${GREEN}------

printf '%b' ${ORANGE}
rule
printf '%b' ${REVERSE}
rule "="
echo ${RESET}

echo ${ORANGE}
kabob "I AM A${BOLD} SECTION${RESET}" 50% orange true "-"

#PERCENT WIDTH HRULE
echo ${ORANGE}
kabob "I AM A${BOLD} SECTION${RESET}" 50% orange true "-"
printf '%b' ${RESET}

#FIXED WIDTH HRULE
COLOR=$MAGENTA
WIDTH=20%
HEIGHT=1
INVERT=$REVERSE # can this be a boolean?
DELIMITER=" : "
PREFIX="SECTION"
CONTENT_TEXT="Colors and Stuff"
kabob "${PREFIX}${DELIMITER}${CONTENT_TEXT}" "$WIDTH" "$COLOR" true "-"
printf '%b' ${RESET}

#FIXED WIDTH HRULE
COLOR=$GREEN
WIDTH=8
HEIGHT=1
INVERT=""
CONTENT_TEXT=" I AM A${BOLD} KITTEN "
kabob "${CONTENT_TEXT}" "$WIDTH" "$COLOR" false "-"
printf '%b' ${RESET}

# LR padding - hspacer
WIDTH=4
printf ${RESET}
rule " " ${WIDTH} 1 false
printf "PADDED:"

# this should become a spacer func, w height as param
#vspacer
HEIGHT=2
rule "${RESET}" 1 ${HEIGHT} true

#COLORED HRULE  (full width)  [width] [height]
COLOR=$GREY
WIDTH=auto
HEIGHT=1
INVERT="" #always true for these boxes
printf '%b' ${RESET}${COLOR}${INVERT}
rule " " $WIDTH $HEIGHT
printf '%b' ${RESET}

echo "50% magenta:"
#COLORED HRULE  (25% width)  [width] [height]
COLOR=$MAGENTA
WIDTH=50%
HEIGHT=1
INVERT=$REVERSE
printf '%b' ${RESET}${COLOR}${INVERT}
rule " " $WIDTH $HEIGHT
printf '%b' ${RESET}

##COLORED HRULE  (full width)  [width] [height]
printf '%b' ${YELLOW}${REVERSE}
rule " " auto 1
printf '%b' ${RESET}
# SPACER
rule " " 1 2

# swatch [width=value] [height=value]
echo "square (box):"
WIDTH=4
HEIGHT=$WIDTH #should be .5xw maybe to compensate for char aspect ratio?
COLOR=$BLUE
INVERT=$REVERSE
NEWLINE=true
printf ${RESET}${COLOR}${INVERT}
rule "~" ${WIDTH} ${HEIGHT} ${NEWLINE}
printf ${RESET}
rule " " 1 2

# inline swatch [width=value] [height=value]
WIDTH=1
HEIGHT=$WIDTH #should be .5xw maybe to compensate for char aspect ratio?
COLOR=$BRIGHT_BLUE
INVERT=$REVERSE
NEWLINE=false
printf ${RESET}${COLOR}${INVERT}
rule " " ${WIDTH} ${HEIGHT} ${NEWLINE}
printf ${RESET}
printf ${RESET}
rule " " ${WIDTH} 1 false

#"  I AM A HEADING  "  rule "-" 25% 1 false;

rule "-" 25% 1 false
echo ${RESET}

rule
rule "="
printf '%b' ${REVERSE}${RED}
rule "=" auto
rule "=" "" 3
rule "=" 40 2
rule "=" 50% 1

echo "${RED}BEFORE :: ${REVERSE}REVERSE RED${RESET}"
echo "${BRIGHT_RED}BEFORE :: ${REVERSE}REVERSE BRIGHT_RED${RESET}"

echo "${ORANGE}BEFORE :: ${REVERSE}REVERSE ORANGE${RESET}"
echo "${BRIGHT_ORANGE}BEFORE :: ${REVERSE}REVERSE BRIGHT_ORANGE${RESET}"

echo "${DIM_YELLOW}BEFORE :: ${REVERSE}REVERSE DIM_YELLOW${RESET}"
echo "${YELLOW}BEFORE :: ${REVERSE}REVERSE YELLOW${RESET}"
echo "${BRIGHT_YELLOW}BEFORE :: ${REVERSE}REVERSE BRIGHT_YELLOW${RESET}"

#echo "${BRIGHT_YELLOW}BEFORE :: ${REVERSE}REVERSE BRIGHT_YELLOW${RESET}";

echo "${GREEN}BEFORE :: ${REVERSE}REVERSE GREEN${RESET}"
echo "${BRIGHT_GREEN}BEFORE :: ${REVERSE}REVERSE BRIGHT_GREEN${RESET}"

echo "${CYAN}BEFORE :: ${REVERSE}REVERSE CYAN${RESET}"
echo "${BRIGHT_CYAN}BEFORE :: ${REVERSE}REVERSE CYAN${RESET}"

echo "${BLUE}BEFORE :: ${REVERSE}REVERSE BLUE${RESET}"
echo "${BRIGHT_BLUE}BEFORE :: ${REVERSE}REVERSE BRIGHT_BLUE${RESET}"

echo "${MAGENTA}BEFORE :: ${REVERSE}REVERSE MAGENTA${RESET}"
echo "${BRIGHT_MAGENTA}BEFORE :: ${REVERSE}REVERSE BRIGHT_MAGENTA${RESET}"

echo "${BRIGHT_WHITE}BEFORE :: ${REVERSE}REVERSE BRIGHT_WHITE${RESET}"
echo "${WHITE}BEFORE :: ${REVERSE}REVERSE WHITE${RESET}"
echo "${GREY}BEFORE :: ${REVERSE}REVERSE GREY${RESET}"
echo "${BLACK}BEFORE :: ${REVERSE}REVERSE BLACK${RESET}"

rule " " auto 1
rule "~" 20% 1
rule " " auto 2

#RAINBOW  FG
WIDTH=auto #doesnt do anything
HEIGHT=4   #should be .5xw maybe to compensate for char aspect ratio?
INVERT=$REVERSE
CHAR="${INVERT}-----"

NEWLINE=false
#RAINBOW_COLORS=($RED $BRIGHT_RED $ORANGE $BRIGHT_YELLOW $GREEN $CYAN $BLUE $MAGENTA $BLACK)
#RAINBOW=${RESET}${BRIGHT_RED}${CHAR}${REVERSE}${RED}${CHAR}${ORANGE}${CHAR}${YELLOW}${CHAR}${GREEN}${CHAR}${CYAN}${CHAR}${BLUE}${CHAR}${MAGENTA}${CHAR}${BLACK}${CHAR}
#printf first ${RAINBOW};

RAINBOW="${RESET}${BRIGHT_RED}${CHAR}${RED}${CHAR}${ORANGE}${CHAR}${YELLOW}${CHAR}${GREEN}${CHAR}${CYAN}${CHAR}${BLUE}${CHAR}${MAGENTA}${CHAR}${BRIGHT_MAGENTA}${CHAR}${BLACK}${CHAR}EBD${RESET}"
#  u wanted to be able to toggle this to bg

#GREY RAMP WIP
WIDTH=auto #doesnt do anything
HEIGHT=4   #should be .5xw maybe to compensate for char aspect ratio?
INVERT=$REVERSE
CHAR="${INVERT}-----"

GREY_RAMP="${RESET}${BRIGHT_WHITE}${CHAR}${WHITE}${CHAR}${MID_GREY}${CHAR}${GREY}${CHAR}${BLACK}${CHAR}EBD${RESET}"
echo $GREY_RAMP

#MID_GREY

#printf '%b' ${REVERSE}${MAGENTA}
#TODO lets make this the new 'subheader? i dont know how the width is set, is it possible to use the dim option?'
WIDTH=40%
HEIGHT=1 #should be .5xw maybe to compensate for char aspect ratio?
COLOR=$MAGENTA
INVERT=""
TEXT_CONTENT="I am an underlined first magenta line"
NEWLINE=true
printf "${RESET}${COLOR}${UNDERLINE}${TEXT_CONTENT}"
rule " " $WIDTH 1 $NEWLINE
echo $RESET
#todo - line break should do after text?

WIDTH=40%
HEIGHT=2
COLOR=$MAGENTA
INVERT=""
TEXT_CONTENT="I am an underlined magenta line"
NEWLINE=true
printf "${RESET}${COLOR}${UNDERLINE}${TEXT_CONTENT}"
rule " " $WIDTH $HEIGHT $NEWLINE

WIDTH=40%
HEIGHT=1 #should be .5xw maybe to compensate for char aspect ratio?
COLOR=$MAGENTA
INVERT=""
NEWLINE=true
printf "${RESET}${COLOR}${UNDERLINE}I am an underlined magenta line"
rule " " $WIDTH 1 $NEWLINE
echo $RESET
#todo - line break should do after text?

rule "${RED}=${RESET}--${GREEN}----" auto 3

printf ${RESET}
rule "${REVERSE}${BRIGHT_RED}${CHAR}${RED}${CHAR}${ORANGE}${CHAR}${BRIGHT_YELLOW}${CHAR}${GREEN}${CHAR}${CYAN}${CHAR}${BLUE}${CHAR}${MAGENTA}${CHAR}${BLACK}${CHAR}${RESET}" auto $HEIGHT $NEWLINE
echo ${RESET}

echo

printf "END OF LINE"

rule "=" auto
rule " " 50% 4
rule "+" "" 3
rule "=" 40 2
rule "=" 50% 1

header "GBTBuild" "50%" bright-cyan "="
section "Default Section"
section "Flexible Section" 50% bright-cyan "=" true 2
section "Short Marker Section" green "-|"
spacer 2
rule "-|" "50%" bg-cyan
rule "-|" "50%" 3 true bg-bright-orange

line "-|" "50%" bg-cyan
line "-|" "50%" bg-red 3

header "Key Value Pairs" "25%" bright-green "-"
kv_pair "package" "snailicid3" "  :" bright-cyan grey
kv_pair "package" "snailicid3" "  :" bg-bright-cyan bright-cyan

kv_pair "version" "0.0.0-dev" "=" yellow grey
kv_pair "install path" "$PACKAGE_DIR" ":  " magenta grey
status_pair "workspace" "dirty"
status_pair "workspace" "dirty" warn
status_pair "shell tests" "clean"
status_pair "pnpm" "pnpm not installed"

COLOR=$GREEN
WIDTH='20'
HEIGHT=1
INVERT=true
CONTENT_TEXT=" I AM A${BOLD} KITTEN "
kabob "${CONTENT_TEXT}" "$WIDTH" "$COLOR" true "--|" 2

#reverse option
kabob "${CONTENT_TEXT}" "30" "$COLOR" true "----|" 2

kabob "${CONTENT_TEXT}" "50" "$COLOR" true "--|" 2

section "Flexible Section" 50% bright-cyan "=" true 4

#width test
kabob "[debug]" "100%" "fg-light-grey" true "=" 8
kabob "[debug] reload_preferred_shell_reload" "100%" "fg-light-grey" true "=" 8
kabob "[debug]" "100%" "fg-light-grey" true "=" 1
kabob "[debug] reload_preferred_shell_reload" "100%" "fg-light-grey" true "=" 1
kabob "[debug]" "60%" "fg-light-grey" true "=" 1
kabob "[debug] reload_preferred_shell_reload" "60%" "fg-light-grey" true "=" 1
