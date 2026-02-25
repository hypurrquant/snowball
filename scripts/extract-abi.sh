#!/usr/bin/env bash
# Extract ABIs from Foundry artifacts for Docker deployment
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ABI_DIR="$ROOT_DIR/backend/abi"

mkdir -p "$ABI_DIR/oracle" "$ABI_DIR/options"

extract() {
    local package="$1"
    local contract="$2"
    local src="$ROOT_DIR/packages/$package/out/${contract}.sol/${contract}.json"
    local dst="$ABI_DIR/$package/${contract}.json"

    if [ -f "$src" ]; then
        # Extract just the ABI from the full artifact
        python3 -c "
import json, sys
with open('$src') as f:
    data = json.load(f)
with open('$dst', 'w') as f:
    json.dump({'abi': data['abi']}, f, indent=2)
" 2>/dev/null || jq '{abi: .abi}' "$src" > "$dst"
        echo "  ✓ $package/$contract"
    else
        echo "  ✗ $src not found (run 'forge build' first)"
    fi
}

echo "Extracting ABIs..."

# Oracle
extract "oracle" "BTCMockOracle"

# Options
extract "options" "OptionsClearingHouse"
extract "options" "OptionsVault"
extract "options" "SnowballOptions"
extract "options" "OptionsRelayer"

echo ""
echo "ABIs extracted to: $ABI_DIR"
