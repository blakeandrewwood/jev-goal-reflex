/**
 * Inspect the running backend: prints snapshots (jev request and response, plan, controller input).
 *
 * Usage: pnpm observe [--frames N] [--port P] [--instructions TEXT] [--speeds MAX_SPEED,MAX_TURN_RATE]
 * --instructions and --speeds send the same messages as the browser's input box and sliders, before reading.
 */
import { parseArgs } from "node:util";
import WebSocket from "ws";
import type { ClientMessage } from "../src/shared/protocol";

const { values } = parseArgs({
  options: {
    frames: { type: "string", default: "1" },
    port: { type: "string", default: "8765" },
    instructions: { type: "string" },
    speeds: { type: "string" },
  },
});

const socket = new WebSocket(`ws://localhost:${values.port}`);
const send = (message: ClientMessage) => socket.send(JSON.stringify(message));
let remaining = Number(values.frames);

socket.on("open", () => {
  if (values.instructions) send({ type: "set_instructions", instructions: values.instructions });
  if (values.speeds) {
    const [maxSpeed, maxTurnRate] = values.speeds.split(",").map(Number);
    send({
      type: "set_speeds",
      max_speed: maxSpeed,
      max_turn_rate: maxTurnRate,
    });
  }
});

socket.on("message", (raw) => {
  console.log(JSON.stringify(JSON.parse(raw.toString()), null, 2));
  remaining -= 1;
  if (remaining <= 0) socket.close();
});
