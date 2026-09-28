import type { Snapshot, Vector3 } from "../../shared/protocol";

export class Hud {
  constructor(private readonly root: HTMLElement) {}

  update({ tick, world, input, engine }: Snapshot) {
    const { player } = world;
    const fmt = ({ x, y, z }: Vector3) => [x, y, z].map((n) => n.toFixed(1)).join(", ");
    const lines = [
      `tick       ${tick}`,
      `position   ${fmt(player)}`,
      `velocity   ${fmt(player.velocity)}`,
      `yaw        ${player.yaw} (${player.heading})`,
      `input      move ${input.move}  turn ${input.turn}`,
    ];
    if (engine) {
      const { move, turn, jump } = engine.response;
      lines.push(
        `commands   ${engine.commands.join(", ")}`,
        `jev        move ${(move.score - 1).toFixed(2)}  turn ${(turn.score - 1).toFixed(2)}  jump ${jump.noul.toFixed(2)}`,
        `latency    ${engine.latency_ms} ms`,
        `requests   ${engine.request}`,
      );
    }
    this.root.textContent = lines.join("\n");
  }
}
