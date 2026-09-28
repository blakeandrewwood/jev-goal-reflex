import type { PlanAction, PlanStep } from "../../shared/protocol";
import type { Limits } from "../character/controller";
import type { BoxEntity } from "../world/entity";

const BRAKING = 4; // u/s^2; GoTo caps speed at sqrt(2 * BRAKING * distance) so it can stop at the target
const HEADING_GAIN = 4; // deg/s per degree of bearing; GoTo turns slower as the target lines up
const SETTLED_SPEED = 0.3; // u/s; GoTo is done only once inside the arrival radius and this slow
const ARRIVED_DISTANCE = 1;

type Axis = "move" | "turn" | "jump";
type Facts = Record<string, unknown>;

/**
 * One single-meaning action. Code tracks its progress; jev sees its phrase and facts.
 *
 * jev matches words: direction words ("forward", "left", ...) appear as fact values, never in fact keys.
 */
abstract class Action {
  abstract readonly name: PlanAction["action"];
  abstract readonly axes: readonly Axis[];
  /** The step waits for required actions; open-ended ones run as long as the step does. */
  required = true;
  done = false;

  abstract update(entity: BoxEntity, dt: number): void;
  abstract phrase(): string;

  facts(_entity: BoxEntity): Facts {
    return {};
  }

  /** Speed (u/s) and turn rate (deg/s) caps; jev decides direction, the action decides how much. */
  caps(_entity: BoxEntity): [speed: number, turnRate: number] {
    return [Infinity, Infinity];
  }

  params(): Facts {
    return {};
  }

  toState(): PlanAction {
    return { action: this.name, ...this.params(), done: this.done };
  }
}

/**
 * Go-to-goal: drives and steers at once. Moves forward while the target is in front, always turns toward it;
 * speed scales with cos(bearing) so sharp turns are slow and gentle ones fast.
 */
class GoTo extends Action {
  readonly name = "go_to";
  readonly axes = ["move", "turn"] as const;

  constructor(
    private readonly x: number,
    private readonly z: number,
    private readonly label: string,
  ) {
    super();
  }

  update(entity: BoxEntity) {
    const [distance] = entity.offset(this.x, this.z);
    this.done = distance < ARRIVED_DISTANCE && entity.speed < SETTLED_SPEED;
  }

  phrase() {
    return "go to the target";
  }

  facts(entity: BoxEntity) {
    const [distance, bearing] = entity.offset(this.x, this.z);
    const arrived = distance < ARRIVED_DISTANCE;
    const moving = arrived || Math.abs(bearing) >= 90 ? "none" : "forward";
    const turning = arrived ? "none" : bearing > 0 ? "left" : "right";
    return {
      target: { distance: Math.round(distance * 10) / 10 },
      moving,
      turning,
    };
  }

  caps(entity: BoxEntity): [number, number] {
    const [distance, bearing] = entity.offset(this.x, this.z);
    const speed = Math.sqrt(2 * BRAKING * distance) * Math.max(0, Math.cos((bearing * Math.PI) / 180));
    return [speed, HEADING_GAIN * Math.abs(bearing)];
  }

  params() {
    return { x: this.x, z: this.z, label: this.label };
  }
}

/** Turns for `turns` full turns, or for as long as the rest of its step when `turns` is null. */
class Rotate extends Action {
  readonly name = "rotate";
  readonly axes = ["turn"] as const;
  private degrees = 0;

  constructor(
    private readonly direction: "left" | "right",
    private readonly turns: number | null,
  ) {
    super();
    this.required = turns !== null;
  }

  update(entity: BoxEntity, dt: number) {
    this.degrees += entity.yawRate * (this.direction === "left" ? 1 : -1) * dt;
    this.done = this.turns !== null && this.degrees >= this.turns * 360;
  }

  phrase() {
    return `turn ${this.direction}`;
  }

  facts() {
    const remaining =
      this.turns === null
        ? {}
        : {
            turns_remaining: Math.round((this.turns - this.degrees / 360) * 100) / 100,
          };
    return { turning: this.direction, ...remaining };
  }

  params() {
    return {
      direction: this.direction,
      turns: this.turns,
      degrees_turned: Math.round(this.degrees),
    };
  }
}

/** Runs for `seconds`, or for as long as the rest of its step when `seconds` is null. */
abstract class Timed extends Action {
  private elapsed = 0;

