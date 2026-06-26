#!/usr/bin/env bash
#
# Restore a kurtosis-pos devnet from a snapshot image — the canonical
# apps-team local e2e devnet. This is a copy of lst-api's
# restore-e2e-snapshot.sh: the published snapshot image bundles its own
# restore tooling, so the consumer is paired with the EXACT scripts that
# produced it (no kurtosis-pos clone or version coordination at restore time).
#
# Inputs (all env vars, all optional):
#   IMAGE              full image reference to restore from
#                      (default: ghcr.io/0xpolygon/lst-api-e2e-snapshot:latest).
#   USE_LOCAL_IMAGE    when "1", skip `docker pull` and trust the image is
#                      already on the local Docker host.
#   OUT_DIR            directory the snapshot is extracted into
#                      (default: ./tmp/e2e-snapshot).
#   WORK_DIR           scratch dir for the snapshot-tooling extraction
#                      (default: a fresh `mktemp -d`; cleaned on exit).
#
# After exit 0, bor's RPC is bound at http://127.0.0.1:9545 and anvil's at
# http://127.0.0.1:8545. Tear down with:
#   docker compose --file <OUT_DIR>/docker-compose.yaml down --volumes

set -euo pipefail

IMAGE="${IMAGE:-${E2E_SNAPSHOT_IMAGE:-ghcr.io/0xpolygon/lst-api-e2e-snapshot:latest}}"
USE_LOCAL_IMAGE="${USE_LOCAL_IMAGE:-0}"
OUT_DIR="${OUT_DIR:-./tmp/e2e-snapshot}"
WORK_DIR="${WORK_DIR:-$(mktemp -d)}"

cleanup() {
  local exit_code=$?
  if [ -n "${WORK_DIR:-}" ] && [ -d "$WORK_DIR" ]; then
    rm -rf "$WORK_DIR"
  fi
  exit "$exit_code"
}
trap cleanup EXIT

##############################################################################
# 1. Ensure the snapshot image is on the local Docker host
##############################################################################
if [ "$USE_LOCAL_IMAGE" = "1" ]; then
  echo "[restore] USE_LOCAL_IMAGE=1 — expecting ${IMAGE} to already exist"
  if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
    echo "[restore] ERROR: image '${IMAGE}' not on local Docker host" >&2
    exit 1
  fi
else
  echo "[restore] pulling ${IMAGE}"
  docker pull "$IMAGE"
fi

