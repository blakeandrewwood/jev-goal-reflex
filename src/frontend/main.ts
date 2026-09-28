import { StateSocket } from "./net/StateSocket";
import { Viewer } from "./scene/Viewer";
import { Hud } from "./ui/Hud";
import { InstructionsInput } from "./ui/InstructionsInput";
import { SpeedControls } from "./ui/SpeedControls";
import { StatePanel } from "./ui/StatePanel";

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const viewer = new Viewer(byId<HTMLCanvasElement>("scene"));
const hud = new Hud(byId("hud"));
const statePanel = new StatePanel(
  byId("plan-text"),
  byId("plan-steps"),
  byId("jev-state"),
  byId("jev-questions"),
  byId("jev-response"),
);

await viewer.start();

const socket = new StateSocket("ws://localhost:8765", (snapshot) => {
  viewer.update(snapshot.world);
  hud.update(snapshot);
  statePanel.update(snapshot);
  speedControls.update(snapshot.settings);
});

const speedControls = new SpeedControls(
  byId("speed"),
  byId("turn-rate"),
  byId("speed-value"),
  byId("turn-rate-value"),
  (settings) => socket.send({ type: "set_speeds", ...settings }),
);

new InstructionsInput(byId("instructions-form"), byId("instructions-input"), (instructions) =>
  socket.send({ type: "set_instructions", instructions }),
);
