---
'@snailicid3/cli-app': minor
'@snailicid3/node-utils': minor
'@snailicid3/color': patch
'@snailicid3/utils': patch
---

Add typed filesystem and JSON-object schemas to CLI flags, support repeatable array arguments, and
provide a documented, tested reference CLI. Organize CLI internals by feature and remove the
unfinished interactive fallback in favor of deterministic Zod validation errors.

Export typed path and filesystem schema utilities directly from node-utils, including multi-type and
opt-in existence validation. Share single, multiple, `any`, and negated selectors between the core
typed-path functions and Zod schemas while preserving narrowed output unions. Improve validation
errors for missing paths, incorrect filesystem types, and unmatched globs.

Centralize numeric range mapping, clamping, wrapping, and decimal rounding utilities in utils, and
reuse those canonical helpers from color.
