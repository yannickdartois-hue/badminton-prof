# Badminton · outil prof (GAREEPS)

Lycée Georges Pompidou. Récupère les séances envoyées par l'appli élève (`badminton-eleves`), reconstruit les poules et les rencontres, aide à la note. Hors ligne sur iPad et PC.

**En ligne :** https://yannickdartois-hue.github.io/badminton-prof/ · démo : `…/badminton-prof/?demo`

## Chaque année, sans toucher au code
1. **Classes** : importer l'export Pronote, coller le lien d'envoi (Nuage, « Demande de fichier »).
2. **1er cours** : **QR de démarrage** de la classe, scanné par chaque tablette.
3. **Chaque séance** : **Importer** (QR ou fichiers .json / .zip), **Appel**, **Tournoi**, **Pilotage** (poules du jour : 7 terrains, groupes de 4 ou 5, un QR par terrain), **Élèves**, **Exporter**.
4. **Fin d'année** : Classes → « Archiver l'année et repartir à zéro ».

## Note (grille « Évaluation EPS : badminton » du carnet GAREEPS)
- Épreuve : au moins 3 matchs de 4 min contre des adversaires de niveau équivalent ; projet annoncé avant le match ; coach au temps mort à 2 min (l'appli élève met le chrono en pause et ouvre le temps mort guidé) ; arbitre élève.
- AFL1 /12 (technique et projet), AFL2 /2, 4 ou 6 (carnet, préparation et analyse), AFL3 /2, 4 ou 6 (coach, partenaire, arbitre). Descripteurs de la fiche affichés tels quels.
- Pour chaque AFL : le prof choisit le degré (4 parts égales du barème, ex. AFL1 0–3, 3–6, 6–9, 9–12), puis bas, milieu ou haut. Les victoires ne donnent pas la note (adversaires de niveau équivalent).
- Aides : matchs de l'épreuve lus dans les séances cochées (joués, V-N-D, points marqués avec le repère 35 / 60 / 75 de la fiche), projets réalisés, carnet, exercices, arbitrages, codes du coach. Suggestions = repères, jamais une note automatique. Saisie rapide élève par élève, export CSV.
- Le mode « rencontre de binômes » de l'appli élève reste disponible pour s'entraîner, mais il ne sert plus à la note.

## Tournois joués sans tablettes
Les tournois du cycle (`bad-tournois` sur le même appareil, ou fichier `tournois-bad-….json`) deviennent des poules : 1 terrain = 1 poule, matchs au temps (égalité = nul).

## Fichiers partagés avec l'appli élève
`donnees.js`, `logique.js`, `scan.js`, `qrcode.js`, `jsqr.js` : garder la même version dans les deux dépôts. Après une modification : augmenter `CACHE` dans `sw.js`.
