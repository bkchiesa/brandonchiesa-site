import { describe, expect, it } from "vitest";
import { SBA_QUESTIONS } from "../../data/banking/sba-eligibility";
import type { SbaQuestion } from "../../data/banking/sba-eligibility";
import {
  calculateBreakEven,
  calculateDscr,
  calculateLoan,
  evaluateSba,
  loanScheduleCsv,
  readAmount,
  type LoanInput,
} from "./calc";

function mustLoan(input: LoanInput) {
  const result = calculateLoan(input);
  if (!result.ok) throw new Error(result.error);
  return result;
}

describe("readAmount", () => {
  it("parses currency and percent text", () => {
    expect(readAmount("200,000")).toBe(200000);
    expect(readAmount("$1,932.56")).toBe(1932.56);
    expect(readAmount(" 6.5% ")).toBe(6.5);
    expect(readAmount("")).toBeNull();
    expect(readAmount("abc")).toBeNull();
  });
});

describe("calculateLoan", () => {
  it("matches the standard $100,000 / 6% / 30-year payment", () => {
    const result = mustLoan({
      principal: 100_000,
      annualRatePercent: 6,
      termCount: 30,
      termUnit: "years",
    });
    expect(result.monthlyPayment).toBe(599.55);
    expect(result.termMonths).toBe(360);
    expect(result.schedule).toHaveLength(360);
    expect(result.totalInterest).toBe(115838.45);
    expect(result.totalPaid).toBe(215838.45);
    expect(result.schedule.at(-1)?.balance).toBe(0);
    expect(result.summary).toBe(
      "Your monthly payment is $599.55. Over 30 years you'd pay $115,838.45 in interest. In total you'd pay $215,838.45.",
    );
  });

  it("states a 10-year loan in plain English", () => {
    const result = mustLoan({
      principal: 200_000,
      annualRatePercent: 6,
      termCount: 10,
      termUnit: "years",
    });
    expect(result.monthlyPayment).toBe(2220.41);
    expect(result.totalInterest).toBe(66449.21);
    expect(result.totalPaid).toBe(266449.21);
    expect(result.years).toHaveLength(10);
    expect(result.years[9]?.balance).toBe(0);
    expect(result.summary).toContain("Your monthly payment is $2,220.41.");
    expect(result.summary).toContain("Over 10 years you'd pay $66,449.21 in interest.");
  });

  it("keeps principal, interest, and payments in balance", () => {
    const cases: LoanInput[] = [
      { principal: 250_000, annualRatePercent: 7.25, termCount: 15, termUnit: "years" },
      { principal: 18_500, annualRatePercent: 0, termCount: 18, termUnit: "months" },
      { principal: 80_000, annualRatePercent: 5.5, termCount: 7, termUnit: "years", balloon: 20_000 },
    ];
    for (const input of cases) {
      const result = mustLoan(input);
      const principalPaid = result.schedule.reduce((sum, row) => sum + Math.round(row.principal * 100), 0);
      const interestPaid = result.schedule.reduce((sum, row) => sum + Math.round(row.interest * 100), 0);
      const payments = result.schedule.reduce((sum, row) => sum + Math.round(row.payment * 100), 0);
      expect(principalPaid).toBe(Math.round(input.principal * 100));
      expect(interestPaid).toBe(Math.round(result.totalInterest * 100));
      expect(payments).toBe(Math.round(result.totalPaid * 100));
      expect(result.schedule.at(-1)?.balance).toBe(0);
    }
  });

  it("charges no interest when the rate is zero", () => {
    const result = mustLoan({
      principal: 12_000,
      annualRatePercent: 0,
      termCount: 1,
      termUnit: "years",
    });
    expect(result.monthlyPayment).toBe(1000);
    expect(result.totalInterest).toBe(0);
    expect(result.totalPaid).toBe(12_000);
    expect(result.summary).toContain("Over 1 year you'd pay $0.00 in interest.");
  });

  it("treats a balloon equal to principal as interest-only, then a payoff", () => {
    const result = mustLoan({
      principal: 100_000,
      annualRatePercent: 6,
      termCount: 12,
      termUnit: "months",
      balloon: 100_000,
    });
    expect(result.monthlyPayment).toBe(500);
    expect(result.schedule).toHaveLength(13);
    expect(result.schedule[0]?.principal).toBe(0);
    expect(result.schedule.at(-1)).toMatchObject({ label: "Balloon", payment: 100_000, balance: 0 });
    expect(result.totalInterest).toBe(6000);
    expect(result.totalPaid).toBe(106_000);
    expect(result.years).toHaveLength(1);
    expect(result.years[0]?.balance).toBe(0);
    expect(result.summary).toContain("A $100,000.00 balloon is due at the end.");
    expect(result.summary).toContain("Over 12 months you'd pay $6,000.00 in interest.");
  });

  it("rejects a balloon larger than the loan and a term past 50 years", () => {
    expect(
      calculateLoan({
        principal: 10_000,
        annualRatePercent: 5,
        termCount: 5,
        termUnit: "years",
        balloon: 10_001,
      }).ok,
    ).toBe(false);
    expect(
      calculateLoan({
        principal: 10_000,
        annualRatePercent: 5,
        termCount: 601,
        termUnit: "months",
      }).ok,
    ).toBe(false);
  });

  it("writes a CSV schedule with a balloon row", () => {
    const result = mustLoan({
      principal: 100_000,
      annualRatePercent: 6,
      termCount: 1,
      termUnit: "years",
      balloon: 100_000,
    });
    const csv = loanScheduleCsv(result.schedule);
    expect(csv.startsWith("Period,Payment,Interest,Principal,Ending Balance\n")).toBe(true);
    expect(csv).toContain("\n1,500.00,500.00,0.00,100000.00");
    expect(csv.endsWith("\nBalloon,100000.00,0.00,100000.00,0.00")).toBe(true);
  });
});

