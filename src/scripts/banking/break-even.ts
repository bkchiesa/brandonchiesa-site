import { calculateBreakEven, formatUsd, readAmount } from "../../lib/banking/calc";
import { setText, textField } from "./dom";

function formatUnits(value: number | null): string {
  if (value === null) return "—";
  const rounded = Math.round(value * 100) / 100;
  if (Math.abs(rounded - Math.round(rounded)) < 1e-9) return String(Math.round(rounded));
  return rounded.toFixed(2);
}

function formatRatio(ratio: number): string {
  const pct = Math.round(ratio * 1000) / 10;
  return Number.isInteger(pct) ? `${pct.toFixed(0)}%` : `${pct.toFixed(1)}%`;
}

export function bindBreakEven(root: HTMLElement): void {
  const fixed = textField(root, "fixed");
  const price = textField(root, "price");
  const variable = textField(root, "variable");
  const profit = textField(root, "profit");
  if (!fixed || !price || !variable || !profit) return;

  const clear = (message: string) => {
    setText(root, "units", "—");
    setText(root, "revenue", "—");
    setText(root, "margin", "—");
    setText(root, "summary", message);
  };

  const render = () => {
    const fixedValue = readAmount(fixed.value);
    const priceValue = readAmount(price.value);
    const variableValue = readAmount(variable.value);
    const profitRaw = profit.value.trim();
    const profitValue = profitRaw === "" ? 0 : readAmount(profitRaw);
    if (fixedValue === null || priceValue === null || variableValue === null) {
      clear("Enter fixed costs, price per unit, and variable cost per unit.");
      return;
    }
    if (profitValue === null) {
      clear("Enter a target profit as a number, or leave it blank.");
      return;
    }
    const result = calculateBreakEven({
      fixedCosts: fixedValue,
      pricePerUnit: priceValue,
      variableCostPerUnit: variableValue,
      targetProfit: profitValue,
    });
    if (!result.ok) {
      clear(result.error);
      return;
    }
    const viable = result.contributionMargin > 0;
    setText(root, "units", viable ? formatUnits(result.breakEvenUnits) : "—");
    setText(root, "revenue", viable ? formatUsd(result.breakEvenRevenue) : "—");
    setText(
      root,
      "margin",
      viable ? `${formatUsd(result.contributionMargin)} · ${formatRatio(result.contributionMarginRatio)}` : "—",
    );
    setText(root, "summary", result.summary);
  };

  root.addEventListener("input", render);
  render();
}
