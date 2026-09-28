# Architecture

The backend owns the world, physics and AI. The frontend displays the simulation and accepts instructions and speed settings.

| Layer | Component | Role |
|---|---|---|
| Goal, System 2 (slow) | `Planner`, OpenAI `gpt-5.4-mini` | Turns each instruction into a typed plan, once per instruction |
| Executive | `Plan`, `Step`, actions | Runs the plan step by step. Measures progress and completion. |
| Reflex, System 1 (fast) | `AIController`, Jev `jev-latest` | Decides the direction of each movement axis, every decision |
| Control | `CharacterController` | Turns input into the player's target velocity, turn rate and jumps, within per-tick caps |
| Physics | `World` | Applies gravity, motion and plane bounds to every entity in the `Scene` |

Set `OPENAI_API_KEY` and `TYPESAFE_API_KEY` in `.env`.

## Modules

| Path | Role |
|---|---|
| `src/backend/world/` | `World` physics, the `Scene` of entities, `BoxEntity` |
| `src/backend/character/` | Player control and per-tick `Limits` |
| `src/backend/commands/` | `Move`, `Rotate` and `Jump` commands |
| `src/backend/planner/` | LLM planner, plans, steps and actions |
| `src/backend/engine/` | Engine loops and the Jev `AIController` |
| `src/backend/server/` | WebSocket server |
| `src/shared/protocol.ts` | WebSocket snapshot and message types, used by backend and frontend |
| `src/frontend/` | three.js viewer (WebGPU, WebGL2 on Firefox) and Tailwind UI |

## Plans, steps and actions

A plan is a list of steps. Steps run in order. The actions in a step run at the same time. With no step left, the player stays still.

| Action | Axes | Done when |
|---|---|---|
| `go_to{x, z, label}` | move, turn | Inside `ARRIVED_DISTANCE` and slower than `SETTLED_SPEED` |
| `move{direction, seconds}` | move | `seconds` elapsed |
| `rotate{direction, turns}` | turn | `turns` completed |
| `jump` | jump | Landed |
| `wait{seconds}` | none | `seconds` elapsed |

- Set `seconds` or `turns` to `null` to run the action as long as the rest of its step.
- Give every step at least one action with an end.
- Do not put two actions that share an axis in one step.
- Implement each action as one class. The class owns its `phrase()`, `facts()`, `caps()` and progress.

## Control

The current step supplies `Limits` every physics tick.

| Axis state | Limit |
|---|---|
| No active action uses the axis | Held: cap 0, no jumping |
| One or more active actions use the axis | Minimum of their caps |

`go_to` is a go-to-goal controller.

| Quantity | Value |
|---|---|
| Jev facts | `moving` and `turning` together, so the box drives and steers at once |
| Speed cap | `sqrt(2 * BRAKING * distance) * cos(bearing)` |
| Turn rate cap | `HEADING_GAIN * abs(bearing)` |

Jev decides direction. Code decides how much. Each decision replaces the previous decision's commands. When a step finishes, the engine zeros move and turn input.

## Engine loops

| Loop | Rate | Work |
|---|---|---|
| Physics | `TICK_RATE`, 60 Hz | Updates the controller, then `world.update(scene, dt)`, then plan progress. Broadcasts a snapshot. |
| Decision | As fast as Jev answers, while a step is active | Asks Jev and executes the commands. Discards a decision whose step finished during the request. Sends no requests while idle or planning. |
| Replanning | Per `set_instructions` message | Runs the planner in the background |

| Plan status | Meaning |
|---|---|
| `planning` | The planner is running |
| `running` | A step is active |
| `done` | No step is left |
| `failed` | The planner raised an error |
