import { SBA_QUESTIONS } from "../../data/banking/sba-eligibility";
import { evaluateSba } from "../../lib/banking/calc";
import { checkedValue, setText } from "./dom";

export function bindSbaCheck(root: HTMLElement): void {
  const reasons = root.querySelector("[data-reasons]");
  if (!(reasons instanceof HTMLElement)) return;

  const render = () => {
    const answers: Record<string, string | undefined> = {};
    for (const question of SBA_QUESTIONS) {
      answers[question.id] = checkedValue(root, question.id) ?? undefined;
    }
    const result = evaluateSba(answers, SBA_QUESTIONS);
    setText(root, "headline", result.headline);
    setText(root, "summary", result.summary);
    reasons.replaceChildren();
    for (const reason of result.reasons) {
      const item = document.createElement("li");
      item.textContent = reason;
      reasons.append(item);
    }
    reasons.hidden = result.reasons.length === 0;
  };

  root.addEventListener("change", render);
  render();
}
