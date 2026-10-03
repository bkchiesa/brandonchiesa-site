import { BREAK_EVEN_EMPTY } from "../../data/banking/copy";
import {
  MSG,
  breakEven,
  breakEvenMathText,
  breakEvenSummary,
  formatUsd,
  readAmount,
} from "../../lib/banking/calc";
import {
  bindDebounced,
  clearErrors,
  clearInvalid,
  hidePrompt,
  hideResults,
  inputField,
  isTouched,
  setPrompt,
  setText,
  showError,
  showResults,
} from "./dom";

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
    let firstMessage = "";
    const fail = (name: string, message: string) => {
      if (!firstMessage) firstMessage = message;
      if (isTouched(root)) showError(root, name, message);
    };
    if (unitLabel.length > 20) {
      fail("unit", "Use 20 characters or fewer.");
      hideResults(root);
      setPrompt(root, isTouched(root) ? firstMessage : BREAK_EVEN_EMPTY);
      return;
    }
    const fixed = parseMoney(fixedText, true, "Enter your monthly fixed costs.");
    const price = parseMoney(priceText, false, MSG.price);
    const variable = parseMoney(variableText, true, "Enter the direct cost of each sale.");
    const target = targetText.trim() === "" ? { ok: true as const, value: 0 } : parseMoney(targetText, true, "Enter a profit goal of zero or more.");
    let blocked = false;
    if (!fixed.ok) {
      fail("fixed", fixed.message);
      blocked = true;
    } else if (fixed.value > MONEY_MAX) {
      fail("fixed", "Enter fixed costs of $100,000,000 or less.");
      blocked = true;
    }
    if (!price.ok) {
      fail("price", price.message);
      blocked = true;
    } else if (price.value > PRICE_MAX) {
      fail("price", "Enter a price of $10,000,000 or less.");
      blocked = true;
    }
    if (!variable.ok) {
      fail("variable", variable.message);
      blocked = true;
    } else if (variable.value > PRICE_MAX) {
      fail("variable", "Enter a cost of $10,000,000 or less.");
      blocked = true;
    }
    if (!target.ok) {
      fail("target", target.message);
      blocked = true;
    } else if (target.value > MONEY_MAX) {
      fail("target", "Enter a profit goal of $100,000,000 or less.");
      blocked = true;
    }
    if (blocked || !fixed.ok || !price.ok || !variable.ok || !target.ok) {
      hideResults(root);
      setPrompt(root, isTouched(root) ? firstMessage || BREAK_EVEN_EMPTY : BREAK_EVEN_EMPTY);
      return;
    }
    const math = breakEven({
      fixedMonthly: fixed.value,
      price: price.value,
      variableCost: variable.value,
      targetProfit: target.value,
    });
    if (!math.ok) {
      const message = math.error === "price" ? MSG.price : MSG.noMargin;
      if (isTouched(root)) showError(root, math.error === "price" ? "price" : "variable", message);
      hideResults(root);
      setPrompt(root, isTouched(root) ? message : BREAK_EVEN_EMPTY);
      return;
    }
    hidePrompt(root);
    showResults(root);
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
  emptyMessage: string,
): { ok: true; value: number } | { ok: false; message: string } {
  if (text.trim() === "") return { ok: false, message: emptyMessage };
  const value = readAmount(text);
  if (value === null) return { ok: false, message: "Enter a number." };
  if (value < 0 || (!allowZero && value === 0)) return { ok: false, message: value < 0 ? MSG.negativeMoney : emptyMessage };
  return { ok: true, value };
}
