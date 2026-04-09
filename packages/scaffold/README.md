<!-- @snailicid3:header:start -->

# @snailicid3/scaffold

> Package scaffolding generator with TypeScript-function-based templates

<!-- @snailicid3:header:end -->

## Installation

```sh
pnpm add @snailicid3/scaffold
```

## TODO

- [ ] Add a manifest utility module for package.json generation and updates
- [ ] Add `reorderPackageJsonKeys()` for stable top-level key ordering
- [ ] Add `mergePackageJson()` for merging scaffold defaults into an existing manifest
- [ ] Add `updatePackageJsonSections()` for targeted section updates
- [ ] Define per-section behavior rules
- [ ] Reorder only: `name`, `version`, `private`, `description`, `type`, `author`, `license`, `repository`, `main`, `types`, `exports`, `files`, `keywords`, `nx`, `bin`
- [ ] Merge shallow object sections: `scripts`, `dependencies`, `devDependencies`, `peerDependencies`, `optionalDependencies`, `engines`
- [ ] Preserve existing package-specific scalar values unless explicitly overridden
- [ ] Decide array behavior per key
- [ ] Replace arrays by default for `files`
- [ ] Merge unique values for `keywords`
- [ ] Preserve manual `exports` entries unless scaffold explicitly owns them
- [ ] Add a scaffold option for `packageJsonStrategy`: `create | merge | update-sections`
- [ ] Add a scaffold option for `packageJsonSections` to limit which sections are updated
- [ ] Add fixture-based tests for new package creation
- [ ] Add fixture-based tests for merging into an existing package.json
- [ ] Add fixture-based tests for preserving package-specific values
- [ ] Add fixture-based tests for key ordering stability
- [ ] Export manifest helpers from the package public API only if they are intended for reuse

## Suggested First API Shape

```ts
type PackageJsonSectionName =
	| 'scripts'
	| 'nx'
	| 'dependencies'
	| 'devDependencies'
	
|'bin'
	| 'exports'
	'rando entry pts'
	| 'files'
	| 'keywords'

type PackageJsonStrategy = 'create' | 'merge' | 'update-sections'

type UpdatePackageJsonOptions = {
	strategy: PackageJsonStrategy
	sections?: PackageJsonSectionName[]
}

declare function reorderPackageJsonKeys(packageJson: Record<string, unknown>): Record<string, unknown>
declare function mergePackageJson(
	existingPackageJson: Record<string, unknown>,
	scaffoldPackageJson: Record<string, unknown>,
): Record<string, unknown>
declare function updatePackageJsonSections(
	existingPackageJson: Record<string, unknown>,
	scaffoldPackageJson: Record<string, unknown>,
	options: UpdatePackageJsonOptions,
): Record<string, unknown>
```
