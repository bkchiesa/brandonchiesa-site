import { LOAN_EMPTY } from "../../data/banking/copy";
import {
  currentMonthValue,
  formatUsd,
  loanCalc,
  loanMathText,
  loanScheduleCsv,
  loanSummary,
  readAmount,
  validateLoan,
  type LoanScheduleRow,
  type TermUnit,
} from "../../lib/banking/calc";
import {
  bindDebounced,
  checkedValue,
  clearErrors,
  clearInvalid,
  downloadText,
  hidePrompt,
  hideResults,
  inputField,
  isTouched,
  setPrompt,
  setText,
  showError,
  showResults,
} from "./dom";

export function bindLoanCalculator(root: HTMLElement | null): void {
  if (!root) return;
  const start = inputField(root, "start");
  if (start && start.value === "") start.value = currentMonthValue();
  let rows: LoanScheduleRow[] = [];
  let csv = "";
  let expanded = false;

  const showAll = root.querySelector<HTMLButtonElement>("[data-show-all]");
  showAll?.addEventListener("click", () => {
    expanded = !expanded;
    applyRows(root, rows, expanded);
    if (showAll) {
      showAll.textContent = expanded ? "Show first 12" : "Show all";
      showAll.setAttribute("aria-expanded", String(expanded));
    }
  });

  root.querySelector("[data-csv]")?.addEventListener("click", () => {
    if (csv) downloadText("loan-schedule.csv", csv, "text/csv;charset=utf-8");
  });
  root.querySelector("[data-print]")?.addEventListener("click", () => {
    expanded = true;
    applyRows(root, rows, true);
    window.print();
  });
  window.addEventListener("beforeprint", () => applyRows(root, rows, true));
  window.addEventListener("afterprint", () => applyRows(root, rows, expanded));

  const render = () => {
    clearErrors(root);
    clearInvalid(root);
    const principalInput = inputField(root, "principal");
    const rateInput = inputField(root, "rate");
    const termInput = inputField(root, "term");
    const amortInput = inputField(root, "amort");
    const validated = validateLoan({
      principal: readAmount(principalInput?.value ?? ""),
      annualRatePct: readAmount(rateInput?.value ?? ""),
      rateText: rateInput?.value ?? "",
      termValue: readAmount(termInput?.value ?? ""),
      termText: termInput?.value ?? "",
      termUnit: (checkedValue(root, "termUnit") === "years" ? "years" : "months") as TermUnit,
      amortText: amortInput?.value ?? "",
    });
    if (!validated.ok) {
      hideResults(root);
      if (isTouched(root)) {
        showError(root, validated.field, validated.message);
        setPrompt(root, validated.message);
      } else {
        setPrompt(root, LOAN_EMPTY);
      }
      return;
    }
    const math = loanCalc({
      principal: validated.principal,
      annualRatePct: validated.annualRatePct,
      n: validated.n,
      amortMonths: validated.amortMonths,
      startDate: inputField(root, "start")?.value,
    });
    if (!math.ok) {
      hideResults(root);
      setPrompt(root, LOAN_EMPTY);
      return;
    }
    hidePrompt(root);
    showResults(root);
    setText(root, "payment", formatUsd(math.payment));
    setText(root, "interest", formatUsd(math.totalInterest));
    setText(root, "total", formatUsd(math.totalPaid));
    const balloonWrap = root.querySelector<HTMLElement>("[data-balloon-stat]");
    if (balloonWrap) balloonWrap.hidden = math.balloon <= 0;
    setText(root, "balloon", formatUsd(math.balloon));
    setText(
      root,
      "summary",
      loanSummary({
        n: validated.n,
        annualRatePct: validated.annualRatePct,
        payment: math.payment,
        totalInterest: math.totalInterest,
        totalPaid: math.totalPaid,
        balloon: math.balloon,
      }),
    );
    setText(
      root,
      "math",
      loanMathText({
        principal: validated.principal,
        annualRatePct: validated.annualRatePct,
        n: validated.n,
        amortMonths: validated.amortMonths,
        payment: math.payment,
      }),
    );
    rows = math.rows;
    csv = loanScheduleCsv(math.rows);
    applyRows(root, rows, expanded);
    const link = root.querySelector<HTMLAnchorElement>("[data-dscr-link]");
    const base = root.dataset.dscrBase ?? "/banking/calculators/dscr/";
    if (link) {
      const params = new URLSearchParams({
        principal: String(validated.principal),
        rate: String(validated.annualRatePct),
        months: String(validated.n),
      });
      if (validated.amortMonths) params.set("amort", String(validated.amortMonths));
      link.href = `${base}?${params.toString()}`;
    }
  };

  bindDebounced(root, render);
}

function applyRows(root: HTMLElement, rows: readonly LoanScheduleRow[], expanded: boolean): void {
  const body = root.querySelector("[data-schedule]");
  const showAll = root.querySelector<HTMLButtonElement>("[data-show-all]");
  if (!(body instanceof HTMLElement)) return;
  body.replaceChildren();
  const paymentRows = rows.filter((row) => !row.balloon);
  const hiddenCount = Math.max(0, paymentRows.length - 12);
  if (showAll) showAll.hidden = hiddenCount === 0;
  rows.forEach((row, index) => {
    const extra = !row.balloon && index >= 12;
    if (extra && !expanded) return;
    const tr = document.createElement("tr");
    if (row.balloon) tr.className = "bank-balloon";
    const cells = [
      row.balloon ? "Balloon due" : String(row.k),
      row.month,
      formatUsd(row.begin),
      formatUsd(row.payment),
      formatUsd(row.interest),
      formatUsd(row.principal),
      formatUsd(row.end),
    ];
    cells.forEach((value, cellIndex) => {
      const cell = document.createElement(cellIndex === 0 ? "th" : "td");
      cell.textContent = value;
      if (cellIndex === 0) cell.scope = "row";
      tr.append(cell);
    });
    body.append(tr);
  });
}
