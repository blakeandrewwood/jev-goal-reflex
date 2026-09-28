import type { EntryType, TypeSafeClient } from "@typesafe-ai/sdk";
import type { AgentState, EngineState, WorldState } from "../../shared/protocol";
import { type Command, Jump, Move, Rotate } from "../commands/command";
import type { Plan } from "../planner/plan";
import type { BoxEntity } from "../world/entity";

// Questions avoid direction words ("at this moment", not "right now"): jev reads them as answers.
const DEAD_ZONE = 0.33; // scores below this count as zero
const JUMP_THRESHOLD = 0.45; // the jump noul must exceed this

const QUESTIONS = {
  move: {
    type: "score",
    instructions: "How should the player move at this moment?",
    criteria: ["move backward", "stay in place", "move forward"],
  },
  turn: {
    type: "score",
    instructions: "How should the player turn at this moment?",
    criteria: ["turn right", "keep facing the same way", "turn left"],
  },
  jump: { type: "noul", instructions: "Is the player supposed to jump?" },
} as const;

/** Maps a 3-level score (0..2) to -1, 0 or 1. */
const axis = (score: number) => {
  const value = score - 1;
  return Math.abs(value) < DEAD_ZONE ? 0 : Math.sign(value);
};

/** One jev request: exactly what was sent (state, questions), what came back, and the resulting commands. */
export class Decision {
  constructor(
    readonly state: AgentState,
    readonly response: EngineState["response"],
    readonly commands: Command[],
    readonly latencyMs: number,
    readonly request: number,
  ) {}

  toState(): EngineState {
    return {
      state: this.state,
      questions: QUESTIONS,
      response: this.response,
      commands: this.commands.map((command) => command.name),
      latency_ms: Math.round(this.latencyMs * 10) / 10,
      request: this.request,
    };
  }
}

/** System 1: jev scores each movement axis for the current plan step; code turns the scores into commands. */
export class AIController {
  private requests = 0;

  constructor(private readonly client: TypeSafeClient) {}

  state(world: WorldState, plan: Plan, player: BoxEntity): AgentState {
    // Key order matters: jev weighs the end of the serialized state most, so the step facts go last.
    return {
      instructions: plan.instructions(),
      world,
      task: plan.task(player),
    };
  }

  async decide(world: WorldState, plan: Plan, player: BoxEntity): Promise<Decision> {
    const state = this.state(world, plan, player);
    const start = performance.now();
    const { answers } = await this.client.systemOne({
      state: state as unknown as EntryType,
      questions: QUESTIONS,
    });
    const latencyMs = performance.now() - start;
    this.requests += 1;
    const move = axis(answers.move.score);
    const turn = axis(answers.turn.score);
    const commands: Command[] = [];
    if (move) commands.push(new Move(move));
    if (turn) commands.push(new Rotate(turn));
    if (answers.jump.noul > JUMP_THRESHOLD) commands.push(new Jump());
    return new Decision(state, answers, commands, latencyMs, this.requests);
  }
}
