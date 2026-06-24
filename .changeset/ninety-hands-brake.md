---
'@snailicid3/cli-app': patch
'@snailicid3/config': patch
---

Add API Extractor config support and tighten the shared config builder API.

- Added `ApiExtractor` config helpers, API Extractor option types, and base rule exports.
- Standardized config tools around explicit `cwd` handling with the shared `ConfigBuilder`, `ConfigCwd`, and resolved options types.
- Expanded path and JSON utilities with normalized path helpers, object/value guards, object import helpers, and typed JSON serialization helpers.
- Refreshed the generated API reports for `@snailicid3/config` and `@snailicid3/cli-app`.
