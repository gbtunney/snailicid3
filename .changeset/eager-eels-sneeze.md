---
'@snailicid3/build-config': patch
'@snailicid3/config': patch
'@snailicid3/utils': patch
---

fixed typescript eslint error

Fix lint-staged markdownlint behavior and markdownlint config:

- Run `markdownlint-cli2` on staged `.md` files only (avoid repo-wide lint runs)
- Add/repair markdownlint ignores for generated instruction docs
- Align markdownlint code-block rules with fenced blocks
