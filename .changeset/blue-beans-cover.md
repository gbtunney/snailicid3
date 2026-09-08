---
'@snailicid3/workspace': patch
---

- Updated `uninstall.sh` script in `@snailicid3/workspace` to preserve `pnpm-lock.yaml` by default
  during cleanup. Added two new flags:
  - `--reset-lockfile`: Deletes `pnpm-lock.yaml` to force re-resolution of dependencies.
  - `--repair-lockfile`: Reconciles the lockfile with current manifests via
    `pnpm install --lockfile-only`.
- Improved help text to clarify the behavior of each mode.
- Added tests to ensure correct behavior for default and flag-based runs.
