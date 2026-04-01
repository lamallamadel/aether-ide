## Lecture des spécifications
- Transformer [Maquette.md](../../docs/archive/Maquette.md) en backlog “UI + state” : explorateur (arbre), onglets, éditeur read-only, panneau IA (streaming mock), palette de commandes (recherche fichiers + actions), status bar, raccourcis clavier.
- Interpréter [Création d'un IDE inspiré Sublime_Cursor.md](../../Création%20d'un%20IDE%20inspir%C3%A9%20Sublime_Cursor.md) comme exigences d’architecture (non-bloquant, tâches async, API agent-friendly, indexation/RAG, worktree fantôme + mission control) et définir une implémentation “prototype” web cohérente.

## Stack & structure de projet
- Créer une app web React + TypeScript (Vite) avec Tailwind CSS pour reproduire fidèlement les classes/visuels de la maquette.
- Ajouter Zustand (state), lucide-react (icônes) comme dans la maquette.
- Mettre en place Vitest + React Testing Library (tests unitaires + tests composants) + jsdom.
- Organiser le code en modules :
  - src/state (store Zustand)
  - src/components (UI)
  - src/domain (types + règles)
  - src/services (IA, indexation, JSON-RPC/MCP mock)
  - src/workers (tâches lourdes simulées en Web Worker)

## Implémentation UI (fidèle à la maquette)
- Activity Bar (colonne gauche) avec icônes et styles.
- Sidebar + FileTreeItem + FileIcon :
  - Toggle dossier via isOpen
  - Ouvrir fichier via openFile
  - Highlight fichier actif
- TabSystem :
  - Liste openFiles, activation, fermeture (avec fallback sur dernier onglet)
- EditorArea + SimpleCodeEditor :
  - Affichage du contenu du fichier actif + numéros de ligne
  - Placeholder quand aucun fichier actif
- AIChatPanel :
  - Liste de messages user/ai
  - Validation input (trim)
  - Envoi via Enter, newline via Shift+Enter
  - Réponse IA simulée avec état “typing” et mise à jour “stream-like”
- CommandPalette :
  - Ouverture/fermeture, focus input, reset search à la fermeture
  - Recherche case-insensitive sur la liste aplatie des fichiers
  - Sélection d’un fichier => openFile + fermeture palette
  - Section “Commands” (au minimum : Ask AI, Toggle Sidebar)
- StatusBar : affichage identique (Ln/Col mock, encoding, langage, état IA)
- Raccourcis globaux : Ctrl/Cmd+K (palette), Ctrl/Cmd+B (sidebar), Ctrl/Cmd+L (IA)
  - Garde-fou : ne pas déclencher si focus dans input/textarea/contentEditable.
- Styles globaux : custom scrollbar + sélection + animation “animate-in” via CSS global (au lieu d’un <style> inline).

## Modèle de données & règles métier
- Implémenter FileNode + INITIAL_FILES exactement comme dans la maquette (y compris contenus mock).
- Implémenter le store Zustand avec les mêmes champs et actions :
  - openFile sans duplicats
  - closeFile avec recalcul activeFileId
  - getFileContent basé sur recherche récursive
  - toggleFolder via mapping récursif

## “Architecture doc” : prototypes fonctionnels (sans sur-promettre un IDE natif)
- Non-bloquant / tâches lourdes :
  - Déporter parsing/indexation simulés dans un Web Worker (message passing) pour respecter l’esprit “ne pas bloquer le thread UI”.
- Text buffer :
  - Introduire une abstraction TextBuffer (interface) + implémentation simple type “piece table” en TypeScript (suffisante pour tests), même si l’éditeur UI reste read-only.
- Indexation & RAG (local, sans API externe obligatoire) :
  - Chunking “structurel” simplifié (par heuristiques) + index lexical/TF-IDF léger.
  - Service de recherche sémantique local (cosine) utilisé par l’IA mock pour citer des fichiers “pertinents”.
- MCP / JSON-RPC (mock) :
  - Implémenter un client JSON-RPC in-memory avec registre de “serveurs/outils”, erreurs structurées, pagination/limits.
  - Exposer quelques outils locaux (list files, read file content, search) pour illustrer l’API agent-friendly.
- Worktree fantôme + Mission Control :
  - Ajouter un panneau “Mission Control” minimal : l’IA peut proposer un patch (sur contenu mock) dans un worktree parallèle, affichage d’un diff (ligne à ligne) + boutons Accept/Reject.
  - Accès via la palette (commande dédiée).

## Validations & accessibilité
- Validations : empêcher l’envoi de message vide, sécuriser les raccourcis globaux, robustesse sur fermeture onglets.
- UX : focus cohérent (palette), fermeture ESC, clic backdrop pour fermer.

## Tests unitaires & tests UI
- Tests du store Zustand : openFile (pas de doublon), closeFile (fallback), toggleFolder, getFileContent.
- Tests des services :
  - TextBuffer (insert/delete invariants)
  - Diff (rendu cohérent)
  - JSON-RPC/MCP mock (idempotence, erreurs structurées, limits)
  - Indexation (recherche retourne résultats attendus)
- Tests composants :
  - Rendu de base App
  - Ouverture fichier via click arbre
  - Raccourci Ctrl+K ouvre la palette
  - Envoi message chat (Enter) + validation vide

## Documentation (sans commentaires inline)
- Ajouter un README (FR) : fonctionnalités implémentées, structure, scripts, conventions, limites du prototype vs cible “IDE natif”.
- Documenter les interfaces clés (types/contrats) via types TS et fichiers de spécification (docs/) si utile.

## Vérification
- Lancer la build et la suite de tests.
- Vérifier visuellement que l’UI correspond à la maquette (dimensions, couleurs, comportements).
- Vérifier que toutes les fonctionnalités listées dans Maquette.md sont présentes et que les concepts majeurs du second MD ont une implémentation prototype (worker, index, JSON-RPC, mission control).