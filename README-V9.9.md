# BODY OS V9.9 — AI Food Vision

Flux : photo/caméra → analyse → aliments détectés → portions → kcal/macros → confiance → correction → ajout au repas.

Aucune clé IA n'est exposée dans le PWA. Une vraie analyse vision se branche via `VITE_FOOD_VISION_ENDPOINT`. Sans endpoint, l'interface utilise un mode local explicitement étiqueté comme démonstration afin de tester tout le workflow sans prétendre reconnaître réellement une photo arbitraire.
