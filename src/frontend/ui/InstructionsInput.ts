export class InstructionsInput {
  constructor(form: HTMLFormElement, input: HTMLInputElement, onSubmit: (instructions: string) => void) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const instructions = input.value.trim();
      if (!instructions) return;
      onSubmit(instructions);
      input.value = "";
    });
  }
}
