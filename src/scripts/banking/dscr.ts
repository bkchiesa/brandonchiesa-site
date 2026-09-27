import { calculateDscr, formatUsd, readAmount, type LoanInput, type TermUnit } from "../../lib/banking/calc";
import { checkedValue, setText, textField } from "./dom";

function showPanel(root: HTMLElement, group: string, mode: string): void {
  root.querySelectorAll<HTMLElement>(`[data-panel="${group}"]`).forEach((panel) => {
    panel.hidden = panel.dataset.mode !== mode;
  });
}

export function bindDscrCalculator(root: HTMLElement): void {
  const noi = textField(root, "noi");
  const revenue = textField(root, "revenue");
  const expenses = textField(root, "expenses");
  const debt = textField(root, "debt");
  const principal = textField(root, "principal");
  const rate = textField(root, "rate");
  const term = textField(root, "term");
  const target = textField(root, "target");
  if (!noi || !revenue || !expenses || !debt || !principal || !rate || !term || !target) return;

  const clear = (message: string) => {
    setText(root, "dscr", "—");
    setText(root, "debt", "—");
    setText(root, "max", "—");
    setText(root, "summary", message);
  };

  const render = () => {
    const noiMode = checkedValue(root, "noi-mode") === "built" ? "built" : "direct";
    const debtMode = checkedValue(root, "debt-mode") === "loan" ? "loan" : "direct";
    showPanel(root, "noi", noiMode);
    showPanel(root, "debt", debtMode);

    const targetValue = readAmount(target.value);
    const payload: {
      noi?: number;
      revenue?: number;
      operatingExpenses?: number;
      annualDebtService?: number;
      loan?: LoanInput;
      targetDscr?: number;
    } = {};
    if (targetValue !== null) payload.targetDscr = targetValue;

    if (noiMode === "direct") {
      const noiValue = readAmount(noi.value);
      if (noiValue === null) {
        clear("Enter net operating income, or switch to revenue and expenses.");
        return;
      }
      payload.noi = noiValue;
    } else {
      const revenueValue = readAmount(revenue.value);
      const expenseValue = readAmount(expenses.value);
      if (revenueValue === null || expenseValue === null) {
        clear("Enter revenue and operating expenses.");
        return;
      }
      payload.revenue = revenueValue;
      payload.operatingExpenses = expenseValue;
    }

    if (debtMode === "direct") {
      const debtValue = readAmount(debt.value);
      if (debtValue === null) {
        clear("Enter annual debt service, or estimate it from a loan.");
        return;
      }
      payload.annualDebtService = debtValue;
    } else {
      const principalValue = readAmount(principal.value);
      const rateValue = readAmount(rate.value);
      const termValue = readAmount(term.value);
      if (principalValue === null || rateValue === null || termValue === null) {
        clear("Enter a loan amount, rate, and term.");
        return;
      }
      const unit: TermUnit = checkedValue(root, "dscr-term-unit") === "months" ? "months" : "years";
      payload.loan = {
        principal: principalValue,
        annualRatePercent: rateValue,
        termCount: termValue,
        termUnit: unit,
      };
    }

    const result = calculateDscr(payload);
    if (!result.ok) {
      clear(result.error);
      return;
    }
    setText(root, "dscr", result.dscrLabel);
    setText(root, "debt", formatUsd(result.annualDebtService));
    setText(root, "max", formatUsd(result.maxDebtService));
    setText(root, "summary", result.summary);
  };

  root.addEventListener("input", render);
  root.addEventListener("change", render);
  render();
}
