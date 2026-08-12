#!/usr/bin/env bash
set -euo pipefail

COMMAND_NAME="${1:?workspace command name is required}"
shift

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_PACKAGE_JSON="$SCRIPT_DIR/../package.json"
WORKSPACE_PACKAGE_JSON="$(node -e "const { createRequire } = require('node:module'); const localRequire = createRequire(process.argv[1]); process.stdout.write(localRequire.resolve('@snailicid3/workspace/package.json'))" "$CONFIG_PACKAGE_JSON")"
WORKSPACE_DIR="$(CDPATH= cd -- "$(dirname -- "$WORKSPACE_PACKAGE_JSON")" && pwd)"
TARGET="$(node -e "const manifest = require(process.argv[1]); const target = manifest.bin?.[process.argv[2]]; if (!target) process.exit(1); process.stdout.write(target)" "$WORKSPACE_PACKAGE_JSON" "$COMMAND_NAME")"

TARGET_PATH="$WORKSPACE_DIR/${TARGET#./}"

if [[ "$TARGET_PATH" == *.js ]]; then
    exec node "$TARGET_PATH" "$@"
fi

exec "$TARGET_PATH" "$@"
