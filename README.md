# jev-goal-reflex

Steer a box around a 3D world with plain-language movement instructions: where to go, how to move and turn, and when to jump. An LLM turns each instruction into a plan, and [Jev](https://docs.typesafe.ai/introduction/quickstart) makes every movement decision in real time.

```
go to the top right
go to center right, then go to center left, then go to center
jump and do a 180 in the air
```

https://github.com/user-attachments/assets/83aa1c7a-5cd4-4da5-9f07-6a576eeef1b2

## How it works

| Layer | Component | Role |
|---|---|---|
| Goal (slow) | OpenAI `gpt-5.4-mini` | Turns each instruction into a plan of steps, once per instruction |
| Reflex (fast) | Jev (`jev-latest`) | Decides whether to move, turn and jump, every decision |
| Control | TypeScript | Measures progress, caps speed and turn rate, applies physics |

Each step holds actions that run at the same time: `go_to`, `move`, `rotate`, `jump` and `wait`. Jev decides direction. Code decides how much.

## Requirements

- Node 20 or later
- pnpm
- An OpenAI API key and a TypeSafe API key

## Setup

1. Install dependencies:

   ```sh
   pnpm install
   ```

2. Create `.env` in the project root:

   ```sh
   OPENAI_API_KEY=...
   TYPESAFE_API_KEY=...
   ```

## Run

1. Start the backend:

   ```sh
   pnpm backend
   ```

2. Start the viewer in a second terminal:

   ```sh
   pnpm start
   ```

3. Open http://localhost:5173 and type an instruction into the input at the bottom of the screen.

The side panels show the plan, the exact state and questions sent to Jev, and Jev's answers. The sliders set top speed and turn rate.

## Development

| Command | Purpose |
|---|---|
| `pnpm backend [--port 8765]` | Starts the backend. It restarts when you save a backend file. |
| `pnpm start` | Starts the viewer at http://localhost:5173 |
| `pnpm observe` | Prints live snapshots. See `scripts/observe.ts` for flags. |
| `pnpm typecheck` | Typechecks the frontend and the backend |
| `pnpm lint` | Checks formatting, import order and lint rules with Biome |
| `pnpm format` | Formats the code and applies safe lint fixes |

Run a test backend on another port with `pnpm backend --port 8766`. Point `observe` at it with `--port 8766`.

## Documentation

| Doc | Covers |
|---|---|
| [docs/architecture.md](docs/architecture.md) | Components, modules, plans, steps, actions, control, engine loops |
| [docs/jev.md](docs/jev.md) | Jev questions and the state Jev receives |
| [src/shared/protocol.ts](src/shared/protocol.ts) | WebSocket snapshot and message types |

## License

[MIT](LICENSE)
