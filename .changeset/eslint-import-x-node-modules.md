---
'@snailicid3/config': patch
---

Fix eslint-plugin-import-x crash: ship `eslint-import-resolver-node` (import-x's optional peer) as a real dependency and set `import-x/ignore: ['node_modules']` in the base import rules, so consumers no longer need the settings override or a manual resolver install.
