/** Verbatim page copy from the Oct 2026 content package, plus short follow-up questions. */

export const BANKING_INTRO =
  "I have spent more than 15 years as a business banker here in Central Virginia, sitting across the table from owners of dental practices, farms, auto shops, contractors, landscapers, and trucking companies. The best conversations always started the same way: the owner knew their numbers and came in organized. This section is meant to help you get there on your own time, with free calculators, checklists, and plain-English guides. No sign-ups and no sales pitch. Use what helps, and bring your questions to your own lender, accountant, or attorney.";

export const SHORT_DISCLAIMER =
  "Estimates for education only. Not an offer of credit or a promise of approval. Actual terms depend on the lender and credit approval. Not affiliated with any employer.";

export const REVIEWED_LINE =
  "Reviewed October 1, 2026 by Brandon Chiesa, a Central Virginia business banker with 15+ years of experience.";

export const LOAN_DESCRIPTION =
  "Before you sign for a loan, it helps to know what it will really cost each month and over its life. Enter the loan amount, an interest rate, and the term to see an estimated payment, the total interest, and a month-by-month schedule. If your loan has a balloon (for example, a 10-year term on a 20-year amortization), you can see what would still be owed at the end.";

export const LOAN_STEPS = [
  "Enter the loan amount, the interest rate your lender gave you (or an example rate), and the term in months or years.",
  "If the loan has a balloon, enter the longer amortization period.",
  "Review the payment, total interest, and schedule. Print or download it to compare offers side by side.",
] as const;

export const DSCR_DESCRIPTION =
  "Debt service coverage ratio (DSCR) is one of the first numbers a business lender looks at. It compares the cash your business generates to the loan payments it has to make. This calculator walks you through the common add-backs and shows your ratio, your cushion, and what it means in plain English.";

export const DSCR_STEPS = [
  "Enter net income from your most recent full year, then the add-backs (depreciation, interest, one-time expenses) and any owner draws.",
  "Enter your current loan payments, plus the new loan (or send it over from the loan payment calculator).",
  "Read your DSCR and cushion. If it is tight, try a longer term or smaller amount and see how it changes.",
] as const;

export const BREAK_EVEN_DESCRIPTION =
  "Break-even is the point where sales cover all your costs, with nothing left over and nothing lost. Knowing it helps with pricing, hiring, and deciding whether a new truck or a new location makes sense. Enter your monthly fixed costs, your price, and your cost per sale to see how many sales you need.";

export const BREAK_EVEN_STEPS = [
  "Enter your monthly fixed costs (rent, salaries, insurance, loan payments, and so on).",
  "Enter your average price per sale and the direct cost of each sale (materials, fuel, commissions).",
  "See your break-even point in sales and dollars. Add a monthly profit goal to see what it takes to hit it.",
] as const;

export const SBA_DESCRIPTION =
  "SBA-guaranteed loans can be a great fit for some businesses, but SBA has basic rules about who can use them. Answer 13 short yes, no, or not sure questions to see whether anything in those basic rules might be an issue for you. This is not an eligibility decision. Only a lender, and in some cases SBA, can make that call.";

export const SBA_STEPS = [
  "Answer each question. If you are not sure, pick \"Not sure\" and read the helper text.",
  "Review your result: \"possible fit\" or \"possible issue,\" with a short reason for each issue.",
  "Take your result and questions to a lender. SBA rules change, so confirm details at SBA.gov.",
] as const;

export const CHECKLIST_DESCRIPTION =
  "Most loan delays come down to missing paperwork. This checklist lists the documents lenders commonly request, starting with a core list for most requests and adding items for lines of credit, equipment, expansion, real estate, business purchases, and SBA loans. Each lender differs, so use it to get a head start.";

export const CHECKLIST_STEPS = [
  "Start with the core list, then add the list for your type of loan.",
  "Check items off (or use the status dropdown in the spreadsheet) as you gather them.",
  "Ask your lender for their checklist and compare. Fill in anything extra they need.",
] as const;

export const CASH_FLOW_DESCRIPTION =
  "Profit and cash are not the same thing, especially in seasonal businesses. This spreadsheet maps cash coming in and going out month by month and flags any month where you would run short. It includes a filled-in example for a fictional landscaping company so you can see how seasonality plays out.";

export const CASH_FLOW_STEPS = [
  "Enter your starting cash, first month, and a cash cushion you are comfortable with.",
  "Fill in expected cash receipts and payments for each month in the yellow cells.",
  "Look for red (short) and amber (below cushion) months, and plan for them early.",
] as const;

export const SBA_GUIDE_DESCRIPTION =
  "A plain-English guide to SBA's two main loan programs: what each is for, how they differ, the basic eligibility rules, the forms you will see, the steps, common mistakes, and questions to ask a lender. SBA facts are cited to SBA.gov and were checked on October 1, 2026.";

