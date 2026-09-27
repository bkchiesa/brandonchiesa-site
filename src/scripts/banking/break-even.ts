import {
  MSG,
  breakEven,
  breakEvenMathText,
  breakEvenSummary,
  formatUsd,
  readAmount,
} from "../../lib/banking/calc";
import { bindDebounced, clearErrors, clearInvalid, inputField, markStale, setText, showError } from "./dom";

const MONEY_MAX = 100_000_000;
const PRICE_MAX = 10_000_000;

export function bindBreakEven(root: HTMLElement | null): void {
  if (!root) return;
  const render = () => {
    clearErrors(root);
    clearInvalid(root);
    const fixedText = inputField(root, "fixed")?.value ?? "";
    const priceText = inputField(root, "price")?.value ?? "";
    const variableText = inputField(root, "variable")?.value ?? "";
    const targetText = inputField(root, "target")?.value ?? "";
    const unitInput = inputField(root, "unit");
    const unitLabel = (unitInput?.value ?? "units").trim() || "units";
    if (unitLabel.length > 20) {
      showError(root, "unit", "Use 20 characters or fewer.");
      markStale(root, true);
      return;
    }
    const fixed = parseMoney(fixedText, true);
    const price = parseMoney(priceText, false);
    const variable = parseMoney(variableText, true);
    const target = targetText.trim() === "" ? { ok: true as const, value: 0 } : parseMoney(targetText, true);
    let blocked = false;
    if (!fixed.ok) {
      showError(root, "fixed", fixed.message);
      blocked = true;
    } else if (fixed.value > MONEY_MAX) {
      showError(root, "fixed", "Enter fixed costs of $100,000,000 or less.");
      blocked = true;
    }
    if (!price.ok || price.value <= 0) {
      showError(root, "price", MSG.price);
      blocked = true;
    } else if (price.value > PRICE_MAX) {
      showError(root, "price", "Enter a price of $10,000,000 or less.");
      blocked = true;
    }
    if (!variable.ok) {
      showError(root, "variable", variable.message);
      blocked = true;
    } else if (variable.value > PRICE_MAX) {
      showError(root, "variable", "Enter a cost of $10,000,000 or less.");
      blocked = true;
    }
    if (!target.ok) {
      showError(root, "target", target.message);
      blocked = true;
    } else if (target.value > MONEY_MAX) {
      showError(root, "target", "Enter a profit goal of $100,000,000 or less.");
      blocked = true;
    }
    if (blocked || !fixed.ok || !price.ok || !variable.ok || !target.ok) {
      markStale(root, true);
      return;
    }
    const math = breakEven({
      fixedMonthly: fixed.value,
      price: price.value,
      variableCost: variable.value,
      targetProfit: target.value,
    });
    if (!math.ok) {
      showError(root, math.error === "price" ? "price" : "variable", math.error === "price" ? MSG.price : MSG.noMargin);
      markStale(root, true);
      return;
    }
    const results = root.querySelector<HTMLElement>("[data-results]");
    if (results) results.hidden = false;
    root.dataset.hasResult = "true";
    markStale(root, false);
    setText(root, "units", `${math.beUnits} ${unitLabel}`);
    setText(root, "revenue", formatUsd(math.beRevenue));
    setText(root, "margin", formatUsd(math.cm));
    const targetWrap = root.querySelector<HTMLElement>("[data-target-stat]");
    if (targetWrap) targetWrap.hidden = target.value <= 0;
    setText(root, "target", `${math.targetUnits} ${unitLabel}`);
    setText(
      root,
      "summary",
      breakEvenSummary({ unitLabel, targetProfit: target.value, fixedMonthly: fixed.value, result: math }),
    );
    setText(
      root,
      "math",
      breakEvenMathText({
        fixedMonthly: fixed.value,
        price: price.value,
        variableCost: variable.value,
        targetProfit: target.value,
        result: math,
      }),
    );
  };
  bindDebounced(root, render);
}

function parseMoney(
  text: string,
  allowZero: boolean,
): { ok: true; value: number } | { ok: false; message: string } {
  if (text.trim() === "") return { ok: false, message: "Enter a number." };
  const value = readAmount(text);
  if (value === null) return { ok: false, message: "Enter a number." };
  if (value < 0) return { ok: false, message: MSG.negativeMoney };
  return { ok: true, value };
}