describe("calculateDscr", () => {
  it("reads 1.25 against the common thresholds and the max debt service", () => {
    const result = calculateDscr({ noi: 150_000, annualDebtService: 120_000, targetDscr: 1.25 });
    if (!result.ok) throw new Error(result.error);
    expect(result.dscr).toBe(1.25);
    expect(result.band).toBe("meets-1-25");
    expect(result.maxDebtService).toBe(120_000);
    expect(result.summary).toContain("Your DSCR is 1.25.");
    expect(result.summary).toContain("meets a common 1.25 lender minimum");
    expect(result.summary).toContain("supports up to $120,000.00");
  });

  it("classifies 1.00, 1.20, and coverage below 1.00", () => {
    const atOne = calculateDscr({ noi: 100_000, annualDebtService: 100_000 });
    const atTwenty = calculateDscr({ noi: 120_000, annualDebtService: 100_000 });
    const thin = calculateDscr({ noi: 110_000, annualDebtService: 100_000 });
    const below = calculateDscr({ noi: 90_000, annualDebtService: 100_000 });
    if (!atOne.ok || !atTwenty.ok || !thin.ok || !below.ok) throw new Error("expected ok");
    expect(atOne.band).toBe("covers-thin");
    expect(thin.band).toBe("covers-thin");
    expect(atTwenty.band).toBe("meets-1-20");
    expect(below.band).toBe("below-1");
    expect(below.summary).toContain("does not cover the debt service");
  });

  it("derives annual debt service from the loan module and leaves the balloon out", () => {
    const loan = mustLoan({
      principal: 100_000,
      annualRatePercent: 6,
      termCount: 30,
      termUnit: "years",
    });
    const result = calculateDscr({
      noi: 10_000,
      loan: {
        principal: 100_000,
        annualRatePercent: 6,
        termCount: 30,
        termUnit: "years",
      },
    });
    if (!result.ok) throw new Error(result.error);
    expect(result.annualDebtService).toBe(Math.round(loan.monthlyPayment * 12 * 100) / 100);
    expect(result.debtFromLoan).toBe(true);

    const withBalloon = calculateDscr({
      revenue: 80_000,
      operatingExpenses: 20_000,
      loan: {
        principal: 100_000,
        annualRatePercent: 6,
        termCount: 12,
        termUnit: "months",
        balloon: 100_000,
      },
    });
    if (!withBalloon.ok) throw new Error(withBalloon.error);
    expect(withBalloon.noi).toBe(60_000);
    expect(withBalloon.annualDebtService).toBe(6_000);
    expect(withBalloon.excludesBalloon).toBe(true);
    expect(withBalloon.summary).toContain("leaves out the balloon");
  });

  it("does not invent a ratio when debt service is zero", () => {
    const result = calculateDscr({ noi: 50_000, annualDebtService: 0 });
    if (!result.ok) throw new Error(result.error);
    expect(result.dscr).toBeNull();
    expect(result.band).toBe("no-debt");
    expect(result.maxDebtService).toBe(40_000);
    expect(result.summary).toContain("isn't meaningful");
  });
});

