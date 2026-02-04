/**
 * Triangle Mastercard Statement Schema
 * Institution: Canadian Tire Bank
 * Type: Credit Card Statement
 */

import type { DocumentSchema } from "../types";

const sampleData = {
  detectedSchema: "triangle-mastercard",
  confidence: "high",
  statement: {
    account: {
      accountName: "Triangle World Elite Mastercard",
      accountNumber: "6251",
      institutionName: "Canadian Tire Bank",
      accountType: "Credit Card",
      currency: "CAD",
      creditLimit: 25000,
      availableCredit: 20499.96,
      cards: ["6251", "0420"],
    },
    periodStart: "2025-12-20",
    periodEnd: "2026-01-19",
    openingBalance: 2444.12,
    closingBalance: 4500.04,
    sourceFile: "2026-01-19-Triangle-WorldEliteMastercard.pdf",
    sourceType: "Credit Card",
    equalPaymentsPlans: [
      {
        startDate: "2025-04-12",
        originalAmount: 359.93,
        monthlyPayment: 15.0,
        remainingBalance: 224.93,
        expiryDate: "2027-04-19",
      },
      {
        startDate: "2024-05-04",
        originalAmount: 272.06,
        monthlyPayment: 11.34,
        remainingBalance: 45.26,
        expiryDate: "2026-05-19",
      },
    ],
  },
  transactions: [
    {
      date: "2026-01-09",
      description: "PAYMENT OAKVILLE ON",
      amount: -2173.93,
      postingDate: "2026-01-09",
      transactionType: "payment",
      location: {
        city: "Oakville",
        province: "ON",
      },
    },
    {
      date: "2026-01-03",
      description: "#242 SPORT CHEK LONDON ON",
      amount: -126.56,
      postingDate: "2026-01-05",
      transactionType: "return",
      location: {
        city: "London",
        province: "ON",
      },
    },
    {
      date: "2025-12-23",
      description: "MT. BRYDGES ABATTOIR MOUNT BRYDGES ON",
      amount: 124.84,
      postingDate: "2025-12-24",
      transactionType: "purchase",
      cardNumber: "6251",
      location: {
        city: "Mount Brydges",
        province: "ON",
      },
      categoryHint: "Groceries",
    },
    {
      date: "2026-01-05",
      description: "STEAM PURCHASE SEATTLE HH",
      amount: 22.04,
      postingDate: "2026-01-07",
      transactionType: "purchase",
      cardNumber: "6251",
      location: {
        city: "Seattle",
        province: "HH",
      },
      categoryHint: "Gaming",
    },
    {
      date: "2026-01-08",
      description: "CLAUDE.AI SUBSCRIPTION SAN FRANCISCO CA",
      amount: 158.2,
      postingDate: "2026-01-09",
      transactionType: "purchase",
      cardNumber: "6251",
      location: {
        city: "San Francisco",
        province: "CA",
        country: "US",
      },
      categoryHint: "Software Subscription",
    },
    {
      date: "2026-01-14",
      description: "GITHUB, INC. SAN FRANCISCO CA",
      amount: 32.76,
      postingDate: "2026-01-15",
      transactionType: "purchase",
      cardNumber: "6251",
      location: {
        city: "San Francisco",
        province: "CA",
        country: "US",
      },
      foreignCurrency: {
        amount: 23.0,
        currency: "USD",
        rate: 1.42475,
      },
      categoryHint: "Software Subscription",
    },
    {
      date: "2026-01-02",
      description: "CDN TIRE STORE #00425 LONDON ON",
      amount: 0.0,
      postingDate: "2026-01-05",
      transactionType: "purchase",
      cardNumber: "6251",
      location: {
        city: "London",
        province: "ON",
      },
      categoryHint: "Home & Hardware",
    },
    {
      date: "2025-12-21",
      description: "COSTCO WHOLESALE W530 LONDON ON",
      amount: 384.18,
      postingDate: "2025-12-22",
      transactionType: "purchase",
      cardNumber: "0420",
      location: {
        city: "London",
        province: "ON",
      },
      categoryHint: "Groceries",
    },
  ],
  extractionNotes: "Credit card: positive = charge, negative = payment/credit",
};

