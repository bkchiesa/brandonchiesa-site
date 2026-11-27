import { describe, expect, it } from "vitest";
import { SBA_FIT_ANSWERS, SBA_QUESTIONS } from "../../data/banking/sba-quick-check";
import {
  MSG,
  SBA_RULES_NOTE,
  breakEven,
  breakEvenSummary,
  cfadsFromParts,
  dscr,
  dscrSummary,
  formatPercent,
  formatUsd,
  loanCalc,
  loanSummary,
  proposedAnnualFromLoan,
  quickCheck,
  validateLoan,
  type SbaAnswer,
} from "./calc";

function fit(overrides: Partial<Record<string, SbaAnswer>> = {}): Record<string, SbaAnswer> {
  return { ...SBA_FIT_ANSWERS, ...overrides };
}

describe("specs.md loan cases", () => {
  it("L1 fully amortizing example loan", () => {
    const loan = loanCalc({ principal: 250_000, annualRatePct: 7.5, n: 120 });
    expect(loan.ok).toBe(true);
    if (!loan.ok) return;
    expect(loan.payment).toBe(2967.54);
    expect(loan.balloon).toBe(0);
    expect(loan.rows[0]).toMatchObject({
      begin: 250000,
      payment: 2967.54,
      interest: 1562.5,
      principal: 1405.04,
      end: 248594.96,
    });
    expect(loan.rows[119]).toMatchObject({
      begin: 2949.78,
      payment: 2968.22,
      interest: 18.44,
      principal: 2949.78,
      end: 0,
    });
    expect(loan.totalInterest).toBe(106105.48);
    expect(loan.totalPaid).toBe(356105.48);
    expect(loanSummary({ ...loan, n: 120, annualRatePct: 7.5 })).toBe(
      "Estimated monthly payment: $2,967.54. Over 120 months you would pay about $106,105.48 in interest, $356,105.48 in total.",
    );
  });

  it("L2 zero interest", () => {
    const loan = loanCalc({ principal: 60_000, annualRatePct: 0, n: 60 });
    expect(loan.ok).toBe(true);
    if (!loan.ok) return;
    expect(loan.payment).toBe(1000);
    expect(loan.totalInterest).toBe(0);
    expect(loan.balloon).toBe(0);
    expect(loan.totalPaid).toBe(60000);
    expect(loan.rows.every((row) => row.interest === 0)).toBe(true);
    expect(loanSummary({ ...loan, n: 60, annualRatePct: 0 })).toContain(
      "At 0% interest, your payment is simply the loan amount divided by the number of months.",
    );
  });

  it("L3 balloon with longer amortization", () => {
    const loan = loanCalc({ principal: 500_000, annualRatePct: 7, n: 120, amortMonths: 240 });
    expect(loan.ok).toBe(true);
    if (!loan.ok) return;
    expect(loan.payment).toBe(3876.49);
    expect(loan.balloon).toBe(333869.2);
    expect(loan.totalInterest).toBe(299048);
    expect(loan.rows.at(-1)?.balloon).toBe(true);
    expect(loanSummary({ ...loan, n: 120, annualRatePct: 7 })).toContain(
      "After 120 payments, about $333,869.20 would still be owed (a balloon payment). Many borrowers refinance or pay it off at that point.",
    );
  });

  it("L4 zero principal has a validation message and no result", () => {
    expect(loanCalc({ principal: 0, annualRatePct: 7.5, n: 120 })).toEqual({ ok: false, error: "invalid" });
    expect(
      validateLoan({
        principal: 0,
        annualRatePct: 7.5,
        rateText: "7.50",
        termValue: 120,
        termText: "120",
        termUnit: "months",
        amortText: "",
      }),
    ).toEqual({ ok: false, field: "principal", message: "Enter a loan amount greater than $0." });
  });

  it("L5 amortization shorter than the term", () => {
    expect(loanCalc({ principal: 250_000, annualRatePct: 7.5, n: 120, amortMonths: 60 })).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(
      validateLoan({
        principal: 250_000,
        annualRatePct: 7.5,
        rateText: "7.5",
        termValue: 120,
        termText: "120",
        termUnit: "months",
        amortText: "60",
      }),
    ).toEqual({
      ok: false,
      field: "amort",
      message: "Amortization has to be at least as long as the term.",
    });
  });
});

