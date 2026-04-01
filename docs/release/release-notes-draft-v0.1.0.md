# Release notes draft - v0.1.0

Status: Draft (release candidate ready for review)
Date: 2026-03-31

## Highlights

- Documentation governance introduced:
  - canonical/support/archive model
  - centralized docs index
  - contribution rules for documentation updates
- Documentation portability fixed:
  - removal of machine-local `file:///` links
  - archive relocation for historical code-dump documents
- Documentation automation added:
  - markdown lint command
  - docs CI workflow (lint + links)
  - full quality-gates CI workflow (`lint`, `test`, `build`, `docs:check`)

## Quality gate summary

- `npm run lint`: PASS (warnings remain)
- `npm test`: PASS
- `npm run build`: PASS
- `npm run docs:check`: PASS

## Known blockers

No hard blocker currently identified in local gates.

## Known limitations

- AI chat remains retrieval/mocked behavior (no full LLM generation path).
- Some accessibility validations still rely on manual procedures.
- Lint warnings (`react-hooks/exhaustive-deps`) remain and should be addressed incrementally.

## Post-release verification plan

- Run smoke checks on:
  - Global Search
  - Mission Control
  - Settings modal
  - Keyboard navigation in top/activity menus
- Confirm all four gates green in CI and local reproducibility:
  - `npm run lint`
  - `npm test`
  - `npm run build`
  - `npm run docs:check`
