/** Navigable banking tools. Placeholder blurbs until the content pass. */

export interface BankingTool {
  title: string;
  path: string;
  description: string;
  kind: "calculator" | "templates";
}

export const BANKING_CALCULATORS: readonly BankingTool[] = [
  {
    title: "Loan calculator",
    path: "/banking/loan-calculator/",
    description: "Monthly payment, total interest, and an amortization schedule you can download.",
    kind: "calculator",
  },
  {
    title: "DSCR calculator",
    path: "/banking/dscr-calculator/",
    description: "Debt service coverage, a plain-English read, and the debt service a target ratio can support.",
    kind: "calculator",
  },
  {
    title: "SBA eligibility",
    path: "/banking/sba-eligibility/",
    description: "A short yes/no check for SBA 7(a) and 504. Draft rules, not a lending decision.",
    kind: "calculator",
  },
  {
    title: "Break-even calculator",
    path: "/banking/break-even-calculator/",
    description: "Units and revenue to cover fixed costs, plus an optional profit target.",
    kind: "calculator",
  },
];

export const BANKING_TEMPLATES_PATH = "/banking/templates/";
