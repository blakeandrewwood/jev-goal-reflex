# Jev

`AIController` sends Jev the same fixed questions every decision. Jev is TypeSafe's System One model, called through the `@typesafe-ai/sdk` `TypeSafeClient` with the default model `jev-latest`. It returns typed answers with probabilities. The planner never writes the questions.

Set `TYPESAFE_API_KEY` in `.env`. A failed request is logged and retried after `RETRY_MS`.

## Questions

| Name | Type | Question | Scale | Result |
|---|---|---|---|---|
| `move` | score | How should the player move at this moment? | move backward, stay in place, move forward | `Move` command past `DEAD_ZONE` |
| `turn` | score | How should the player turn at this moment? | turn right, keep facing the same way, turn left | `Rotate` command past `DEAD_ZONE` |
| `jump` | noul | Is the player supposed to jump? | yes or no | `Jump` command above `JUMP_THRESHOLD` |

| Constant | Value | Effect |
|---|---|---|
| `DEAD_ZONE` | 0.33 | Scores closer than this to the middle count as 0. Larger scores are full input. |
| `JUMP_THRESHOLD` | 0.45 | The noul must exceed this to jump. |

## State

```json
{
  "instructions": "Jump and turn left",
  "world": {
    "plane_size": 40,
    "time": { "one_game_tick": "1/60 second" },
    "player": {
      "x": 0, "y": 0, "z": 0,
      "velocity": { "x": 0, "y": 0, "z": 0 },
      "yaw": "10 degrees",
      "heading": "north",
      "compass": { "north": "bow", "east": "starboard", "south": "stern", "west": "port" },
      "grounded": true
    },
    "entities": []
  },
  "task": { "jumping": "yes", "turning": "left", "turns_remaining": 0.5 }
}
```

| Field | Contents |
|---|---|
| `instructions` | The active actions' phrases, joined with "and" |
| `task` | The active actions' facts, merged |
| `world.time` | Length of one physics tick |
| `player.yaw` | Compass heading from 0 to 360 degrees, clockwise from north |
| `player.heading` | Nearest of the 8 directions. Between two directions: `slight` plus the neighbouring intercardinal. |
| `player.compass` | Where each direction lies relative to the player, as a nautical bearing |

North is the top of the screen (−z). East is right (+x).

| Compass bearing | Position relative to the player |
|---|---|
| `bow` | Ahead |
| `starboard bow` | Ahead, to the right |
| `starboard` | Right |
| `starboard quarter` | Behind, to the right |
| `stern` | Behind |
| `port quarter` | Behind, to the left |
| `port` | Left |
| `port bow` | Ahead, to the left |

## Rules for the state

- Precompute every spatial fact in code. Jev gets no geometry to do.
- Use the answer words `forward`, `backward`, `left` and `right` only in step phrases and fact values.
- Keep the answer words out of fact keys, questions and world data. Examples: `turns_remaining`, "at this moment", nautical bearings.
- Prefer words to numbers in anything Jev reads.
- Put `task` last in the state.
- Leave unused axes to code. Jev decides only the axes the step uses. See [Control](architecture.md#control).
- Give the planner no rates. Use open-ended actions and code-measured progress for durations.
- Probe Jev with a scratch script across every step type before you change the state shape.
