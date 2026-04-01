# Revue complète de la documentation

Date: 2026-03-31  
Périmètre: documentation du dépôt uniquement (pas d'audit du code applicatif)

## Méthode et barème

- Statut documentaire:
  - `Canonique`: source de vérité à maintenir en continu
  - `Support`: utile mais secondaire (référence contextuelle/projet)
  - `Archive`: historique/prototype ou export brut, à isoler
- Score qualité (sur 5):
  - Exactitude technique
  - Fraîcheur (alignement avec l'état actuel)
  - Clarté/actionnabilité
  - Portabilité des liens/ressources

## Matrice de diagnostic par document

| Fichier | Statut recommandé | Score | Diagnostic rapide |
|---|---|---:|---|
| `README.md` | Canonique | 3.2 | Bon point d'entrée, mais liens absolus cassables et au moins une section fonctionnelle obsolète. |
| `GEMINI.md` | Support | 4.2 | Synthèse claire, stable, peu de dette documentaire détectée. |
| `settings.md` | Canonique (après nettoyage) | 2.6 | Bonne structure, mais assertions obsolètes (DB/FS) + nombreux liens `file:///` + appendice legacy très volumineux. |
| `docs/architecture/ADR-003-transformers-local.md` | Canonique | 4.3 | ADR bien structuré et cohérent avec la direction technique locale/offline. |
| `docs/accessibility/keyboard-navigation.md` | Support | 2.8 | Contenu utile, mais liens absolus non portables vers chemins locaux. |
| `docs/accessibility/a11y-test-report.md` | Support | 2.9 | Rapport détaillé, mais même problème de portabilité des liens. |
| `PROPOSAL_STABILIZATION.md` | Support | 3.7 | Proposition actionnable pour tests/stabilisation, plutôt à versionner par itérations. |
| `TEAM_ROLE_ANALYSIS.md` | Support | 3.4 | Audit riche et priorisé, mais volumineux et orienté pilotage plutôt que runbook doc. |
| `Search.md` | Archive | 1.8 | Principalement dump de code/prototype, faible valeur documentaire maintenable. |
| `Maquette.md` | Archive | 1.9 | Contenu très orienté code exporté, peu exploitable comme spec durable. |
| `menu_haut.md` | Archive | 1.8 | Même pattern de dump code/prototype, peu actionnable pour maintenance. |
| `Project Aether V1.x_ Lead Architect Imad_ Architecture Reference and Governance (1).md` | Archive | 2.1 | Document stratégique/historique, format hétérogène, non canonique pour exploitation quotidienne. |
| `Project Aether v-1.1_ AKSIL _ Core IDE Source Code.md` | Archive | 1.6 | Export massif pseudo-source, difficilement vérifiable et non maintenable en l'état. |
| `Project AETHER Technical Manifestos and Strategic Roadmap V1.1.md` | Archive | 2.2 | Manifeste et roadmap utiles historiquement, pas une doc d'exploitation produit. |
| `Aether Front-End_ The Golden Master Source Code.md` | Archive | 1.6 | Gros export code/narratif, pas une source fiable pour l'état actuel du repo. |
| `Création d'un IDE inspiré Sublime_Cursor.md` | Support | 3.1 | Bon document de vision/architecture, mais trop long pour onboarding opérationnel. |
| `.trae/documents/Application IDE IA (specs Markdown).md` | Support | 3.0 | Spécification utile, mais liens absolus cassables et contenu partiellement daté. |

## Constats portabilité (liens, assets, navigation)

### Liens non portables

Liens absolus de type `file:///c:/Users/lamal/work/ide/...` détectés dans:

- `README.md`
- `settings.md`
- `docs/accessibility/keyboard-navigation.md`
- `docs/accessibility/a11y-test-report.md`
- `.trae/documents/Application IDE IA (specs Markdown).md`

Impact: ces liens cassent hors de la machine d'origine et en rendu GitHub.

### Assets référencés

- Références à `docs/screenshots/menu-bar.png`, `docs/screenshots/global-search.png`, `docs/screenshots/settings.png` présentes dans `README.md`.
- Dossier actuel: `docs/screenshots/.gitkeep` uniquement.

Impact: sections "captures" incomplètes pour lecteurs externes.

## Cohérence documentation vs état du projet

### Écarts critiques

- `README.md` indique encore "pas de File System Access API", alors que le code expose des services de chargement/sauvegarde projet.
- `settings.md` affirme "no database", alors que le projet contient une base locale IndexedDB (`AetherDB`/`VectorStore`).

### Écarts modérés

- Mélange FR/EN sans convention explicite.
- Absence de marquage clair "archive" pour les documents historiques/dumps.

## Lacunes de couverture (par besoin utilisateur)

### Onboarding

- Présent: installation/build/test basiques.
- Manque: prérequis précis (versions Node recommandées), parcours "first run", captures vérifiées.

### Exploitation quotidienne

- Présent: vue d'ensemble des fonctionnalités.
- Manque: guide utilisateur orienté tâches (ouvrir projet, recherche, mission control, limites/erreurs fréquentes).

### Contribution

- Lacune majeure: pas de `CONTRIBUTING.md`, pas de conventions de commit/doc/testing centralisées.
- Pas de guide "comment mettre à jour la doc quand le code change".

### Architecture / décisions

- Présent: un ADR de bonne qualité.
- Manque: index ADR + règles de création/mise à jour d'ADR pour nouvelles décisions.

### Qualité documentaire / automatisation

- Pas de lint Markdown/link-check en CI.
- Pas de workflow CI détecté pour validation documentation.

## Backlog d'amélioration priorisé

### P0 (bloquant documentation fiable)

1. Remplacer tous les liens `file:///...` par des liens relatifs de repo.
2. Corriger les affirmations obsolètes dans `README.md` et `settings.md` (FS API, IndexedDB).
3. Ajouter/retirer explicitement les captures attendues dans `README.md` selon disponibilité réelle.

### P1 (structuration et gouvernance doc)

1. Créer `CONTRIBUTING.md` avec section "Documentation standards".
2. Créer un index documentaire (ex: `docs/README.md`) avec statut de chaque doc (`Canonique/Support/Archive`).
3. Déplacer les documents historiques en dossier `docs/archive/` avec en-tête "historique/non source de vérité".
4. Extraire l'appendice legacy de `settings.md` dans une archive dédiée.

### P2 (standardisation et contrôles automatiques)

1. Ajouter un lint Markdown (`markdownlint`) et un check de liens (`lychee` ou équivalent).
2. Ajouter un workflow CI doc (lint + link-check sur PR).
3. Définir des templates minimaux:
   - README produit
   - ADR
   - Rapport qualité/a11y
4. Formaliser une convention de langue (FR principal + glossaire EN, ou inverse).

## Standard documentaire minimal proposé

- Liens: uniquement relatifs au repo, jamais de chemin local absolu.
- Statut obligatoire en tête de document: `Canonique`, `Support`, `Archive`.
- Date de dernière révision obligatoire.
- Section minimale par type:
  - README: objectifs, setup, usage, limites, troubleshooting.
  - ADR: contexte, décision, alternatives, conséquences.
  - Rapport: périmètre, méthode, constats, actions.

## Synthèse exécutive

La documentation contient une base solide (`README`, ADR, docs a11y), mais sa fiabilité globale est réduite par la portabilité des liens, plusieurs divergences avec le code actuel, et une forte présence de documents de type "dump historique". La priorité immédiate est de restaurer une source de vérité exploitable (P0), puis de structurer la gouvernance documentaire (P1) avant d'automatiser les contrôles (P2).
