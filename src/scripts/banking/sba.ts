import { SBA_QUESTIONS } from "../../data/banking/sba-quick-check";
import { MSG, SBA_RESULT_NOTE, quickCheck, type SbaAnswer } from "../../lib/banking/calc";
import { setText } from "./dom";

function joinList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/** Tells the visitor which questions are still open so the check can be finished. */
export function openQuestionPrompt(openNumbers: readonly number[]): string {
  if (openNumbers.length === 0) return MSG.sbaIncomplete;
  const labels = openNumbers.map((number) => `question ${number}`);
  return `${MSG.sbaIncomplete} Still open: ${joinList(labels)}.`;
}

export function bindSbaCheck(root: HTMLElement | null): void {
  if (!root) return;
  const nextButton = root.querySelector<HTMLButtonElement>("[data-next]");
  const render = () => {
    const answers: Record<string, SbaAnswer | undefined> = {};
    const openNumbers: number[] = [];
    let answered = 0;
    SBA_QUESTIONS.forEach((question, index) => {
      const picked = root.querySelector<HTMLInputElement>(`input[name="q-${question.key}"]:checked`);
      if (picked && (picked.value === "yes" || picked.value === "no" || picked.value === "unsure")) {
        answers[question.key] = picked.value;
        answered += 1;
      } else {
        openNumbers.push(index + 1);
      }
    });
    setText(root, "progress", `${answered} of ${SBA_QUESTIONS.length}`);
    const result = quickCheck(answers, SBA_QUESTIONS);
    const box = root.querySelector<HTMLElement>("[data-results]");
    const waiting = root.querySelector<HTMLElement>("[data-waiting]");
    if (!box) return;
    if (result.result === "incomplete") {
      box.hidden = true;
      if (waiting) {
        waiting.hidden = false;
        waiting.textContent = answered === 0 ? MSG.sbaIncomplete : openQuestionPrompt(openNumbers);
      }
      if (nextButton) nextButton.hidden = answered === 0;
      return;
    }
    if (waiting) waiting.hidden = true;
    if (nextButton) nextButton.hidden = true;
    box.hidden = false;
    setText(root, "summary", result.summary);
    setText(root, "note", SBA_RESULT_NOTE);
  };

  const focusNext = () => {
    for (const question of SBA_QUESTIONS) {
      const picked = root.querySelector<HTMLInputElement>(`input[name="q-${question.key}"]:checked`);
      if (picked) continue;
      const first = root.querySelector<HTMLInputElement>(`input[name="q-${question.key}"]`);
      const fieldset = first?.closest("fieldset");
      fieldset?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      first?.focus();
      return;
    }
  };

  root.addEventListener("change", render);
  nextButton?.addEventListener("click", focusNext);
  root.querySelector("[data-reset]")?.addEventListener("click", () => {
    root.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach((input) => {
      input.checked = false;
    });
    render();
  });
  render();
  root.dataset.ready = "true";
}
