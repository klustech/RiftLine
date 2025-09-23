#!/usr/bin/env bash
set -euo pipefail

echo "[riftline] Running Prisma migrations for api-gateway"
(
  cd backend/api-gateway
  npm install --silent
  npx prisma generate
  npx prisma migrate deploy
)
echo "[riftline] Prisma migrations complete"
