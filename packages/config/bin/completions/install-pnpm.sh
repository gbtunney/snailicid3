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

section "Installing pnpm completions for zsh and bash..."

########################################
# ZSH
########################################

ZSH_COMPLETIONS_DIR="$HOME/.zsh/completions"
mkdir -p "$ZSH_COMPLETIONS_DIR"

if pnpm completion zsh > /dev/null 2>&1; then
    pnpm completion zsh > "$ZSH_COMPLETIONS_DIR/_pnpm"

    spacer 1
    status_pair "zsh completions" "✓ installed" "success"

    ZSHRC="$HOME/.zshrc"
    MARKER_BEGIN="# >>> pnpm completions >>>"
    MARKER_END="# <<< pnpm completions <<<"

    touch "$ZSHRC"

    if ! grep -Fq "$MARKER_BEGIN" "$ZSHRC"; then
        {
            echo ""
            echo "$MARKER_BEGIN"
            echo 'fpath=("$HOME/.zsh/completions" $fpath)'
            echo 'autoload -Uz compinit'
            echo 'compinit -i'
            echo "$MARKER_END"
        } >> "$ZSHRC"
        success "✓ updated .zshrc"
    else
        status_pair " " "✓ already configured" "success"
    fi

    rm -f "$HOME"/.zcompdump*
else
    err "✗ pnpm zsh completion not supported"
fi

########################################
# BASH
########################################

BASH_COMPLETIONS_DIR="$HOME/.bash/completions"
mkdir -p "$BASH_COMPLETIONS_DIR"

if pnpm completion bash > /dev/null 2>&1; then
    pnpm completion bash > "$BASH_COMPLETIONS_DIR/pnpm"

    spacer 1
    status_pair "bash completions" "✓ installed" "success"

    BASHRC="$HOME/.bashrc"
    MARKER_BEGIN="# >>> pnpm completions >>>"
    MARKER_END="# <<< pnpm completions <<<"

    touch "$BASHRC"

    if ! grep -Fq "$MARKER_BEGIN" "$BASHRC"; then
        {
            echo ""
            echo "$MARKER_BEGIN"
            echo 'if [ -f "$HOME/.bash/completions/pnpm" ]; then'
            echo '  . "$HOME/.bash/completions/pnpm"'
            echo 'fi'
            echo "$MARKER_END"
        } >> "$BASHRC"
        success "✓ updated .bashrc"
    else
        status_pair " " "✓ already configured" "success"
    fi
else
    err "✗ pnpm bash completion not supported"
fi

########################################
# RELOAD CURRENT SHELL ONLY
########################################

spacer 1
rule "-" 100% fg-dark-grey
spacer 1
info "Reloading current shell..."
success "Complete!"
spacer 1
reload_preferred_shell
