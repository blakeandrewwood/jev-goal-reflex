import type { CharacterController } from "../character/controller";

export interface Command {
  readonly name: string;
  execute(controller: CharacterController): void;
}

const signed = (value: number) => `${value >= 0 ? "+" : ""}${value}`;

/** Moves along the heading: 1 forward, -1 backward. */
export class Move implements Command {
  constructor(private readonly direction: number) {}

  get name() {
    return `move(${signed(this.direction)})`;
  }

  execute(controller: CharacterController) {
    controller.input.move = this.direction;
  }
}

/** Rotates: 1 left, -1 right. */
export class Rotate implements Command {
  constructor(private readonly direction: number) {}

  get name() {
    return `rotate(${signed(this.direction)})`;
  }

  execute(controller: CharacterController) {
    controller.input.turn = this.direction;
  }
}

export class Jump implements Command {
  readonly name = "jump";

  execute(controller: CharacterController) {
    controller.input.jump = true;
  }
}
