# Decision: `src/services/syntax/syntaxTypes.ts`

Date: 2026-03-31

## Observation

`src/services/syntax/syntaxTypes.ts` had been emptied locally, which broke type contracts across syntax-related modules.

## Release decision

- **Status for release candidate:** RESOLVED
- Decision taken: restore the shared contract types (`Point`, `SerializedNode`, `SerializedTree`, `SymbolKind`, `ExtractedSymbol`).

## Validation evidence

- `npm run build`: PASS after restoring `src/services/syntax/syntaxTypes.ts`.

## Follow-up

- If a future refactor changes syntax contracts, migrate all import sites in a single PR and keep build green.
