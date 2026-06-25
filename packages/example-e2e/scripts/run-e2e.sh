#!/usr/bin/env bash
#
# Run the example-indexer e2e suite against a kurtosis-pos bor devnet.
#
#   pnpm --filter @polygonlabs/example-e2e run e2e          # restore, test, tear down
#   pnpm --filter @polygonlabs/example-e2e run e2e -- --skip-down   # leave devnet up
#
# Restores the snapshot devnet (unless bor already answers at 9545), runs the
# suite (the Firestore emulator is managed by vitest's globalSetup), then tears
# the devnet down. Locally, use the prebuilt snapshot image:
#
#   IMAGE=lst-api-e2e-snapshot:bash32fix USE_LOCAL_IMAGE=1 \
#     pnpm --filter @polygonlabs/example-e2e run e2e

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
L2_RPC_URL="${L2_RPC_URL:-http://127.0.0.1:9545}"
OUT_DIR="${OUT_DIR:-$PKG_DIR/tmp/e2e-snapshot}"
SKIP_DOWN=0
RESTORED=0

for arg in "$@"; do
  case "$arg" in
    --skip-down) SKIP_DOWN=1 ;;
    *) echo "run-e2e: unknown argument '$arg'" >&2; exit 2 ;;
  esac
done

teardown() {
  if [ "$SKIP_DOWN" -eq 0 ] && [ "$RESTORED" -eq 1 ]; then
    local compose_file="$OUT_DIR/docker-compose.yaml"
    if [ -f "$compose_file" ]; then
      echo "[run-e2e] tearing down devnet"
      docker compose --file "$compose_file" down --volumes --remove-orphans || true
    fi
  fi
}
trap teardown EXIT

if curl -fsSL -X POST -H 'Content-Type: application/json' \
     --data '{"jsonrpc":"2.0","method":"eth_blockNumber","id":1}' \
     "$L2_RPC_URL" >/dev/null 2>&1; then
  echo "[run-e2e] bor already responding at ${L2_RPC_URL} — skipping restore"
else
  echo "[run-e2e] restoring snapshot devnet"
  OUT_DIR="$OUT_DIR" bash "$SCRIPT_DIR/restore-e2e-snapshot.sh"
  RESTORED=1
fi

pnpm --filter @polygonlabs/example-e2e run test:e2e