describe("specs.md DSCR cases", () => {
  it("D1 mode B with the example loan", () => {
    const cfads = cfadsFromParts({
      netIncome: 180_000,
      depreciation: 45_000,
      amortization: 5_000,
      interestExpense: 30_000,
      nonrecurring: 10_000,
      excessOwnerComp: 0,
      ownerDraws: 60_000,
      otherAdj: 0,
    });
    expect(cfads).toBe(210_000);
    const proposed = proposedAnnualFromLoan(250_000, 7.5, 120);
    expect(proposed).toBe(35610.48);
    expect(proposedAnnualFromLoan(500_000, 7, 120, 240)).toBe(46517.88);
    const result = dscr({ cfads, existing: 90_000, proposed: proposed ?? 0 });
    expect(result).toMatchObject({
      tds: 125610.48,
      dscr: 1.67,
      band: "comfortable",
      cushion: 84389.52,
      maxDS125: 168000,
    });
    expect(dscrSummary(result)).toBe(
      "Your estimated DSCR is 1.67x. For every $1.00 of loan payments, the business has about $1.67 of cash flow available. Roughly 1.25x or higher is often viewed as comfortable. Each lender sets its own standard. Cushion after payments: $84,389.52 per year. At a 1.25x ratio, this cash flow would support about $168,000.00 in total annual payments.",
    );
  });

  it("D2 mode A thin coverage", () => {
    const result = dscr({ cfads: 150_000, existing: 90_000, proposed: 35610.48 });
    expect(result).toMatchObject({
      dscr: 1.19,
      band: "thin",
      cushion: 24389.52,
      maxDS125: 120000,
      tds: 125610.48,
    });
    expect(dscrSummary(result)).toContain("Payments are covered, but the cushion is thin. Many lenders look for more room.");
  });

  it("D3 short coverage", () => {
    const result = dscr({ cfads: 80_000, existing: 100_000, proposed: 0 });
    expect(result).toMatchObject({
      dscr: 0.8,
      band: "short",
      cushion: -20000,
      maxDS125: 64000,
      tds: 100000,
    });
    expect(formatUsd(result.cushion ?? 0)).toBe("-$20,000.00");
    expect(dscrSummary(result)).toContain("Below 1.00x means cash flow does not fully cover the payments.");
    expect(dscrSummary(result)).toContain("Your estimated DSCR is 0.80x.");
  });

  it("D4 no debt service", () => {
    const result = dscr({ cfads: 150_000, existing: 0, proposed: 0 });
    expect(result.dscr).toBeNull();
    expect(result.band).toBe("none");
    expect(dscrSummary(result)).toBe("Enter your loan payments to see a result.");
  });
});

