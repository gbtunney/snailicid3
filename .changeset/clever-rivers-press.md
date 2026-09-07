---
'@snailicid3/build-config': patch
'@snailicid3/config': patch
'@snailicid3/workspace': patch
---

Fix packed-consumer release blockers found by the isolated npm and pnpm rehearsal.

Config compatibility-bin shims now resolve their physical package script through the symlink a
package manager creates in `node_modules/.bin` before delegating to the owning package.
`dirname "$0"` resolved to `.bin` rather than to the Config script directory, so the delegating
helper beside it could not be found under an npm install.

Workspace, Config and Build Config declare ESM-only roots instead of advertising CommonJS entries
they never had. Each was `type: module` with `main` pointing at an ES module, and each root offered
CommonJS a route — a bare `types` condition, or `default` beside `import` — that landed on that ES
module. None has a CommonJS consumer, so the entries are gone rather than reimplemented: `main` is
dropped and every JavaScript root and subpath is a single `import` condition carrying its own
declarations. Config's JSON asset subpaths are unchanged and stay reachable by every resolver.

Workspace also declares `sideEffects: false`, and all three now declare a full git repository URL.
