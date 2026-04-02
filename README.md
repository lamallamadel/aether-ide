# Aether Code IDE (prototype IDE IA)

Application web inspirée de Sublime/Cursor, implémentée à partir des spécifications :
- [Maquette.md](./docs/archive/Maquette.md) : UI + état + workflows
- [Création d'un IDE inspiré Sublime_Cursor.md](./Création%20d'un%20IDE%20inspiré%20Sublime_Cursor.md) : contraintes d’architecture (async, API agent-friendly, indexation, worktree)

## Fonctionnalités
- Menu haut (type desktop IDE) avec dropdowns : File/Edit/…/Help (responsive + accessible)
- Explorateur de fichiers (arbre dossiers/fichiers), ouverture des fichiers
- Onglets : activation/fermeture, fichier actif
- Éditeur CodeMirror 6 (édition + wrap + font-size) + parsing Tree-sitter (worker)
- Panneau de chat IA (mock streaming + indicateur de saisie)
- Palette de commandes : recherche fichiers + actions (Toggle Sidebar, Ask AI, Global Search, Mission Control)
- Global Search : recherche contenu (TF‑IDF) / filename / Knowledge (GraphRAG “lazy” minimal via IndexedDB) + filtres (scope + extensions)
- Settings : modal catégorisée (Theme, Editor, Languages, Servers, AI Privacy, Environment, Keybindings, Workspace, Extensions), recherche et persistance de section
- Raccourcis : Ctrl/Cmd+K (palette), Ctrl/Cmd+B (sidebar), Ctrl/Cmd+L (IA), Ctrl/Cmd+, (settings)
- Mission Control : worktree fantôme + diff + Accept/Reject + badge de risque (trivial/review/high)
- StatusBar : métriques 16ms (Long Tasks) en temps réel
- Module d'extensions hybride (in-process + sandbox worker)
- Extension builtin `aether.native` activée au démarrage
- Extension builtin `yaml.native` activée au démarrage et à l'ouverture de fichiers YAML
- LSP Aether: mode `embedded` (par défaut), `external` et `auto` (fallback automatique)
- LSP YAML: mode `embedded` (par défaut), `external` et `auto` (fallback automatique)
- Langage Aether par défaut pour les nouveaux buffers et les fichiers `.aether`
- Environnement unifié runtime + workspace (résolution déterministe runtime/workspace/fallback)

## Captures d’écran
- Ajoutez vos captures dans `docs/screenshots/`
- Recommandé : `docs/screenshots/menu-bar.png`, `docs/screenshots/global-search.png`, `docs/screenshots/settings.png`
- Note : le dépôt ne fournit actuellement qu'un placeholder (`docs/screenshots/.gitkeep`).

## Accessibilité
- Navigation clavier menu : [keyboard-navigation.md](./docs/accessibility/keyboard-navigation.md)
- Rapport de test a11y : [a11y-test-report.md](./docs/accessibility/a11y-test-report.md)
- Global Search : focus visible aligné thème (résultats + filtres)

## Prototypes “architecture”
- Buffer texte type piece table : `src/services/textBuffer/`
- Indexation locale TF‑IDF + chunking : `src/services/indexing/` (+ worker `src/workers/indexer.worker.ts`)
- JSON‑RPC in-memory (style MCP) + erreurs structurées : `src/services/jsonrpc/` et `src/services/mcp/`

## Structure du code
- `src/components/` : UI (sidebar, éditeur, chat, palette, mission control…)
- `src/state/` : Zustand store
- `src/domain/` : types et données mock
- `src/services/` : logique “moteur” (diff, index, buffer, JSON‑RPC)

## Documentation
- Index et statuts documentaires : [docs/README.md](./docs/README.md)
- Guide de contribution : [CONTRIBUTING.md](./CONTRIBUTING.md)

## Développement
```bash
npm install
npm run dev
```

## Tests
```bash
npm test
```

## Build
```bash
npm run build
```

## Application desktop (Electron)

Après `npm install`, le même front est empaqueté avec **Electron** (processus principal : [`electron/main.mjs`](./electron/main.mjs), preload : [`electron/preload.mjs`](./electron/preload.mjs)).

```bash
npm run desktop:dev    # Lance Vite + une fenêtre Electron (serveur http://127.0.0.1:5173)
npm run desktop:build  # Build Vite avec chemins relatifs + electron-builder → artefacts dans ./release/
```

- Le build desktop utilise `VITE_DESKTOP=1` pour fixer le `base` Vite à `./` (compatible avec `loadFile` et `file://`).
- Dans l’UI, **File → Open Folder** et la persistance **`.aether/workspace.json`** fonctionnent comme dans le navigateur (File System Access dans le renderer Chromium).
- `window.aetherDesktop` expose la plateforme et un hook IPC `pickWorkspaceRoot()` (chemin absolu) pour une future couche FS 100 % native.
- CI : workflow [`.github/workflows/desktop.yml`](./.github/workflows/desktop.yml) (matrice Ubuntu / Windows / macOS). La signature des binaires (Windows/macOS) n’est pas configurée dans ce dépôt.
- **Windows** : si `electron-builder` échoue en extrayant `winCodeSign` (symlinks), activer le **mode développeur** Windows ou lancer le terminal en administrateur ; la config utilise `signAndEditExecutable: false` et `npmRebuild: false` pour limiter ces dépendances.

## Limitations connues
- **Chat IA** : utilise uniquement GraphRAG (retrieval). Pas de génération LLM — les réponses sont des snippets formatés, pas un vrai dialogue.
- **Fichiers** : un flux projet réel est disponible via File System Access API, mais reste dépendant des capacités du navigateur et d'un contexte sécurisé (HTTPS/localhost). Certaines expériences restent orientées prototype.
- **Cloud vs Local** : le mode Cloud n'appelle pas d'API externe. Les deux modes utilisent des embeddings locaux ([@huggingface/transformers](https://huggingface.co/docs/transformers.js)).
