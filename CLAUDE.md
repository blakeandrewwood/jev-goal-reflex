# jev-goal-reflex

An LLM plans, Jev decides each moment, and code moves a box on a flat plane. Read the doc for the area you change.

| Doc | Covers |
|---|---|
| [README.md](README.md) | Setup, running, development commands |
| [docs/architecture.md](docs/architecture.md) | Components, modules, plans, steps, actions, control, engine loops |
| [docs/jev.md](docs/jev.md) | Jev questions, the exact state Jev receives, rules for changing that state |
| [src/shared/protocol.ts](src/shared/protocol.ts) | WebSocket snapshot and message types |

## Working in this repo

- Never launch a browser. This includes Chrome and Playwright. The user checks the visuals.
- Never stop or restart the user's backend on port 8765 or Vite on port 5173.
- Run test backends on another port.
- After every code change, run `pnpm format`, then `pnpm lint`. Fix anything `pnpm lint` reports.
- Update the affected docs in the same change as the code.
- Describe the system as it is. Do not describe how it changed.

## Commits and pull requests

Before committing, run `pnpm format`, then `pnpm lint` and `pnpm typecheck`. Commit only when both pass.

- Use Conventional Commits: `<type>[optional scope]: <description>`. Types: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `perf`, `ci`.
- Write one line. Add a short body only when the diff does not show the why.
- Do not add a `Co-Authored-By` trailer.

```text
feat(planner): add a wait action
fix(engine): skip Jev requests while no step is active
```

In a pull request, state what changed and why. Do not narrate each step. Do not add a co-author line.

## Code guidelines

- Separate modules by domain.
- Use classes. Give each class a single responsibility.
- Keep code simple and DRY. Do not over-engineer.
- Do not write wrapper functions that add nothing.
- Comment only what the code does not make obvious. Keep comments short.
- Research anything unfamiliar online before you implement it.
