#!/usr/bin/env bash
# Replace esbuild's Darwin x64 executable with a Catalina-compatible build.

BOOTSTRAP_CALLER_SOURCE="${BASH_SOURCE[0]}"
# shellcheck source=../bootstrap.sh
. "$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)/bootstrap.sh"

PATCH_BINARY="$SCRIPT_DIR/esbuild-darwin-x64"
CONSUMER_DIR="${GBT_PATCH_CWD:-$PWD}"
PNPM_STORE_DIR="$CONSUMER_DIR/node_modules/.pnpm"

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
    info "Catalina esbuild patch is only needed on Darwin x64; nothing to do."
    exit 0
fi

[[ -f "$PATCH_BINARY" ]] || {
    critical "Catalina-compatible esbuild binary is missing."
    kv_pair "expected" "$PATCH_BINARY"
    exit 1
}

ESBUILD_TARGET="$(discover_esbuild_target || true)"
[[ -n "$ESBUILD_TARGET" ]] || {
    warn "No installed @esbuild/darwin-x64 executable was found; nothing to patch."
    kv_pair "searched" "$PNPM_STORE_DIR"
    exit 0
}

header "🐌 ESBUILD CATALINA PATCH" "80%" "reverse-magenta" "~"
kv_pair "source" "$PATCH_BINARY"
kv_pair "target" "$ESBUILD_TARGET"
install -m 755 "$PATCH_BINARY" "$ESBUILD_TARGET"

if cmp -s "$PATCH_BINARY" "$ESBUILD_TARGET"; then
    success "Catalina-compatible esbuild installed successfully."
else
    critical "The copied esbuild executable does not match the patch binary."
    exit 1
fi
