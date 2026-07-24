#!/usr/bin/env bash
# Replace esbuild's Darwin x64 executable with a Catalina-compatible build.

BOOTSTRAP_CALLER_SOURCE="${BASH_SOURCE[0]}"
# shellcheck source=../bootstrap.sh
. "$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)/bootstrap.sh"

PATCH_BINARY="$SCRIPT_DIR/esbuild-darwin-x64"
CONSUMER_DIR="${GBT_PATCH_CWD:-$PWD}"
PNPM_STORE_DIR="$CONSUMER_DIR/node_modules/.pnpm"

header "🐌 ESBUILD CATALINA PATCH" "80%" "reverse-magenta" "~"

 discover_esbuild_target() {
    local candidate

    for candidate in "$PNPM_STORE_DIR"/@esbuild+darwin-x64@*/node_modules/@esbuild/darwin-x64/bin/esbuild; do
        if [[ -f "$candidate" ]]; then
            printf '%s\n' "$candidate"
            return 0
        fi
    done

    return 1
}

if [[ "$(uname -s)" != "Darwin" || "$(uname -m)" != "x86_64" ]]; then
    status_pair "platform" "not Darwin x64; skipped" "info"
    exit 0
fi

[[ -f "$PATCH_BINARY" ]] || {
    status_pair "patch binary" "missing" "critical"
    kv_pair "expected" "$PATCH_BINARY"
    exit 1
}

ESBUILD_TARGET="$(discover_esbuild_target || true)"
[[ -n "$ESBUILD_TARGET" ]] || {
    status_pair "installed esbuild" "not found; skipped" "warning"
    kv_pair "searched" "$PNPM_STORE_DIR"
    exit 0
}

kv_pair "source" "$PATCH_BINARY"
kv_pair "target" "$ESBUILD_TARGET"
install -m 755 "$PATCH_BINARY" "$ESBUILD_TARGET"

if cmp -s "$PATCH_BINARY" "$ESBUILD_TARGET"; then
    status_pair "Catalina patch" "✓ installed" "success"
else
    status_pair "Catalina patch" "✗ verification failed" "critical"
    exit 1
fi
