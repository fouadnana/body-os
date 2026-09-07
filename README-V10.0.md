# BODY OS V10.0 — REAL FOOD VISION

Architecture : PWA → backend FastAPI → modèle vision → JSON structuré → correction humaine → Nutrition.

## Terminal 1 — backend
```bash
cd /tmp/body-os-v617
./scripts/start-food-vision.sh
```
Ajoute ensuite `OPENAI_API_KEY` dans `backend/.env` puis relance.

## Terminal 2 — frontend
```bash
cd /tmp/body-os-v617
cp .env.example .env.local
npm run dev -- --host 0.0.0.0
```

La clé API reste exclusivement côté backend. La validation humaine reste obligatoire avant sauvegarde des macros.
