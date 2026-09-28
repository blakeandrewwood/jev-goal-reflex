import type { WorldState } from "../../shared/protocol";
import { type BoxEntity, mod } from "./entity";
import type { Scene } from "./scene";

const PLANE_SIZE = 40;
const GRAVITY = -20; // u/s^2
export const TICK_RATE = 60; // physics ticks per second

/** A flat square plane centered at the origin. Applies world forces and bounds to every entity in a scene. */
export class World {
  readonly planeSize = PLANE_SIZE;

  update(scene: Scene, dt: number) {
    for (const entity of scene.entities) {
      this.applyGravity(entity, dt);
      this.integrate(entity, dt);
      this.collide(entity);
    }
  }

  /** World state for Jev and the viewer: the player on its own, every other scene entity in `entities`. */
  toState(scene: Scene, player: BoxEntity): WorldState {
    return {
      plane_size: this.planeSize,
      time: { one_game_tick: `1/${TICK_RATE} second` },
      player: player.toState(),
      entities: scene.entities.filter((entity) => entity !== player).map((entity) => entity.toState()),
    };
  }

  private applyGravity(entity: BoxEntity, dt: number) {
    entity.vy += GRAVITY * dt;
  }

  private integrate(entity: BoxEntity, dt: number) {
    entity.x += entity.vx * dt;
    entity.y += entity.vy * dt;
    entity.z += entity.vz * dt;
    entity.yaw = mod(entity.yaw + entity.yawRate * dt, 360);
  }

  /** Keeps the entity on the plane: stops it at the ground and at the edges. */
  private collide(entity: BoxEntity) {
    const bounds = this.planeSize / 2;
    if (entity.y <= 0) {
      entity.y = 0;
      entity.vy = 0;
    }
    if (Math.abs(entity.x) > bounds) {
      entity.x = Math.sign(entity.x) * bounds;
      entity.vx = 0;
    }
    if (Math.abs(entity.z) > bounds) {
      entity.z = Math.sign(entity.z) * bounds;
      entity.vz = 0;
    }
  }
}
