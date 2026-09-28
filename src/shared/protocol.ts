/** Messages between the backend (`ws://localhost:8765`) and the frontend. */

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface EntityState extends Vector3 {
  velocity: Vector3;
  yaw: string; // compass heading, e.g. "10 degrees"
  heading: string; // e.g. "slight north east"
  compass: Record<"north" | "east" | "south" | "west", string>;
  grounded: boolean;
}

export interface WorldState {
  plane_size: number;
  time: { one_game_tick: string };
  player: EntityState;
  entities: EntityState[];
}

export interface ControllerInput {
  move: number;
  turn: number;
  jump: boolean;
}

export interface ScoreAnswer {
  type: "score";
  score: number;
  confidence: number;
  probabilities: Record<string, number>;
}

export interface NoulAnswer {
  type: "noul";
  noul: number;
}

export interface JevResponse {
  move: ScoreAnswer;
  turn: ScoreAnswer;
  jump: NoulAnswer;
}

/** The latest Jev decision: the exact state and questions sent, the answers, and the commands run. */
export interface EngineState {
  state: AgentState;
  questions: Record<string, unknown>;
  commands: string[];
  response: JevResponse;
  latency_ms: number;
  request: number;
}

export interface AgentState {
  instructions: string;
  task: Record<string, unknown>;
  world: WorldState;
}

export interface PlanAction {
  action: "go_to" | "rotate" | "move" | "wait" | "jump";
  done: boolean;
  [param: string]: unknown;
}

export interface PlanStep {
  actions: PlanAction[];
  done: boolean;
}

export interface PlanState {
  text: string;
  status: "planning" | "running" | "done" | "failed";
  error: string | null;
  current: number;
  steps: PlanStep[];
}

export interface Settings {
  max_speed: number; // units per second
  max_turn_rate: number; // degrees per second
}

/** Sent by the backend every physics tick. */
export interface Snapshot {
  tick: number;
  world: WorldState;
  plan: PlanState;
  input: ControllerInput;
  settings: Settings;
  engine: EngineState | null; // null before the first decision
}

/** Sent by the frontend and the `observe` script. */
export type ClientMessage = { type: "set_instructions"; instructions: string } | ({ type: "set_speeds" } & Settings);
