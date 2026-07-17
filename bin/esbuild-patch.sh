#!/usr/bin/env bash
set -euo pipefail

SOURCE="./bin/esbuild-darwin-x64"
TARGET="./node_modules/.pnpm/@esbuild+darwin-x64@0.28.1/node_modules/@esbuild/darwin-x64/bin/esbuild"

# CI/Linux/etc. will not have the macOS Catalina esbuild package installed.
# Skip cleanly instead of failing postinstall.
if [[ ! -f "$TARGET" ]]; then
    echo "Skipping esbuild Catalina patch: target binary not found."
    echo "Target was: $TARGET"
    exit 0
fi

if [[ ! -f "$SOURCE" ]]; then
    echo "Skipping esbuild Catalina patch: source binary not found."
    echo "Source was: $SOURCE"
    exit 0
fi

install -m 755 "$SOURCE" "$TARGET"

if cmp -s "$SOURCE" "$TARGET"; then
    pnpm exec snail-sh success "Esbuild patch applied successfully"
else
    pnpm exec snail-sh critical "Esbuild patch failed: copied binary does not match source"
    exit 1
fi
