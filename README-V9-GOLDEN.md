# BODY OS V9 — Adaptive Body Interface

Source de vérité visuelle: `docs/reference/V9-GOLDEN-MOCKUP.png`.

Cette branche isole la refonte V9 dans `src/V9App.tsx` et `src/v9.css` afin de préserver la base V8.9.

Écrans inclus:
- Today / trajectoire de sèche
- Nutrition
- Détail repas
- Séance workout
- Exercice immersif
- Timer de repos
- Historique exercice
- Progress
- AI Coach (shell local/demo)
- Plan IA semaine

Le moteur conversationnel n'est pas requis pour le rendu ni pour les règles déterministes. Aucun secret API n'est embarqué côté client.

## Test local

```bash
npm install
npm run build
npm run dev -- --host 0.0.0.0
```

## QA prioritaire
1. iPhone: densité / safe-area / bottom nav.
2. Today: anatomie centrale, orbites, poids, taille, trajectoire.
3. Workout: médias, charge, reps, RIR, validation, repos, historique.
4. Nutrition: macro ring, timeline repas, sheet repas.
5. Progress: courbe poids, mesures, body impact.
6. AI Coach: mode demo sans clé API.
7. Plan semaine: scroll horizontal mobile.
