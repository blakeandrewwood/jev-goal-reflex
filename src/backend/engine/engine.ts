import { TypeSafeClient, TypeSafeError } from "@typesafe-ai/sdk";
import type { ClientMessage, Snapshot } from "../../shared/protocol";
import { CharacterController } from "../character/controller";
import { Plan } from "../planner/plan";
import { Planner } from "../planner/planner";
import type { StateServer } from "../server/stateServer";
import { BoxEntity } from "../world/entity";
import { Scene } from "../world/scene";
import { TICK_RATE, World } from "../world/world";
import { AIController, type Decision } from "./aiController";

const RETRY_MS = 1000;
const IDLE_POLL_MS = 100; // how often an idle decision loop checks for an active step

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs physics and plan progress at a fixed rate, AI decisions back to back as fast as jev answers while a step
 * is active, and asks the planner for a new plan whenever the user sends instructions.
 */
export class Engine {
  private readonly world = new World();
  private readonly scene = new Scene();
  private readonly player = new BoxEntity();
  private readonly character = new CharacterController(this.player);
  private readonly ai = new AIController(new TypeSafeClient());
  private readonly planner = new Planner(this.world);
  private plan = new Plan();
  private decision: Decision | null = null;
  private tick = 0;

  constructor(private readonly server: StateServer) {
    this.scene.add(this.player);
    server.onMessage = (message) => this.handleMessage(message);
  }

  run() {
    let last = performance.now();
    setInterval(() => {
      const now = performance.now();
      this.step((now - last) / 1000);
      last = now;
    }, 1000 / TICK_RATE);
    void this.decisionLoop();
  }

  private step(dt: number) {
    this.character.update(dt, this.plan.limits(this.player));
    this.world.update(this.scene, dt);
    const step = this.plan.current;
    this.plan.update(this.player, dt);
    if (this.plan.current !== step) this.character.stop(); // a finished step's command must not carry into the next one
    this.tick += 1;
    this.server.broadcast(this.snapshot());
  }

  private async decisionLoop() {
    while (true) {
      const step = this.plan.current;
      // With no active step every axis is held still, so jev has nothing to decide.
      if (!step) {
        await sleep(IDLE_POLL_MS);
        continue;
      }
      try {
        this.decision = await this.ai.decide(this.world.toState(this.scene, this.player), this.plan, this.player);
      } catch (error) {
        if (!(error instanceof TypeSafeError)) throw error;
        console.error(`jev request failed, retrying: ${error.message}`);
        await sleep(RETRY_MS);
        continue;
      }
      // A decision made for a step that finished (or a plan that was replaced) while jev was thinking is stale.
      if (this.plan.current === step) {
        this.character.stop(); // each decision replaces the previous one's commands
        for (const command of this.decision.commands) command.execute(this.character);
      }
    }
  }

  private handleMessage(message: ClientMessage) {
    if (message.type === "set_instructions") {
      void this.replan(message.instructions);
    } else if (message.type === "set_speeds") {
      this.character.maxSpeed = message.max_speed;
      this.character.maxTurnRate = message.max_turn_rate;
    }
  }

  private async replan(text: string) {
    this.plan = new Plan(text, [], true);
    try {
      const steps = await this.planner.create(text);
      this.plan = new Plan(text, steps);
    } catch (error) {
      this.plan = new Plan(text, [], false, String(error));
    }
  }

  private snapshot(): Snapshot {
    return {
      tick: this.tick,
      world: this.world.toState(this.scene, this.player),
      plan: this.plan.toState(),
      input: { ...this.character.input },
      settings: this.character.settings(),
      engine: this.decision?.toState() ?? null,
    };
  }
}
