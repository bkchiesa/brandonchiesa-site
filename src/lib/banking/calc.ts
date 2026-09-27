/**
 * Banking calculator math from the Sep 2026 content spec.
 * Money shown to the cent uses round2. Ratios shown to 2 decimals use a separate round.
 * Band thresholds use the unrounded DSCR.
 */

export type TermUnit = "months" | "years";
export type SbaAnswer = "yes" | "no" | "unsure";

export const LOAN_FOOTNOTE =
  "Estimate only. Actual payments depend on your lender's terms, fees, rate type (fixed or variable), and payment dates.";
export const DSCR_FOOTNOTE =
  "Lenders commonly cite roughly 1.20x to 1.25x or higher as a general benchmark. It is not a rule, and lenders calculate cash flow in different ways.";
export const BREAK_EVEN_FOOTNOTE =
  "Estimate only. Real businesses have mixed products and costs that shift with volume.";
export const SBA_RESULT_NOTE =
  "This quick-check is educational. It is not a determination of eligibility. SBA rules change; check SBA.gov or a lender.";
export const SBA_RULES_NOTE =
  "SBA rules change. This quick-check reflects SBA's basic rules as of September 2026. Check SBA.gov or a lender.";
export const ZERO_RATE_NOTE =
  "At 0% interest, your payment is simply the loan amount divided by the number of months.";
export const REVIEWED = "Reviewed Sep 2026";

export const MSG = {
  principal: "Enter a loan amount greater than $0.",
  principalMin: "Enter a loan amount of at least $1.",
  principalMax: "Enter a loan amount of $100,000,000 or less.",
  rateNegative: "Rate can't be negative.",
  rateMax: "Enter a rate of 30% or less.",
  rateDecimals: "Use at most 3 decimal places in the rate.",
  rateBlank: "Enter an interest rate.",
  termMonths: "Enter a whole number of months from 1 to 480.",
  termYears: "Enter a whole number of years from 1 to 40.",
  amort: "Amortization has to be at least as long as the term.",
  amortRange: "Enter an amortization from the term length up to 480 months.",
  amortWhole: "Enter amortization in whole months.",
  price: "Enter a selling price greater than $0.",
  noMargin:
    "Each sale costs as much or more than it brings in, so there is no break-even point at this price. Raise the price or lower the cost per unit.",
  noFixed: "With no fixed costs, every sale above variable cost is profit.",
  negativeMoney: "Enter amounts of zero or more.",
  dscrPayments: "Enter your loan payments to see a result.",
  dscrNegative: "Cash flow available is zero or negative, so it does not cover the payments.",
  sbaIncomplete: "Answer all questions to see your result.",
  sbaAllUnsure:
    "That is a lot of open questions. A 15-minute conversation with a lender can sort most of them out.",
} as const;

