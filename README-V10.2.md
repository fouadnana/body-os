# BODY OS V10.2 — Free Food Vision / Gemini

V10.2 remplace le fournisseur OpenAI du backend Food Vision par **Gemini 2.5 Flash-Lite**.

## Objectif

Conserver le flux BODY OS existant :

`photo repas → backend FastAPI → analyse vision → aliments/grammages/kcal/macros → correction humaine → ajout au repas`

Le frontend et son endpoint `/api/food-vision` ne changent pas.

## Pourquoi Gemini 2.5 Flash-Lite

Le modèle accepte les entrées image et dispose actuellement d'un niveau sans frais sur Gemini Developer API, dans les limites de quota de Google. La disponibilité et les quotas du niveau gratuit restent sous le contrôle de Google et peuvent évoluer.

## Configuration Render

Variables d'environnement :

```env
GEMINI_API_KEY=<clé créée dans Google AI Studio>
BODY_OS_VISION_MODEL=gemini-2.5-flash-lite
BODY_OS_ALLOWED_ORIGINS=https://fouadnana.github.io
BODY_OS_MAX_IMAGE_MB=8
```

Build command :

```bash
pip install -r requirements.txt
```

Start command :

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

Root Directory : `backend`

## Sécurité / qualité

- La clé Gemini reste côté serveur.
- L'image est normalisée en JPEG et limitée avant envoi.
- Les sorties sont contraintes par le schéma `FoodVisionResponse`.
- `needs_user_review` est forcé à `true` : les portions et macros issues d'une photo restent des estimations.
- Le frontend conserve l'écran de correction avant validation.

## Important

Le niveau gratuit Gemini peut avoir des quotas et Google indique que les données du free tier peuvent être utilisées pour améliorer ses produits. Ne pas considérer Food Vision comme un dispositif médical ou une mesure nutritionnelle exacte.
