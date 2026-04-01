# Documentation index

This index defines which documents are the source of truth and how to use the rest.

## Status definitions

- `Canonique`: primary source of truth, must stay aligned with code.
- `Support`: useful context, not the single source of truth.
- `Archive`: historical/prototype material, read-only reference.

## Documentation map

| Path | Status | Purpose |
|---|---|---|
| `README.md` | Canonique | Product overview, setup, current features/limits |
| `settings.md` | Canonique | Configuration surfaces and runtime/tooling settings |
| `docs/architecture/ADR-003-transformers-local.md` | Canonique | Accepted architecture decision for local embeddings |
| `docs/architecture/ADR-004-extensions-lsp-aether.md` | Canonique | Accepted architecture decision for extensions + Aether LSP |
| `docs/architecture/ADR-005-yaml-extension-lsp.md` | Canonique | Accepted architecture decision for YAML extension + LSP |
| `docs/accessibility/keyboard-navigation.md` | Support | Keyboard/ARIA behavior details |
| `docs/accessibility/a11y-test-report.md` | Support | Accessibility validation report |
| `docs/release/traceability-matrix.md` | Support | Feature-to-validation mapping for release readiness |
| `docs/release/functional-checklist.md` | Support | Targeted functional review checklist and results |
| `docs/release/syntax-types-decision.md` | Support | Explicit decision log for syntax types release blocker |
| `docs/release/release-notes-draft-v0.1.0.md` | Support | Release notes draft and gate status |
| `GEMINI.md` | Support | Quick high-level project overview |
| `PROPOSAL_STABILIZATION.md` | Support | Stabilization proposal for test hardening |
| `TEAM_ROLE_ANALYSIS.md` | Support | Cross-role analysis and risk framing |
| `Création d'un IDE inspiré Sublime_Cursor.md` | Support | Long-form architecture and product intent |
| `.trae/documents/Application IDE IA (specs Markdown).md` | Support | Imported spec/checklist document |
| `docs/archive/Search.md` | Archive | Historical prototype/code dump |
| `docs/archive/Maquette.md` | Archive | Historical prototype/code dump |
| `docs/archive/menu_haut.md` | Archive | Historical prototype/code dump |
| `docs/archive/Project Aether V1.x_ Lead Architect Imad_ Architecture Reference and Governance (1).md` | Archive | Historical governance export |
| `docs/archive/Project Aether v-1.1_ AKSIL _ Core IDE Source Code.md` | Archive | Historical source export |
| `docs/archive/Project AETHER Technical Manifestos and Strategic Roadmap V1.1.md` | Archive | Historical manifesto/roadmap export |
| `docs/archive/Aether Front-End_ The Golden Master Source Code.md` | Archive | Historical frontend export |

## Working rules

- Prefer links relative to repo paths (never local `file:///` paths).
- Update canonique docs in the same PR as behavior/config changes.
- When a doc becomes obsolete, move it under `docs/archive/` (or list it there first) and mark it archive.
- Keep major decisions in ADR format under `docs/architecture/`.
