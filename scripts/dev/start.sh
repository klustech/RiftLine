#!/usr/bin/env bash
set -euo pipefail
echo "Starting local stack..."
docker compose -f infra/docker/docker-compose.local.yml up -d
