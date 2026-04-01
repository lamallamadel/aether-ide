# Traceability matrix (doc -> validation)

Date: 2026-03-31

Sources:
- `README.md`
- `settings.md`
- `docs/architecture/ADR-003-transformers-local.md`

## Matrix

| Documented capability | Evidence type | Evidence path/command | Status |
|---|---|---|---|
| Top menu + dropdown UX | Automated tests | `src/components/MenuBar.test.tsx` | OK |
| File explorer open/select/tabs | Automated tests | `src/state/editorStore.test.ts`, `src/components/App.test.tsx` | OK |
| Editor interactions / symbols | Automated tests | `src/components/GoToSymbol.test.tsx`, `src/components/App.test.tsx` | OK |
| AI panel (mock chat flow) | Automated tests | `src/components/App.test.tsx` | OK |
| Command palette behavior | Automated tests | `src/components/App.test.tsx` | OK |
| Global Search (TF-IDF + filters) | Automated tests | `src/components/GlobalSearch.test.tsx`, `src/services/indexing/tfidfIndex.test.ts` | OK |
| Mission Control worktree/diff flow | Automated tests | `src/components/MissionControl.test.tsx` | OK |
| Settings modal behavior | Automated tests | `src/components/SettingsModal.test.tsx` | OK |
| Keyboard accessibility docs coverage | Manual doc + focused tests | `docs/accessibility/keyboard-navigation.md`, `docs/accessibility/a11y-test-report.md` | PARTIAL |
| Local embeddings architecture (ADR-003) | Architecture decision | `docs/architecture/ADR-003-transformers-local.md` | OK |
| Local DB persistence (IndexedDB) | Unit tests | `src/services/db/VectorStore.test.ts`, `src/services/fileSystem/fileSystemAccess.test.ts` | OK |
| Runtime quality gates (lint/test/build/docs) | Command evidence | `npm run lint`, `npm test`, `npm run build`, `npm run docs:check` | OK |

## Gaps identified

- Accessibility still relies partly on manual validation; no dedicated end-to-end a11y pipeline.
- Keyboard accessibility remains partly manual (no dedicated e2e screen-reader automation).
