#!/usr/bin/env bash

# Replace esbuild's Darwin x64 executable with a locally-built Catalina-compatible binary.

BOOTSTRAP_CALLER_SOURCE="${BASH_SOURCE[0]}"

# shellcheck source=../bootstrap.sh
. "$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)/bootstrap.sh"

CONSUMER_DIR="${GBT_PATCH_CWD:-$PWD}"
PNPM_STORE_DIR="$CONSUMER_DIR/node_modules/.pnpm"
PATCH_REVISION="catalina-v1"
PLATFORM="${GBT_PATCH_TEST_PLATFORM:-$(uname -s)}"
ARCHITECTURE="${GBT_PATCH_TEST_ARCHITECTURE:-$(uname -m)}"
CACHE_ROOT="${GBT_PATCH_TEST_CACHE_ROOT:-/tmp/snailicid3/gbt-patch}"

# The official Catalina Go installer uses /usr/local/go, which is not always on PATH in package
# lifecycle shells. Prefer an existing PATH entry, then add the installer location automatically.
if ! command -v go > /dev/null 2>&1 && [[ -x /usr/local/go/bin/go ]]; then
    export PATH="/usr/local/go/bin:$PATH"
fi

if [[ -n "${CI:-}" && "${GBT_PATCH_TEST_ALLOW_CI:-}" != "1" ]]; then
    status_pair "environment" "CI detected; skipped" "info"
    exit 0
fi

checksum() {
    if command -v shasum > /dev/null 2>&1; then
        shasum -a 256 "$1" | awk '{ print $1 }'
    else
        sha256sum "$1" | awk '{ print $1 }'
    fi
}

cached_binary_is_valid() {
    local binary="$1"
    local marker="$2"
    local expected_version="$3"
    local recorded_checksum=""

    [[ -x "$binary" && -f "$marker" ]] || return 1
    recorded_checksum="$(sed -n 's/^sha256=//p' "$marker")"
    [[ -n "$recorded_checksum" ]] || return 1
    [[ "$(checksum "$binary")" == "$recorded_checksum" ]] || return 1
    [[ "$("$binary" --version 2> /dev/null || true)" == "$expected_version" ]]
}

build_cached_binary() {
    local version="$1"
    local cache_dir="$2"
    local binary="$cache_dir/esbuild"
    local marker="$cache_dir/complete"
    local staging_root=""
    local staging_binary=""

    if cached_binary_is_valid "$binary" "$marker" "$version"; then
        status_pair "esbuild $version" "using cached build" "info" >&2
        printf '%s\n' "$binary"
        return 0
    fi

    command -v git > /dev/null 2>&1 || {
        status_pair "git" "required to build patched esbuild" "critical" >&2
        return 1
    }
    command -v go > /dev/null 2>&1 || {
        status_pair "go" "required to build patched esbuild" "critical" >&2
        kv_pair "expected" "/usr/local/go/bin/go or go on PATH" >&2
        return 1
    }

    mkdir -p "$(dirname "$cache_dir")"
    staging_root="$(mktemp -d "$(dirname "$cache_dir")/.build.XXXXXX")"
    staging_binary="$staging_root/esbuild"

    spacer 6 >&2
    status_pair "esbuild $version" "building local patch" "info" >&2
    kv_pair "git tag" "v$version" >&2
    kv_pair "Go executable" "$(command -v go)" >&2
    kv_pair "Go version" "$(go version)" >&2
    kv_pair "cache" "$cache_dir" >&2
    spacer 1 >&2
    if ! git clone --depth 1 --branch "v$version" \
        https://github.com/evanw/esbuild.git "$staging_root/source"; then
        rm -rf "$staging_root"
        return 1
    fi

    if ! (
        cd "$staging_root/source"
        CGO_ENABLED=0 GOOS=darwin GOARCH=amd64 go build -o "$staging_binary" ./cmd/esbuild
    ); then
        rm -rf "$staging_root"
        return 1
    fi

    chmod 755 "$staging_binary"
    [[ "$("$staging_binary" --version 2> /dev/null || true)" == "$version" ]] || {
        status_pair "built binary" "version verification failed" "critical" >&2
        rm -rf "$staging_root"
        return 1
    }

    printf 'version=%s\nrevision=%s\nplatform=%s\narchitecture=%s\nsha256=%s\n' \
        "$version" "$PATCH_REVISION" "$PLATFORM" "$ARCHITECTURE" \
        "$(checksum "$staging_binary")" > "$staging_root/complete"
    rm -rf "$staging_root/source"
    rm -rf "$cache_dir"
    mv "$staging_root" "$cache_dir"
    printf '%s\n' "$binary"
}

rule " " 50% 1
kabob "🐌 ESBUILD CATALINA PATCH" "100%" "cyan"
rule " " 50% 1

if [[ "$PLATFORM" != "Darwin" || "$ARCHITECTURE" != "x86_64" ]]; then
    status_pair "platform" "not Darwin x64; skipped" "info"
    exit 0
fi

FOUND_COUNT=0
PATCHED_COUNT=0

for ESBUILD_TARGET in \
    "$PNPM_STORE_DIR"/@esbuild+darwin-x64@*/node_modules/@esbuild/darwin-x64/bin/esbuild; do
    [[ -f "$ESBUILD_TARGET" ]] || continue
    FOUND_COUNT=$((FOUND_COUNT + 1))

    PACKAGE_DIR_FOR_TARGET="$(dirname "$(dirname "$ESBUILD_TARGET")")"
    ESBUILD_VERSION="$(node -e '
        const fs = require("fs")
        const pkg = JSON.parse(fs.readFileSync(process.argv[1], "utf8"))
        process.stdout.write(pkg.version)
    ' "$PACKAGE_DIR_FOR_TARGET/package.json")"
    CACHE_DIR="$CACHE_ROOT/$ESBUILD_VERSION/$PATCH_REVISION/$PLATFORM/$ARCHITECTURE"

    kv_pair "installed version" "$ESBUILD_VERSION"
    PATCH_BINARY="$(build_cached_binary "$ESBUILD_VERSION" "$CACHE_DIR")" || {
        status_pair "esbuild $ESBUILD_VERSION" "patch build failed" "critical"
        exit 1
    }

    kv_pair "source" "$PATCH_BINARY"
    kv_pair "target" "$ESBUILD_TARGET"
    spacer 1
    install -m 755 "$PATCH_BINARY" "$ESBUILD_TARGET"

    if cmp -s "$PATCH_BINARY" "$ESBUILD_TARGET"; then
        status_pair "esbuild $ESBUILD_VERSION" "✓ installed" "success"
        PATCHED_COUNT=$((PATCHED_COUNT + 1))
    else
        status_pair "esbuild $ESBUILD_VERSION" "✗ verification failed" "critical"
        exit 1
    fi
done

if [[ "$FOUND_COUNT" -eq 0 ]]; then
    status_pair "installed esbuild" "not found; skipped" "warning"
    kv_pair "searched" "$PNPM_STORE_DIR"
    exit 0
fi

kv_pair "found" "$FOUND_COUNT"
kv_pair "patched" "$PATCHED_COUNT"
status_pair "Catalina patch" "✓ complete" "success"
rule " " 50% 1
