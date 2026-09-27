/** Published downloads. File bytes are measured at build time. */

export interface BankingDownload {
  href: string;
  typeLabel: "PDF" | "XLSX";
  /** PDF opens in a new tab. Spreadsheets download. */
  open: "preview" | "download";
}

export interface BankingCard {
  id: string;
  title: string;
  description: string;
  /** Guide page, when the card is also an HTML summary. */
  page?: string;
  files: readonly BankingDownload[];
}

export const BANKING_CARDS: readonly BankingCard[] = [
  {
    id: "loan-package-checklist",
    title: "Loan package checklist (PDF, XLSX)",
    description:
      "The documents lenders commonly ask for, organized by loan type, so you can gather them before you apply.",
    files: [
      { href: "downloads/banking/loan-package-checklist.pdf", typeLabel: "PDF", open: "preview" },
      { href: "downloads/banking/loan-package-checklist.xlsx", typeLabel: "XLSX", open: "download" },
    ],
  },
  {
    id: "cash-flow-projection",
    title: "12-month cash flow projection (XLSX)",
    description: "Map out cash coming in and going out each month and spot tight months before they hit.",
    files: [{ href: "downloads/banking/cash-flow-projection-12mo.xlsx", typeLabel: "XLSX", open: "download" }],
  },
  {
    id: "sba-7a-504",
    title: "SBA 7(a) and 504 prep guide (PDF)",
    description: "What each SBA program is for, how they differ, what to gather, and what to ask a lender.",
    page: "/banking/guides/sba-7a-504/",
    files: [{ href: "downloads/banking/sba-7a-504-prep-guide.pdf", typeLabel: "PDF", open: "preview" }],
  },
  {
    id: "dscr-worksheet",
    title: "DSCR worksheet (XLSX)",
    description: "Work out your debt service coverage ratio step by step, with a filled-in example.",
    files: [{ href: "downloads/banking/dscr-worksheet.xlsx", typeLabel: "XLSX", open: "download" }],
  },
  {
    id: "personal-financial-statement",
    title: "Personal financial statement walkthrough (PDF)",
    description:
      "How to fill out a personal financial statement accurately, line by line, and the mistakes to avoid.",
    page: "/banking/guides/personal-financial-statement/",
    files: [
      {
        href: "downloads/banking/personal-financial-statement-walkthrough.pdf",
        typeLabel: "PDF",
        open: "preview",
      },
    ],
  },
  {
    id: "sources-and-uses",
    title: "Sources and uses worksheet (XLSX)",
    description: "Line up every project cost against every source of money, so you know if there is a gap.",
    files: [{ href: "downloads/banking/sources-and-uses-worksheet.xlsx", typeLabel: "XLSX", open: "download" }],
  },
];