describe("calculateBreakEven", () => {
  it("explains units, revenue, and contribution margin", () => {
    const result = calculateBreakEven({
      fixedCosts: 10_000,
      pricePerUnit: 50,
      variableCostPerUnit: 30,
    });
    if (!result.ok) throw new Error(result.error);
    expect(result.contributionMargin).toBe(20);
    expect(result.contributionMarginRatio).toBeCloseTo(0.4);
    expect(result.breakEvenUnits).toBe(500);
    expect(result.breakEvenRevenue).toBe(25_000);
    expect(result.summary).toBe(
      "You break even at 500 units, or $25,000.00 in revenue. Each unit contributes $20.00 (40% of the price) toward fixed costs.",
    );
  });

  it("adds the units needed for a target profit", () => {
    const result = calculateBreakEven({
      fixedCosts: 10_000,
      pricePerUnit: 50,
      variableCostPerUnit: 30,
      targetProfit: 5_000,
    });
    if (!result.ok) throw new Error(result.error);
    expect(result.targetUnits).toBe(750);
    expect(result.targetRevenue).toBe(37_500);
    expect(result.summary).toContain("To also clear $5,000.00 in profit, you'd sell 750 units ($37,500.00 in revenue).");
  });

  it("rounds a fractional break-even up to whole units in the sentence", () => {
    const result = calculateBreakEven({
      fixedCosts: 1_000,
      pricePerUnit: 25,
      variableCostPerUnit: 10,
    });
    if (!result.ok) throw new Error(result.error);
    expect(result.summary).toContain("You break even at 66.67 units, or $1,666.67 in revenue.");
    expect(result.summary).toContain("Rounded up, that's 67 whole units.");
  });

  it("says there is no break-even when price does not cover variable cost", () => {
    const result = calculateBreakEven({
      fixedCosts: 10_000,
      pricePerUnit: 20,
      variableCostPerUnit: 20,
    });
    if (!result.ok) throw new Error(result.error);
    expect(result.summary).toContain("There is no break-even at this price.");
  });
});

describe("evaluateSba", () => {
  const fixture: SbaQuestion[] = [
    {
      id: "profit",
      prompt: "For profit?",
      detail: "",
      choices: [
        { value: "yes", label: "Yes", effect: "pass", reason: "For-profit." },
        { value: "no", label: "No", effect: "fail", reason: "Not for-profit." },
        { value: "unsure", label: "Not sure", effect: "soft", reason: "Profit status is unclear." },
      ],
    },
  ];

  it("follows pass, soft, and fail effects on a fixture", () => {
    expect(evaluateSba({ profit: "yes" }, fixture).verdict).toBe("likely-eligible");
    expect(evaluateSba({ profit: "unsure" }, fixture)).toMatchObject({
      verdict: "check-with-lender",
      headline: "Check with a lender",
    });
    const failed = evaluateSba({ profit: "no" }, fixture);
    expect(failed.verdict).toBe("likely-not-eligible");
    expect(failed.reasons).toEqual(["Not for-profit."]);
    expect(evaluateSba({}, fixture).verdict).toBe("incomplete");
  });

  it("marks the draft questionnaire eligible only when every live rule passes", () => {
    const passing = Object.fromEntries(
      SBA_QUESTIONS.map((question) => {
        const choice = question.choices.find((item) => item.effect === "pass");
        if (!choice) throw new Error(`missing pass choice for ${question.id}`);
        return [question.id, choice.value];
      }),
    );
    const eligible = evaluateSba(passing, SBA_QUESTIONS);
    expect(eligible.verdict).toBe("likely-eligible");
    expect(eligible.headline).toBe("Likely eligible");
    expect(eligible.reasons.length).toBe(SBA_QUESTIONS.length);

    const withSoft = { ...passing, "owner-equity": "no" };
    expect(evaluateSba(withSoft, SBA_QUESTIONS).verdict).toBe("check-with-lender");

    const withFail = { ...passing, "for-profit": "no" };
    const notEligible = evaluateSba(withFail, SBA_QUESTIONS);
    expect(notEligible.verdict).toBe("likely-not-eligible");
    expect(notEligible.summary).toContain("not for-profit");
  });
});
