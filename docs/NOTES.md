# Package files


## Scripts 



```json
{
    "\n========== DEVELOPMENT >> ==========": "",
        "dev": "pnpm build:ts --watch",
        "dev:ts": "pnpm build:ts --watch",
        "dev:rollup": "rollup --watch --config ./rollup.config.mjs",
        "dev:vite": "pnpm exec vite --config ./vite.config.ts",

 "\n========== TEST >> ==========": "",
        "test": "vitest run",
        "test:nx": "cross-var nx run $npm_package_name:test",
        "test:watch": "vitest watch",
}
```
to nx.json defaults... 


workspace packages.json need default nx project targets...
```json5
 {
        "targets": {
/** ========= TEST >> ========== */
             "build": {},
            "build:ts": {},
            "build:rollup": {},
            "build:vite": {},
           
        /** ========= TEST >> ========== */
            "test": "vitest run",
        "test:nx": "cross-var nx run $npm_package_name:test",
        "test:watch":


/** ========= CLEAN >> ========== */
           "clean": {},
            "clean:ts": {},
            "clean:build": {},

            "test": {},
            "

            "lint": {},
            "fix": {},
            
            "docs:build": {}
        }
```

```json 
 {
        "targets": {
            "build:ts": {},
            "build:rollup": {},
            "build:vite": {},
            "build": {      },
            "test": {},
            "lint": {},
            "fix": {},
            "clean": {},
            "clean:ts": {},
            "clean:build": {},
            "docs:build": {}
        }
        
 "dependsOn": [
                    "build:ts"
                ]


### Older package.json scripts example for ref:
```json5

//probably not complete example. 
{
        "\n========== DEVELOPMENT >> ==========": "",
        "dev": "pnpm build:ts --watch",
        "dev:ts": "pnpm build:ts --watch",
        "dev:rollup": "rollup --watch --config ./rollup.config.mjs",
        "dev:vite": "pnpm exec vite --config ./vite.config.ts",
        "\n========== BUILD >> ==========": "",
        "build": "pnpm build:ts && pnpm build:rollup",
        "build:ts": "pnpm exec tsc --build",
        "build:nx": "cross-var nx run $npm_package_name:build",
        "build:rollup": "rollup --config ./rollup.config.mjs",
        "build:vite": "pnpm exec vite build --config ./vite.config.ts",
        "\n========== TEST >> ==========": "",
        "test": "vitest run",
        "test:nx": "cross-var nx run $npm_package_name:test",
        "test:watch": "vitest watch",
        "\n========== CLEAN >> ==========": "",
        "clean": "pnpm clean:ts && pnpm clean:build",
        "clean:ts": "pnpm exec tsc --build --clean",
        "clean:build": "pnpm exec rm -rf ./dist ./types",
        "\n========== PUBLISH >> ==========": "",
        "release": "pnpm run prerelease && pnpm changeset",
        "prerelease": "pnpm run build && pnpm run fix && pnpm run check && pnpm test",
        "\n========== CHECK >> ==========": "",
        "check": "pnpm check:self",
        "check:md": "pnpm run lint:md",
        "check:self": "pnpm lint",
        "\n========== FIX >> ==========": "",
        "fix": "pnpm fix:self",
        "fix:md": "pnpm run lint:md --fix",
        "fix:self": "pnpm prettier --write && pnpm lint --fix",
        "\n========== CODE STYLE >> ==========": "",
        "prettier": "prettier --ignore-path ./.gitignore --no-error-on-unmatched-pattern .",
        "lint": "pnpm exec eslint .",
        "lint:md": "pnpm exec markdownlint-cli2 '{./*,./**/*}.md' '#**/node_modules/**' '#packages/test-package/**/*' "
}

```