export function round2(x: number): number {
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

export function formatUsd(dollars: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

export function readAmount(raw: string): number | null {
  const cleaned = raw.trim().replace(/[$,%\s]/g, "");
  if (cleaned === "" || cleaned === "." || cleaned === "-" || cleaned === "-.") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return value;
}

export function decimalPlaces(raw: string): number {
  const cleaned = raw.trim().replace(/[$,%\s]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot === -1) return 0;
  return cleaned.length - dot - 1;
}

export interface LoanScheduleRow {
  k: number;
  month: string;
  begin: number;
  payment: number;
  interest: number;
  principal: number;
  end: number;
  balloon: boolean;
}

export interface LoanMath {
  payment: number;
  totalInterest: number;
  balloon: number;
  totalPaid: number;
  rows: LoanScheduleRow[];
}

export interface LoanCalcInput {
  principal: number;
  annualRatePct: number;
  n: number;
  amortMonths?: number | null;
  startDate?: string;
}

/** Spec pseudocode, plus month labels and a balloon row for the schedule. */
export function loanCalc(input: LoanCalcInput): ({ ok: true } & LoanMath) | { ok: false; error: "invalid" } {
  const P = +input.principal;
  const n = +input.n;
  const N = input.amortMonths ? +input.amortMonths : n;
  const r = +input.annualRatePct / 100 / 12;
  if (!(P > 0) || !(n >= 1) || !(N >= n)) return { ok: false, error: "invalid" };
  const rawPmt = r === 0 ? P / N : (P * r) / (1 - (1 + r) ** -N);
  const pmt = round2(rawPmt);
  let bal = P;
  let totalInterest = 0;
  const rows: LoanScheduleRow[] = [];
  for (let k = 1; k <= n; k += 1) {
    const interest = round2(bal * r);
    let principalPart = round2(pmt - interest);
    if (N === n && k === n) principalPart = bal;
    const payment = round2(interest + principalPart);
    const begin = bal;
    bal = round2(bal - principalPart);
    totalInterest = round2(totalInterest + interest);
    rows.push({
      k,
      month: monthLabel(input.startDate, k),
      begin,
      payment,
      interest,
      principal: principalPart,
      end: bal,
      balloon: false,
    });
  }
  const balloon = N > n ? bal : 0;
  if (balloon > 0) {
    rows.push({
      k: n + 1,
      month: "Balloon due",
      begin: balloon,
      payment: balloon,
      interest: 0,
      principal: balloon,
      end: 0,
      balloon: true,
    });
  }
  const lastPayment = rows[n - 1]?.payment ?? pmt;
  return {
    ok: true,
    payment: pmt,
    totalInterest,
    balloon,
    totalPaid: round2(pmt * (n - 1) + lastPayment + balloon),
    rows,
  };
}

export function monthLabel(startDate: string | undefined, k: number): string {
  const start = startDate && /^\d{4}-\d{2}$/.test(startDate) ? startDate : currentMonthValue();
  const [yearText, monthText] = start.split("-");
  const date = new Date(Date.UTC(Number(yearText), Number(monthText) - 1 + (k - 1), 1));
  return date.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

export function currentMonthValue(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export interface LoanValidation {
  ok: true;
  principal: number;
  annualRatePct: number;
  n: number;
  amortMonths: number | null;
}

export function validateLoan(input: {
  principal: number | null;
  annualRatePct: number | null;
  rateText: string;
  termValue: number | null;
  termText: string;
  termUnit: TermUnit;
  amortText: string;
}): LoanValidation | { ok: false; field: string; message: string } {
  if (input.principal === null || input.principal <= 0) {
    return { ok: false, field: "principal", message: MSG.principal };
  }
  if (input.principal < 1) return { ok: false, field: "principal", message: MSG.principalMin };
  if (input.principal > 100_000_000) return { ok: false, field: "principal", message: MSG.principalMax };
  if (input.rateText.trim() === "") return { ok: false, field: "rate", message: MSG.rateBlank };
  if (input.annualRatePct === null) return { ok: false, field: "rate", message: MSG.rateBlank };
  if (input.annualRatePct < 0) return { ok: false, field: "rate", message: MSG.rateNegative };
  if (input.annualRatePct > 30) return { ok: false, field: "rate", message: MSG.rateMax };
  if (decimalPlaces(input.rateText) > 3) return { ok: false, field: "rate", message: MSG.rateDecimals };
  if (input.termText.trim() !== "" && !/^\d+$/.test(input.termText.trim().replace(/,/g, ""))) {
    return {
      ok: false,
      field: "term",
      message: input.termUnit === "years" ? MSG.termYears : MSG.termMonths,
    };
  }
  if (input.termValue === null || !Number.isInteger(input.termValue)) {
    return {
      ok: false,
      field: "term",
      message: input.termUnit === "years" ? MSG.termYears : MSG.termMonths,
    };
  }
  const n = input.termUnit === "years" ? input.termValue * 12 : input.termValue;
  if (input.termUnit === "years" && (input.termValue < 1 || input.termValue > 40)) {
    return { ok: false, field: "term", message: MSG.termYears };
  }
  if (input.termUnit === "months" && (n < 1 || n > 480)) {
    return { ok: false, field: "term", message: MSG.termMonths };
  }
  const amortRaw = input.amortText.trim();
  let amortMonths: number | null = null;
  if (amortRaw !== "") {
    if (!/^\d+$/.test(amortRaw.replace(/,/g, ""))) {
      return { ok: false, field: "amort", message: MSG.amortWhole };
    }
    const amort = Number(amortRaw.replace(/,/g, ""));
    if (!Number.isInteger(amort)) return { ok: false, field: "amort", message: MSG.amortWhole };
    if (amort < n) return { ok: false, field: "amort", message: MSG.amort };
    if (amort > 480) return { ok: false, field: "amort", message: MSG.amortRange };
    amortMonths = amort;
  }
  return {
    ok: true,
    principal: input.principal,
    annualRatePct: input.annualRatePct,
    n,
    amortMonths,
  };
}

export function loanSummary(input: {
  n: number;
  annualRatePct: number;
  payment: number;
  totalInterest: number;
  totalPaid: number;
  balloon: number;
}): string {
  const lines = [
    `Estimated monthly payment: ${formatUsd(input.payment)}`,
    `Over ${input.n} months you would pay about ${formatUsd(input.totalInterest)} in interest, ${formatUsd(input.totalPaid)} in total.`,
  ];
  if (input.balloon > 0) {
    lines.push(
      `After ${input.n} payments, about ${formatUsd(input.balloon)} would still be owed (a balloon payment). Many borrowers refinance or pay it off at that point.`,
    );
  }
  if (input.annualRatePct === 0) lines.push(ZERO_RATE_NOTE);
  return lines.join(" ");
}

export function loanMathText(input: {
  principal: number;
  annualRatePct: number;
  n: number;
  amortMonths: number | null;
  payment: number;
}): string {
  const N = input.amortMonths ?? input.n;
  const monthlyRate = input.annualRatePct / 100 / 12;
  const lines = [
    "The monthly payment is the loan amount spread over the amortization period at a fixed monthly rate.",
    input.annualRatePct === 0
      ? `At 0% interest, payment = ${formatUsd(input.principal)} / ${N} = ${formatUsd(input.payment)}.`
      : `Monthly rate = ${input.annualRatePct}% / 12 = ${(monthlyRate * 100).toFixed(4).replace(/0+$/, "").replace(/\.$/, "")}%.`,
  ];
  if (input.annualRatePct !== 0) {
    lines.push(
      `Payment = ${formatUsd(input.principal)} × ${monthlyRate.toFixed(6)} / (1 - (1 + ${monthlyRate.toFixed(6)}) ^ -${N}) = ${formatUsd(input.payment)}.`,
    );
  }
  if ((input.amortMonths ?? input.n) > input.n) {
    lines.push(
      `The payment uses ${N} months of amortization, and the loan comes due after ${input.n} payments. The balance then is the balloon.`,
    );
  }
  lines.push(
    "Each month, interest is the balance times the monthly rate, rounded to the cent. On a fully amortizing loan, the last payment absorbs leftover cents so the balance ends at $0.00.",
  );
  lines.push("Total interest is the sum of those interest amounts. Total paid is the payments plus any balloon.");
  return lines.join(" ");
}

export function loanScheduleCsv(rows: readonly LoanScheduleRow[]): string {
  const header = "#,Month,Beginning balance,Payment,Interest,Principal,Ending balance";
  const lines = rows.map((row) =>
    [
      row.balloon ? "Balloon due" : String(row.k),
      row.balloon ? row.month : row.month,
      row.begin.toFixed(2),
      row.payment.toFixed(2),
      row.interest.toFixed(2),
      row.principal.toFixed(2),
      row.end.toFixed(2),
    ].join(","),
  );
  return [header, ...lines].join("\n");
}

export interface DscrMath {
  cfads: number;
  proposedAnnual: number;
  tds: number;
  dscr: number | null;
  band: "none" | "negative" | "short" | "thin" | "comfortable";
  cushion: number | null;
  maxDS125: number | null;
}

export function proposedAnnualFromLoan(principal: number, annualRatePct: number, n: number): number | null {
  const loan = loanCalc({ principal, annualRatePct, n });
  if (!loan.ok) return null;
  return round2(loan.payment * 12);
}

export function dscr(input: { cfads: number; existing: number; proposed: number }): DscrMath {
  const cfads = input.cfads;
  const tds = (+input.existing || 0) + (+input.proposed || 0);
  if (tds <= 0) {
    return { cfads, proposedAnnual: input.proposed, tds, dscr: null, band: "none", cushion: null, maxDS125: null };
  }
  const ratio = cfads / tds;
  const band = cfads <= 0 ? "negative" : ratio < 1 ? "short" : ratio < 1.25 ? "thin" : "comfortable";
  return {
    cfads,
    proposedAnnual: input.proposed,
    tds: round2(tds),
    dscr: band === "negative" ? null : Math.round(ratio * 100) / 100,
    band,
    cushion: round2(cfads - tds),
    maxDS125: round2(Math.max(0, cfads / 1.25)),
  };
}

export function cfadsFromParts(parts: {
  netIncome: number;
  depreciation: number;
  amortization: number;
  interestExpense: number;
  nonrecurring: number;
  excessOwnerComp: number;
  ownerDraws: number;
  otherAdj: number;
}): number {
  return (
    parts.netIncome +
    parts.depreciation +
    parts.amortization +
    parts.interestExpense +
    parts.nonrecurring +
    parts.excessOwnerComp -
    parts.ownerDraws +
    parts.otherAdj
  );
}

const DSCR_BAND_COPY = {
  short: "Below 1.00x means cash flow does not fully cover the payments.",
  thin: "Payments are covered, but the cushion is thin. Many lenders look for more room.",
  comfortable: "Roughly 1.25x or higher is often viewed as comfortable. Each lender sets its own standard.",
  negative: MSG.dscrNegative,
} as const;

export function dscrSummary(result: DscrMath): string {
  if (result.band === "none" || result.cushion === null || result.maxDS125 === null) return MSG.dscrPayments;
  const tail = `Cushion after payments: ${formatUsd(result.cushion)} per year. At a 1.25x ratio, this cash flow would support about ${formatUsd(result.maxDS125)} in total annual payments.`;
  if (result.band === "negative" || result.dscr === null) {
    return `${DSCR_BAND_COPY.negative} ${tail}`;
  }
  const ratio = result.dscr.toFixed(2);
  return `Your estimated DSCR is ${ratio}x. For every $1.00 of loan payments, the business has about $${ratio} of cash flow available. ${DSCR_BAND_COPY[result.band]} ${tail}`;
}

export function dscrMathText(input: {
  mode: "parts" | "direct";
  parts?: {
    netIncome: number;
    depreciation: number;
    amortization: number;
    interestExpense: number;
    nonrecurring: number;
    excessOwnerComp: number;
    ownerDraws: number;
    otherAdj: number;
  };
  cfads: number;
  existing: number;
  proposed: number;
  result: DscrMath;
}): string {
  const built =
    input.mode === "parts" && input.parts
      ? `Cash flow available = ${formatUsd(input.parts.netIncome)} + ${formatUsd(input.parts.depreciation)} + ${formatUsd(input.parts.amortization)} + ${formatUsd(input.parts.interestExpense)} + ${formatUsd(input.parts.nonrecurring)} + ${formatUsd(input.parts.excessOwnerComp)} - ${formatUsd(input.parts.ownerDraws)} + ${formatUsd(input.parts.otherAdj)} = ${formatUsd(input.cfads)}.`
      : `Cash flow available = ${formatUsd(input.cfads)}.`;
  const debt = `Total debt service = ${formatUsd(input.existing)} + ${formatUsd(input.proposed)} = ${formatUsd(input.result.tds)}.`;
  const ratio =
    input.result.dscr === null
      ? "There is no ratio until total debt service is above $0 and cash flow is above $0."
      : `DSCR = ${formatUsd(input.cfads)} / ${formatUsd(input.result.tds)} = ${input.result.dscr.toFixed(2)}x.`;
  return `${built} ${debt} ${ratio} Cushion = cash flow available minus total debt service. The 1.25x support figure is cash flow available divided by 1.25, and it is $0 when cash flow is not positive.`;
}

export interface BreakEvenMath {
  cm: number;
  cmr: number;
  beUnitsExact: number;
  beUnits: number;
  beRevenue: number;
  targetUnits: number;
  targetRevenue: number;
}

export function breakEven(input: {
  fixedMonthly: number;
  price: number;
  variableCost: number;
  targetProfit?: number;
}): ({ ok: true } & BreakEvenMath) | { ok: false; error: "price" | "noMargin" } {
  const F = input.fixedMonthly;
  const p = input.price;
  const v = input.variableCost;
  const T = input.targetProfit ?? 0;
  if (!(p > 0)) return { ok: false, error: "price" };
  const cm = p - v;
  if (cm <= 0) return { ok: false, error: "noMargin" };
  const cmr = cm / p;
  return {
    ok: true,
    cm: round2(cm),
    cmr,
    beUnitsExact: F / cm,
    beUnits: wholeUp(F / cm),
    beRevenue: round2(F / cmr),
    targetUnits: wholeUp((F + T) / cm),
    targetRevenue: round2((F + T) / cmr),
  };
}

function wholeUp(exact: number): number {
  const units = Math.ceil(exact - 1e-9);
  return units > 0 ? units : 0;
}

export function formatPercent(ratio: number): string {
  return `${round2(ratio * 100).toFixed(2)}%`;
}

export function breakEvenSummary(input: {
  unitLabel: string;
  targetProfit: number;
  fixedMonthly: number;
  result: BreakEvenMath;
}): string {
  const units = input.unitLabel.trim() || "units";
  const lines = [
    `Each ${units} brings in ${formatUsd(input.result.cm)} after its direct costs. That is ${formatPercent(input.result.cmr)} of the price.`,
    `To break even, you need about ${input.result.beUnits} ${units} a month, or about ${formatUsd(input.result.beRevenue)} in monthly sales.`,
  ];
  if (input.fixedMonthly === 0) lines.push(MSG.noFixed);
  if (input.targetProfit > 0) {
    lines.push(
      `To earn ${formatUsd(input.targetProfit)} a month, you need about ${input.result.targetUnits} ${units}, or about ${formatUsd(input.result.targetRevenue)} in monthly sales.`,
    );
  }
  return lines.join(" ");
}

export function breakEvenMathText(input: {
  fixedMonthly: number;
  price: number;
  variableCost: number;
  targetProfit: number;
  result: BreakEvenMath;
}): string {
  return `Contribution margin = ${formatUsd(input.price)} - ${formatUsd(input.variableCost)} = ${formatUsd(input.result.cm)}. Contribution margin ratio = ${formatUsd(input.result.cm)} / ${formatUsd(input.price)} = ${formatPercent(input.result.cmr)}. Break-even units = ${formatUsd(input.fixedMonthly)} / ${formatUsd(input.result.cm)} = ${trimExact(input.result.beUnitsExact)}, shown as ${input.result.beUnits} after rounding up to a whole unit. Break-even revenue = fixed costs / contribution margin ratio = ${formatUsd(input.result.beRevenue)}.${
    input.targetProfit > 0
      ? ` Target units = (${formatUsd(input.fixedMonthly)} + ${formatUsd(input.targetProfit)}) / ${formatUsd(input.result.cm)} = ${input.result.targetUnits} whole units.`
      : ""
  }`;
}

function trimExact(value: number): string {
  const rounded = Math.round(value * 10000) / 10000;
  return String(rounded);
}

export interface QuickQuestionRule {
  key: string;
  issueIf: "yes" | "no";
  issue: string;
  shortName: string;
}

export type QuickVerdict = "incomplete" | "possible_fit" | "possible_fit_confirm" | "possible_issue";

export interface QuickCheckResult {
  result: QuickVerdict;
  issues: string[];
  unsure: string[];
  summary: string;
  alsoConfirm: string;
}

function joinAnd(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export function quickCheck(
  answers: Readonly<Record<string, SbaAnswer | undefined>>,
  questions: readonly QuickQuestionRule[],
): QuickCheckResult {
  if (questions.some((question) => answers[question.key] === undefined)) {
    return { result: "incomplete", issues: [], unsure: [], summary: MSG.sbaIncomplete, alsoConfirm: "" };
  }
  const issues = questions
    .filter((question) => answers[question.key] === question.issueIf)
    .map((question) => question.issue);
  const unsure = questions.filter((question) => answers[question.key] === "unsure").map((question) => question.shortName);
  const alsoConfirm = unsure.length ? `Also confirm: ${joinAnd(unsure)}.` : "";
  if (issues.length) {
    const lines = issues.map((issue) => `Possible issue: ${issue}`);
    const summary = [
      ...lines,
      "This does not necessarily rule you out. Rules have exceptions, and a lender can tell you where you stand. Other options, such as a conventional loan, may also fit.",
      alsoConfirm,
    ]
      .filter(Boolean)
      .join(" ");
    return { result: "possible_issue", issues, unsure, summary, alsoConfirm };
  }
  if (unsure.length) {
    let summary = `Looks like a possible fit, with a few things to confirm. Ask a lender about: ${joinAnd(unsure)}.`;
    if (unsure.length === questions.length) summary = `${summary} ${MSG.sbaAllUnsure}`;
    return { result: "possible_fit_confirm", issues: [], unsure, summary, alsoConfirm };
  }
  return {
    result: "possible_fit",
    issues: [],
    unsure: [],
    summary:
      "Looks like a possible fit. Talk to a lender. Based on your answers, nothing in SBA's basic rules jumps out as a problem. A lender still has to review your credit, cash flow, and the details.",
    alsoConfirm: "",
  };
}
