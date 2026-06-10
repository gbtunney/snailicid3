---
'@snailicid3/build-config': patch
'@snailicid3/config': patch
---

- Improved shell logging and completion output behavior in config scripts.
- Added commitlint support and convenience scripts.
- Added bootstrap support for shell scripts across config/root.
- Fixed and restored preferred shell handling, including zsh-related flow.
- Updated dependencies across the monorepo, including build-config and config.
- Centralized release automation through `call-release-plan.yml` and added detector outputs for
  pending changeset slugs to drive release branch naming.
- Added optional `disable_nx_cloud` pipeline input that overrides `vars.DISABLE_NX_CLOUD` when set
  and falls back to the repo variable when unset.
