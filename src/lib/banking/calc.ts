/**
 * Educational banking math. Framework-free and deterministic.
 *
 * Money is rounded to cents (half up, via Math.round) at each amortization step.
 * The level payment uses the standard annuity formula; the last installment
 * absorbs leftover cents so the balance lands on the balloon (or zero).
 * A balloon, when set, is the balance due at maturity and is not part of the
 * level payment. Annual debt service for DSCR is the level payment × 12
 * (or × the term, when the term is shorter than a year) and excludes the balloon.
 *
 * Rates are percents: 6.5 means 6.5% a year, not 0.065.
 * Placeholder copy and these rounding choices wait on the banking content pass.
 */

import type { SbaQuestion } from "../../data/banking/sba-eligibility";

export type TermUnit = "years" | "months";

export type CalcResult<T> = ({ ok: true } & T) | { ok: false; error: string };

export interface LoanInput {
  principal: number;
  /** Annual rate in percent. 6.5 means 6.5%. */
  annualRatePercent: number;
  termCount: number;
  termUnit: TermUnit;
  /** Balance due at maturity, in dollars. Omit or 0 for a fully amortizing loan. */
  balloon?: number;
}

export interface LoanScheduleRow {
  period: number;
  label: string;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
  balloon: boolean;
}

export interface LoanYearSummary {
  year: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

export interface LoanResult {
  monthlyPayment: number;
  totalInterest: number;
  totalPaid: number;
  termMonths: number;
  balloon: number;
  schedule: LoanScheduleRow[];
  years: LoanYearSummary[];
  summary: string;
}

export interface DscrInput {
  /** Annual net operating income, when already known. */
  noi?: number;
  /** Used only when `noi` is omitted: revenue minus operating expenses. */
  revenue?: number;
  operatingExpenses?: number;
  /** Annual debt service, when already known. Wins over `loan` if both are set. */
  annualDebtService?: number;
  loan?: LoanInput;
  /** Defaults to 1.25. */
  targetDscr?: number;
}

export type DscrBand = "below-1" | "covers-thin" | "meets-1-20" | "meets-1-25" | "no-debt";

export interface DscrResult {
  noi: number;
  annualDebtService: number;
  /** Null when there is no debt service to divide by. */
  dscr: number | null;
  dscrLabel: string;
  band: DscrBand;
  maxDebtService: number;
  targetDscr: number;
  /** True when debt service came from the loan formula rather than a typed amount. */
  debtFromLoan: boolean;
  excludesBalloon: boolean;
  summary: string;
}

export interface BreakEvenInput {
  fixedCosts: number;
  pricePerUnit: number;
  variableCostPerUnit: number;
  targetProfit?: number;
}

export interface BreakEvenResult {
  contributionMargin: number;
  contributionMarginRatio: number;
  breakEvenUnits: number;
  breakEvenRevenue: number;
  wholeUnits: number;
  targetUnits: number | null;
  targetRevenue: number | null;
  targetWholeUnits: number | null;
  summary: string;
}

export type SbaVerdict = "likely-eligible" | "check-with-lender" | "likely-not-eligible" | "incomplete";

export interface SbaEvaluation {
  verdict: SbaVerdict;
  headline: string;
  summary: string;
  reasons: string[];
}

const MAX_TERM_MONTHS = 600;

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

export function formatUsd(dollars: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

function roundTo(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/** Strip $ , % and spaces. Empty input is null. */
export function readAmount(raw: string): number | null {
  const cleaned = raw.trim().replace(/[$,%\s]/g, "");
  if (cleaned === "" || cleaned === "." || cleaned === "-" || cleaned === "-.") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return value;
}

function termPhrase(months: number, unit: TermUnit, count: number): string {
  if (unit === "years" && Number.isInteger(count)) {
    return count === 1 ? "1 year" : `${count} years`;
  }
  if (unit === "months" && Number.isInteger(count) && months === count) {
    return count === 1 ? "1 month" : `${count} months`;
  }
  return months === 1 ? "1 month" : `${months} months`;
}

export function resolveTermMonths(count: number, unit: TermUnit): number | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  const raw = unit === "years" ? count * 12 : count;
  const months = Math.round(raw);
  if (months < 1 || months > MAX_TERM_MONTHS) return null;
  return months;
}

function levelPaymentCents(
  principalCents: number,
  balloonCents: number,
  monthlyRate: number,
  months: number,
): number {
  if (monthlyRate === 0) {
    return Math.round((principalCents - balloonCents) / months);
  }
  const growth = (1 + monthlyRate) ** months;
  const presentBalloon = balloonCents / growth;
  const presentPayments = principalCents - presentBalloon;
  const payment = (presentPayments * monthlyRate * growth) / (growth - 1);
  return Math.round(payment);
}

function summarizeYears(rows: LoanScheduleRow[], termMonths: number): LoanYearSummary[] {
  const buckets = new Map<number, LoanYearSummary>();
  for (const row of rows) {
    const monthIndex = row.balloon ? termMonths : row.period;
    const year = Math.ceil(monthIndex / 12);
    const current = buckets.get(year) ?? {
      year,
      payment: 0,
      interest: 0,
      principal: 0,
      balance: 0,
    };
    current.payment = fromCents(toCents(current.payment) + toCents(row.payment));
    current.interest = fromCents(toCents(current.interest) + toCents(row.interest));
    current.principal = fromCents(toCents(current.principal) + toCents(row.principal));
    current.balance = row.balance;
    buckets.set(year, current);
  }
  return [...buckets.values()].sort((a, b) => a.year - b.year);
}

function loanSummary(input: {
  monthlyPayment: number;
  totalInterest: number;
  totalPaid: number;
  balloon: number;
  termMonths: number;
  termUnit: TermUnit;
  termCount: number;
}): string {
  const span = termPhrase(input.termMonths, input.termUnit, input.termCount);
  const balloon =
    input.balloon > 0 ? ` A ${formatUsd(input.balloon)} balloon is due at the end.` : "";
  return `Your monthly payment is ${formatUsd(input.monthlyPayment)}.${balloon} Over ${span} you'd pay ${formatUsd(input.totalInterest)} in interest. In total you'd pay ${formatUsd(input.totalPaid)}.`;
}

export function calculateLoan(input: LoanInput): CalcResult<LoanResult> {
  if (!Number.isFinite(input.principal) || input.principal <= 0) {
    return fail("Enter a loan amount greater than zero.");
  }
  if (!Number.isFinite(input.annualRatePercent) || input.annualRatePercent < 0 || input.annualRatePercent > 100) {
    return fail("Enter an annual interest rate between 0 and 100 percent.");
  }
  const termMonths = resolveTermMonths(input.termCount, input.termUnit);
  if (termMonths === null) {
    return fail("Enter a term from 1 month up to 50 years.");
  }
  const balloonDollars = input.balloon ?? 0;
  if (!Number.isFinite(balloonDollars) || balloonDollars < 0) {
    return fail("Enter a balloon of zero or more, or leave it blank.");
  }

  const principalCents = toCents(input.principal);
  const balloonCents = toCents(balloonDollars);
  if (balloonCents > principalCents) {
    return fail("Balloon can't be larger than the loan amount.");
  }

  const monthlyRate = input.annualRatePercent / 100 / 12;
  const level = levelPaymentCents(principalCents, balloonCents, monthlyRate, termMonths);
  if (!Number.isFinite(level) || level < 0) {
    return fail("Those inputs don't produce a payment. Check the amount, rate, and balloon.");
  }

  let balance = principalCents;
  const schedule: LoanScheduleRow[] = [];

  for (let period = 1; period <= termMonths; period += 1) {
    const interest = Math.round(balance * monthlyRate);
    let payment = level;
    let principalPaid = payment - interest;
    if (period === termMonths) {
      principalPaid = balance - balloonCents;
      payment = interest + principalPaid;
    } else {
      const room = balance - balloonCents;
      if (principalPaid > room) {
        principalPaid = room;
        payment = interest + principalPaid;
      }
    }
    balance -= principalPaid;
    schedule.push({
      period,
      label: String(period),
      payment: fromCents(payment),
      interest: fromCents(interest),
      principal: fromCents(principalPaid),
      balance: fromCents(balance),
      balloon: false,
    });
  }

  if (balloonCents > 0) {
    schedule.push({
      period: termMonths + 1,
      label: "Balloon",
      payment: fromCents(balloonCents),
      interest: 0,
      principal: fromCents(balloonCents),
      balance: 0,
      balloon: true,
    });
  }

  const totalPaidCents = schedule.reduce((sum, row) => sum + toCents(row.payment), 0);
  const totalInterestCents = schedule.reduce((sum, row) => sum + toCents(row.interest), 0);
  const monthlyPayment = fromCents(level);
  const totalInterest = fromCents(totalInterestCents);
  const totalPaid = fromCents(totalPaidCents);
  const balloon = fromCents(balloonCents);

  return {
    ok: true,
    monthlyPayment,
    totalInterest,
    totalPaid,
    termMonths,
    balloon,
    schedule,
    years: summarizeYears(schedule, termMonths),
    summary: loanSummary({
      monthlyPayment,
      totalInterest,
      totalPaid,
      balloon,
      termMonths,
      termUnit: input.termUnit,
      termCount: input.termCount,
    }),
  };
}

export function loanScheduleCsv(rows: readonly LoanScheduleRow[]): string {
  const header = "Period,Payment,Interest,Principal,Ending Balance";
  const lines = rows.map((row) =>
    [row.label, row.payment.toFixed(2), row.interest.toFixed(2), row.principal.toFixed(2), row.balance.toFixed(2)].join(
      ",",
    ),
  );
  return [header, ...lines].join("\n");
}

function resolveNoi(input: DscrInput): number | null {
  if (input.noi !== undefined) {
    return Number.isFinite(input.noi) ? input.noi : null;
  }
  if (input.revenue === undefined && input.operatingExpenses === undefined) return null;
  const revenue = input.revenue ?? 0;
  const expenses = input.operatingExpenses ?? 0;
  if (!Number.isFinite(revenue) || !Number.isFinite(expenses)) return null;
  return revenue - expenses;
}

function bandForShown(shown: number): DscrBand {
  if (shown < 1) return "below-1";
  if (shown < 1.2) return "covers-thin";
  if (shown < 1.25) return "meets-1-20";
  return "meets-1-25";
}

const BAND_SENTENCE: Record<Exclude<DscrBand, "no-debt">, string> = {
  "below-1": "That's below 1.00, so cash flow does not cover the debt service.",
  "covers-thin":
    "That's at least 1.00 and under 1.20, so the debt is covered with a thin cushion. Many lenders look for 1.20 or more.",
  "meets-1-20": "That meets a common 1.20 minimum and is still under 1.25. Some programs look for 1.25.",
  "meets-1-25": "That meets a common 1.25 lender minimum.",
};

export function calculateDscr(input: DscrInput): CalcResult<DscrResult> {
  const noiRaw = resolveNoi(input);
  if (noiRaw === null) {
    return fail("Enter net operating income, or revenue and operating expenses.");
  }
  const noi = fromCents(toCents(noiRaw));

  const targetRaw = input.targetDscr ?? 1.25;
  if (!Number.isFinite(targetRaw) || targetRaw <= 0 || targetRaw > 10) {
    return fail("Enter a target DSCR greater than zero and up to 10.");
  }
  const targetDscr = roundTo(targetRaw, 2);

  let annualDebtService: number;
  let debtFromLoan = false;
  let excludesBalloon = false;

  if (input.annualDebtService !== undefined) {
    if (!Number.isFinite(input.annualDebtService) || input.annualDebtService < 0) {
      return fail("Enter annual debt service of zero or more.");
    }
    annualDebtService = fromCents(toCents(input.annualDebtService));
  } else if (input.loan) {
    const loan = calculateLoan(input.loan);
    if (!loan.ok) return loan;
    const periods = Math.min(12, loan.termMonths);
    annualDebtService = fromCents(toCents(loan.monthlyPayment) * periods);
    debtFromLoan = true;
    excludesBalloon = loan.balloon > 0;
  } else {
    return fail("Enter annual debt service, or a loan amount, rate, and term.");
  }

  const maxDebtService = noi > 0 ? fromCents(Math.round(toCents(noi) / targetDscr)) : 0;
  const targetLabel = targetDscr.toFixed(2);
  const support = `At a target of ${targetLabel}, this cash flow supports up to ${formatUsd(maxDebtService)} in annual debt service.`;
  const balloonNote = excludesBalloon
    ? " Annual debt service here is the monthly payment over a year and leaves out the balloon."
    : "";

  if (annualDebtService === 0) {
    return {
      ok: true,
      noi,
      annualDebtService,
      dscr: null,
      dscrLabel: "—",
      band: "no-debt",
      maxDebtService,
      targetDscr,
      debtFromLoan,
      excludesBalloon,
      summary: `There is no debt service to compare, so a DSCR isn't meaningful. ${support}${balloonNote}`,
    };
  }

  const dscr = roundTo(noi / annualDebtService, 2);
  const band = bandForShown(dscr);
  return {
    ok: true,
    noi,
    annualDebtService,
    dscr,
    dscrLabel: dscr.toFixed(2),
    band,
    maxDebtService,
    targetDscr,
    debtFromLoan,
    excludesBalloon,
    summary: `Your DSCR is ${dscr.toFixed(2)}. ${BAND_SENTENCE[band]} ${support}${balloonNote}`,
  };
}

function formatCount(value: number): string {
  const rounded = roundTo(value, 2);
  if (Math.abs(rounded - Math.round(rounded)) < 1e-9) return String(Math.round(rounded));
  return rounded.toFixed(2);
}

function formatRatio(ratio: number): string {
  const pct = roundTo(ratio * 100, 1);
  return Number.isInteger(pct) ? `${pct.toFixed(0)}%` : `${pct.toFixed(1)}%`;
}

function wholeUnits(units: number): number {
  const rounded = roundTo(units, 2);
  return Math.ceil(rounded - 1e-9);
}

export function calculateBreakEven(input: BreakEvenInput): CalcResult<BreakEvenResult> {
  if (!Number.isFinite(input.fixedCosts) || input.fixedCosts < 0) {
    return fail("Enter fixed costs of zero or more.");
  }
  if (!Number.isFinite(input.pricePerUnit) || input.pricePerUnit <= 0) {
    return fail("Enter a price per unit greater than zero.");
  }
  if (!Number.isFinite(input.variableCostPerUnit) || input.variableCostPerUnit < 0) {
    return fail("Enter a variable cost per unit of zero or more.");
  }
  const targetRaw = input.targetProfit ?? 0;
  if (!Number.isFinite(targetRaw) || targetRaw < 0) {
    return fail("Enter a target profit of zero or more, or leave it blank.");
  }

  const fixedCosts = fromCents(toCents(input.fixedCosts));
  const price = fromCents(toCents(input.pricePerUnit));
  const variable = fromCents(toCents(input.variableCostPerUnit));
  const targetProfit = fromCents(toCents(targetRaw));
  const contributionMargin = fromCents(toCents(price) - toCents(variable));

  if (contributionMargin <= 0) {
    return {
      ok: true,
      contributionMargin,
      contributionMarginRatio: 0,
      breakEvenUnits: 0,
      breakEvenRevenue: 0,
      wholeUnits: 0,
      targetUnits: null,
      targetRevenue: null,
      targetWholeUnits: null,
      summary:
        "There is no break-even at this price. Variable cost per unit is not below the price, so each sale doesn't help cover fixed costs.",
    };
  }

  const contributionMarginRatio = contributionMargin / price;
  const breakEvenUnits = fixedCosts / contributionMargin;
  const breakEvenRevenue = fromCents(Math.round(breakEvenUnits * toCents(price)));
  const unitsLabel = formatCount(breakEvenUnits);
  const whole = wholeUnits(breakEvenUnits);
  const wholeNote =
    whole !== Number(unitsLabel) ? ` Rounded up, that's ${whole} whole units.` : "";

  let targetUnits: number | null = null;
  let targetRevenue: number | null = null;
  let targetWholeUnits: number | null = null;
  let targetSentence = "";
  if (targetProfit > 0) {
    targetUnits = (fixedCosts + targetProfit) / contributionMargin;
    targetRevenue = fromCents(Math.round(targetUnits * toCents(price)));
    targetWholeUnits = wholeUnits(targetUnits);
    targetSentence = ` To also clear ${formatUsd(targetProfit)} in profit, you'd sell ${formatCount(targetUnits)} units (${formatUsd(targetRevenue)} in revenue).`;
  }

  return {
    ok: true,
    contributionMargin,
    contributionMarginRatio,
    breakEvenUnits,
    breakEvenRevenue,
    wholeUnits: whole,
    targetUnits,
    targetRevenue,
    targetWholeUnits,
    summary: `You break even at ${unitsLabel} units, or ${formatUsd(breakEvenRevenue)} in revenue. Each unit contributes ${formatUsd(contributionMargin)} (${formatRatio(contributionMarginRatio)} of the price) toward fixed costs.${wholeNote}${targetSentence}`,
  };
}

export function evaluateSba(
  answers: Readonly<Record<string, string | undefined>>,
  questions: readonly SbaQuestion[],
): SbaEvaluation {
  const pass: string[] = [];
  const soft: string[] = [];
  const failed: string[] = [];
  let incomplete = false;

  for (const question of questions) {
    const choice = question.choices.find((item) => item.value === answers[question.id]);
    if (!choice) {
      incomplete = true;
      continue;
    }
    if (choice.effect === "fail") failed.push(choice.reason);
    else if (choice.effect === "soft") soft.push(choice.reason);
    else pass.push(choice.reason);
  }

  if (incomplete) {
    return {
      verdict: "incomplete",
      headline: "Answer each question",
      summary:
        "Answer every question for a plain-English read. This check is educational, not a lending decision.",
      reasons: [],
    };
  }

  if (failed.length > 0) {
    return {
      verdict: "likely-not-eligible",
      headline: "Likely not eligible",
      summary: `Likely not eligible. ${failed.join(" ")}`,
      reasons: failed,
    };
  }

  if (soft.length > 0) {
    return {
      verdict: "check-with-lender",
      headline: "Check with a lender",
      summary: `Check with a lender. ${soft.join(" ")}`,
      reasons: soft,
    };
  }

  return {
    verdict: "likely-eligible",
    headline: "Likely eligible",
    summary:
      "Likely eligible. These answers don't show an obvious stop, and a lender still has to underwrite the request.",
    reasons: pass,
  };
}
