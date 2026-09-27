/**
 * PLACEHOLDER SBA 7(a) / 504 quick-check.
 * Replace this list with the final spec. The evaluator in `src/lib/banking/calc.ts`
 * only reads `effect` on the selected choice: pass, soft, or fail.
 *
 * Draft effects (guesses, not a lending policy):
 * - Hard stops: not for-profit, not US-based, misses size standard, ineligible
 *   business type, can get credit elsewhere, ineligible use of proceeds,
 *   delinquent federal debt or a character bar.
 * - Soft (check with a lender): "not sure" on any question, and "no" on owner
 *   equity, because injection rules vary by program.
 */

export type SbaEffect = "pass" | "soft" | "fail";
export type SbaChoiceValue = "yes" | "no" | "unsure";

export interface SbaChoice {
  value: SbaChoiceValue;
  label: string;
  effect: SbaEffect;
  reason: string;
}

export interface SbaQuestion {
  id: string;
  prompt: string;
  detail: string;
  choices: SbaChoice[];
}

const yesNoUnsure = (
  pass: SbaChoiceValue,
  reasons: { pass: string; fail: string; unsure: string },
): SbaChoice[] => {
  const effectFor = (value: SbaChoiceValue): SbaEffect => {
    if (value === "unsure") return "soft";
    return value === pass ? "pass" : "fail";
  };
  const reasonFor = (value: SbaChoiceValue): string => {
    if (value === "unsure") return reasons.unsure;
    return value === pass ? reasons.pass : reasons.fail;
  };
  return (["yes", "no", "unsure"] as const).map((value) => ({
    value,
    label: value === "yes" ? "Yes" : value === "no" ? "No" : "Not sure",
    effect: effectFor(value),
    reason: reasonFor(value),
  }));
};

export const SBA_RULES_NOTE =
  "Placeholder questions. Final SBA rules will replace this list. This is not a lending decision.";

export const SBA_QUESTIONS: SbaQuestion[] = [
  {
    id: "for-profit",
    prompt: "Is the business for-profit?",
    detail: "SBA 7(a) and 504 financing is aimed at for-profit companies.",
    choices: yesNoUnsure("yes", {
      pass: "The business is for-profit.",
      fail: "The business is not for-profit. These SBA programs are for for-profit businesses.",
      unsure: "For-profit status is unclear. A lender has to confirm how the business is organized.",
    }),
  },
  {
    id: "us-based",
    prompt: "Does the business operate in the United States?",
    detail: "The company should be located in and operating in the U.S. or its territories.",
    choices: yesNoUnsure("yes", {
      pass: "The business operates in the United States.",
      fail: "The business does not operate in the United States. SBA programs require a U.S. operating business.",
      unsure: "The U.S. operating footprint is unclear. A lender has to confirm where the business operates.",
    }),
  },
  {
    id: "size-standard",
    prompt: "Does the business meet the SBA size standard for its industry, including affiliates?",
    detail: "Size standards differ by industry and count affiliates. This draft does not look up NAICS tables.",
    choices: yesNoUnsure("yes", {
      pass: "The business meets the SBA size standard, including affiliates.",
      fail: "The business does not meet the SBA size standard. That is a common bar to 7(a) and 504.",
      unsure: "Size-standard status is unclear. A lender compares the business and its affiliates with the current table.",
    }),
  },
  {
    id: "owner-equity",
    prompt: "Have the owners put their own money into the business?",
    detail: "Many files need an equity injection. How much depends on the program, so a no here is a lender question, not an automatic stop in this draft.",
    choices: [
      {
        value: "yes",
        label: "Yes",
        effect: "pass",
        reason: "Owners have invested their own equity.",
      },
      {
        value: "no",
        label: "No",
        effect: "soft",
        reason:
          "Owners have not invested their own equity. Many SBA files need an injection, and the amount depends on the program.",
      },
      {
        value: "unsure",
        label: "Not sure",
        effect: "soft",
        reason: "Owner equity is unclear. A lender will ask what the owners have already put in.",
      },
    ],
  },
  {
    id: "ineligible-type",
    prompt:
      "Is the business an ineligible type, such as lending, speculation, gambling, pyramid sales, or a business that only holds investments?",
    detail: "Some activities are outside SBA 7(a) and 504 even when the company is otherwise healthy.",
    choices: yesNoUnsure("no", {
      pass: "The business is not one of the ineligible types in this draft list.",
      fail: "The business type is on the draft ineligible list. Those activities are generally outside SBA 7(a) and 504.",
      unsure: "The business type needs a closer look. A lender checks it against the current ineligible-activity rules.",
    }),
  },
  {
    id: "credit-elsewhere",
    prompt: "Is the business unable to get this credit on reasonable terms from a non-SBA lender?",
    detail: "SBA programs are for borrowers who cannot get the credit they need elsewhere on reasonable terms.",
    choices: yesNoUnsure("yes", {
      pass: "The business cannot get this credit on reasonable terms elsewhere.",
      fail: "The business can get this credit elsewhere on reasonable terms. SBA programs are for borrowers who cannot.",
      unsure: "Credit available elsewhere is unclear. A lender documents the credit-elsewhere test.",
    }),
  },
  {
    id: "use-of-proceeds",
    prompt:
      "Will the money be used for a business purpose such as working capital, equipment, furniture, real estate, or an eligible refinance?",
    detail: "Speculation, investment in other securities, and other non-business uses generally do not qualify.",
    choices: yesNoUnsure("yes", {
      pass: "The funds are for an eligible business purpose on this draft list.",
      fail: "The use of proceeds is not an eligible business purpose on this draft list.",
      unsure: "Use of proceeds is unclear. A lender has to match the request to eligible uses.",
    }),
  },
  {
    id: "owner-character",
    prompt:
      "Are all owners current on federal debt, including taxes, and free of character issues that would bar an SBA loan?",
    detail: "Delinquent federal debt and certain character issues can block a file until they are resolved.",
    choices: yesNoUnsure("yes", {
      pass: "Owners report they are current on federal debt and have no character bar.",
      fail: "An owner has delinquent federal debt or a character issue that can bar an SBA loan until it is resolved.",
      unsure: "Federal debt or character history is unclear. A lender runs those checks before a decision.",
    }),
  },
];
