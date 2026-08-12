#!/usr/bin/env bash
set -euo pipefail

OWNER_PACKAGE="${1:?owner package name is required}"
COMMAND_NAME="${2:?package command name is required}"
shift 2

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_PACKAGE_JSON="$SCRIPT_DIR/../package.json"
OWNER_PACKAGE_JSON="$(node -e "const { createRequire } = require('node:module'); const localRequire = createRequire(process.argv[1]); process.stdout.write(localRequire.resolve(process.argv[2] + '/package.json'))" "$CONFIG_PACKAGE_JSON" "$OWNER_PACKAGE")"
OWNER_DIR="$(CDPATH= cd -- "$(dirname -- "$OWNER_PACKAGE_JSON")" && pwd)"
TARGET="$(node -e "const manifest = require(process.argv[1]); const target = manifest.bin?.[process.argv[2]]; if (!target) process.exit(1); process.stdout.write(target)" "$OWNER_PACKAGE_JSON" "$COMMAND_NAME")"

TARGET_PATH="$OWNER_DIR/${TARGET#./}"

if [[ "$TARGET_PATH" == *.js || "$TARGET_PATH" == *.mjs || "$TARGET_PATH" == *.cjs ]]; then
    exec node "$TARGET_PATH" "$@"
fi

exec "$TARGET_PATH" "$@"
