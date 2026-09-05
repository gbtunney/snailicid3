---
'@snailicid3/build-config': minor
---

Make package validation impossible from a build.

The tsdown adapter now forces `publint`, `attw` and `unused` off, and forces `exports` off. The
first three are package validation — Doctor's question, asked of a packed artifact — and running
them from a build fails builds for reasons the build did not cause. They are forced rather than left
to tsdown's defaults, which already agree today: a default can change under a tsdown upgrade or a
merged user config, while an explicit `false` is a decision the adapter states.

`exports` is a write switch rather than a validation one. tsdown's exports feature rewrites the
`exports` field of `package.json` to point at generated files, and the manifest here is
hand-authored — an input to the build, never an output of it. This is unrelated to the build plan's
own `exports` flag, which only selects entries for `toPackageExportsPlan`.

**Breaking:** the historical `lint` entry option is removed, along with its mapping to tsdown's
`report`. It appeared in the `BuildPlanEntryBase` and `BuildPlanEntryInput` public types, so a
consumer still passing it will see a type error; the value was silently ignored at runtime by the
schema either way. Reporting is now the adapter's own decision and is forced off, because tsdown
defaults it on and every build plan here had turned it off for the memory errors in #82.

The canonical package identity to banner path is unchanged.
