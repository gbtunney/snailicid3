---
'@snailicid3/config': patch
---

Improve config package portability across GitHub Actions, local package execution, and release
validation workflows.

Updates shared reporting scripts to respect an existing `ROOT_DIR`, use the published `snail-sh` bin
through `pnpm exec`, tolerate missing `packages` or `apps` directories, and skip the expensive
`pnpm outdated -r` report unless explicitly enabled.

Moves CI environment/repository/workspace reporting after install setup, adds an Nx report step,
adds a combined local reporting script, and makes release PR validation manually runnable and safe
when `GITHUB_HEAD_REF` is unavailable.

Updates the release workflow so version-bump creation can trigger `pr-release.yml` validation on
`release/main`.

Also relaxes config linting defaults by allowing common short parameter names like `id`, `db`, `fs`,
`ctx`, `req`, and `res`, and adjusts markdownlint line-length behavior for headings/tables.

- Fixes #86
- Fixes #87
- Fixes #84
- Fixes #78
