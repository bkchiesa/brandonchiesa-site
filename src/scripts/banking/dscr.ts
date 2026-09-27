import {
  MSG,
  cfadsFromParts,
  dscr,
  dscrMathText,
  dscrSummary,
  formatUsd,
  proposedAnnualFromLoan,
  readAmount,
  validateLoan,
} from "../../lib/banking/calc";
import { bindDebounced, checkedValue, clearErrors, clearInvalid, field, inputField, markStale, setText, showError } from "./dom";

const WIDE = 100_000_000;

export function bindDscrCalculator(root: HTMLElement | null): void {
  if (!root) return;
  const params = new URLSearchParams(window.location.search);
  if (params.has("principal") || params.has("rate") || params.has("months")) {
    const mode = field(root, "proposedMode");
    if (mode) mode.value = "loan";
    const principal = inputField(root, "loanPrincipal");
    const rate = inputField(root, "loanRate");
    const months = inputField(root, "loanMonths");
    if (principal && params.get("principal")) principal.value = params.get("principal") ?? "";
    if (rate && params.get("rate")) rate.value = params.get("rate") ?? "";
    if (months && params.get("months")) months.value = params.get("months") ?? "";
  }

  const render = () => {
    clearErrors(root);
    clearInvalid(root);
    const mode = checkedValue(root, "dscrMode") === "direct" ? "direct" : "parts";
    root.querySelectorAll<HTMLElement>("[data-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.panel !== mode;
    });
    const proposedMode = field(root, "proposedMode")?.value === "annual" ? "annual" : "loan";
    root.querySelectorAll<HTMLElement>("[data-proposed]").forEach((panel) => {
      panel.hidden = panel.dataset.proposed !== proposedMode;
    });

    let blocked = false;
    const partNames = [
      ["netIncome", true],
      ["depreciation", false],
      ["amortization", false],
      ["interest", false],
      ["nonrecurring", false],
      ["excess", false],
      ["draws", false],
      ["other", true],
    ] as const;
    const values: Record<string, number> = {};
    for (const [name, allowNegative] of partNames) {
      const parsed = readPart(root, name, allowNegative);
      if (!parsed.ok) {
        if (mode === "parts") {
          showError(root, name, parsed.message);
          blocked = true;
        }
      } else values[name] = parsed.value;
    }
    const direct = readPart(root, "cashFlow", true);
    const existing = readPart(root, "existing", false);
    if (mode === "direct" && !direct.ok) {
      showError(root, "cashFlow", direct.message);
      blocked = true;
    }
    if (!existing.ok) {
      showError(root, "existing", existing.message);
      blocked = true;
    }

    let proposed = 0;
    if (proposedMode === "annual") {
      const annual = readPart(root, "proposedAnnual", false);
      if (!annual.ok) {
        showError(root, "proposedAnnual", annual.message);
        blocked = true;
      } else proposed = annual.value;
    } else {
      const loan = validateLoan({
        principal: readAmount(inputField(root, "loanPrincipal")?.value ?? ""),
        annualRatePct: readAmount(inputField(root, "loanRate")?.value ?? ""),
        rateText: inputField(root, "loanRate")?.value ?? "",
        termValue: readAmount(inputField(root, "loanMonths")?.value ?? ""),
        termText: inputField(root, "loanMonths")?.value ?? "",
        termUnit: "months",
        amortText: "",
      });
      if (!loan.ok) {
        const fieldName = loan.field === "principal" ? "loanPrincipal" : loan.field === "rate" ? "loanRate" : "loanMonths";
        showError(root, fieldName, loan.message);
        blocked = true;
      } else {
        const annual = proposedAnnualFromLoan(loan.principal, loan.annualRatePct, loan.n);
        if (annual === null) {
          showError(root, "loanPrincipal", MSG.principal);
          blocked = true;
        } else proposed = annual;
      }
    }

    if (blocked || !existing.ok || (mode === "direct" && !direct.ok)) {
      markStale(root, true);
      return;
    }

    const cfads =
      mode === "direct" && direct.ok
        ? direct.value
        : cfadsFromParts({
            netIncome: values.netIncome ?? 0,
            depreciation: values.depreciation ?? 0,
            amortization: values.amortization ?? 0,
            interestExpense: values.interest ?? 0,
            nonrecurring: values.nonrecurring ?? 0,
            excessOwnerComp: values.excess ?? 0,
            ownerDraws: values.draws ?? 0,
            otherAdj: values.other ?? 0,
          });
    const result = dscr({ cfads, existing: existing.value, proposed });
    const results = root.querySelector<HTMLElement>("[data-results]");
    if (results) results.hidden = false;
    root.dataset.hasResult = "true";
    markStale(root, false);
    setText(root, "cfads", formatUsd(cfads));
    setText(root, "tds", formatUsd(result.tds));
    setText(root, "ratio", result.dscr === null ? "No ratio" : `${result.dscr.toFixed(2)}x`);
    setText(root, "cushion", result.cushion === null ? "" : formatUsd(result.cushion));
    setText(root, "summary", dscrSummary(result));
    setText(
      root,
      "math",
      dscrMathText({
        mode,
        parts:
          mode === "parts"
            ? {
                netIncome: values.netIncome ?? 0,
                depreciation: values.depreciation ?? 0,
                amortization: values.amortization ?? 0,
                interestExpense: values.interest ?? 0,
                nonrecurring: values.nonrecurring ?? 0,
                excessOwnerComp: values.excess ?? 0,
                ownerDraws: values.draws ?? 0,
                otherAdj: values.other ?? 0,
              }
            : undefined,
        cfads,
        existing: existing.value,
        proposed,
        result,
      }),
    );
    const ratioWrap = root.querySelector<HTMLElement>("[data-ratio-stat]");
    if (ratioWrap) ratioWrap.hidden = result.dscr === null && result.band !== "negative";
  };

  bindDebounced(root, render);
}

function readPart(
  root: ParentNode,
  name: string,
  allowNegative: boolean,
): { ok: true; value: number } | { ok: false; message: string } {
  const text = inputField(root, name)?.value ?? "";
  if (text.trim() === "") return { ok: true, value: 0 };
  const value = readAmount(text);
  if (value === null) return { ok: false, message: "Enter a number." };
  if (!allowNegative && value < 0) return { ok: false, message: MSG.negativeMoney };
  if (value < -WIDE || value > WIDE) return { ok: false, message: "Enter an amount of $100,000,000 or less." };
  return { ok: true, value };
}
