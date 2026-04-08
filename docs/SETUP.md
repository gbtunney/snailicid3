# Codespace / Dev Environment Setup

## Requirements

| Tool | Version |
|---|---|
| Node.js | >= 20.x |
| pnpm | >= 10.0.0 |
| Python | >= 3.11 (for workspace-tools bin/python scripts) |

## Quick start

```bash
pnpm install
pnpm build:self   # compile root tsconfig references
pnpm nx:build     # build all packages bottom-up via Nx
```

## First-time codespace setup

```bash
# Install pnpm if not present
npm install -g pnpm@10

# Install dependencies
pnpm install

# Make shell scripts executable
python3 packages/workspace-tools/bin/python/make_executable.py './packages/workspace-tools/bin/shell/*.sh'
```

## Useful commands

```bash
# Diagnostics
pnpm report           # run all report scripts (env, repo, workspace, prettier)
pnpm report:env       # python env_diagnostics.py
pnpm report:repo      # python repo_status.py
pnpm report:workspace # pnpm outdated -r
pnpm report:prettier  # prettier check

# Build
pnpm build            # build:self + nx run-many build
pnpm nx:build:ts      # tsc-only pass across all packages

# Nx
pnpm nx:graph         # open dependency graph in browser
pnpm nx:reset         # clear Nx cache

# Code style
pnpm fix              # prettier --write + eslint --fix + markdownlint --fix
pnpm check            # lint + prettier --check (read-only)
```

## Nx target reference

All targets are defined globally in `nx.json` — packages don't need to repeat them.

| Target | Cached | Notes |
|---|---|---|
| `build:ts` | yes | `tsc --build` |
| `build:rollup` | yes | depends on build:ts |
| `build` | yes | depends on build:ts + build:rollup |
| `test` | yes | `vitest run` |
| `lint` | yes | `eslint` |
| `typecheck` | yes | `tsc --noEmit` |
| `fix` | **no** | mutates files — never cached |
| `clean` | no | depends on clean:ts + clean:build |
| `docs:build` | yes | `typedoc` |

## Package dependency graph

See `docs/PACKAGE_MAP.md` for the full dependency graph and per-package details.

## GitHub issue tooling

```bash
# Create repo labels (run once per repo)
python3 packages/workspace-tools/bin/python/issues/repo_labels.py

# Create an issue
python3 packages/workspace-tools/bin/python/issues/create.py \
  --title "..." --type task --scope utils --summary "..."

# Seed example issues
python3 packages/workspace-tools/bin/python/issues/seed_issues.py
```

Requires `gh` CLI authenticated with `issues:write`.
