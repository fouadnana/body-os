#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"
[ -d .venv ] || python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
if [ ! -f .env ]; then cp .env.example .env; echo "Ajoute OPENAI_API_KEY dans backend/.env puis relance."; exit 1; fi
exec uvicorn main:app --reload --host 0.0.0.0 --port 8787
