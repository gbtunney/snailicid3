---
description:
  'Best practices and actions for managing .gitignore in this workspace. Use `/gitignore` to trigger.'
---

# .gitignore Management

- Review and update `.gitignore` to exclude logs, build artifacts, and sensitive files.
- Use language- and tool-specific templates from https://github.com/github/gitignore as a base.
- To add a new ignore rule, append it to `.gitignore` and commit the change.
- To check if a file is ignored:
  ```sh
  git check-ignore -v path/to/file
  ```
- To see all ignored files:
  ```sh
  git status --ignored
  ```

_You can edit this prompt as your workflow evolves._

---

Type `/gitignore` in Copilot Chat to insert these instructions.
