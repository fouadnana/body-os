# BODY OS — AI CUT V2

PWA React + TypeScript, conçue à partir des maquettes validées.

## V2 inclut
- TODAY cockpit
- WORKOUT set-by-set + timer repos
- sauvegarde charges / reps / RIR
- archivage de séance + volume
- conseil automatique KEEP / PROGRESS par exercice
- nutrition quotidienne + macros
- suivi poids / tour de taille / pas
- photos FACE / PROFIL / DOS stockées localement dans IndexedDB
- AI CHECK-IN utilisant tendances 7/14 jours
- décisions KEEP / PROGRESS / ADJUST / RECOVER
- niveaux L5-S1 1→4
- blocage prudent des exercices `medium` si check-in dos = orange/rouge
- PWA installable iPhone
- workflow GitHub Pages prêt à l'emploi

## Lancer localement
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Déploiement GitHub Pages
1. Créer un repo GitHub.
2. Mettre ces fichiers sur `main`.
3. Settings → Pages → Source: GitHub Actions.
4. Le workflow `.github/workflows/deploy.yml` build et publie automatiquement.

## Données
Les données sont locales au navigateur :
- localStorage : séances, mesures, check-ins
- IndexedDB : photos de progression

Aucune donnée santé n'est envoyée vers un serveur dans cette V2.


## V3 Mockup Parity

- Refonte visuelle TODAY / WORKOUT / AI COACH alignée sur la maquette validée.
- Layout mobile-first 390px.
- Navigation 5 tabs fixe.
- Données et moteur V2 conservés.
- Déploiement GitHub Pages : `npm install && npm run deploy`.


## V4 Pixel-Parity
- TODAY responsive mobile/desktop.
- Premium anatomy component.
- WORKOUT split layout desktop, compact mobile.
- AI COACH two-column desktop, single-column mobile.
- `.gitignore` added to exclude node_modules/dist.
- Deploy: `npm install && npm run build && npm run deploy`.


## V5 TODAY Pixel Lock
- TODAY verrouillé sur la maquette validée.
- Largeur app 390 px sur desktop, 100% iPhone.
- Asset anatomique et L5-S1 dérivés de la maquette validée.
- Les autres écrans restent fonctionnels mais ne sont pas encore pixel-lockés.

## V6.1 TODAY Finalize
- Courbe 7 jours toujours visible grâce à un fallback de démonstration.
- Labels L M M J V S D visibles.
- Carte poids/taille resserrée.
- Illustration anatomique mieux fondue dans la carte PUSH.
- Netteté et densité verticale affinées.

## V6.2 Retina Sharp
- Remplacement des petits JPG par des SVG vectoriels.
- Suppression des compositings/masks pouvant dégrader le rendu.
- Aucun transform/scale sur le viewport applicatif.
- Typographies légèrement remontées pour la netteté Retina.

## V6.2.1 Asset Hotfix
- Assets Retina servis depuis public/ avec chemins GitHub Pages explicites.
- Correction de la déclaration CSS invalide `-webkit-`.
- Aucun changement fonctionnel ou de layout hors rendu des illustrations.

## V6.3 TODAY Final Visual
- Retour au visuel anatomique premium de la maquette validée.
- Asset PNG lossless préparé en haute résolution, sans JPEG 8 kB.
- Rendu à taille contrôlée pour éviter l'agrandissement flou.
- Structure, courbe, L5-S1 et moteur V6.2.1 conservés.

## V6.4 — Mockup Fidelity Lock
- TODAY recalé sur la maquette V1 validée : proportions, densité, cartes, typographie et navigation.
- Aucun changement de logique React, stockage, données ou navigation.
- Asset V6.3 conservé : cette passe vise l'interface, pas une nouvelle direction graphique.


## V6.5 — iPhone Fidelity Lock
- TODAY compressé spécifiquement pour iPhone 375/390 px afin de retrouver la densité de la maquette validée.
- Header, greeting, PUSH, KPI, L5-S1, trend, AI Coach et bottom nav recalibrés.
- Le visuel anatomique existant est fondu dans la carte via un masque CSS pour supprimer l'effet de rectangle noir.
- Aucun changement de logique React, stockage, données, routes ou navigation.

## V6.6 — WORKOUT Fidelity + Interaction
- WORKOUT recalé sur la vue centrale de la maquette V1 validée.
- Stepper 1→6, média, consignes, tableau séries, validation, ajout de série, timer et exercice suivant.
- Le bouton Play ouvre désormais une fiche de démonstration intégrée.
- Limite volontaire : aucune vidéo d'exercice réelle n'est embarquée dans cette version ; il faut une bibliothèque vidéo/source dédiée pour remplacer la démonstration statique.
- TODAY V6.5 est préservé.

## V6.6.1 — WORKOUT iPhone Fidelity Lock
- La grande zone média reprend désormais la démonstration visuelle du développé incliné issue de la maquette de référence validée.
- L'anatomie reste uniquement en vignette secondaire, comme dans la maquette.
- Premier exercice PUSH prérempli à 80/10/2, 80/10/2, 80/9/2, 80/8/2 pour reproduire l'expérience cible.
- Les données restent modifiables et persistantes via le stockage existant.
- Compaction iPhone du header, stepper, média, consignes, tableau et actions afin de faire remonter la carte Exercice suivant.
- Le bouton Play ouvre toujours la démonstration intégrée.

## V6.7 — Workout Exercise Engine
- Écran WORKOUT unique et data-driven.
- 5 séances structurées.
- Muscle mapping principal/secondaire par exercice.
- Prescriptions dynamiques.
- Démo inclinée validée conservée.
- Slots média explicites pour les autres exercices, sans fausse démonstration.
- Voir `WORKOUT-ENGINE.md`.

## V6.7.1 — No Image Duplicates
- Correction ciblée du doublon anatomique sur `incline-machine`.
- L'asset de démonstration actuel contient déjà son mannequin anatomique : la carte dynamique supplémentaire est donc masquée uniquement pour cet exercice.
- Pour tous les autres exercices, la carte musculaire dynamique reste active.
- Aucun changement sur le moteur, les prescriptions, la navigation, le stockage ou le layout.
- Prochaine étape : remplacer progressivement les démos par des assets propres sans anatomie incrustée, afin de réactiver une carte musculaire unique et indépendante partout.

## V6.7.2 — WORKOUT Golden Lock
- Le cadrage média du développé incliné reprend exactement la composition visuelle validée.
- Le pratiquant est désormais adapté aux proportions de la zone média.
- Une seule anatomie est visible.
- Le bouton Play est de nouveau visible et reste fonctionnel via une zone tactile superposée.
- Ce rendu devient la Golden Reference à reproduire pour les autres exercices.

## V6.9 — FULL EXERCISE MOCKUPS

Couverture complète des 5 séances et 31 exercices.
Chaque exercice est maintenant inspectable depuis WORKOUT avec :
- sa maquette de démonstration dédiée ;
- sa carte anatomique dédiée ;
- ses muscles primaires / secondaires ;
- séries, répétitions, RIR, repos et consigne ;
- modal Play ;
- navigation exercice précédent/suivant via le stepper ;
- sélecteur PUSH / PULL / LEGS A / UPPER / LOWER + BRAS ;
- catalogue de maquettes de la séance.

Le développé incliné conserve la Golden Reference validée.
Les 30 autres visuels sont des maquettes UX de développement destinées à valider l'ensemble avant production des médias photo/vidéo finaux.
