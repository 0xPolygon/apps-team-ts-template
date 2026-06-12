#!/usr/bin/env bash
#
# Brings up the example-rest-api integration resources (Redis + the Firestore
# emulator) via the package's docker-compose.yml, discovers the EPHEMERAL host
# ports Compose published, and exports the connection env vars to $GITHUB_ENV.
# vitest.globalSetup then sees both REDIS_URL and FIRESTORE_EMULATOR_HOST
# already set and DEFERS — it uses these instead of managing Docker itself.
#
# Why a script (not a `services:` block): a GitHub Actions service container
# can't override the image's command, but the Firestore emulator image needs
# `gcloud beta emulators firestore start ...` to do anything. So the emulator
# can only come up via Compose (which carries that command), and we bring Redis
# up the same way for one consistent path. Reusing the repo's docker-compose.yml
# keeps the resource definitions in one place rather than duplicating them in
# YAML.
#
# Arg 1 (HOST) is how the test process reaches the published ports:
#   localhost    — ci-trigger runs the suite on the runner host (default).
#   172.17.0.1   — docker-release runs the suite from a sibling app container,
#                  which reaches the runner's published ports via the Docker
#                  bridge gateway (NOT localhost — inside the app container that
#                  is the container itself).
set -euo pipefail

HOST="${1:-localhost}"
COMPOSE_FILE="packages/example-rest-api/docker-compose.yml"

docker compose -f "$COMPOSE_FILE" up -d --wait

redis_port="$(docker compose -f "$COMPOSE_FILE" port redis 6379 | cut -d: -f2)"
firestore_port="$(docker compose -f "$COMPOSE_FILE" port firestore-emulator 8080 | cut -d: -f2)"

{
  echo "REDIS_URL=${HOST}:${redis_port}"
  echo "REDIS_CLUSTER=false"
  echo "FIRESTORE_EMULATOR_HOST=${HOST}:${firestore_port}"
  echo "GOOGLE_CLOUD_PROJECT_ID=demo-example-rest-api"
} >>"$GITHUB_ENV"

echo "Integration resources ready: redis=${HOST}:${redis_port} firestore=${HOST}:${firestore_port}"
