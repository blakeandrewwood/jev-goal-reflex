import type { ControllerInput, Settings } from "../../shared/protocol";
import type { BoxEntity } from "../world/entity";

const DEFAULT_MAX_SPEED = 8; // units/s; adjustable from the UI
const ACCELERATION = 6; // how quickly velocity converges on the target, 1/s
const DEFAULT_MAX_TURN_RATE = 180; // deg/s; adjustable from the UI
const TURN_ACCELERATION = 8; // 1/s
const JUMP_VELOCITY = 7; // u/s

/** Per-tick caps from the current plan step; a 0 cap or jump=false holds that axis still. */
export interface Limits {
  speed: number; // u/s
  turnRate: number; // deg/s
  jump: boolean;
}

const radians = (degrees: number) => (degrees * Math.PI) / 180;
const blend = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

/** Controls the player: input sets a target velocity and turn rate the player eases toward, and triggers jumps. */
export class CharacterController {
  readonly input: ControllerInput = { move: 0, turn: 0, jump: false };
  maxSpeed = DEFAULT_MAX_SPEED;
  maxTurnRate = DEFAULT_MAX_TURN_RATE;

  constructor(private readonly entity: BoxEntity) {}

  update(dt: number, limits: Limits) {
    if (!limits.jump) this.input.jump = false;
    this.steer(dt, Math.min(this.maxSpeed, limits.speed), Math.min(this.maxTurnRate, limits.turnRate));
    this.jump();
  }

  stop() {
    this.input.move = 0;
    this.input.turn = 0;
  }

  settings(): Settings {
    return { max_speed: this.maxSpeed, max_turn_rate: this.maxTurnRate };
  }

  private steer(dt: number, speed: number, turnRate: number) {
    const e = this.entity;
    const yaw = radians(e.yaw);
    const targetSpeed = this.input.move * speed;
    const velocityBlend = blend(ACCELERATION, dt);
    e.vx += (-Math.sin(yaw) * targetSpeed - e.vx) * velocityBlend;
    e.vz += (-Math.cos(yaw) * targetSpeed - e.vz) * velocityBlend;
    e.yawRate += (this.input.turn * turnRate - e.yawRate) * blend(TURN_ACCELERATION, dt);
  }

  private jump() {
    if (this.input.jump && this.entity.grounded) this.entity.vy = JUMP_VELOCITY;
    this.input.jump = false;
  }
}
