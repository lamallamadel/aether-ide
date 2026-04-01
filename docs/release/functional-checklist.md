# Functional checklist (targeted flows)

Date: 2026-03-31

Scale:
- `OK`: validated with evidence
- `KO`: failing behavior
- `RISK`: partially validated or manual-only evidence

## Checklist

| Flow | Evidence | Result | Notes |
|---|---|---|---|
| Global Search | `src/components/GlobalSearch.test.tsx` + indexing tests | OK | Core behavior covered by automated tests. |
| Mission Control | `src/components/MissionControl.test.tsx` | OK | Worktree and diff interactions covered. |
| Settings | `src/components/SettingsModal.test.tsx` | OK | Modal and key settings interactions tested. |
| Keyboard accessibility (menu/activity bar) | `docs/accessibility/*` + `src/components/MenuBar.test.tsx` | RISK | Good documentation and partial tests; no automated screen-reader validation pipeline. |

## Global gate evidence

- `npm test`: OK (21 files, 146 tests)
- `npm run docs:check`: OK
- `npm run lint`: OK (passes with warnings only)
- `npm run build`: OK

## Exit criterion for release candidate

Release candidate only when all four commands are green:
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run docs:check`
