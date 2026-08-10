#!/usr/bin/env bash

# Replace esbuild's Darwin x64 executables with Catalina-compatible builds.

BOOTSTRAP_CALLER_SOURCE="${BASH_SOURCE[0]}"

# shellcheck source=../bootstrap.sh
. "$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)/bootstrap.sh"

PATCH_BINARIES_DIR="$SCRIPT_DIR/binaries"
CONSUMER_DIR="${GBT_PATCH_CWD:-$PWD}"
PNPM_STORE_DIR="$CONSUMER_DIR/node_modules/.pnpm"

rule " " 50% 1 # todo this is temporary dont know why spacer wouldnt work
kabob "🐌 ESBUILD CATALINA PATCH" "100%" "cyan"
rule " " 50% 1

if [[ "$(uname -s)" != "Darwin" || "$(uname -m)" != "x86_64" ]]; then
    status_pair "platform" "not Darwin x64; skipped" "info"
    exit 0
fi

[[ -d "$PATCH_BINARIES_DIR" ]] || {
    status_pair "patch binaries" "directory missing" "critical"
    kv_pair "expected" "$PATCH_BINARIES_DIR"
    exit 1
}

FOUND_COUNT=0
PATCHED_COUNT=0
SKIPPED_COUNT=0

for ESBUILD_TARGET in \
    "$PNPM_STORE_DIR"/@esbuild+darwin-x64@*/node_modules/@esbuild/darwin-x64/bin/esbuild; do
    [[ -f "$ESBUILD_TARGET" ]] || continue

    FOUND_COUNT=$((FOUND_COUNT + 1))

    PACKAGE_DIR="$(dirname "$(dirname "$ESBUILD_TARGET")")"
    PACKAGE_JSON="$PACKAGE_DIR/package.json"

    ESBUILD_VERSION="$(
        node -e '
            const fs = require("fs")
            const pkg = JSON.parse(fs.readFileSync(process.argv[1], "utf8"))
            process.stdout.write(pkg.version)
        ' "$PACKAGE_JSON"
    )"

    PATCH_BINARY="$PATCH_BINARIES_DIR/$ESBUILD_VERSION/esbuild-darwin-x64"

    kv_pair "installed version" "$ESBUILD_VERSION"

    # We found an esbuild version but don't have a Catalina build for it.
    if [[ ! -f "$PATCH_BINARY" ]]; then
        status_pair "esbuild $ESBUILD_VERSION" "unsupported; skipped" "warning"
        kv_pair "expected binary" "$PATCH_BINARY"

        SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
        continue
    fi

    # Safety check: make sure the binary stored in this version folder
    # really is that version.
    PATCH_VERSION="$("$PATCH_BINARY" --version 2> /dev/null || true)"

    if [[ "$PATCH_VERSION" != "$ESBUILD_VERSION" ]]; then
        status_pair "bundled binary" "version mismatch" "critical"
        kv_pair "folder version" "$ESBUILD_VERSION"
        kv_pair "binary version" "${PATCH_VERSION:-unknown}"
        kv_pair "binary" "$PATCH_BINARY"
        exit 1
    fi

    kv_pair "source" "$PATCH_BINARY"
    kv_pair "target" "$ESBUILD_TARGET"

    install -m 755 "$PATCH_BINARY" "$ESBUILD_TARGET"

    if cmp -s "$PATCH_BINARY" "$ESBUILD_TARGET"; then
        status_pair "esbuild $ESBUILD_VERSION" "✓ installed" "success"
        PATCHED_COUNT=$((PATCHED_COUNT + 1))
    else
        status_pair "esbuild $ESBUILD_VERSION" "✗ verification failed" "critical"
        rule " " 50% 1 # todo
        exit 1
    fi
done

if [[ "$FOUND_COUNT" -eq 0 ]]; then
    status_pair "installed esbuild" "not found; skipped" "warning"
    kv_pair "searched" "$PNPM_STORE_DIR"
    rule " " 50% 1 # todo
    exit 0
fi

kv_pair "found" "$FOUND_COUNT"
kv_pair "patched" "$PATCHED_COUNT"
kv_pair "unsupported" "$SKIPPED_COUNT"

if [[ "$SKIPPED_COUNT" -gt 0 ]]; then
    status_pair "Catalina patch" "completed with unsupported versions" "warning"
else
    status_pair "Catalina patch" "✓ complete" "success"
fi

rule " " 50% 1 # todo this is temporary dont know why spacer wouldnt work
