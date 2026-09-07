# BODY OS V10.1 — Food Vision Production Ready

## What changes

V10.1 closes the deployment gap left by V10.0:

1. The FastAPI Food Vision backend has a production deployment blueprint (`render.yaml`).
2. `OPENAI_API_KEY` remains server-side only.
3. CORS is restricted to `https://fouadnana.github.io`.
4. The frontend accepts a public HTTPS Food Vision endpoint through `.env.production`.
5. Production no longer silently uses fake/demo recognition when no backend is configured.
6. Local development can still use `http://127.0.0.1:8787/api/food-vision`.
7. Python cache files and secrets are ignored by Git.
8. A guarded production build script refuses to build without a configured HTTPS backend.

## Production sequence

### 1. Deploy backend

Use `render.yaml` at repository root with a Render Blueprint.

Configure the secret:
`OPENAI_API_KEY`

After deployment, verify:
`https://<backend>/health`

### 2. Connect frontend

Create `.env.production`:

```env
VITE_FOOD_VISION_ENDPOINT=https://<backend>/api/food-vision
```

### 3. Build

```bash
./scripts/build-production.sh
```

### 4. Deploy `dist/` to gh-pages

Use the existing BODY OS gh-pages deployment flow.

## Important

Meal-photo macro estimation remains probabilistic. BODY OS therefore keeps the correction screen and requires explicit human validation before writing the result into Nutrition.
