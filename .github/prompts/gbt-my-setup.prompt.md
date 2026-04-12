---
description: 'Workspace setup checklist and actions for Copilot Chat. Use `/my-setup` to trigger.'
---

# Workspace Setup Checklist (Current)

- [ ] Install completions and recommended extensions
- [ ] Sync/pull template files from upstream if needed
- [ ] Push updated config or template files to template repo if changed
- [ ] Run `pnpm install` at root
- [ ] Check for outdated dependencies
- [ ] Review and apply workspace instructions in `.github/instructions/`
- [ ] Confirm Copilot Chat keybindings are set for Ask/Edit modes
- [ ] Review README for project-specific notes

## Actions

- To install completions: `/install-completions` or ask Copilot Chat
- To sync template: `/sync-template` or ask Copilot Chat to pull from template-upstream
- To push template: `/push-template` or ask Copilot Chat to push to template-upstream
- To check dependencies: `/check-deps` or ask Copilot Chat to check for outdated packages

_Keep this checklist up to date with only actionable, current setup steps. Remove or update any items that
become obsolete._

---

Type `/my-setup` in Copilot Chat to insert this checklist and instructions.

---

**To run a code block directly:**

- Copy the code block from the prompt and paste it into your terminal.
- For shell scripts, you can also save the block to a file (e.g., `setup.sh`), then run `bash setup.sh` or
  `zsh setup.sh`.
- Copilot Chat cannot execute code blocks automatically; manual copy-paste is required for now.
