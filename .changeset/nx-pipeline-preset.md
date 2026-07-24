---
'@snailicid3/config': minor
---

Add a shared Nx pipeline preset under a new `Nx` tool namespace (`src/nx/`), mirroring the existing
`src/markdownlint/` convention. Fragments split by target prefix (`inputs`, `build`, `dev`, `clean`, `test`,
`lint`, `misc`, `root`) deep-merge into one `{ namedInputs, targetDefaults }` preset, emitted by
`build-exporter.ts` as `dist/nx-preset.json` and exposed via the new `./nx-preset.json` package export so
downstream repos can `extends: "@snailicid3/config/nx-preset.json"`.

`Nx.config()` returns the merged preset; `selectTargets`/`prefixTargets` derive the `root:*` target set from the
shared recipes with intra-set `dependsOn` rewiring. A `scripts/render-nx.ts` helper (`nx:render` /
`nx:render:check`) renders a full, self-contained `nx.json` from the same source for snailicid3's own use.
