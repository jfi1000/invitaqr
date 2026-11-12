#!/usr/bin/env bash
set -euo pipefail

git pull origin main
docker-compose -f docker-compose.prod.yml build --no-cache api
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.prod.yml exec api node dist/main.js --version
echo "Deploy completado"
