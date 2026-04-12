---
description:
  'Install completions and recommended extensions for this workspace. Use `/pnpm-install-completions` to
  trigger.'
---

# Install Completions and Extensions

To set up completions and recommended extensions for this workspace, run the following commands in the root
directory:

```sh
# Ensure pnpm is installed and dependencies are set up
pnpm install

# Create a local zsh completions dir and install pnpm completion into it
if [ -z "${ZSH_VERSION:-}" ]; then
  echo "Error: this snippet is for zsh. Current shell isn't zsh (try: exec zsh)." >&2
else
  mkdir -p ~/.zsh/completions

  # Prefer a real capability check over parsing help text.
  if pnpm completion zsh > /dev/null 2>&1; then
    pnpm completion zsh > ~/.zsh/completions/_pnpm
    echo "Installed: ~/.zsh/completions/_pnpm"

    # Auto-update ~/.zshrc (with backup) to load the completions directory.
    ZSHRC="${HOME}/.zshrc"
    MARKER_BEGIN="# >>> pnpm completions >>>"
    MARKER_END="# <<< pnpm completions <<<"

    # Ensure the file exists, then back it up.
    touch "$ZSHRC"
    cp -f "$ZSHRC" "${ZSHRC}.bk"

    if ! grep -Fq "$MARKER_BEGIN" "$ZSHRC"; then
      {
        echo ""
        echo "$MARKER_BEGIN"
        echo 'fpath=(~/.zsh/completions $fpath)'
        echo "# Ensure completion system is initialized (ok if already done elsewhere)"
        echo 'autoload -Uz compinit && compinit'
        echo "$MARKER_END"
      } >> "$ZSHRC"
      echo "Updated: $ZSHRC (backup: ${ZSHRC}.bk)"
      echo "Reload with: exec zsh"
    else
      echo "No change: $ZSHRC already contains pnpm completions snippet (backup: ${ZSHRC}.bk)"
    fi

    echo "If completions still don't load, try:"
    echo "  rm -f ~/.zcompdump* && exec zsh"
  else
    echo "Error: this pnpm doesn't provide 'pnpm completion'. Update pnpm and try again." >&2
    echo "Try: pnpm completion --help" >&2
  fi
fi
```

You can copy and run these commands manually, or ask Copilot Chat to explain or execute them for you.

---

Type `/pnpm-install-completions` in Copilot Chat to insert these setup instructions.
