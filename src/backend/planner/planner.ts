import OpenAI from "openai";
import type { World } from "../world/world";
import { type ActionSpec, createAction, Step } from "./steps";

const PLANNER_MODEL = "gpt-5.4-mini";
const EDGE_MARGIN = 2;

const systemPrompt = (
  half: number,
  reach: number,
) => `You plan movements for a box on a flat square plane. Turn the user's instruction into steps.
The plane spans x and z from -${half} to ${half}; the center is (0, 0). As seen on screen: top is -z, bottom is +z, left is -x, right is +x.
Keep go_to targets within -${reach}..${reach} so they sit on the plane. A rotation of 1 turn is 360 degrees; a quarter turn is 0.25.
Steps run one after another. Each step is a list of actions that happen at the same time.
Actions: go_to moves and turns to a place; move goes forward or backward; rotate turns; jump jumps once; wait stays still.
Only put actions in the same step when the user wants them at the same time ("while", "as", "at the same time", "in the air", a curve or a circle). "X and Y" or "X then Y" are separate steps.
Actions in one step must not overlap: go_to cannot share a step with move or rotate, and a step holds at most one of each.
A move with seconds null, or a rotate with turns null, lasts as long as the other actions in its step.
Each jump action is one jump.
The box stops on its own after the last step, so never add a step just to stop.`;

const actionSchema = (action: string, properties: Record<string, object>) => ({
  type: "object",
  additionalProperties: false,
  required: ["action", ...Object.keys(properties)],
  properties: { action: { type: "string", enum: [action] }, ...properties },
});

const PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["steps"],
  properties: {
    steps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["actions"],
        properties: {
          actions: {
            type: "array",
            items: {
              anyOf: [
                actionSchema("go_to", {
                  x: { type: "number" },
                  z: { type: "number" },
                  label: { type: "string" },
                }),
                actionSchema("rotate", {
                  direction: { type: "string", enum: ["left", "right"] },
                  turns: { type: ["number", "null"] },
                }),
                actionSchema("move", {
                  direction: { type: "string", enum: ["forward", "backward"] },
                  seconds: { type: ["number", "null"] },
                }),
                actionSchema("wait", { seconds: { type: "number" } }),
                actionSchema("jump", {}),
              ],
            },
          },
        },
      },
    },
  },
};

/** System 2: a fast LLM turns a free-form instruction into typed steps, once per instruction. */
export class Planner {
  private readonly client = new OpenAI();
  private readonly systemPrompt: string;

  constructor(world: World) {
    const half = world.planeSize / 2;
    this.systemPrompt = systemPrompt(half, half - EDGE_MARGIN);
  }

  async create(text: string): Promise<Step[]> {
    const response = await this.client.chat.completions.create({
      model: PLANNER_MODEL,
      reasoning_effort: "low",
      messages: [
        { role: "system", content: this.systemPrompt },
        { role: "user", content: text },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "plan", strict: true, schema: PLAN_SCHEMA },
      },
    });
    const { steps } = JSON.parse(response.choices[0].message.content ?? "{}") as { steps: { actions: ActionSpec[] }[] };
    return steps.map((step) => new Step(step.actions.map(createAction)));
  }
}