describe("specs.md SBA quick-check cases", () => {
  it("uses the October 1, 2026 rules note and does not call a result eligible", () => {
    expect(SBA_RULES_NOTE).toBe(
      "SBA rules change. This quick-check reflects SBA's basic rules as of October 1, 2026. Check SBA.gov or a lender.",
    );
    expect(SBA_RULES_NOTE.toLowerCase()).not.toMatch(/eligible|qualify|takes effect/);
  });

  it("E1 possible fit", () => {
    const result = quickCheck(fit(), SBA_QUESTIONS);
    expect(result.result).toBe("possible_fit");
    expect(result.summary.startsWith("Looks like a possible fit. Talk to a lender.")).toBe(true);
    expect(result.summary.toLowerCase()).not.toMatch(/eligible|qualify/);
  });

  it("E2 for-profit no", () => {
    const result = quickCheck(fit({ forProfit: "no" }), SBA_QUESTIONS);
    expect(result.result).toBe("possible_issue");
    expect(result.summary.startsWith("Possible issue: SBA business loans are for for-profit businesses.")).toBe(true);
    expect(result.issues).toEqual(["SBA business loans are for for-profit businesses."]);
  });

  it("E3 credit elsewhere and an unsure size standard", () => {
    const result = quickCheck(fit({ creditElsewhere: "yes", small: "unsure" }), SBA_QUESTIONS);
    expect(result.result).toBe("possible_issue");
    expect(result.issues).toEqual([
      "SBA loans are for credit that is not available on reasonable terms without the SBA guarantee. A conventional loan may be the better fit.",
    ]);
    expect(result.unsure).toEqual(["size standard"]);
    expect(result.summary).toContain("Also confirm: size standard.");
    expect(result.summary).not.toMatch(/\beligible\b|\bqualify\b/i);
  });

  it("E4 two items to confirm", () => {
    const result = quickCheck(fit({ small: "unsure", repayment: "unsure" }), SBA_QUESTIONS);
    expect(result.result).toBe("possible_fit_confirm");
    expect(result.summary).toBe(
      "Looks like a possible fit, with a few things to confirm. Ask a lender about: size standard and repayment ability.",
    );
    expect(result.summary.toLowerCase()).not.toMatch(/eligible|qualify/);
  });

  it("E5 two possible issues", () => {
    const result = quickCheck(fit({ operating: "no", ineligibleType: "yes" }), SBA_QUESTIONS);
    expect(result.result).toBe("possible_issue");
    expect(result.issues).toEqual([
      "SBA loans generally go to operating businesses (with a limited exception for certain real estate holding companies that lease to an operating business).",
      "The type of business may be on SBA's list of ineligible businesses.",
    ]);
    expect(result.summary).toContain("Possible issue: SBA loans generally go to operating businesses");
    expect(result.summary).toContain("Possible issue: The type of business may be on SBA's list of ineligible businesses.");
    expect(result.summary.replace(/ineligible/gi, "")).not.toMatch(/eligible|qualify/i);
  });
});

describe("specs.md break-even cases", () => {
  it("B1 base case", () => {
    const result = breakEven({ fixedMonthly: 20_000, price: 85, variableCost: 35 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.cm).toBe(50);
    expect(formatPercent(result.cmr)).toBe("58.82%");
    expect(result.beUnits).toBe(400);
    expect(result.beRevenue).toBe(34000);
    expect(
      breakEvenSummary({ unitLabel: "units", targetProfit: 0, fixedMonthly: 20_000, result }),
    ).toBe(
      "After direct costs, $50.00 is left from the price. That is 58.82% of the price. To break even, you need about 400 units a month, or about $34,000.00 in monthly sales.",
    );
  });

  it("B2 profit target", () => {
    const result = breakEven({ fixedMonthly: 20_000, price: 85, variableCost: 35, targetProfit: 5_000 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.targetUnits).toBe(500);
    expect(result.targetRevenue).toBe(42500);
    expect(
      breakEvenSummary({ unitLabel: "units", targetProfit: 5_000, fixedMonthly: 20_000, result }),
    ).toContain("To earn $5,000.00 a month, you need about 500 units, or about $42,500.00 in monthly sales.");
  });

  it("B3 rounds units up and shows the exact value in the math", () => {
    const result = breakEven({ fixedMonthly: 12_500, price: 40, variableCost: 17 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.beUnitsExact).toBeCloseTo(543.47826, 4);
    expect(result.beUnits).toBe(544);
    expect(result.beRevenue).toBe(21739.13);
  });

  it("B4 no contribution margin", () => {
    expect(breakEven({ fixedMonthly: 20_000, price: 30, variableCost: 35 })).toEqual({
      ok: false,
      error: "noMargin",
    });
    expect(MSG.noMargin).toBe(
      "Each sale costs as much or more than it brings in, so there is no break-even point at this price. Raise the price or lower the cost per unit.",
    );
  });

  it("B5 zero fixed costs", () => {
    const result = breakEven({ fixedMonthly: 0, price: 85, variableCost: 35 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.beUnits).toBe(0);
    expect(result.beRevenue).toBe(0);
    expect(breakEvenSummary({ unitLabel: "units", targetProfit: 0, fixedMonthly: 0, result })).toContain(
      "With no fixed costs, every sale above variable cost is profit.",
    );
  });
});
