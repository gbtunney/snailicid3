---
'@snailicid3/workspace': minor
---

Add the canonical read-only release-plan model.

`createReleasePlan` composes one typed document — `schemaVersion: 1`, an `observe` execution,
per-package records and a summary — from separately supplied release intent, version state, exact
`name@version` registry observation, publish policy, Doctor facts and Git-tag intent.
`releasePlanSchema` is the runtime source of truth, so an adapter can reject an unsupported
`schemaVersion` before it reads a field, and the TypeScript types are derived from it rather than
maintained alongside it.

The plan observes and never mutates. A missing exact registry version is inventory, not
authorization: publication requires explicit selection. Registry lookups that fail to answer stay
unknown rather than becoming unpublished, and `private: true` resolves to `private_unpublishable`
whatever the registry reports, while leaving versioning and Git tagging independent.
