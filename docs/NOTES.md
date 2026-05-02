# Package files

## Scripts

```json
{
    "dev": "pnpm build:ts --watch",
    "dev:ts": "pnpm build:ts --watch",
    "dev:tsdown": "tsdown --watch",

    "test": "vitest run",
    "test:nx": "cross-var nx run $npm_package_name:test",
    "test:watch": "vitest watch"
}
```

to nx.json defaults...

workspace packages.json need default nx project targets...

```json5
{
    targets: {
        build: {},
        'build:ts': {},
        'build:tsdown': {},

        test: {},
        'test:watch': {},

        clean: {},
        'clean:ts': {},
        'clean:build': {},

        lint: {},
        fix: {},

        'docs:build': {},
    },
}
```

```json
{
    "targets": {
        "build:ts": {},
        "build:tsdown": {},
        "build": {},
        "test": {},
        "lint": {},
        "fix": {},
        "clean": {},
        "clean:ts": {},
        "clean:build": {},
        "docs:build": {}
    }
}
```
