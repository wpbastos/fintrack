/**
 * RBC Statement Schema
 * Institution: Royal Bank of Canada
 * Type: Bank Statement (Chequing/Savings)
 */

import type { DocumentSchema } from "../types";

const sampleData = {
  detectedSchema: "rbc-statement",
  confidence: "high",
  statement: {
    account: {
      accountName: "RBC No Limit Banking",
      accountNumber: "2467",
      transitNumber: "09971",
      institutionName: "Royal Bank of Canada",
      accountType: "Chequing",
      currency: "CAD",
      isJoint: true,
    },
    periodStart: "2025-11-03",
    periodEnd: "2025-12-02",
    openingBalance: 2578.73,
    closingBalance: 1373.36,
    sourceFile: "Chequing_Statement-2467_2025-12-02.pdf",
    sourceType: "Statement",
  },
  transactions: [
    {
      date: "2025-11-04",
      description: "Health/Dental Claim MANULIFE 729642",
      amount: 95.2,
      runningBalance: 2673.93,
      transactionType: "insurance_claim",
      referenceNumber: "729642",
      categoryHint: "Insurance Reimbursement",
    },
    {
      date: "2025-11-05",
      description: "e-Transfer sent Cathy 4GH5Y9",
      amount: -385.0,
      runningBalance: 2288.93,
      transactionType: "e_transfer",
      referenceNumber: "4GH5Y9",
      categoryHint: "Transfer",
    },
    {
      date: "2025-11-06",
      description: "Insurance SUNLIFE MED INS",
      amount: 24.8,
      runningBalance: 2603.73,
      transactionType: "insurance",
      categoryHint: "Insurance Reimbursement",
    },
    {
      date: "2025-11-06",
      description: "Payroll Deposit Avanade Canada",
      amount: 3789.37,
      runningBalance: 6445.1,
      transactionType: "payroll",
      categoryHint: "Income",
    },
    {
      date: "2025-11-06",
      description: "Loan HONDA FINANCE",
      amount: -477.66,
      runningBalance: 5677.44,
      transactionType: "loan_payment",
      categoryHint: "Auto Loan",
    },
    {
      date: "2025-11-13",
      description: "Online Banking payment - 3558 WALMART MC",
      amount: -84.14,
      runningBalance: 1924.54,
      transactionType: "bill_payment",
      paymentReference: "3558",
      categoryHint: "Credit Card Payment",
    },
    {
      date: "2025-11-14",
      description: "e-Transfer - Autodeposit CAROLINA SOARES BASTOS C1AacPckQ7cY",
      amount: 56.3,
      runningBalance: 1980.84,
      transactionType: "e_transfer",
      referenceNumber: "C1AacPckQ7cY",
      categoryHint: "Transfer",
    },
    {
      date: "2025-11-14",
      description: "Contactless Interac purchase - 9204 PEDI N NAILS LO",
      amount: -78.19,
      runningBalance: 1902.65,
      transactionType: "purchase",
      terminalId: "9204",
      categoryHint: "Personal Care",
    },
    {
      date: "2025-11-17",
      description: "Residential Mtg CMLS Financial",
      amount: -2380.98,
      runningBalance: 3348.32,
      transactionType: "mortgage",
      categoryHint: "Mortgage",
    },
    {
      date: "2025-11-20",
      description: "Account Payable Pmt AVANADE CANADA",
      amount: 25.0,
      runningBalance: 3050.39,
      transactionType: "account_payable",
      categoryHint: "Expense Reimbursement",
    },
    {
      date: "2025-11-21",
      description: "Online Transfer to Deposit Account-0131",
      amount: -200.0,
      runningBalance: 6097.1,
      transactionType: "internal_transfer",
      targetAccount: "0131",
    },
    {
      date: "2025-11-24",
      description: "Inter-FI Fund Tr Dr AMEX",
      amount: -4248.06,
      runningBalance: 1035.82,
      transactionType: "interbank_transfer",
      categoryHint: "Credit Card Payment",
    },
    {
      date: "2025-12-01",
      description: "e-Transfer cancel ginan JYXUUX",
      amount: 70.0,
      runningBalance: 3927.29,
      transactionType: "e_transfer_cancel",
      referenceNumber: "JYXUUX",
    },
    {
      date: "2025-12-02",
      description: "Monthly fee",
      amount: -12.95,
      runningBalance: 1373.36,
      transactionType: "fee",
      categoryHint: "Bank Fee",
    },
  ],
  extractionNotes: "Chequing: positive = deposit, negative = withdrawal",
};

