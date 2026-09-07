---
'@snailicid3/config': patch
'@snailicid3/workspace': patch
---

Fix packed-consumer release blockers found by the isolated npm and pnpm rehearsal.

Config compatibility-bin shims now resolve their physical package script before delegating to the
owning package, so package-manager-created `.bin` symlinks work under both npm and pnpm installed
layouts.

Workspace no longer advertises legacy runtime fallback fields for its dual ESM/CJS root entry. The
public runtime contract is the package `exports` map, which prevents CommonJS resolution from being
pointed at an ES module.
