#!/usr/bin/env bash
set -euo pipefail

if [ ! -f .env.production ]; then
  echo "ERROR: .env.production absent."
  echo "Create it from .env.production.example after deploying the Food Vision backend."
  exit 1
fi

if ! grep -q '^VITE_FOOD_VISION_ENDPOINT=https://' .env.production; then
  echo "ERROR: VITE_FOOD_VISION_ENDPOINT must be a public HTTPS URL."
  exit 1
fi

npm install
npm run build
echo "BODY OS production build ready in dist/"