  constructor(private readonly seconds: number | null) {
    super();
    this.required = seconds !== null;
  }

  update(_entity: BoxEntity, dt: number) {
    this.elapsed += dt;
    this.done = this.seconds !== null && this.elapsed >= this.seconds;
  }

  facts(_entity: BoxEntity): Facts {
    return this.seconds === null
      ? {}
      : {
          seconds_remaining: Math.round((this.seconds - this.elapsed) * 10) / 10,
        };
  }

  params(): Facts {
    return {
      seconds: this.seconds,
      elapsed: Math.round(this.elapsed * 100) / 100,
    };
  }
}

class Move extends Timed {
  readonly name = "move";
  readonly axes = ["move"] as const;

  constructor(
    private readonly direction: "forward" | "backward",
    seconds: number | null,
  ) {
    super(seconds);
  }

  phrase() {
    return `move ${this.direction}`;
  }

  facts(entity: BoxEntity) {
    return { moving: this.direction, ...super.facts(entity) };
  }

  params() {
    return { direction: this.direction, ...super.params() };
  }
}

class Wait extends Timed {
  readonly name = "wait";
  readonly axes = [] as const;

  phrase() {
    return "stay still";
  }
}

/** A single jump, done on landing. Several jumps are several steps. */
class Jump extends Action {
  readonly name = "jump";
  readonly axes = ["jump"] as const;
  private airborne = false;

  update(entity: BoxEntity) {
    if (!entity.grounded) this.airborne = true;
    this.done = this.airborne && entity.grounded;
  }

  phrase() {
    return "jump";
  }

  facts() {
    return { jumping: "yes" };
  }
}

/** An action as the planner LLM returns it. */
export type ActionSpec =
  | { action: "go_to"; x: number; z: number; label: string }
  | { action: "rotate"; direction: "left" | "right"; turns: number | null }
  | {
      action: "move";
      direction: "forward" | "backward";
      seconds: number | null;
    }
  | { action: "wait"; seconds: number }
  | { action: "jump" };

export function createAction(spec: ActionSpec): Action {
  switch (spec.action) {
    case "go_to":
      return new GoTo(spec.x, spec.z, spec.label);
    case "rotate":
      return new Rotate(spec.direction, spec.turns);
    case "move":
      return new Move(spec.direction, spec.seconds);
    case "wait":
      return new Wait(spec.seconds);
    case "jump":
      return new Jump();
  }
}

/**
 * Actions that run at the same time; the step is done once every required action is. An empty step stays still.
 *
 * Axes no active action uses are held still by code (caps of 0, no jumping), so jev only has to be right
 * about the axes the step uses.
 */
export class Step {
  constructor(private readonly actions: Action[]) {
    const claimed = actions.flatMap((action) => action.axes);
    if (new Set(claimed).size !== claimed.length) {
      throw new Error(`actions in one step use the same axis: ${actions.map((action) => action.name)}`);
    }
    if (actions.length && !actions.some((action) => action.required)) {
      throw new Error("a step needs at least one action with an end");
    }
  }

  get done() {
    return this.actions.every((action) => !action.required || action.done);
  }

  private get active() {
    return this.actions.filter((action) => !action.done);
  }

  private get axes() {
    return new Set(this.active.flatMap((action) => action.axes));
  }

  update(entity: BoxEntity, dt: number) {
    for (const action of this.active) action.update(entity, dt);
  }

  instructions() {
    const text = this.active.map((action) => action.phrase()).join(" and ") || "stay still";
    return text[0].toUpperCase() + text.slice(1);
  }

  task(entity: BoxEntity): Facts {
    return Object.assign({}, ...this.active.map((action) => action.facts(entity)));
  }

  limits(entity: BoxEntity): Limits {
    const axes = this.axes;
    let speed = axes.has("move") ? Infinity : 0;
    let turnRate = axes.has("turn") ? Infinity : 0;
    for (const action of this.active) {
      const [actionSpeed, actionTurnRate] = action.caps(entity);
      speed = Math.min(speed, actionSpeed);
      turnRate = Math.min(turnRate, actionTurnRate);
    }
    return { speed, turnRate, jump: axes.has("jump") };
  }

  toState(): PlanStep {
    return {
      actions: this.actions.map((action) => action.toState()),
      done: this.done,
    };
  }
}
