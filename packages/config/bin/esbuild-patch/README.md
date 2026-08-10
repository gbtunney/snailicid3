# esbuild Catalina patch

Provides Catalina-compatible Darwin x64 builds of `esbuild` for pnpm workspaces.

The patch command detects each installed `@esbuild/darwin-x64` version and replaces its executable
with the matching Catalina-compatible binary bundled with this package.

Run after dependencies are installed:

```sh
pnpm exec gbt-patch
```

## Bundled binaries

Catalina-compatible builds are stored by exact esbuild version:

```text
esbuild-patch/
├── binaries/
│   ├── 0.28.1/
│   │   └── esbuild-darwin-x64
│   └── 0.28.2/
│       └── esbuild-darwin-x64
├── build-new.sh
├── patch.sh
└── README.md
```

The JavaScript package and native esbuild executable must use the same version, so a separate
Catalina build is maintained for each supported esbuild version.

For example:

```text
@esbuild/darwin-x64@0.28.1
→ binaries/0.28.1/esbuild-darwin-x64

@esbuild/darwin-x64@0.28.2
→ binaries/0.28.2/esbuild-darwin-x64
```

If an installed esbuild version does not have a matching bundled binary, `gbt-patch` reports the
unsupported version and skips it.

## Patch behavior

`gbt-patch`:

- does nothing on platforms other than Darwin x64;
- discovers installed `@esbuild/darwin-x64` packages in the pnpm store;
- determines each package's exact esbuild version;
- selects the corresponding binary from `binaries/<version>/`;
- verifies that the bundled binary reports the expected version;
- installs it over the incompatible executable;
- verifies that the copied binary matches the bundled binary;
- warns when an installed version has no Catalina-compatible build.

Set `GBT_PATCH_CWD` to patch a workspace other than the current directory.

---

### Adding support for a new esbuild version

Use `build-new.sh` when the project updates to a new esbuild version.

#### Make sure Catalina-compatible Go is installed

This setup uses Go 1.20.14.

```sh
go version
```

Expected:

```text
go version go1.20.14 darwin/amd64
```

If Go is installed but not found:

```sh
export PATH="/usr/local/go/bin:$PATH"
```

#### Install Go 1.20.14 if needed

```sh
cd ~/Downloads

curl -LO https://go.dev/dl/go1.20.14.darwin-amd64.tar.gz

sudo tar -C /usr/local -xzf go1.20.14.darwin-amd64.tar.gz

rm go1.20.14.darwin-amd64.tar.gz

export PATH="/usr/local/go/bin:$PATH"

go version
```

---

#### Determine the required esbuild version

From the `snailicid3` repo root:

```sh
pnpm why esbuild
```

Example:

```text
esbuild@0.28.2
```

---

#### Set the version in `build-new.sh`

Update:

```sh
ESBUILD_VERSION=0.28.1
```

to the version being added, for example:

```sh
ESBUILD_VERSION=0.28.2
```

Then run the script from the `snailicid3` repo root:

```sh
./packages/config/bin/esbuild-patch/build-new.sh
```

The script:

1. clones the requested esbuild release into `/tmp/esbuild`;
2. builds it locally using the Catalina-compatible Go installation;
3. verifies the compiled version;
4. creates the corresponding version directory;
5. copies the binary into the package;
6. marks it executable;
7. verifies the bundled copy;
8. runs `pnpm exec gbt-patch`.

For version `0.28.2`, the resulting binary is:

```text
packages/config/bin/esbuild-patch/binaries/0.28.2/esbuild-darwin-x64
```

---

#### Check the result

Verify the newly bundled binary directly:

```sh
./packages/config/bin/esbuild-patch/binaries/0.28.2/esbuild-darwin-x64 --version
```

Expected:

```text
0.28.2
```

Then check the repository changes:

```sh
git status
```

Optional:

```sh
git diff --summary
```

The new or changed binary should appear under:

```text
packages/config/bin/esbuild-patch/binaries/<version>/esbuild-darwin-x64
```

#### Updating esbuild

Normal future update procedure:

```text
1. pnpm why esbuild
2. Note the new exact version.
3. Update ESBUILD_VERSION in build-new.sh.
4. Run build-new.sh.
5. Verify the new binaries/<version>/ directory.
6. Run/test pnpm exec gbt-patch.
7. Commit the new binary.
```

Existing versioned binaries should generally remain in the repository while they are still needed by
consuming projects.
