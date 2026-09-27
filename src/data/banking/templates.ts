/** Placeholder downloads. Real files replace these later. Contents must say PLACEHOLDER. */

export interface BankingTemplate {
  title: string;
  description: string;
  /** Path under `public/`, no leading slash. */
  href: string;
  /** Short type label shown on the card. */
  typeLabel: string;
}

export const BANKING_TEMPLATES: readonly BankingTemplate[] = [
  {
    title: "Loan package checklist",
    description: "A starter list of documents lenders often ask for.",
    href: "downloads/banking/loan-package-checklist.pdf",
    typeLabel: "PDF",
  },
  {
    title: "Cash flow projection",
    description: "A blank workbook for a simple cash-flow projection.",
    href: "downloads/banking/cash-flow-projection.xlsx",
    typeLabel: "XLSX",
  },
  {
    title: "SBA loan prep guide",
    description: "A short guide for gathering an SBA 7(a) or 504 file.",
    href: "downloads/banking/sba-loan-prep-guide.pdf",
    typeLabel: "PDF",
  },
  {
    title: "Personal financial statement",
    description: "A blank personal financial statement for owners and guarantors.",
    href: "downloads/banking/personal-financial-statement.pdf",
    typeLabel: "PDF",
  },
  {
    title: "Business debt schedule",
    description: "A blank schedule of notes, lines, and other business debt.",
    href: "downloads/banking/business-debt-schedule.xlsx",
    typeLabel: "XLSX",
  },
];
