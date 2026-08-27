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
