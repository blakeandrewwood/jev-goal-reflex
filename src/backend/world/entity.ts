import type { EntityState } from "../../shared/protocol";

// Compass headings, clockwise from north. North is the top of the screen (-z), east is right (+x).
const COMPASS = { north: 0, east: 90, south: 180, west: 270 } as const;
const DIRECTIONS = ["north", "north east", "east", "south east", "south", "south west", "west", "north west"];
// Nautical relative bearings in 45 degree sectors, clockwise from dead ahead. They avoid the words jev answers
// with (left, right, forward, ...) and numbers.
const BEARINGS = [
  "bow",
  "starboard bow",
  "starboard",
  "starboard quarter",
  "stern",
  "port quarter",
  "port",
  "port bow",
];

export const mod = (value: number, n: number) => ((value % n) + n) % n;
const round = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits;
const degrees = (radians: number) => (radians * 180) / Math.PI;

/** Transform and velocity of the controlled box. Yaw is in degrees; yaw 0 faces -Z (three.js convention). */
export class BoxEntity {
  x = 0;
  y = 0;
  z = 0;
  vx = 0;
  vy = 0;
  vz = 0;
  yaw = 0;
  yawRate = 0;

  get grounded() {
    return this.y <= 0;
  }

  get speed() {
    return Math.hypot(this.vx, this.vz);
  }

  /** Compass heading in degrees, 0-360 clockwise from north. */
  get heading() {
    return mod(-this.yaw, 360);
  }

  /** Nearest of the 8 directions; between two of them it is "slight" plus the intercardinal it touches. */
  headingName() {
    const sector = mod(Math.round(this.heading / 22.5), 16);
    const index = Math.floor(sector / 2);
    if (sector % 2 === 0) return DIRECTIONS[index];
    const intercardinal = index % 2 === 1 ? index : index + 1;
    return `slight ${DIRECTIONS[intercardinal % 8]}`;
  }

  /** Where each compass direction lies relative to the box, as a nautical bearing. */
  compass() {
    const entries = Object.entries(COMPASS).map(([name, direction]) => [
      name,
      BEARINGS[mod(Math.round((direction - this.heading) / 45), 8)],
    ]);
    return Object.fromEntries(entries) as EntityState["compass"];
  }

  /** Distance to a point and its signed bearing from the heading in degrees (positive is to the left). */
  offset(x: number, z: number): [distance: number, bearing: number] {
    const dx = x - this.x;
    const dz = z - this.z;
    return [Math.hypot(dx, dz), mod(degrees(Math.atan2(-dx, -dz)) - this.yaw + 180, 360) - 180];
  }

  toState(): EntityState {
    return {
      x: round(this.x, 3),
      y: round(this.y, 3),
      z: round(this.z, 3),
      velocity: {
        x: round(this.vx, 3),
        y: round(this.vy, 3),
        z: round(this.vz, 3),
      },
      yaw: `${this.heading.toFixed(0)} degrees`,
      heading: this.headingName(),
      compass: this.compass(),
      grounded: this.grounded,
    };
  }
}
