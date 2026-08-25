---
'@snailicid3/workspace': minor
---

Observe exact `name@version` existence in each package's resolved target registry.

`observeWorkspaceRegistry` walks canonical workspace membership, resolves the registry each package
would publish to — `publishConfig.registry`, then `@scope:registry`, then `registry`, then npm's
default — and asks that registry what it holds. The result drops straight into `createReleasePlan`
as a package's registry observation.

Existence is read from the registry's version list alone. Dist-tags are recorded alongside it and
never consulted, so a `latest` pointer can neither make an absent version look published nor make a
present one look absent.

Lookups that do not answer stay unknown. Authentication refusals, network failures and registry
errors map to `unknown_auth`, `unknown_network` and `unknown_registry` respectively, and only a
registry that answered "no such package or version" produces `missing`. Recorded registry URLs are
stripped of any inline credentials. Private packages are never queried at all.