const extractionNotes = `#### Sign Determination (CRITICAL — no flexibility)
This statement has NO running balance. The **section header** determines the sign. All amounts in the PDF are plain positive numbers — you must apply the correct sign based on which section the transaction appears in:

| Section Header                | JSON Amount | Transaction Type |
|-------------------------------|-------------|------------------|
| Payments received             | Negative    | \`payment\`        |
| Returns and other credits     | Negative    | \`return\`         |
| Purchases                     | Positive    | \`purchase\`       |
| Cash transactions             | Positive    | \`cash_advance\`   |
| Fees                          | Positive    | \`fee\`            |
| Interest charges              | Positive    | \`interest\`       |

**Example:** An amount of \`2,173.93\` under "Payments received" → \`"amount": -2173.93\`
**Example:** An amount of \`124.84\` under "Purchases" → \`"amount": 124.84\`

#### Document Layout
- **Page 1** — Account summary (use for validation, do NOT extract as transactions)
  - Use **"Your New Balance"** as \`closingBalance\` (NOT "Balance Due", which includes Equal Payments Plan adjustments)
  - Use **"Balance from your last statement"** as \`openingBalance\`
- **Page 2+** — Transaction details organized by section
- **Transaction columns:** \`TRANSACTION DATE\` | \`POSTING DATE\` | \`DESCRIPTION\` | \`AMOUNT ($)\`
- **Store detail pages** — Sections like "Details of your Canadian Tire store purchases" and "Details of your Sport Chek store purchases" are line-item breakdowns of transactions already listed in the Purchases section. **Do NOT extract these as additional transactions.**
- **Equal Payments Plan section** — Extract as \`equalPaymentsPlans\` metadata if present.

#### Extraction Rules
1. **Account number:** Extract LAST 4 DIGITS only (e.g., \`"6251"\` from \`"5446 14XX XXXX 6251"\`)
2. **Dates:** Extract both \`date\` (transaction date) and \`postingDate\` (posting date) — format as \`YYYY-MM-DD\`. The statement uses short date formats (e.g., "Dec 23", "Jan 09"). Resolve the year from the statement period.
3. **Multiple cards:** Purchases are grouped by card (e.g., \`"Purchases - Card #5446 14XX XXXX 6251"\`). Extract last 4 digits into \`cardNumber\`. Payments and returns typically have no \`cardNumber\` — omit the field entirely, do not set it to \`null\`.
4. **Foreign currency:** Look for a line below the transaction like \`"23.00 USD @ 1.424750000"\`. Extract into \`foreignCurrency: { amount, currency, rate }\`.
5. **Location parsing:** Parse city/province from the description suffix. Use \`country: "US"\` when the suffix is a recognized US state abbreviation (e.g., \`CA\`, \`NY\`, \`WA\`). Omit \`country\` for Canadian transactions. If the suffix is not a recognized Canadian province or US state (e.g., \`"HH"\`), include it as-is in \`province\` and omit \`country\`.
6. **categoryHint:** Infer a spending category based on the merchant name, description, and transaction context. Use your best judgment — reasonable inferences are better than omitting. Only omit when truly ambiguous (e.g., a generic description with no identifiable merchant or purpose).
7. **transactionType:** Determined by the section header (see Sign Determination table above). The section defines both the sign and the type.
8. **$0.00 transactions:** These are valid (e.g., CT Money redemption covering the full amount). Include them — do not skip.
9. **Description wrapping:** PDF text extraction may concatenate wrapped lines without spaces (e.g., \`"FRANCISCOCA"\` instead of \`"FRANCISCO CA"\`, \`"BRYDGESON"\` instead of \`"BRYDGES ON"\`). When parsing location, check for province/state codes fused to the preceding word and split them correctly.
10. **Duplicate city in merchant name:** Some merchants include their city in the name (e.g., \`"PEDI N NAILS LONDON LONDON ON"\`). The last occurrence of \`CITY PROVINCE\` is the location — do not be confused by earlier occurrences in the merchant name.
11. **Truncated merchant names:** Merchant names may be truncated in the statement (e.g., \`"London District Cathol"\` instead of \`"London District Catholic"\`). Extract as-is — do not attempt to reconstruct the full name.
12. **Reference extraction:** Extract identifiers, codes, and account references when they appear in descriptions (e.g., store numbers from \`"#242 SPORT CHEK"\`, transaction codes). Apply your judgment for new patterns.

#### Validation (CRITICAL — no flexibility)
Use Page 1 summary to validate:
\`\`\`
openingBalance + sum(all transaction amounts) = closingBalance
\`\`\`
Where \`closingBalance\` = "Your New Balance" (NOT "Balance Due").
If the totals do not balance, add a \`"validationError"\` field to the output describing the discrepancy. Do not silently drop transactions to force a balance.`;

export const triangleMastercardSchema: DocumentSchema = {
  code: "triangle-mastercard",
  name: "Triangle Mastercard Statement",
  documentType: "credit_card_statement",
  institutionName: "Canadian Tire Bank",
  version: "1.0",
  sampleData: JSON.stringify(sampleData, null, 2),
  extractionNotes,
  notes: "Primary credit card format for Canadian Tire Bank",
};
