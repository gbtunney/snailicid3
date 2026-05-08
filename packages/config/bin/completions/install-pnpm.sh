#!/usr/bin/env bash
set -euo pipefail
snail_sh() {
    pnpm exec snail-sh "$@"
}

snail-sh section "Installing pnpm completions for zsh and bash..."

########################################
# ZSH
########################################

ZSH_COMPLETIONS_DIR="$HOME/.zsh/completions"
mkdir -p "$ZSH_COMPLETIONS_DIR"

if pnpm completion zsh > /dev/null 2>&1; then
    pnpm completion zsh > "$ZSH_COMPLETIONS_DIR/_pnpm"

    snail-sh spacer 2
    snail-sh status_pair "zsh completions" "✓ installed" "success"

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
        echo "✓ updated .zshrc"
    else
        snail-sh status_pair " " "✓ already configured" "success"
        snail-sh spacer 2
    fi

    rm -f "$HOME"/.zcompdump*
else
    echo "✗ pnpm zsh completion not supported"
fi

########################################
# BASH
########################################

BASH_COMPLETIONS_DIR="$HOME/.bash/completions"
mkdir -p "$BASH_COMPLETIONS_DIR"

if pnpm completion bash > /dev/null 2>&1; then
    pnpm completion bash > "$BASH_COMPLETIONS_DIR/pnpm"
    echo "✓ bash completions installed"

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
        echo "✓ updated .bashrc"
    else
        echo "• .bashrc already configured"
    fi
else
    echo "✗ pnpm bash completion not supported"
fi

########################################
# RELOAD CURRENT SHELL ONLY
########################################

echo ""
echo "Reloading current shell..."

if [ -n "${ZSH_VERSION:-}" ]; then
    exec zsh
elif [ -n "${BASH_VERSION:-}" ]; then
    exec bash
else
    echo "Unknown shell. Run manually:"
    echo "  exec zsh   or   exec bash"
fi
EOF
