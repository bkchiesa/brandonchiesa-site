import {
  calculateLoan,
  formatUsd,
  loanScheduleCsv,
  readAmount,
  type LoanScheduleRow,
  type LoanYearSummary,
  type TermUnit,
} from "../../lib/banking/calc";
import { checkedValue, downloadText, fillTable, setText, textField } from "./dom";

export function bindLoanCalculator(root: HTMLElement): void {
  const principal = textField(root, "principal");
  const rate = textField(root, "rate");
  const term = textField(root, "term");
  const balloon = textField(root, "balloon");
  const body = root.querySelector("[data-schedule-body]");
  const caption = root.querySelector("[data-schedule-caption]");
  const periodHead = root.querySelector("[data-period-head]");
  const csvButton = root.querySelector("[data-csv]");
  if (!principal || !rate || !term || !balloon || !(body instanceof HTMLElement)) return;

  let mode: "year" | "month" = window.matchMedia("(max-width: 699px)").matches ? "year" : "month";
  let latestCsv = "";
  let latestSchedule: LoanScheduleRow[] = [];
  let latestYears: LoanYearSummary[] = [];

  const paintMode = () => {
    root.querySelectorAll<HTMLButtonElement>("[data-schedule-mode]").forEach((button) => {
      const pressed = button.dataset.scheduleMode === mode;
      button.setAttribute("aria-pressed", pressed ? "true" : "false");
    });
    if (periodHead) periodHead.textContent = mode === "year" ? "Year" : "Period";
  };

  const showWaiting = (message: string) => {
    setText(root, "payment", "—");
    setText(root, "interest", "—");
    setText(root, "total", "—");
    setText(root, "summary", message);
    body.replaceChildren();
    latestCsv = "";
    latestSchedule = [];
    latestYears = [];
    if (csvButton instanceof HTMLButtonElement) csvButton.disabled = true;
  };

  const renderTable = () => {
    if (mode === "year") {
      if (caption) caption.textContent = "Amortization by year";
      fillTable(
        body,
        latestYears.map((year) => [
          `Year ${year.year}`,
          formatUsd(year.payment),
          formatUsd(year.interest),
          formatUsd(year.principal),
          formatUsd(year.balance),
        ]),
      );
      return;
    }
    if (caption) caption.textContent = "Amortization by month";
    fillTable(
      body,
      latestSchedule.map((row) => [
        row.label,
        formatUsd(row.payment),
        formatUsd(row.interest),
        formatUsd(row.principal),
        formatUsd(row.balance),
      ]),
    );
  };

  const render = () => {
    const principalValue = readAmount(principal.value);
    const rateValue = readAmount(rate.value);
    const termValue = readAmount(term.value);
    const balloonRaw = balloon.value.trim();
    const balloonValue = balloonRaw === "" ? 0 : readAmount(balloonRaw);
    principal.setAttribute("aria-invalid", principal.value.trim() !== "" && principalValue === null ? "true" : "false");
    rate.setAttribute("aria-invalid", rate.value.trim() !== "" && rateValue === null ? "true" : "false");
    term.setAttribute("aria-invalid", term.value.trim() !== "" && termValue === null ? "true" : "false");
    balloon.setAttribute("aria-invalid", balloonRaw !== "" && balloonValue === null ? "true" : "false");

    if (principalValue === null || rateValue === null || termValue === null) {
      showWaiting("Enter a loan amount, rate, and term.");
      return;
    }
    if (balloonValue === null) {
      showWaiting("Enter a balloon as a number, or leave it blank.");
      return;
    }

    const unit: TermUnit = checkedValue(root, "loan-term-unit") === "months" ? "months" : "years";
    const result = calculateLoan({
      principal: principalValue,
      annualRatePercent: rateValue,
      termCount: termValue,
      termUnit: unit,
      balloon: balloonValue,
    });
    if (!result.ok) {
      showWaiting(result.error);
      return;
    }

    setText(root, "payment", formatUsd(result.monthlyPayment));
    setText(root, "interest", formatUsd(result.totalInterest));
    setText(root, "total", formatUsd(result.totalPaid));
    setText(root, "summary", result.summary);
    latestCsv = loanScheduleCsv(result.schedule);
    latestSchedule = result.schedule;
    latestYears = result.years;
    if (csvButton instanceof HTMLButtonElement) csvButton.disabled = false;
    renderTable();
  };

  root.addEventListener("input", render);
  root.addEventListener("change", render);
  root.querySelectorAll<HTMLButtonElement>("[data-schedule-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.dataset.scheduleMode;
      mode = next === "month" ? "month" : "year";
      paintMode();
      renderTable();
    });
  });
  if (csvButton instanceof HTMLButtonElement) {
    csvButton.addEventListener("click", () => {
      if (!latestCsv) return;
      downloadText("loan-amortization.csv", latestCsv, "text/csv;charset=utf-8");
    });
  }

  paintMode();
  render();
}
