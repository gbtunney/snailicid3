---
'@snailicid3/workspace': minor
---

Stabilize the release contract as the boundary an external adapter consumes.

Five documents leave this package, and each one is a validated contract rather than a shape that
happens to serialize: `releasePlanSchema`, `releasePreparePlanSchema`, `releaseTagPlanSchema`,
`releasePublishPlanSchema` and `releasePublishResultSchema`. All five encode `schemaVersion: 1` as a
literal, so `.safeParse()` rejects an unsupported document before a consumer reads a field. The
TypeScript types are derived from those schemas, so there is no second contract to drift.

`schemaVersion` is independent of this package's SemVer. A consumer pins a published version to get
a known implementation and validates `schemaVersion` to know what it may read; neither substitutes
for the other, and a version bump here does not imply a schema change.

Alongside the read-only plan, the contract now covers prepare planning, tag planning, publish
planning, selected publish execution, live exact `name@version` registry observation, Changesets
release intent read through Changesets itself, and the terminal and Markdown renderers. The
renderers project the same parsed plan rather than recomputing release state, which is what keeps
three views from becoming three answers.

Every one of these is reachable from the package root and is now exercised through it, so a name
dropping out of the barrel fails a test instead of failing a consumer. Adapters are expected to
import the public API; nothing here requires a new executable entry point.
