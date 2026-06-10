#!/bin/sh
set -e

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Skopiowano .env.example -> .env"
fi

docker compose up db -d
pnpm dev
