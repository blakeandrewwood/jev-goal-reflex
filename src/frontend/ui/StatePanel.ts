import type { PlanState, Snapshot } from "../../shared/protocol";

export class StatePanel {
  constructor(
    private readonly planText: HTMLElement,
    private readonly planSteps: HTMLElement,
    private readonly jevState: HTMLElement,
    private readonly jevQuestions: HTMLElement,
    private readonly jevResponse: HTMLElement,
  ) {}

  update({ plan, engine }: Snapshot) {
    this.planText.textContent = plan.text ? `${plan.text}  (${plan.error ?? plan.status})` : "No instructions yet";
    this.planSteps.replaceChildren(...this.stepItems(plan));
    if (!engine) return;
    // The exact request jev received and its answer, from the same decision.
    this.jevState.textContent = JSON.stringify(engine.state, null, 2);
    this.jevQuestions.textContent = JSON.stringify(engine.questions, null, 2);
    this.jevResponse.textContent = JSON.stringify(engine.response, null, 2);
  }

  private stepItems({ steps, current }: PlanState) {
    return steps.map(({ actions, done }, i) => {
      const item = document.createElement("li");
      const marker = done ? "✓" : i === current ? "▶" : "·";
      const text = actions.map(({ action, done, ...params }) =>
        Object.keys(params).length ? `${action} ${JSON.stringify(params)}` : action,
      );
      item.textContent = `${marker} ${text.join(" + ")}`;
      item.className = i === current ? "text-neutral-100" : "text-neutral-500";
      return item;
    });
  }
}
