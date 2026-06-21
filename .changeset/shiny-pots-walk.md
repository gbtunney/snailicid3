---
'@snailicid3/build-config': patch
'@snailicid3/config': patch
---

Clean up the shared config tool APIs and plugin helpers.

`@snailicid3/config` now exposes a more consistent namespace shape across config tools, with each
tool providing `config(...)` for generated/default config and `defineConfig(...)` for typed authored
config. Internal builder helpers are no longer part of the public root API, Markdownlint config
types are exported, and the internal tool registry now proves namespace conformance while exposing
registry entry types for native config/function options.

Prettier plugin helpers were reorganized around clearer names. The confusing `builtIn`, `bundled`,
and `list` plugin helpers were replaced with `Prettier.plugins.default()` and
`Prettier.plugins.packageNames()`, backed by a renamed plugin registry module. `useResolvedPlugins`
was added as the clearer option name while keeping existing behavior compatible.

TypeDoc config moved into `@snailicid3/config` and now follows the same namespace format, including
`Typedoc.config(...)`, `Typedoc.defineConfig(...)`, and focused markdown/material-theme/vitepress
helpers. TypeDoc plugin package names are centralized in a registry instead of being scattered
across presets, including VitePress theme support.

Typedoc consumers in `@snailicid3/build-config` were updated to use the new config package helpers,
and the commitlint CLI integration test timeout was increased to avoid false failures under
Nx/Vitest coverage.
