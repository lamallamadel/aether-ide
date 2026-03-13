# Proposition : stabilisation des tests Phase 1 & 2

## Problèmes identifiés

| Problème | Tests concernés | Cause probable |
|----------|-----------------|----------------|
| Maximum update depth exceeded | App.test (8), GlobalSearch.test (1) | Boucle de rendu lors du montage de `<App />` : subscription store → mise à jour → re-render → mise à jour |
| perfMonitor mocké globalement | perfMonitor.test (1) | `vi.mock` dans setup empêche le test d’utiliser l’implémentation réelle |

---

## Correction 1 : perfMonitor — mock limité aux tests App/GlobalSearch

**Option A (recommandée)** : retirer le mock de `perfMonitor` du setup et le mocker uniquement dans App.test et GlobalSearch.test :

```ts
// App.test.tsx et GlobalSearch.test.tsx — en tête du fichier
vi.mock('../services/perf/perfMonitor', () => ({
  startPerfMonitor: vi.fn(() => () => {}),
}))
```

**Option B** : garder le mock global et adapter `perfMonitor.test.ts` pour désactiver le mock :

```ts
// perfMonitor.test.ts — tout en haut, avant tout import
vi.unmock('../services/perf/perfMonitor')
```

→ Utiliser **Option A** : mock ciblé uniquement dans les tests qui montent App.

---

## Correction 2 : boucle « Maximum update depth » — abonnements sélectifs dans App

App utilise `useEditorStore()` sans sélecteur, donc il se ré-abonne à tout le store. Toute mise à jour (indexing, perf, etc.) provoque un re-render, ce qui peut enchaîner des effects et créer une boucle.

**Modifier App.tsx** : utiliser des sélecteurs ciblés avec `useShallow` (Zustand v4+) ou des sélecteurs manuels :

```ts
// Avant
const { files, terminalPanelOpen, setCommandPaletteOpen, ... } = useEditorStore()

// Après — sélecteur avec shallow compare
import { useShallow } from 'zustand/react/shallow'

const files = useEditorStore((s) => s.files)
const terminalPanelOpen = useEditorStore((s) => s.terminalPanelOpen)
const setCommandPaletteOpen = useEditorStore((s) => s.setCommandPaletteOpen)
// ... idem pour les autres actions (setters), stables par défaut
```

Ou regrouper en un seul sélecteur :

```ts
const { files, terminalPanelOpen, setCommandPaletteOpen, toggleSidebar, ... } = useEditorStore(
  useShallow((s) => ({
    files: s.files,
    terminalPanelOpen: s.terminalPanelOpen,
    setCommandPaletteOpen: s.setCommandPaletteOpen,
    toggleSidebar: s.toggleSidebar,
    toggleAiPanel: s.toggleAiPanel,
    setSettingsOpen: s.setSettingsOpen,
    setMissionControlOpen: s.setMissionControlOpen,
    setIndexingError: s.setIndexingError,
    toggleTerminalPanel: s.toggleTerminalPanel,
  }))
)
```

**Alternative** : supprimer l’appel synchrone à `setIndexingError(null)` en début d’effect, car l’état initial est déjà `null` :

```ts
// App.tsx — dans l’effect d’indexation
useEffect(() => {
  const flatFiles = ...
  traverse(files)
  // Retirer : setIndexingError(null)
  workerBridge.postRequest('INDEX_BUILD', { files: flatFiles })
    .then(() => setIndexingError(null))
    .catch((err) => setIndexingError(...))
}, [files, setIndexingError])
```

---

## Correction 3 : mock de @xterm/xterm pour les tests qui rendent le terminal

Si un test ouvre le terminal (`terminalPanelOpen: true`), il faut mocker xterm car il utilise Canvas/WebGL :

```ts
// Dans setup.ts ou dans les tests qui ouvrent le terminal
vi.mock('@xterm/xterm', () => ({
  Terminal: vi.fn().mockImplementation(() => ({
    loadAddon: vi.fn(),
    open: vi.fn(),
    writeln: vi.fn(),
    write: vi.fn(),
    clear: vi.fn(),
    onData: vi.fn(),
    dispose: vi.fn(),
  })),
}))

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: vi.fn().mockImplementation(() => ({
    fit: vi.fn(),
  })),
}))
```

Pour l’instant les tests ne montent pas le terminal, donc on peut ignorer ce point jusqu’à ce que des tests du TerminalPanel soient ajoutés.

---

## Plan d’implémentation (ordre conseillé)

1. **Retirer le mock perfMonitor du setup** et l’ajouter uniquement dans `App.test.tsx` et `GlobalSearch.test.tsx`.
2. **Simplifier l’effect d’indexation** : supprimer le `setIndexingError(null)` initial.
3. **Introduire `useShallow` dans App** si la boucle persiste.
4. Relancer les tests et vérifier que les 52 tests passent.

---

## Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `src/test/setup.ts` | Retirer le mock de `perfMonitor` |
| `src/components/App.test.tsx` | Ajouter `vi.mock` local pour `perfMonitor` |
| `src/components/GlobalSearch.test.tsx` | Ajouter `vi.mock` local pour `perfMonitor` |
| `src/App.tsx` | (a) Supprimer `setIndexingError(null)` en début d’effect ; (b) éventuellement utiliser `useShallow` pour les abonnements au store |

---

## Tests à conserver et état visé

- **editorStore.test.ts** : 8 tests (dont terminal, fileHandles)
- **fileSystemAccess.test.ts** : 6 tests
- **App.test.tsx** : 8 tests
- **GlobalSearch.test.tsx** : 1 test
- **perfMonitor.test.ts** : 1 test
- Tous les autres tests existants

**Objectif** : 52 tests verts.
