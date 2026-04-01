# Contributing

## Development basics

- Install: `npm install`
- Dev server: `npm run dev`
- Tests: `npm test`
- Build: `npm run build`
- Lint: `npm run lint`

## Documentation standards

- Use relative markdown links (no machine-local `file:///` links).
- Keep `README.md`, `settings.md`, and active ADRs aligned with code changes.
- Add architecture decisions in `docs/architecture/` using ADR structure:
  - Context
  - Decision
  - Consequences/constraints
- If a doc is no longer authoritative, mark/archive it instead of silently leaving it stale.
- Use `docs/README.md` as the status map (`Canonique` / `Support` / `Archive`).

## Pull request checklist (docs)

- [ ] Updated affected canonique docs
- [ ] Markdown links are repo-relative and valid
- [ ] New/updated decisions captured in ADR when relevant
- [ ] Historical/prototype material marked as archive when applicable
