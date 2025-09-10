#!/usr/bin/env bash
set -euo pipefail
echo "Stopping local stack..."
docker compose -f infra/docker/docker-compose.local.yml down
