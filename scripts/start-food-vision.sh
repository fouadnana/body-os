#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../backend"
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Ajoute GEMINI_API_KEY dans backend/.env puis relance."
  exit 1
fi
uvicorn main:app --host 127.0.0.1 --port 8787 --reload
