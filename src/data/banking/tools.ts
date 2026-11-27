/** Banking destinations. Blurbs are verbatim from content/tools.md. */

export interface BankingTool {
  title: string;
  path: string;
  description: string;
}

export const LOAN_PATH = "/banking/calculators/loan-payment/";
export const DSCR_PATH = "/banking/calculators/dscr/";
export const BREAK_EVEN_PATH = "/banking/calculators/break-even/";
export const SBA_PATH = "/banking/calculators/sba-quick-check/";
export const TEMPLATES_PATH = "/banking/templates/";
export const SBA_GUIDE_PATH = "/banking/guides/sba-7a-504/";
export const PFS_GUIDE_PATH = "/banking/guides/personal-financial-statement/";
export const DISCLAIMER_PATH = "/banking/disclaimer/";

export const BANKING_CALCULATORS: readonly BankingTool[] = [
  {
    title: "Loan payment calculator",
    path: LOAN_PATH,
    description:
      "See your estimated monthly payment, total interest, and any balloon payment, with a month-by-month schedule.",
  },
  {
    title: "DSCR calculator",
    path: DSCR_PATH,
    description: "Check whether your business's cash flow covers its loan payments, and by how much.",
  },
  {
    title: "Break-even calculator",
    path: BREAK_EVEN_PATH,
    description: "Find how many sales you need each month to cover your costs, or to hit a profit goal.",
  },
  {
    title: "SBA quick-check",
    path: SBA_PATH,
    description:
      "Answer a few yes-or-no questions to spot possible issues with SBA's basic rules before you talk to a lender.",
  },
];

export function relatedCalculators(path: string): readonly BankingTool[] {
  return BANKING_CALCULATORS.filter((tool) => tool.path !== path);
}
