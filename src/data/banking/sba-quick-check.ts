import type { QuickQuestionRule, SbaAnswer } from "../../lib/banking/calc";

export interface SbaChoice {
  value: SbaAnswer;
  label: string;
}

export interface SbaQuestion extends QuickQuestionRule {
  prompt: string;
  helper: string;
  sourceLabel: string;
  sourceHref: string;
  extraList?: readonly string[];
}

const CHOICES: SbaChoice[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unsure", label: "Not sure" },
];

export const SBA_CHOICES = CHOICES;

const PART_120 = "https://www.ecfr.gov/current/title-13/chapter-I/part-120";
const SBA_7A = "https://www.sba.gov/funding-programs/loans/7a-loans";

export const SBA_QUESTIONS: readonly SbaQuestion[] = [
  {
    key: "forProfit",
    prompt: "Is the business organized to make a profit?",
    helper: "Nonprofits are not eligible; for-profit subsidiaries of nonprofits can be.",
    issueIf: "no",
    issue: "SBA business loans are for for-profit businesses.",
    shortName: "for-profit status",
    sourceLabel: "13 CFR 120.100(b), 120.110(a)",
    sourceHref: PART_120,
  },
  {
    key: "operating",
    prompt: "Is it an operating business (or will it be, once you buy or start it)?",
    helper:
      "A company that only owns property can sometimes qualify if it leases to an operating business it is tied to. Ask a lender.",
    issueIf: "no",
    issue:
      "SBA loans generally go to operating businesses (with a limited exception for certain real estate holding companies that lease to an operating business).",
    shortName: "whether it is an operating business",
    sourceLabel: "13 CFR 120.100(a), 120.111",
    sourceHref: PART_120,
  },
  {
    key: "usLocated",
    prompt: "Is the business located in the United States?",
    helper: "",
    issueIf: "no",
    issue: "The business needs to be located in the U.S.",
    shortName: "U.S. location",
    sourceLabel: "13 CFR 120.100(c); sba.gov 7(a) page",
    sourceHref: SBA_7A,
  },
  {
    key: "small",
    prompt:
      'Is the business "small" under SBA\'s size standard for your industry, counting affiliated businesses?',
    helper: "",
    issueIf: "no",
    issue: "The business (with affiliates) may be over SBA's size standard for its industry.",
    shortName: "size standard",
    sourceLabel: "13 CFR 120.100(d); SBA size standards page",
    sourceHref: "https://www.sba.gov/size-standards/",
  },
  {
    key: "ineligibleType",
    prompt: "Is the business mainly any of these?",
    helper: "",
    issueIf: "yes",
    issue: "The type of business may be on SBA's list of ineligible businesses.",
    shortName: "business type",
    sourceLabel: "13 CFR 120.110",
    sourceHref: "https://www.ecfr.gov/current/title-13/chapter-I/part-120/subpart-A/section-120.110",
    extraList: [
      "Lending or financing businesses (banks, finance companies, factors). Some pawn shops may qualify.",
      "Passive businesses owned by developers or landlords that do not use or occupy the property (with an exception for certain Eligible Passive Companies)",
      "Life insurance companies",
      "Businesses located in a foreign country",
      "Pyramid sale distribution plans",
      "Businesses earning more than one-third of gross annual revenue from legal gambling",
      "Businesses engaged in any activity that is illegal under federal, state, or local law",
      "Private clubs that limit membership for reasons other than capacity",
      "Government-owned entities (except businesses owned or controlled by a Native American tribe)",
      "Loan packagers earning more than one-third of revenue from packaging SBA loans",
      "Businesses in which the lender or CDC (or its associates) owns an equity interest",
      "Businesses presenting live performances of a prurient sexual nature or earning more than de minimis revenue from such material",
      "Businesses primarily engaged in political or lobbying activities",
      "Speculative businesses (such as oil wildcatting)",
    ],
  },
  {
    key: "priorLoss",
    prompt:
      "Has the business, an owner, or a business an owner previously controlled ever defaulted on a federal loan or federally backed loan that caused the government a loss?",
    helper: "Includes settled (compromised) debts. SBA can waive this for good cause.",
    issueIf: "yes",
    issue:
      "A prior default that caused a loss to the federal government can make a business ineligible unless SBA grants a waiver.",
    shortName: "prior federal loan loss",
    sourceLabel: "13 CFR 120.110(q)",
    sourceHref: PART_120,
  },
  {
    key: "associateLegal",
    prompt:
      "Is any owner or key person currently incarcerated, or under indictment for a felony or a crime involving financial misconduct or a false statement?",
    helper: "",
    issueIf: "yes",
    issue:
      "SBA rules restrict loans where an owner or key person is currently incarcerated or under indictment for certain crimes.",
    shortName: "legal status of an owner or key person",
    sourceLabel: "13 CFR 120.110(n)",
    sourceHref: PART_120,
  },
  {
    key: "citizenship",
    prompt:
      "Are all owners (direct and indirect) U.S. citizens or U.S. nationals whose principal residence is in the U.S.?",
    helper: "SBA revised these rules effective March 1, 2026. Confirm with a lender.",
    issueIf: "no",
    issue: "SBA's current ownership citizenship and residency rules may be an issue.",
    shortName: "citizenship and residency",
    sourceLabel: "SBA Procedural Notice 5000-876626",
    sourceHref:
      "https://www.sba.gov/document/procedural-notice-5000-876626-revised-applicant-ownership-citizenship-residency-requirements-7a-504-loans",
  },
  {
    key: "equity",
    prompt: "Will the owners put their own money into the project?",
    helper:
      "SBA sets equity rules for some loans (for example, startups and business purchases). For 504 projects, SBA describes at least 10% from the borrower.",
    issueIf: "no",
    issue: "Lenders and SBA generally expect owners to put their own money into the project.",
    shortName: "owner money in the project",
    sourceLabel: "SOP 50 10; sba.gov lender program page",
    sourceHref: "https://www.sba.gov/document/sop-50-10-lender-development-company-loan-programs",
  },
  {
    key: "creditElsewhere",
    prompt: "Could you get this same loan on reasonable terms from a lender without an SBA guarantee?",
    helper: "SBA loans are meant for credit that is not otherwise available on reasonable terms.",
    issueIf: "yes",
    issue:
      "SBA loans are for credit that is not available on reasonable terms without the SBA guarantee. A conventional loan may be the better fit.",
    shortName: "credit available without an SBA guarantee",
    sourceLabel: "13 CFR 120.101; sba.gov 7(a) page",
    sourceHref: SBA_7A,
  },
  {
    key: "taxesCurrent",
    prompt: "Is the business current on federal taxes and any government loans?",
    helper: "",
    issueIf: "no",
    issue:
      "Past-due taxes or government debt usually need to be resolved, and SBA loan proceeds cannot pay past-due trust fund taxes.",
    shortName: "federal taxes and government loans",
    sourceLabel: "13 CFR 120.130(e); 13 CFR 120.150",
    sourceHref: PART_120,
  },
  {
    key: "useOfProceeds",
    prompt:
      "Will the money be used for the business itself (not to buy property to hold for investment, and not to pay owners beyond normal pay except in an approved ownership change)?",
    helper: "",
    issueIf: "no",
    issue: "Some uses of loan money are not allowed under SBA rules.",
    shortName: "use of the money",
    sourceLabel: "13 CFR 120.130",
    sourceHref: "https://www.ecfr.gov/current/title-13/chapter-I/part-120/subpart-A/section-120.130",
  },
  {
    key: "repayment",
    prompt: "Can the business's cash flow reasonably cover the new payments?",
    helper: "",
    issueIf: "no",
    issue: "Lenders need to see a reasonable ability to repay, usually from business cash flow.",
    shortName: "repayment ability",
    sourceLabel: 'sba.gov 7(a) page ("creditworthy and demonstrate a reasonable ability to repay"); 13 CFR 120.150',
    sourceHref: SBA_7A,
  },
];

export const SBA_FIT_ANSWERS: Record<string, SbaAnswer> = {
  forProfit: "yes",
  operating: "yes",
  usLocated: "yes",
  small: "yes",
  ineligibleType: "no",
  priorLoss: "no",
  associateLegal: "no",
  citizenship: "yes",
  equity: "yes",
  creditElsewhere: "no",
  taxesCurrent: "yes",
  useOfProceeds: "yes",
  repayment: "yes",
};
