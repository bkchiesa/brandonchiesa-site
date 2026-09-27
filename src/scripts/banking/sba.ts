import { SBA_QUESTIONS } from "../../data/banking/sba-quick-check";
import { SBA_RESULT_NOTE, quickCheck, type SbaAnswer } from "../../lib/banking/calc";
import { setText } from "./dom";

export function bindSbaCheck(root: HTMLElement | null): void {
  if (!root) return;
  const render = () => {
    const answers: Record<string, SbaAnswer | undefined> = {};
    let answered = 0;
    for (const question of SBA_QUESTIONS) {
      const picked = root.querySelector<HTMLInputElement>(`input[name="q-${question.key}"]:checked`);
      if (picked && (picked.value === "yes" || picked.value === "no" || picked.value === "unsure")) {
        answers[question.key] = picked.value;
        answered += 1;
      }
    }
    setText(root, "progress", `${answered} of ${SBA_QUESTIONS.length}`);
    const result = quickCheck(answers, SBA_QUESTIONS);
    const box = root.querySelector<HTMLElement>("[data-results]");
    const waiting = root.querySelector<HTMLElement>("[data-waiting]");
    if (!box) return;
    if (result.result === "incomplete") {
      box.hidden = true;
      if (waiting) waiting.hidden = false;
      return;
    }
    if (waiting) waiting.hidden = true;
    box.hidden = false;
    setText(root, "summary", result.summary);
    setText(root, "note", SBA_RESULT_NOTE);
  };

  root.addEventListener("change", render);
  root.querySelector("[data-reset]")?.addEventListener("click", () => {
    root.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach((input) => {
      input.checked = false;
    });
    render();
  });
  render();
  root.dataset.ready = "true";
}
