#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$(git rev-parse --show-toplevel 2> /dev/null || pwd)}"
SCRIPT_DIR="$ROOT_DIR/.github/scripts"

cd "$ROOT_DIR"

export ROOT_DIR

bash "$SCRIPT_DIR/report-env.sh"
bash "$SCRIPT_DIR/report-repo.sh"
bash "$SCRIPT_DIR/report-workspace.sh"
bash "$SCRIPT_DIR/report-prettier.sh"
pnpm exec nx report