##############################################################################
# 2. Pull restore tooling out of the image
##############################################################################
echo "[restore] extracting snapshot tooling from ${IMAGE} -> ${WORK_DIR}/snapshot-tooling"
tooling_extract_cid="$(docker create "$IMAGE" /bin/true)"
docker cp "${tooling_extract_cid}:/snapshot-tooling/." "$WORK_DIR/snapshot-tooling/"
docker rm "$tooling_extract_cid" >/dev/null
chmod +x "$WORK_DIR"/snapshot-tooling/*.sh

##############################################################################
# 3. Extract volumes + docker-compose + addresses sidecar from the image
##############################################################################
mkdir -p "$OUT_DIR"
OUT_DIR_ABS="$(cd "$OUT_DIR" && pwd)"
echo "[restore] extracting ${IMAGE} -> ${OUT_DIR_ABS}"
( cd "$WORK_DIR/snapshot-tooling" && bash ./extract.sh "$IMAGE" "$OUT_DIR_ABS" )

ADDRS_FILE="${OUT_DIR_ABS}/e2e-snapshot-addresses.json"
echo "[restore] extracting addresses sidecar -> ${ADDRS_FILE}"
addr_extract_cid="$(docker create "$IMAGE" /bin/true)"
docker cp "${addr_extract_cid}:/e2e-snapshot-addresses.json" "$ADDRS_FILE"
docker rm "$addr_extract_cid" >/dev/null

##############################################################################
# 4. Patch anvil host-port mapping into the extracted docker-compose
##############################################################################
# With l1_backend: anvil, the L1 EL service is named `pos-anvil` (no `el-N`
# segment), so kurtosis-pos's configure_ports skips it and the published
# compose leaves anvil with no host port. Patch the 8545:8545 mapping back in
# before restore.sh runs so the restored devnet exposes anvil's RPC.
COMPOSE_FILE="${OUT_DIR_ABS}/docker-compose.yaml"
echo "[restore] adding 8545:8545 host-port to pos-anvil in ${COMPOSE_FILE}"
python3 - "$COMPOSE_FILE" <<'PY'
import sys
import yaml

path = sys.argv[1]
with open(path) as fh:
    doc = yaml.safe_load(fh)

services = doc.get("services") or {}
anvil_keys = [k for k in services if "anvil" in k]
if not anvil_keys:
    print("[restore] WARNING: no anvil service in docker-compose — snapshot may use a non-anvil L1", file=sys.stderr)
else:
    for k in anvil_keys:
        services[k]["ports"] = ["8545:8545"]

with open(path, "w") as fh:
    yaml.safe_dump(doc, fh, default_flow_style=False, sort_keys=False)
PY

##############################################################################
# 5. Restore docker volumes and bring the devnet up
##############################################################################
# Tear down any previous restore on this host before starting fresh, and wipe
# the named pos-* volumes so restore.sh's `tar xzf` lands in empty volumes
# (leftover files mixed with the snapshot tarball crash bor on startup).
if docker compose --file "$COMPOSE_FILE" ps --quiet 2>/dev/null | grep -q .; then
  echo "[restore] tearing down previous devnet before re-restoring"
  docker compose --file "$COMPOSE_FILE" down --remove-orphans
  docker volume ls --filter 'name=^pos-' --format '{{.Name}}' \
    | xargs -r docker volume rm
fi

echo "[restore] restoring volumes + starting devnet"
( cd "$WORK_DIR/snapshot-tooling" && bash ./restore.sh "$OUT_DIR_ABS" )

# Wait for L2 (bor) to bind 9545 — bor's healthcheck only gates on heimdall, so
# its RPC isn't guaranteed bound on restore.sh return.
L2_RPC_URL="${L2_RPC_URL:-http://127.0.0.1:9545}"
echo "[restore] waiting for L2 RPC at ${L2_RPC_URL}"
deadline=$((SECONDS + 60))
until curl -fsSL -X POST -H 'Content-Type: application/json' \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","id":1}' \
        "$L2_RPC_URL" >/dev/null 2>&1; do
  if [ "$SECONDS" -gt "$deadline" ]; then
    echo "[restore] ERROR: L2 RPC at ${L2_RPC_URL} did not respond within 60s — bor likely crashed at startup" >&2
    docker compose --file "$COMPOSE_FILE" logs --tail=40 >&2 || true
    exit 1
  fi
  sleep 1
done

##############################################################################
# 6. Re-apply anvil state captured at snapshot time
##############################################################################
# anvil's startup dumps state to /tmp (not captured by the snapshot), so on
# restore it boots from bare genesis. build-e2e-snapshot.sh saved the
# dump-state hex into the anvil volume; replay it via anvil_loadState so L1
# contracts exist. (Only relevant if the snapshot ships the hex; older
# snapshots warn and skip.)
ANVIL_RPC_URL="${ANVIL_RPC_URL:-http://127.0.0.1:8545}"
echo "[restore] applying captured anvil state via ${ANVIL_RPC_URL}"
deadline=$((SECONDS + 60))
until curl -fsSL -X POST -H 'Content-Type: application/json' \
        --data '{"jsonrpc":"2.0","method":"web3_clientVersion","id":1}' \
        "$ANVIL_RPC_URL" >/dev/null 2>&1; do
  if [ "$SECONDS" -gt "$deadline" ]; then
    echo "[restore] ERROR: anvil RPC at ${ANVIL_RPC_URL} did not respond within 60s" >&2
    exit 1
  fi
  sleep 1
done
ANVIL_CONTAINER="$(docker compose --file "$COMPOSE_FILE" ps --format '{{.Name}}' | grep '^pos-anvil$' | head -1)"
if [ -z "$ANVIL_CONTAINER" ]; then
  echo "[restore] ERROR: pos-anvil container not running after compose up" >&2
  exit 1
fi
# The hex is ~2 MB; route it through files/pipes (exceeds ARG_MAX as an argv).
state_hex_file="$(mktemp)"
docker exec "$ANVIL_CONTAINER" cat /opt/anvil/state_dump.hex > "$state_hex_file" 2>/dev/null || true
state_hex_bytes="$(wc -c < "$state_hex_file")"
if [ "$state_hex_bytes" -lt 100 ]; then
  echo "[restore] WARNING: pos-anvil:/opt/anvil/state_dump.hex missing or empty (${state_hex_bytes} bytes) — older snapshot?" >&2
  rm -f "$state_hex_file"
else
  body_file="$(mktemp)"
  {
    printf '{"jsonrpc":"2.0","method":"anvil_loadState","params":["'
    cat "$state_hex_file"
    printf '"],"id":1}'
  } > "$body_file"
  rm -f "$state_hex_file"
  load_response="$(curl -fsSL -X POST -H 'Content-Type: application/json' \
    --data-binary "@${body_file}" "$ANVIL_RPC_URL")"
  rm -f "$body_file"
  if ! printf '%s' "$load_response" | python3 -c 'import json,sys; r=json.load(sys.stdin); sys.exit(0 if r.get("result") is True else 1)'; then
    echo "[restore] ERROR: anvil_loadState rejected the captured state: $load_response" >&2
    exit 1
  fi
  echo "[restore] anvil state restored (${state_hex_bytes} bytes)"
fi

##############################################################################
# 7. Summary
##############################################################################
echo ""
echo "[restore] done. devnet is running."
echo "[restore]   compose file:  ${COMPOSE_FILE}"
echo "[restore]   list services: docker compose --file ${COMPOSE_FILE} ps"
echo "[restore]   tear down:     docker compose --file ${COMPOSE_FILE} down --volumes"