const extractionNotes = `#### Sign Determination (CRITICAL — no flexibility)
The PDF table has 5 columns in this exact order:

| Date | Description | Withdrawals ($) | Deposits ($) | Balance ($) |

All amounts in the PDF are plain positive numbers with NO sign. The **column** the amount appears in determines the sign you assign in JSON:

| Column                        | JSON Amount | Meaning              |
|-------------------------------|-------------|----------------------|
| Withdrawals ($) — 3rd column  | Negative    | Money leaving account  |
| Deposits ($) — 4th column     | Positive    | Money entering account |

An amount appears in ONLY ONE of these columns, never both.

**Example:** \`385.00\` in the Withdrawals column → \`"amount": -385.00\`
**Example:** \`95.20\` in the Deposits column → \`"amount": 95.20\`

> **WARNING:** The same description can appear in either column. Do not infer sign from description text.
> - \`"Insurance SUNLIFE MED INS"\` in Withdrawals → \`-24.80\` (premium payment)
> - \`"Insurance SUNLIFE MED INS"\` in Deposits → \`24.80\` (reimbursement)
> - \`"e-Transfer Request Fulfilled"\` can be either direction
> - Always rely on column position. When in doubt, cross-check against the running balance.

#### Document Layout
- **Page 1 header** — Period, account number (\`transit-account\` format), account holder names
- **Account product name** — Appears below "Summary of your account for this period" (e.g., \`"RBC No Limit Banking"\`, \`"RBC High Interest eSavings"\`). Use this to determine \`accountName\` and \`accountType\` (\`Chequing\` or \`Savings\`).
- **Summary section** — Opening balance, total deposits, total withdrawals, closing balance (use for validation, do NOT extract as transactions)
- **Transaction table** — Chronological rows with running balance
  - First row: \`"Opening Balance"\` (skip — not a transaction)
  - Last row: \`"Closing Balance"\` (skip — not a transaction)
  - Multiple transactions per day: running balance shown only after the LAST transaction of that date
  - Descriptions may wrap to multiple lines — concatenate into a single \`description\` string, preserving a single space between lines

#### Extraction Rules
1. **Account number:** LAST 4 DIGITS only (e.g., \`"2467"\` from \`"09971-5072467"\`)
2. **Transit number:** First 5 digits before the hyphen (e.g., \`"09971"\`)
3. **Dates:** Format as \`YYYY-MM-DD\`. The statement uses short date formats (e.g., "4 Nov", "1 Dec"). Resolve the year from the statement period.
4. **Joint account:** Multiple names listed below address → \`isJoint: true\`
5. **Running balance:** Include \`runningBalance\` for each transaction. When multiple transactions share a date and only the last shows a balance, calculate intermediate balances by working backward from the displayed balance.
6. **categoryHint:** Infer a spending category based on the merchant name, description, and transaction context. Use your best judgment — reasonable inferences are better than omitting. Only omit when truly ambiguous (e.g., a generic description with no identifiable payee or purpose).
7. **transactionType:** Infer from the description pattern. Use descriptive, lowercase, underscored names (e.g., \`payroll\`, \`mortgage\`, \`e_transfer\`, \`bill_payment\`, \`insurance\`, \`insurance_claim\`, \`loan_payment\`, \`fee\`, \`purchase\`, \`internal_transfer\`, \`interbank_transfer\`, \`investment\`). Use \`"other"\` only as a last resort.
8. **Reference extraction:** Extract identifiers, codes, and account references when they appear in descriptions. Examples:
   - \`"e-Transfer sent Cathy 4GH5Y9"\` → \`referenceNumber: "4GH5Y9"\`
   - \`"e-Transfer - Autodeposit CAROLINA SOARES BASTOS C1AacPckQ7cY"\` → \`referenceNumber: "C1AacPckQ7cY"\`
   - \`"Health/Dental Claim MANULIFE 729642"\` → \`referenceNumber: "729642"\`
   - \`"Online Transfer to Deposit Account-0131"\` → \`targetAccount: "0131"\`
   - \`"Online Banking transfer - 0132"\` → \`sourceAccount: "0132"\`
   - \`"Online Banking payment - 3558 WALMART MC"\` → \`paymentReference: "3558"\`
   - \`"Contactless Interac purchase - 9204 PEDI N NAILS LO"\` → \`terminalId: "9204"\`
   - Apply the same approach to any new patterns you encounter.
9. **Description wrapping:** PDF text extraction may concatenate wrapped lines. Concatenate into a single \`description\` string, preserving a single space between lines.
10. **Truncated merchant names:** Merchant names may be truncated in the statement (e.g., \`"PEDI N NAILS LO"\` instead of \`"PEDI N NAILS LONDON"\`). Extract as-is — do not attempt to reconstruct the full name.

#### Validation (CRITICAL — no flexibility)
Use the Page 1 summary section to validate:
\`\`\`
openingBalance + sum(all transaction amounts) = closingBalance
Total deposits - Total withdrawals = closingBalance - openingBalance
\`\`\`
If the totals do not balance, **re-check which column each amount appeared in**, then add a \`"validationError"\` field describing the discrepancy. Do not silently drop or modify transactions to force a balance.

As a secondary verification, confirm that each transaction's \`runningBalance\` is consistent with the previous balance ± the transaction amount. If a discrepancy is found, flag it in \`"extractionNotes"\`.`;

export const rbcStatementSchema: DocumentSchema = {
  code: "rbc-statement",
  name: "RBC Statement",
  documentType: "bank_statement",
  institutionName: "Royal Bank of Canada",
  version: "1.0",
  sampleData: JSON.stringify(sampleData, null, 2),
  extractionNotes,
  notes: "Standard RBC chequing and savings account format",
};
