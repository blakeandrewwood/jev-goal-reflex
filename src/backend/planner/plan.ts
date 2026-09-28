import type { PlanState } from "../../shared/protocol";
import type { BoxEntity } from "../world/entity";
import { Step } from "./steps";

const IDLE = new Step([]);

/** The user's instruction broken into steps, run in order. With no current step the player stays still. */
export class Plan {
  private index = 0;

  constructor(
    readonly text = "",
    private readonly steps: Step[] = [],
    private readonly pending = false,
    private readonly error: string | null = null,
  ) {}

  get current(): Step | null {
    return this.steps[this.index] ?? null;
  }

  get status(): PlanState["status"] {
    if (this.error) return "failed";
    if (this.pending) return "planning";
    return this.current ? "running" : "done";
  }

  update(entity: BoxEntity, dt: number) {
    const step = this.current;
    if (!step) return;
    step.update(entity, dt);
    if (step.done) this.index += 1;
  }

  instructions() {
    return (this.current ?? IDLE).instructions();
  }

  limits(entity: BoxEntity) {
    return (this.current ?? IDLE).limits(entity);
  }

  task(entity: BoxEntity) {
    return (this.current ?? IDLE).task(entity);
  }

  toState(): PlanState {
    return {
      text: this.text,
      status: this.status,
      error: this.error,
      current: this.index,
      steps: this.steps.map((step) => step.toState()),
    };
  }
}
