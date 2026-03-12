# Aether Code IDE (prototype IDE IA)

Application web inspirée de Sublime/Cursor, implémentée à partir des spécifications :
- [Maquette.md](./Maquette.md) : UI + état + workflows
- [Création d'un IDE inspiré Sublime_Cursor.md](./Création%20d'un%20IDE%20inspiré%20Sublime_Cursor.md) : contraintes d’architecture (async, API agent-friendly, indexation, worktree)

## Fonctionnalités
- Menu haut (type desktop IDE) avec dropdowns : File/Edit/…/Help (responsive + accessible)
- Explorateur de fichiers (arbre dossiers/fichiers), ouverture des fichiers
- Onglets : activation/fermeture, fichier actif
- Éditeur CodeMirror 6 (édition + wrap + font-size) + parsing Tree-sitter (worker)
- Panneau de chat IA (mock streaming + indicateur de saisie)
- Palette de commandes : recherche fichiers + actions (Toggle Sidebar, Ask AI, Global Search, Mission Control)
- Global Search : recherche contenu (TF‑IDF) / filename / Knowledge (GraphRAG “lazy” minimal via IndexedDB) + filtres (scope + extensions)
- Settings : modal + préférences éditeur + AI Mode (Cloud/Local). Local active “Zero‑egress”
- Raccourcis : Ctrl/Cmd+K (palette), Ctrl/Cmd+B (sidebar), Ctrl/Cmd+L (IA), Ctrl/Cmd+, (settings)
- Mission Control : worktree fantôme + diff + Accept/Reject + badge de risque (trivial/review/high)
- StatusBar : métriques 16ms (Long Tasks) en temps réel

## Captures d’écran
- Ajoutez vos captures dans `docs/screenshots/`
- Recommandé : `docs/screenshots/menu-bar.png`, `docs/screenshots/global-search.png`, `docs/screenshots/settings.png`

## Accessibilité
- Navigation clavier menu : [keyboard-navigation.md](file:///c:/Users/lamal/work/ide/docs/accessibility/keyboard-navigation.md)
- Rapport de test a11y : [a11y-test-report.md](file:///c:/Users/lamal/work/ide/docs/accessibility/a11y-test-report.md)
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

## Limitations connues
- **Chat IA** : utilise uniquement GraphRAG (retrieval). Pas de génération LLM — les réponses sont des snippets formatés, pas un vrai dialogue.
- **Fichiers** : arbre statique (`INITIAL_FILES`). Pas de File System Access API ni d'import de projet réel.
- **Cloud vs Local** : le mode Cloud n'appelle pas d'API externe. Les deux modes utilisent des embeddings locaux (@xenova/transformers).
