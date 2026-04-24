#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

LOGGER_SCRIPT="${SCRIPT_DIR}/sh-logger.sh"
INTEGRATION_SCRIPT="${SCRIPT_DIR}/sh-logger-needs-integration.sh"

source "${LOGGER_SCRIPT}"

header "Logger Integration Test" 4 "${CYAN}"
kv_pair "script" "${INTEGRATION_SCRIPT}"

step "Checking script syntax"
bash -n "${INTEGRATION_SCRIPT}"
success "Syntax check passed"

step "Running integration script"
(
    cd "${REPO_ROOT}"
    bash "${INTEGRATION_SCRIPT}"
)
success "Integration script completed"