export const SBA_GUIDE_STEPS = [
  "Read the side-by-side comparison to see which program fits your project.",
  "Check the eligibility basics and start gathering documents with the checklist.",
  "Bring the \"questions to ask a lender\" page to your first meeting.",
] as const;

export const DSCR_SHEET_DESCRIPTION =
  "The spreadsheet version of the DSCR calculator, with room for up to five existing loans and a proposed loan. It shows your ratio, your cushion, and the most annual debt service your cash flow could support at a commonly cited benchmark. A filled-in example is included.";

export const DSCR_SHEET_STEPS = [
  "Enter net income and add-backs from your most recent full year.",
  "List your current loan payments and the proposed loan.",
  "Read the result and the plain-English explanation. Save a copy for each scenario you want to compare.",
] as const;

export const PFS_DESCRIPTION =
  "If you personally guarantee a business loan, your lender will ask for a personal financial statement. This walkthrough explains each section in plain English, from assets and liabilities to contingent liabilities and the real estate schedule, and lists the mistakes that most often slow things down.";

export const PFS_STEPS = [
  "Gather the statements listed on page 1.",
  "Get your lender's PFS form or the current SBA Form 413 from SBA.gov, and follow along section by section.",
  "Check your work against the common mistakes list before you sign and date it.",
] as const;

export const SOURCES_DESCRIPTION =
  "For bigger projects like buying a building, expanding, or buying a business, lenders want to see every dollar the project costs and every dollar paying for it. This worksheet lines them up and tells you if they balance or if there is a gap. The example shows a fictional dental practice buying its building.";

export const SOURCES_STEPS = [
  "List every cost in Uses, including closing costs and a contingency.",
  "List every source of money in Sources, including your own cash.",
  "Check the Status line. If there is a gap, adjust the project or line up more funding before you apply.",
] as const;

export const LOAN_FOLLOW_UP = [
  "Can your cash flow comfortably cover this payment each month?",
  "If there is a balloon, how will you pay it or refinance it when it comes due?",
] as const;

export const DSCR_FOLLOW_UP = [
  "If revenue dips for a few months, does the cushion still cover the payments?",
  "If this loan pays off an old one, did you leave that old payment out?",
] as const;

export const BREAK_EVEN_FOLLOW_UP = [
  "Does this monthly sales number match what you actually sell now?",
  "If you add a new fixed cost, how many more sales would you need?",
] as const;

export const SBA_FOLLOW_UP = [
  "Which answers are still Not sure, and who can confirm them?",
  "If a possible issue showed up, ask a lender whether an exception or a different loan still fits.",
] as const;

export const TEMPLATES_PAGE_DESCRIPTION =
  "Downloadable checklists, worksheets, and plain English guides for a business loan conversation. Educational use only, not an offer of credit.";

export const DISCLAIMER_PAGE_DESCRIPTION =
  "Educational information only. These calculators, templates, and guides are not financial, legal, tax, or accounting advice, and they are not an offer of credit.";

export const DISCLAIMER_SECTIONS = [
  {
    title: "Educational information only.",
    body: "The calculators, templates, guides, and articles in this section are general educational information. They are not financial, legal, tax, or accounting advice, and they are not a recommendation about any specific loan, lender, or product.",
  },
  {
    title: "Not an offer or commitment to lend.",
    body: "Nothing here is an offer of credit, a commitment to lend, a loan application, or a promise that any business will qualify or be approved.",
  },
  {
    title: "Calculators give estimates only.",
    body: "Results depend entirely on the numbers you enter and on simplified assumptions. Actual payments, rates, fees, and terms depend on the lender, your credit, your business's financial condition, collateral, and final credit approval. Example interest rates are for illustration only and are not quotes.",
  },
  {
    title: "My views are my own.",
    body: "I am a Central Virginia business banker with 15+ years of experience. This is my personal website. It is not affiliated with, endorsed by, or tied to First Citizens Bank or any employer, and nothing here represents the views, policies, products, or underwriting standards of any employer or financial institution.",
  },
  {
    title: "SBA program details change.",
    body: "SBA rules, forms, fees, and limits change, sometimes several times a year. Information in this section was checked on October 1, 2026. Always verify current details at SBA.gov or with a lender before making decisions.",
  },
  {
    title: "Talk to your own advisors.",
    body: "Before you borrow, sign, or make a financial decision, consult your own lender, accountant, attorney, or other qualified advisor who knows your situation.",
  },
  {
    title: "No data collected by the tools.",
    body: "The calculators run in your browser. Please do not send me personal or business financial information through this site.",
  },
  {
    title: "Accuracy.",
    body: "I work to keep this information accurate and current, but I cannot guarantee it is complete, error-free, or up to date. Use it at your own risk.",
  },
] as const;
