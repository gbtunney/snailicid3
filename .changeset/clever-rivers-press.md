---
'@snailicid3/config': patch
'@snailicid3/workspace': patch
---

Fix packed-consumer release blockers found by the isolated npm and pnpm rehearsal.

Config compatibility-bin shims now resolve their physical package script through the symlink a
package manager creates in `node_modules/.bin` before delegating to the owning package.
`dirname "$0"` resolved to `.bin` rather than to the Config script directory, so the delegating
helper beside it could not be found under an npm install.

Workspace declares an ESM-only root instead of advertising a CommonJS entry it never had. `main`
pointed at `./dist/index.js` while the package is `type: module`, so CommonJS resolution landed on
an ES module. The package has no CommonJS consumer — the entry was legacy metadata, not a contract —
so it is gone rather than reimplemented, and the root now offers a single `import` condition
carrying its own declarations.

Workspace also declares `sideEffects: false` and a full git repository URL, clearing the two
remaining packed validation suggestions.
