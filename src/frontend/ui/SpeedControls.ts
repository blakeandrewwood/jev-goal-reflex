import type { Settings } from "../../shared/protocol";

export class SpeedControls {
  constructor(
    private readonly speed: HTMLInputElement,
    private readonly turnRate: HTMLInputElement,
    private readonly speedValue: HTMLElement,
    private readonly turnRateValue: HTMLElement,
    onChange: (settings: Settings) => void,
  ) {
    const send = () =>
      onChange({
        max_speed: Number(speed.value),
        max_turn_rate: Number(turnRate.value),
      });
    speed.addEventListener("input", send);
    turnRate.addEventListener("input", send);
  }

  update({ max_speed, max_turn_rate }: Settings) {
    // Leave a slider alone while the user is on it so the server echo doesn't fight the drag.
    if (document.activeElement !== this.speed) this.speed.value = String(max_speed);
    if (document.activeElement !== this.turnRate) this.turnRate.value = String(max_turn_rate);
    this.speedValue.textContent = `${max_speed} u/s`;
    this.turnRateValue.textContent = `${max_turn_rate}°/s`;
  }
}
