# Snailicid3 Architecture and Refactor Plan

> **Single source of truth.** This file records durable architecture, the current finish line, and
> work order. GitHub Issues own actionable requirements. Pull requests and git history own completed
> investigations; completed audit prose is not retained as a second backlog.

## Current state

**Updated:** 2026-08-14 · **Baseline:** `main` at `81a7799`

- Foundational ownership Phases 0–6 are complete.
- The workspace core audit is complete; all fifteen instructions were addressed.
- Scope detection, `scope-affected`, and Commitlint now share one workspace scope model.
- Generic package identity and manifest reading live in node-utils.
- Logger owns the compiled `snail-sh`; only the bootstrap shell floor remains.
- The remaining Part A finish line is the branch-aware changeset/release workflow plus packed
  consumer validation.

Do not reopen completed cleanup from old audit text. File a GitHub issue when new evidence reveals a
new defect.

## Architecture rules

1. Preserve proven public imports, exports, bins, flags, and exit behavior until a tested migration
   replaces them.
2. Organize by knowledge: config owns policy; workspace owns repository facts and operations;
   node-utils owns generic Node primitives; logger owns presentation; cli-app owns application UX.
3. Keep runtime, Nx task, and bootstrap dependency graphs acyclic.
4. Configuration returns configuration. It does not discover repositories, execute tools, mutate
   manifests, or decide process exits.
5. Doctor observes without mutation. Validate may later enforce explicit severity policy.
6. Nx may enrich the model but is never required. A non-Nx package remains supported.
7. A public package must not require an unpublished first-party runtime dependency.
8. Validate public packages from packed artifacts and clean npm/pnpm consumers, not workspace links.
9. Do not combine Part A completion with the deferred build-system refactor.

## Package ownership

| Package | Owns |
| --- | --- |
| `@snailicid3/node-utils` | Generic Node, filesystem, path, JSON, process, argv, and package-identity primitives |
| `@snailicid3/logger` | Structured logging, terminal reports, progress, tables, and `snail-sh` |
| `@snailicid3/workspace` | Repository discovery, packages, git state, scopes, affected logic, branch/release operations, and repo CLI commands |
| `@snailicid3/config` | Tool policy, config composition, formatting policy, and pure build-tool adapters |
| `@snailicid3/cli-app` | Commands, help, versions, errors, prompts, and logger integration |
| `@snailicid3/doctor` | Read-only package/artifact diagnostics and fixture classification |
| `@snailicid3/storybook-config` | Storybook defaults and framework/addon configuration |
| `@snailicid3/build-config` | Temporary build API pending the separate Part B migration |

Config may consume node-utils primitives. Config must not import workspace to discover repository
facts; callers compose config policy with workspace results.

## Active Part A work

GitHub Issues are authoritative. This file intentionally does not duplicate their acceptance
criteria.

| Order | Issue | Outcome |
| --- | --- | --- |
| 1 | [#201 — branch-aware changeset/release workflow](https://github.com/gbtunney/snailicid3/issues/201) | One local/CI engine; branch-derived workflow context; explicit mutation |
| 2 | [#221 — reusable commit-scope report](https://github.com/gbtunney/snailicid3/issues/221) | Core area × scope model with terminal, JSON, and Markdown renderers |
| 3 | [#219 — oversized scope headers](https://github.com/gbtunney/snailicid3/issues/219) | Collapse a rendered scope list before it violates Commitlint policy |
| 4 | [#206 — version inventory vs publish execution](https://github.com/gbtunney/snailicid3/issues/206) | Direct registry comparison; explicit release checks and publish execution |
| 5 | [#222 — packed consumer rehearsal](https://github.com/gbtunney/snailicid3/issues/222) | Prove exports, bins, dependencies, and consumers through clean npm/pnpm installs |

[#201](https://github.com/gbtunney/snailicid3/issues/201) is the immediate implementation target.
Its first slice removes the automatic stage/commit tail from the current `gbt-changeset` command.

## Branch workflow contract

The branch name is durable workflow memory:

```text
changeset/<slug>
release/<slug>
```

The CLI infers the mode from the current branch without a routine mode flag. A recognized branch
provides the commit type and slug; staged files provide scope; the user may append optional text.

```text
changeset(config): wacky-walker — adjust output
release(workspace): wacky-walker — repair generated exports
```

The default operation reports facts and offers exact next actions. It does not automatically fetch,
merge, rebase, stash, switch, reconnect, commit, push, version, open a PR, or publish.

A valid base is determined from commit ancestry, not whether the branch is literally named
`main`. Ahead/diverged work is identified as a potential stacked branch or PR and requires an
explicit choice.

Local changeset preparation:

1. create the Changesets Markdown file;
2. derive its slug;
3. create or resume `changeset/<slug>`;
4. stop.

Local or CI release preparation:

1. create or resume `release/<slug>`;
2. run the repository version operation;
3. explicitly create a branch-derived release commit;
4. create or update the release PR.

A release branch remains usable after Changesets removes its Markdown file because the branch retains
the workflow type and slug. Pending publish inventory comes directly from local-versus-registry
version comparison, not from branch state. Preparing a release does not authorize publishing; #206
owns explicit release checks and publish execution.

Reconnect behavior is recovery support. It may offer switch/track/relink instructions or apply an
explicit choice, but it must not block the primary workflow.

## Scope contract

Workspace owns the single scope-definition and classification model.

- discovered packages, standard repository scopes, and consumer overrides merge into one map;
- `true` means a valid manual scope;
- `false` disables a scope;
- `undefined` inherits;
- an empty matcher array is invalid;
- `root` is a valid manual umbrella scope;
- root-package identity comes from normalized path `.`, never a package name;
- Commitlint scope names and file classifiers derive from the same result.

Config consumes resolved scope policy; it does not maintain a second matcher engine.

## Compatibility and release gates

Before publishing the Part A cohort:

- record the exact candidate commit;
- test packed artifacts through an isolated local registry;
- install into clean npm and pnpm consumers;
- exercise every declared export condition, declaration route, and public bin;
- verify symlinked bin resolution and the absence of unpublished runtime dependencies;
- run the known real-consumer matrix;
- preserve registered Doctor fixtures;
- require a clean repository after builds and tests.

The registered fixture packages remain intentionally imperfect until their named diagnostics have
replacement coverage:

- `@snailicid3/example-package`: `EXP-EXAMPLE-001`
- `@snailicid3/logger`: `EXP-LOGGER-001`, `API-LOGGER-001`,
  `PACK-LOGGER-001`, and `RUNTIME-LOGGER-001`

Do not run broad manifest/export autofixes against those fixture surfaces.

## Deferred Part B

Part B begins only after Part A and its release rehearsal are complete.

- Reframe pure build configuration and remove operational/mutating adapters.
- Decide runtime boundary enforcement in
  [#220](https://github.com/gbtunney/snailicid3/issues/220).
- Finish Doctor collectors before adding Validate enforcement.
- Consolidate cli-app on the shared argv primitives before adding prompts or making Doctor a
  cli-app consumer.
- Run a final packed-consumer checkpoint after the build/tooling changes.

When Part B starts, its implementation requirements belong in focused GitHub Issues, not another
expanding plan document.

## Completion

Part A is complete when:

- #201 and #206 provide one branch/release model shared by local tooling and CI;
- #219 and #221 make scope generation and reporting reliable;
- #222 proves the public package and compatibility surfaces from clean consumers;
- no public behavior or dependency boundary regresses.

Part B is complete when build configuration is pure, Doctor reliably reports artifact reality,
Validate has explicit policy, and the final packed-consumer checkpoint passes.
