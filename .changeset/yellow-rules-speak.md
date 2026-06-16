---
'@snailicid3/config': minor
'@snailicid3/build-config': patch
---

Updated the shared config API and added first-class Vite build-config support.

For `@snailicid3/config`:

- Added a shared core module with `ConfigApi`, `DefineConfig`, and `defineConfig`.
- Standardized Prettier, EsLint, Markdownlint, and Commitlint around the same
  `Tool.config(options?)` and `Tool.defineConfig(...)` API shape.
- Moved tool-specific extras under namespaced sub-objects such as `options`, `overrides`, `plugins`,
  `rules`, and `files`.
- Removed the old lowercase/snake_case names and positional-argument APIs, including `commitlint`,
  `markdownlint`, `commit_types`, `configuration`, `flatEslintConfig`, and `prettierConfiguration`.
- Updated root config consumers to the new API shape.
- Added a scoped commit escape hatch so `commit:direct` keeps generated commit scopes while skipping
  only the `lint-staged` step.
- Added merge-behavior coverage for each tool config builder.
- Regenerated the API report and refreshed README examples.

For `@snailicid3/build-config`:

- Expanded the Vite adapter into a build-plan driven config adapter with app and library support.
- Added deterministic Vite library output names, DTS plugin wiring, and the public `viteAdapter`.
- Added a React/Vite playground using the same `defineBuildPlan(...)` plus `toViteConfig(...)`
  pattern as tsdown configs.
- Updated shared React/TSX lint handling so the playground lint/fix path works with ESLint 10.
