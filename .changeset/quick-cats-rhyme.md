---
'@snailicid3/config': minor
---

Add a shared Nx pipeline preset under a new `Nx` tool namespace (`src/nx/`), mirroring the existing
`src/markdownlint/` convention. Fragments split by target prefix (`inputs`, `build`, `dev`, `clean`,
`test`, `lint`, `misc`, `root`) deep-merge into one `{ namedInputs, targetDefaults }` preset,
emitted by `build-exporter.ts` as `dist/nx-preset.json` and exposed via a new `./nx-preset.json`
export subpath so downstream repos can write `extends: "@snailicid3/config/nx-preset.json"` in their
`nx.json`.

`Nx.config()` returns the merged preset; `selectTargets` / `prefixTargets` derive the `root:*`
target set from the shared recipes, rewiring intra-set `dependsOn`. A `scripts/render-nx.ts` helper
(`nx:render` / `nx:render:check`) renders a full, self-contained `nx.json` from the same source for
snailicid3's own use, since it cannot `extends` an artifact produced by building itself.

Two pipeline corrections are included: `build:ts` (and the other targets needing upstream types)
depends on `^build` rather than `^build:ts`, because bundled packages emit their declarations from
the bundler rather than from tsc; and `clean:ts` now also cleans `tsconfig.build.json` and removes
`node_modules/.tmp`, where `tsBuildInfoFile` lives — the previous command left it behind, so tsc
reported "up to date" after a clean and emitted nothing.
