# Scaffold Procedure

Clone consumer template repo: `git clone https://github.com/gbtunney/gbt-template-boilerplate.git`

> Require a clean repository

- Config files (commit these first before proceeding)
  - .gitignore
  - .lintstagedrc.mts
  - .markdownlint-cli2.mts
  - eslint.config.ts
  - prettier.config.ts
  - commitlint.config.ts
  - tsconfig.json

then copy:

- `cp -r` folders
  - .husky
  - .changeset
  - .github (might need to hold off, idk?) EXCEPT.github/ISSUE_TEMPLATE
  - .vscode

- **backups** ( add .bk.\* to old filename)
  - README.md
  - package.json

- **nx**: _might not be nessicary for single package repo but package.json need to be adjusted_
  - nx.json
  - project.json

- if **multipackage** repo:
  - mkdir (packages if it doesnt excist) then copy example-package contents (no node_modules)
  - mkdir apps
  - pnpm-workspace.yaml
