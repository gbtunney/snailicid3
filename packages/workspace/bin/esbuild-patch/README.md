# esbuild Catalina patch

`gbt-patch` replaces installed Darwin x64 esbuild executables with binaries built locally for macOS
Catalina. It does not ship native executables in `@snailicid3/config`.

Run it from the consumer repository after dependencies are installed:

```sh
pnpm exec gbt-patch
```

On Darwin x64, the command discovers every installed `@esbuild/darwin-x64` package in pnpm's virtual
store. For each exact esbuild version it:

1. clones the matching esbuild tag;
2. builds `./cmd/esbuild` with the local Go toolchain;
3. verifies the reported version;
4. records a SHA-256 completion marker;
5. installs the binary only after all build and verification steps succeed.

The cache lives below `/tmp/snailicid3/gbt-patch` and is keyed by esbuild version, patch revision,
platform, and architecture. A valid cached build is reused, making repeated runs idempotent.
Removing the temp cache simply causes the next run to rebuild it.

The command exits successfully without changing anything on other platforms or when no matching
esbuild package is installed. It also exits successfully without building or patching whenever `CI`
is set; this compatibility patch is intended only for local development. A build failure exits
nonzero and leaves the installed executable unchanged.

Requirements on Darwin x64:

- `git`
- a Go toolchain capable of building esbuild
- `node`
- `shasum` (provided by macOS)

## Go setup for Catalina

This patch has been tested with Go 1.20.14 for Darwin AMD64. Check the installed toolchain:

```sh
go version
```

Expected output is similar to:

```text
go version go1.20.14 darwin/amd64
```

The official installer places Go at `/usr/local/go/bin/go`. `gbt-patch` checks the current `PATH`
first and automatically adds `/usr/local/go/bin` for its own process when necessary. To make Go
available in your interactive shell too, add it to your shell configuration:

```sh
export PATH="/usr/local/go/bin:$PATH"
```

For zsh, persist that line in `~/.zshrc`, then reload the shell:

```sh
source ~/.zshrc
go version
```

### Installing Go 1.20.14

If the compatible toolchain is not installed, download and install the Darwin AMD64 archive:

```sh
cd ~/Downloads
curl -LO https://go.dev/dl/go1.20.14.darwin-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.20.14.darwin-amd64.tar.gz
rm go1.20.14.darwin-amd64.tar.gz
export PATH="/usr/local/go/bin:$PATH"
go version
```

Installing into `/usr/local` requires administrator access. If an incompatible Go installation
already exists at `/usr/local/go`, move or remove it deliberately before extracting the archive.

## Dynamic version selection

There is no version to update in this package. The command reads the exact version from each
installed `@esbuild/darwin-x64/package.json`, clones the corresponding `v<version>` esbuild tag, and
uses that version in its cache key. To inspect the versions selected by the workspace before running
the patch:

```sh
pnpm why esbuild
```

After running `pnpm exec gbt-patch`, the output reports every installed version, cache source, and
patched target. A first run builds the binary; subsequent runs reuse the verified cache.

## Cache inspection and rebuilding

Cached binaries use this layout:

```text
/tmp/snailicid3/gbt-patch/
└── <esbuild-version>/
    └── <patch-revision>/
        └── Darwin/
            └── x86_64/
                ├── complete
                └── esbuild
```

Verify a cached binary directly by passing `--version`, for example:

```sh
/tmp/snailicid3/gbt-patch/0.28.2/catalina-v1/Darwin/x86_64/esbuild --version
```

To force a clean local rebuild, remove only the version-specific cache directory and rerun the
command:

```sh
rm -rf /tmp/snailicid3/gbt-patch/0.28.2
pnpm exec gbt-patch
```

No cache or native executable is committed to this repository or included in the npm package.

## Other behavior

- Set `GBT_PATCH_CWD` to patch a workspace other than the current directory.
- When `CI` is set, the command exits successfully without building or patching.
- On platforms other than Darwin x64, it exits successfully without changing anything.
- If no matching pnpm package is installed, it reports that fact and exits successfully.
- Clone, build, version-check, or checksum failures exit nonzero without replacing the installed
  executable.
