# Database Agent Report

## Executive Summary

Fintrack's existing schema is well-structured for its current import-resolve-review pipeline, with 16 models covering the core workflow from bank statement import through to finalized transactions. The schema correctly uses SQLite via Prisma with a singleton client pattern and supports PDF extraction with AI metric tracking.

**Key findings:**
- **22+ missing indexes** on foreign keys and commonly filtered columns, particularly on `Transaction`, `StagingTransaction`, and `Account` tables
- **No cascade delete** on most foreign key relationships (only `MerchantPattern`, `IncomePattern`, `Payslip`, and `BudgetPeriod` have `onDelete: Cascade`)
- **Existing `Payslip` model is misnamed** — it actually tracks salary change history, not payslip documents. The new Payslip feature needs a different model name or the existing one needs renaming.
- **6 new model groups** proposed for planned features: PayslipDocument (7 models), Receipt (2 models), Forecast (2 models), SavingsGoal (2 models), AI operation log (1 model), and auto-learning metadata (field additions to 2 existing models)
- **3 additional proposals**: Tag system, Notification/Alert model, and Audit Log

---

## Existing Schema Analysis

### Table Inventory & Relationships

| # | Model | Table Name | Row Purpose | Key Relations |
|---|-------|------------|-------------|---------------|
| 1 | `Import` | `import` | Batch import audit trail | -> Account, -> StagingTransaction[], -> Transaction[] |
| 2 | `StagingTransaction` | `staging_transaction` | Temporary holding for imported transactions | -> Import, -> Account, -> Merchant, -> Category, -> Income, -> Person |
| 3 | `Transaction` | `transaction` | Permanent finalized transactions | -> Import, -> Account, -> Merchant, -> Category, -> Income, -> Person |
| 4 | `Merchant` | `merchant` | Where money is spent | -> Category, -> Person, -> Account, -> MerchantPattern[], -> StagingTransaction[], -> Transaction[] |
| 5 | `MerchantPattern` | `merchant_pattern` | Substring patterns for merchant matching | -> Merchant (Cascade) |
| 6 | `Institution` | `institution` | Banks, credit unions, brokerages | -> Account[] |
| 7 | `Person` | `person` | Family members / account owners | -> Account[], -> Merchant[], -> Transaction[], -> StagingTransaction[], -> Income[] |
| 8 | `Account` | `account` | Financial accounts (chequing, credit, etc.) | -> Institution, -> Person (owner), -> Import[], -> StagingTransaction[], -> Transaction[], -> Merchant[], -> Income[], -> BudgetPeriod[] |
| 9 | `CategoryGroup` | `category_group` | Top-level grouping (Income, Expense, Transfer, Investment) | -> Category[] |
| 10 | `Category` | `category` | Transaction categories with budgets | -> CategoryGroup, -> Parent/Children (self-ref), -> Merchant[], -> Income[], -> StagingTransaction[], -> Transaction[], -> BudgetPeriod[] |
| 11 | `BudgetPeriod` | `budget_period` | Historical budget cycle tracking | -> Category (Cascade), -> Account |
| 12 | `Employer` | `employer` | Companies that pay income | -> Position[] |
| 13 | `Position` | `position` | Job roles at employers | -> Employer, -> Income[] |
| 14 | `Income` | `income` | Income sources (salary, benefits, etc.) | -> Position, -> Person, -> Category, -> Account (deposit), -> IncomePattern[], -> Payslip[], -> StagingTransaction[], -> Transaction[] |
| 15 | `IncomePattern` | `income_pattern` | Substring patterns for income matching | -> Income (Cascade) |
| 16 | `Payslip` | `payslip` | **Salary change history** (not payslip documents) | -> Income (Cascade) |
| 17 | `DocumentSchema` | `document_schema` | JSON templates for AI extraction | Standalone (no FK relations) |

### Missing Indexes

The following indexes should be added for query performance. These are identified from actual query patterns in the codebase:

#### Critical (High-traffic queries)

| Table | Columns | Justification |
|-------|---------|---------------|
| `Transaction` | `merchantId` | Count checks before merchant deletion, analytics groupBy |
| `Transaction` | `incomeId` | Count checks before income deletion, analytics groupBy |
| `Transaction` | `categoryId, date` | Budget period aggregate (SUM amount by category in date range) |
| `Transaction` | `accountId` | Account-level analytics, filtering |
| `Transaction` | `personId` | Person deletion safety check |
| `StagingTransaction` | `importId` | Cascade deletes when removing imports, batch filtering |
| `StagingTransaction` | `merchantId` | Resolution lookups |
| `StagingTransaction` | `incomeId` | Resolution lookups |
| `StagingTransaction` | `categoryId` | Category filtering |
| `StagingTransaction` | `accountId` | Account filtering |
| `MerchantPattern` | `merchantId` | Pattern lookups by merchant (already implicit via FK but explicit index helps) |
| `IncomePattern` | `incomeId` | Pattern lookups by income |

#### Important (Admin & CRUD queries)

| Table | Columns | Justification |
|-------|---------|---------------|
| `Account` | `institutionId` | Institution deletion check, cascading disables |
| `Account` | `ownerId` | Person deletion check |
| `Account` | `type` | Credit card filtering on merchants page |
| `BudgetPeriod` | `categoryId, status` | Open period lookup in cron job |
| `BudgetPeriod` | `categoryId, periodStart` | Period existence check (already has unique constraint, but composite index helps range queries) |
| `BudgetPeriod` | `status, periodEnd` | Expired period lookup in cron job |
| `Position` | `employerId` | Position listing and employer deletion check |
| `Category` | `groupId` | Category listing by group, cascading deletes |
| `Category` | `parentId` | Hierarchy traversal |

#### Proposed Prisma Index Additions

```prisma
// Transaction
@@index([merchantId])
@@index([incomeId])
@@index([categoryId, date])
@@index([accountId])
@@index([personId])

// StagingTransaction
@@index([importId])
@@index([merchantId])
@@index([incomeId])
@@index([categoryId])
@@index([accountId])

// Account
@@index([institutionId])
@@index([ownerId])
@@index([type])

// BudgetPeriod (already has: [status], [categoryId, periodStart] unique)
@@index([categoryId, status])
@@index([status, periodEnd])

// Position
@@index([employerId])

// Category
@@index([groupId])
@@index([parentId])
```

### Normalization Issues

1. **JSON string fields for structured data**: `StagingTransaction.location`, `StagingTransaction.foreignCurrency`, `Transaction.location`, `Transaction.foreignCurrency` store JSON as strings. While acceptable for SQLite, these could benefit from separate tables if queried frequently. Currently they are display-only, so JSON strings are adequate.

2. **`Import.content`** stores the entire original JSON content as a string. For large statements this could be significant. Consider moving to a separate `ImportContent` table or storing as a file reference.

3. **`Import.aiResult`** stores AI resolution results as a JSON string. This is appropriate for now since it's a blob consumed by the frontend.

4. **Duplication between `StagingTransaction` and `Transaction`**: Both have identical metadata fields (`postingDate`, `cardNumber`, `location`, `foreignCurrency`, `runningBalance`, `transactionType`, `referenceNumber`, `terminalId`, `targetAccount`, `sourceAccount`). This is **intentional** — staging is temporary and transactions are permanent. No normalization needed.

5. **`Payslip` model naming**: Currently tracks salary changes (effectiveDate, previousGross, newGross, changeReason). This is really a `SalaryHistory` or `CompensationChange` model. The proposed payslip document feature needs a different name.

### Constraint Gaps

1. **Missing NOT NULL constraints**:
   - `StagingTransaction.importBatchId` — should arguably be required (every staging tx belongs to a batch)
   - `Transaction.accountId` — most transactions should have an account, but nullable is correct for manual entries

2. **Missing default values**:
   - `MerchantPattern.priority` defaults to `0`, but `IncomePattern.priority` defaults to `10` — inconsistent defaults
   - `Institution.isActive` defaults to `false` (by design — auto-created institutions start inactive)
   - `Income.isActive` defaults to `true` in schema but seed creates with `isActive: false` — inconsistency

3. **String enum fields without validation**: All "type" and "status" fields use free-form strings:
   - `Import.status`: "staged" | "finalized" (only 2 values)
   - `Import.aiStatus`: "idle" | "resolving" | "complete" | "error"
   - `Import.sourceType`: "Statement" | "Receipt" | "Payslip" | "Manual"
   - `StagingTransaction.status`: "pending" | "matched" | "unknown" | "suggested" | "imported" | "skipped"
   - `CategoryGroup.type`: "Income" | "Expense" | "Transfer" | "Investment"
   - `Category.necessityLevel`: "Essential" | "Important" | "Discretionary" | "Wasteful"
   - `BudgetPeriod.status`: "open" | "closed"
   - `Income.type`: "Employment" | "Government" | "Investment" | "Gig" | "Reimbursement" | "Other"
   - `Income.payFrequency`: "Weekly" | "Bi-weekly" | "Semi-monthly" | "Monthly" | "Quarterly" | "Annually" | "Irregular"
   - `Account.type`: Free-form (Credit Card, Chequing, Savings, etc.)
   - `Institution.type`: "Bank" | "Credit Union" | "Brokerage" | "Other"

   **Recommendation**: SQLite doesn't support CHECK constraints well via Prisma. Keep string-based enums but add application-level validation constants.

4. **Missing unique constraints**:
   - `Account.number` is not unique (correctly — different institutions may reuse numbers). The composite `@@unique([name, institutionId])` is appropriate.
   - `Position.title` is not unique globally (correctly — unique per employer via `@@unique([title, employerId])`).

### Cascade & Orphan Prevention

**Current cascade deletes:**
| Parent | Child | onDelete |
|--------|-------|----------|
| Merchant | MerchantPattern | Cascade |
| Income | IncomePattern | Cascade |
| Income | Payslip | Cascade |
| Category | BudgetPeriod | Cascade |

**Missing cascade deletes (orphan risk):**
| Parent | Child | Current Behavior | Recommendation |
|--------|-------|-----------------|----------------|
| Import | StagingTransaction | SetNull (default) | **Add Cascade** — staging txns are meaningless without their import batch |
| Import | Transaction | SetNull (default) | **Keep SetNull** — transactions are permanent records |
| CategoryGroup | Category | SetNull (default) | **Add Cascade or Restrict** — code manually handles this in group deletion |
| Category | Category (children) | SetNull (default) | **Keep SetNull** — allows re-parenting |
| Account | Import | SetNull (default) | **Keep SetNull** — imports should survive account deletion |
| Account | Transaction | SetNull (default) | **Keep SetNull** — transactions are permanent |
| Employer | Position | SetNull (default) | **Add Cascade or Restrict** — positions are meaningless without employer |
| Position | Income | SetNull (default) | **Keep SetNull** — income source can exist independently |
| Person | Account | SetNull (default) | **Keep SetNull** — account can be reassigned |
| Person | Transaction | SetNull (default) | **Keep SetNull** |

**Recommended cascade additions:**

```prisma
// StagingTransaction
import Import? @relation(fields: [importId], references: [id], onDelete: Cascade)

// Position (prevent orphan positions)
employer Employer @relation(fields: [employerId], references: [id], onDelete: Cascade)
```

---

## Proposed Schema Changes

### Payslip Document Models

The existing `Payslip` model tracks salary changes. The new feature needs actual payslip document extraction — storing gross pay, all deductions, taxes, and net pay from uploaded payslip PDFs.

**Rename existing model** from `Payslip` to `SalaryChange` to avoid confusion, then create new payslip document models.

```prisma
// ============================================================================
// Renamed: Salary Change History (was "Payslip")
// Tracks compensation changes over time
// ============================================================================
model SalaryChange {
  id            Int      @id @default(autoincrement()) @map("id")
  incomeId      Int      @map("income_id")
  income        Income   @relation(fields: [incomeId], references: [id], onDelete: Cascade)
  effectiveDate DateTime @map("effective_date")
  previousGross Float?   @map("previous_gross")
  previousNet   Float?   @map("previous_net")
  newGross      Float    @map("new_gross")
  newNet        Float    @map("new_net")
  changeReason  String   @map("change_reason")
  notes         String?  @map("notes")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@unique([incomeId, effectiveDate])
  @@map("salary_change")
}

// ============================================================================
// NEW: Payslip Document — extracted data from payslip PDFs
// ============================================================================
model PayslipDocument {
  id              Int       @id @default(autoincrement()) @map("id")
  incomeId        Int       @map("income_id")
  income          Income    @relation(fields: [incomeId], references: [id], onDelete: Cascade)
  importId        Int?      @map("import_id")
  import          Import?   @relation(fields: [importId], references: [id], onDelete: SetNull)

  // Pay period
  payDate         DateTime  @map("pay_date")
  periodStart     DateTime  @map("period_start")
  periodEnd       DateTime  @map("period_end")
  payFrequency    String?   @map("pay_frequency") // Bi-weekly, Semi-monthly, etc.

  // Gross earnings
  grossPay        Float     @map("gross_pay")
  regularHours    Float?    @map("regular_hours")
  regularRate     Float?    @map("regular_rate")
  overtimeHours   Float?    @map("overtime_hours")
  overtimeRate    Float?    @map("overtime_rate")
  overtimePay     Float?    @map("overtime_pay")
  vacationPay     Float?    @map("vacation_pay")
  holidayPay      Float?    @map("holiday_pay")
  bonusPay        Float?    @map("bonus_pay")
  otherEarnings   Float?    @map("other_earnings")

  // Deductions total
  totalDeductions Float     @map("total_deductions")

  // Net pay
  netPay          Float     @map("net_pay")

  // YTD totals
  ytdGross        Float?    @map("ytd_gross")
  ytdDeductions   Float?    @map("ytd_deductions")
  ytdNet          Float?    @map("ytd_net")

  // Employer info (denormalized for document fidelity)
  employerName    String?   @map("employer_name")
  employeeId      String?   @map("employee_id")

  // Source document
  documentSchemaId Int?     @map("document_schema_id")
  documentSchema   DocumentSchema? @relation(fields: [documentSchemaId], references: [id])
  rawContent      String?   @map("raw_content") // Original extracted JSON

  notes           String?   @map("notes")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  // Relations
  deductions      PayslipDeduction[]
  taxes           PayslipTax[]
  benefits        PayslipBenefit[]

  @@unique([incomeId, payDate])
  @@index([incomeId])
  @@index([payDate])
  @@index([importId])
  @@map("payslip_document")
}

// Individual deduction line items
model PayslipDeduction {
  id              Int              @id @default(autoincrement()) @map("id")
  payslipId       Int              @map("payslip_id")
  payslip         PayslipDocument  @relation(fields: [payslipId], references: [id], onDelete: Cascade)
  name            String           @map("name") // e.g., "Union Dues", "Pension", "Parking"
  category        String           @default("other") @map("category") // tax, benefit, retirement, union, garnishment, other
  amount          Float            @map("amount")
  ytdAmount       Float?           @map("ytd_amount")
  isPreTax        Boolean          @default(false) @map("is_pre_tax")
  notes           String?          @map("notes")
  createdAt       DateTime         @default(now()) @map("created_at")

  @@index([payslipId])
  @@map("payslip_deduction")
}

// Tax withholdings (federal, provincial, CPP, EI, etc.)
model PayslipTax {
  id              Int              @id @default(autoincrement()) @map("id")
  payslipId       Int              @map("payslip_id")
  payslip         PayslipDocument  @relation(fields: [payslipId], references: [id], onDelete: Cascade)
  name            String           @map("name") // e.g., "Federal Tax", "Provincial Tax", "CPP", "EI"
  jurisdiction    String?          @map("jurisdiction") // "federal", "provincial", "municipal"
  amount          Float            @map("amount")
  ytdAmount       Float?           @map("ytd_amount")
  notes           String?          @map("notes")
  createdAt       DateTime         @default(now()) @map("created_at")

  @@index([payslipId])
  @@map("payslip_tax")
}

// Employer-paid benefits (health, dental, life insurance, RRSP match, etc.)
model PayslipBenefit {
  id              Int              @id @default(autoincrement()) @map("id")
  payslipId       Int              @map("payslip_id")
  payslip         PayslipDocument  @relation(fields: [payslipId], references: [id], onDelete: Cascade)
  name            String           @map("name") // e.g., "Health Insurance", "Dental", "Life Insurance"
  employeeAmount  Float            @default(0) @map("employee_amount") // Employee portion
  employerAmount  Float            @default(0) @map("employer_amount") // Employer contribution
  ytdEmployee     Float?           @map("ytd_employee")
  ytdEmployer     Float?           @map("ytd_employer")
  notes           String?          @map("notes")
  createdAt       DateTime         @default(now()) @map("created_at")

  @@index([payslipId])
  @@map("payslip_benefit")
}
```

### Receipt Models

```prisma
// ============================================================================
// NEW: Receipt — extracted data from receipt images/PDFs
// ============================================================================
model Receipt {
  id                Int          @id @default(autoincrement()) @map("id")
  transactionId     Int?         @map("transaction_id")
  transaction       Transaction? @relation(fields: [transactionId], references: [id], onDelete: SetNull)
  importId          Int?         @map("import_id")
  import            Import?      @relation(fields: [importId], references: [id], onDelete: SetNull)
  merchantId        Int?         @map("merchant_id")
  merchant          Merchant?    @relation(fields: [merchantId], references: [id], onDelete: SetNull)

  // Receipt header
  receiptDate       DateTime     @map("receipt_date")
  vendorName        String       @map("vendor_name")
  vendorAddress     String?      @map("vendor_address")
  vendorPhone       String?      @map("vendor_phone")

  // Totals
  subtotal          Float        @map("subtotal")
  taxTotal          Float        @default(0) @map("tax_total")
  tipAmount         Float        @default(0) @map("tip_amount")
  discountAmount    Float        @default(0) @map("discount_amount")
  total             Float        @map("total")

  // Tax breakdown (Canadian: GST/HST/PST/QST)
  gstAmount         Float?       @map("gst_amount")
  hstAmount         Float?       @map("hst_amount")
  pstAmount         Float?       @map("pst_amount")
  qstAmount         Float?       @map("qst_amount")

  // Payment info
  paymentMethod     String?      @map("payment_method") // Cash, Credit, Debit, etc.
  cardLast4         String?      @map("card_last4")

  // Reconciliation
  reconciliationStatus String    @default("unmatched") @map("reconciliation_status") // unmatched, matched, confirmed, discrepancy
  reconciliationNote   String?   @map("reconciliation_note")
  amountDifference     Float?    @map("amount_difference") // Difference between receipt total and transaction amount

  // Source document
  documentSchemaId  Int?         @map("document_schema_id")
  documentSchema    DocumentSchema? @relation(fields: [documentSchemaId], references: [id])
  rawContent        String?      @map("raw_content") // Original extracted JSON

  currency          String       @default("CAD") @map("currency")
  notes             String?      @map("notes")
  createdAt         DateTime     @default(now()) @map("created_at")
  updatedAt         DateTime     @updatedAt @map("updated_at")

  // Relations
  lineItems         ReceiptLineItem[]

  @@index([transactionId])
  @@index([merchantId])
  @@index([receiptDate])
  @@index([reconciliationStatus])
  @@index([importId])
  @@map("receipt")
}

// Individual line items on a receipt
model ReceiptLineItem {
  id          Int      @id @default(autoincrement()) @map("id")
  receiptId   Int      @map("receipt_id")
  receipt     Receipt  @relation(fields: [receiptId], references: [id], onDelete: Cascade)
  description String   @map("description")
  quantity    Float    @default(1) @map("quantity")
  unitPrice   Float    @map("unit_price")
  totalPrice  Float    @map("total_price")
  categoryId  Int?     @map("category_id")
  category    Category? @relation(fields: [categoryId], references: [id])
  sku         String?  @map("sku")
  isTaxable   Boolean  @default(true) @map("is_taxable")
  isDiscount  Boolean  @default(false) @map("is_discount")
  notes       String?  @map("notes")
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([receiptId])
  @@index([categoryId])
  @@map("receipt_line_item")
}
```

### Forecast Models (ForecastEntry, RecurrenceRule)

```prisma
// ============================================================================
// NEW: Recurrence Rule — defines how often a forecast repeats
// Follows iCalendar RRULE concepts (RFC 5545)
// ============================================================================
model RecurrenceRule {
  id            Int       @id @default(autoincrement()) @map("id")
  name          String    @map("name") // Human-readable: "Monthly Rent", "Bi-weekly Salary"
  frequency     String    @map("frequency") // daily, weekly, biweekly, semimonthly, monthly, quarterly, annually
  interval      Int       @default(1) @map("interval") // Every N frequencies (e.g., every 2 months)
  dayOfMonth    Int?      @map("day_of_month") // 1-31, for monthly/quarterly/annual
  dayOfWeek     Int?      @map("day_of_week") // 0=Sun, 1=Mon, ..., 6=Sat, for weekly/biweekly
  monthOfYear   Int?      @map("month_of_year") // 1-12, for annual
  weekOfMonth   Int?      @map("week_of_month") // 1-5, for "2nd Tuesday of month" patterns
  startDate     DateTime  @map("start_date")
  endDate       DateTime? @map("end_date") // null = no end
  maxOccurrences Int?     @map("max_occurrences") // Alternative to endDate

  // Source tracking
  source        String    @default("manual") @map("source") // manual, ai-detected, import-pattern
  aiConfidence  Float?    @map("ai_confidence") // 0.0-1.0 for AI-detected rules
  patternSource String?   @map("pattern_source") // Description of how AI detected this
  lastDetected  DateTime? @map("last_detected") // Last time AI confirmed this pattern

  isActive      Boolean   @default(true) @map("is_active")
  notes         String?   @map("notes")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  // Relations
  forecastEntries ForecastEntry[]

  @@index([isActive])
  @@index([source])
  @@map("recurrence_rule")
}

// ============================================================================
// NEW: Forecast Entry — individual projected/confirmed/reconciled transactions
// Lifecycle: projected -> confirmed -> reconciled (or missed/cancelled)
// ============================================================================
model ForecastEntry {
  id                Int        @id @default(autoincrement()) @map("id")

  // What
  description       String     @map("description")
  amount            Float      @map("amount") // Positive = income, Negative = expense
  type              String     @map("type") // income, expense, transfer

  // When
  expectedDate      DateTime   @map("expected_date")
  actualDate        DateTime?  @map("actual_date") // Set when reconciled

  // Status lifecycle
  // projected: future predicted occurrence
  // confirmed: user confirmed it will happen
  // reconciled: matched to actual transaction
  // missed: expected but didn't happen
  // cancelled: user cancelled this occurrence
  status            String     @default("projected") @map("status")

  // Linked entities
  merchantId        Int?       @map("merchant_id")
  merchant          Merchant?  @relation(fields: [merchantId], references: [id])
  incomeId          Int?       @map("income_id")
  income            Income?    @relation(fields: [incomeId], references: [id])
  categoryId        Int?       @map("category_id")
  category          Category?  @relation(fields: [categoryId], references: [id])
  accountId         Int?       @map("account_id")
  account           Account?   @relation(fields: [accountId], references: [id])
  personId          Int?       @map("person_id")
  person            Person?    @relation(fields: [personId], references: [id])

  // Recurrence link (null for one-off forecasts)
  recurrenceRuleId  Int?       @map("recurrence_rule_id")
  recurrenceRule    RecurrenceRule? @relation(fields: [recurrenceRuleId], references: [id], onDelete: SetNull)
  occurrenceIndex   Int?       @map("occurrence_index") // Which occurrence of the rule (1st, 2nd, etc.)

  // Reconciliation
  transactionId     Int?       @map("transaction_id") // Linked actual transaction
  transaction       Transaction? @relation(fields: [transactionId], references: [id], onDelete: SetNull)
  amountDifference  Float?     @map("amount_difference") // Actual - Expected
  dateDifference    Int?       @map("date_difference") // Days between expected and actual

  // AI metadata
  aiConfidence      Float?     @map("ai_confidence") // 0.0-1.0
  aiSource          String?    @map("ai_source") // Which AI model/method generated this
  aiGeneratedAt     DateTime?  @map("ai_generated_at")

  // Variance tracking
  amountMin         Float?     @map("amount_min") // Historical min for this recurring item
  amountMax         Float?     @map("amount_max") // Historical max
  amountAvg         Float?     @map("amount_avg") // Historical average

  notes             String?    @map("notes")
  createdAt         DateTime   @default(now()) @map("created_at")
  updatedAt         DateTime   @updatedAt @map("updated_at")

  @@index([status])
  @@index([expectedDate])
  @@index([status, expectedDate])
  @@index([merchantId])
  @@index([incomeId])
  @@index([categoryId])
  @@index([accountId])
  @@index([recurrenceRuleId])
  @@index([transactionId])
  @@map("forecast_entry")
}
```

### Savings Goals Model

```prisma
// ============================================================================
// NEW: Savings Goal — tracks progress toward financial targets
// ============================================================================
model SavingsGoal {
  id              Int       @id @default(autoincrement()) @map("id")
  name            String    @map("name")
  description     String?   @map("description")

  // Target
  targetAmount    Float     @map("target_amount")
  currentAmount   Float     @default(0) @map("current_amount")
  deadline        DateTime? @map("deadline")

  // Linked account (where savings are held)
  accountId       Int?      @map("account_id")
  account         Account?  @relation(fields: [accountId], references: [id])

  // Contribution plan
  monthlyTarget   Float?    @map("monthly_target") // Suggested monthly contribution
  autoContribute  Boolean   @default(false) @map("auto_contribute") // Auto-detect contributions

  // Status
  status          String    @default("active") @map("status") // active, paused, completed, abandoned
  completedAt     DateTime? @map("completed_at")

  // Visual
  color           String?   @map("color") // Hex color for UI
  icon            String?   @map("icon") // Lucide icon name
  priority        Int       @default(0) @map("priority") // Sort order

  // Category link (for tracking related spending reductions)
  categoryId      Int?      @map("category_id")
  category        Category? @relation(fields: [categoryId], references: [id])
  personId        Int?      @map("person_id")
  person          Person?   @relation(fields: [personId], references: [id])

  notes           String?   @map("notes")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  // Relations
  contributions   SavingsContribution[]

  @@index([status])
  @@index([accountId])
  @@index([deadline])
  @@map("savings_goal")
}

// Individual contributions toward a savings goal
model SavingsContribution {
  id              Int          @id @default(autoincrement()) @map("id")
  goalId          Int          @map("goal_id")
  goal            SavingsGoal  @relation(fields: [goalId], references: [id], onDelete: Cascade)
  amount          Float        @map("amount")
  date            DateTime     @map("date")
  transactionId   Int?         @map("transaction_id")
  transaction     Transaction? @relation(fields: [transactionId], references: [id], onDelete: SetNull)
  source          String       @default("manual") @map("source") // manual, auto-detected, transfer
  notes           String?      @map("notes")
  createdAt       DateTime     @default(now()) @map("created_at")

  @@index([goalId])
  @@index([date])
  @@index([transactionId])
  @@map("savings_contribution")
}
```

### Auto-Learning Metadata

Add fields to existing `MerchantPattern` and `IncomePattern` tables to track AI-originated patterns:

```prisma
// Changes to MerchantPattern — add auto-learning metadata
model MerchantPattern {
  id         Int      @id @default(autoincrement()) @map("id")
  merchantId Int      @map("merchant_id")
  merchant   Merchant @relation(fields: [merchantId], references: [id], onDelete: Cascade)
  pattern    String   @unique @map("pattern")
  priority   Int      @default(0) @map("priority")

  // NEW: Auto-learning metadata
  source        String   @default("manual") @map("source") // manual, ai-learned, ai-suggested, import-auto
  aiConfidence  Float?   @map("ai_confidence") // Confidence at time of creation (0.0-1.0)
  matchCount    Int      @default(0) @map("match_count") // Times this pattern has matched since creation
  lastMatchedAt DateTime? @map("last_matched_at") // Last time pattern matched a transaction
  createdBy     String?  @map("created_by") // "system", "user", "ai-resolve", "ai-import"

  notes      String?  @map("notes")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  @@index([source])
  @@map("merchant_pattern")
}

// Changes to IncomePattern — add auto-learning metadata
model IncomePattern {
  id        Int      @id @default(autoincrement()) @map("id")
  incomeId  Int      @map("income_id")
  income    Income   @relation(fields: [incomeId], references: [id], onDelete: Cascade)
  pattern   String   @unique @map("pattern")
  priority  Int      @default(10) @map("priority")

  // NEW: Auto-learning metadata
  source        String   @default("manual") @map("source") // manual, ai-learned, ai-suggested, import-auto
  aiConfidence  Float?   @map("ai_confidence") // Confidence at time of creation (0.0-1.0)
  matchCount    Int      @default(0) @map("match_count") // Times this pattern has matched since creation
  lastMatchedAt DateTime? @map("last_matched_at") // Last time pattern matched a transaction
  createdBy     String?  @map("created_by") // "system", "user", "ai-resolve", "ai-import"

  notes     String?  @map("notes")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([source])
  @@map("income_pattern")
}
```

### AI Operation Log

A general-purpose table for tracking all AI operations across features, replacing the need to embed AI metrics in domain-specific tables.

```prisma
// ============================================================================
// NEW: AI Operation Log — tracks all AI calls across features
// Replaces per-table AI metric fields (Import.extractDurationMs, etc.)
// ============================================================================
model AiOperationLog {
  id              Int       @id @default(autoincrement()) @map("id")

  // What operation
  operationType   String    @map("operation_type")
  // Types: pdf-extract, receipt-extract, payslip-extract,
  //        ai-resolve, ai-categorize, pattern-detect, forecast-generate

  // Context
  entityType      String?   @map("entity_type") // Import, StagingTransaction, Receipt, PayslipDocument, ForecastEntry
  entityId        Int?      @map("entity_id") // ID of the related entity

  // Status
  status          String    @default("started") @map("status") // started, success, error, cancelled

  // Input/Output
  inputSummary    String?   @map("input_summary") // Brief description of input (not full content)
  outputSummary   String?   @map("output_summary") // Brief description of result
  inputTokens     Int?      @map("input_tokens")
  outputTokens    Int?      @map("output_tokens")
  cacheTokens     Int?      @map("cache_tokens")

  // Cost & Performance
  durationMs      Int?      @map("duration_ms")
  costUsd         Float?    @map("cost_usd")

  // AI Model info
  modelName       String?   @map("model_name") // claude-sonnet-4-5-20250929, etc.
  modelProvider   String?   @map("model_provider") // anthropic, openai, local

  // Error details
  errorMessage    String?   @map("error_message")
  errorCode       String?   @map("error_code")

  // Quality tracking
  userAccepted    Boolean?  @map("user_accepted") // Did user accept the AI result?
  userFeedback    String?   @map("user_feedback") // Optional feedback

  // Metadata
  metadata        String?   @map("metadata") // JSON blob for operation-specific data

  createdAt       DateTime  @default(now()) @map("created_at")

  @@index([operationType])
  @@index([entityType, entityId])
  @@index([status])
  @@index([createdAt])
  @@index([operationType, createdAt])
  @@map("ai_operation_log")
}
```

---

## Relation Updates to Existing Models

The new models require adding relation arrays to existing models. Here are all the required changes:

```prisma
// Import — add relations
model Import {
  // ... existing fields ...
  payslipDocuments  PayslipDocument[]
  receipts          Receipt[]
}

// Transaction — add relations
model Transaction {
  // ... existing fields ...
  receipt             Receipt?
  forecastEntries     ForecastEntry[]
  savingsContributions SavingsContribution[]
}

// Merchant — add relation
model Merchant {
  // ... existing fields ...
  receipts          Receipt[]
  forecastEntries   ForecastEntry[]
}

// Income — add relations
model Income {
  // ... existing fields ...
  salaryChanges      SalaryChange[]       // renamed from payslips
  payslipDocuments   PayslipDocument[]     // new
  forecastEntries    ForecastEntry[]
}

// Category — add relations
model Category {
  // ... existing fields ...
  receiptLineItems    ReceiptLineItem[]
  forecastEntries     ForecastEntry[]
  savingsGoals        SavingsGoal[]
}

// Account — add relations
model Account {
  // ... existing fields ...
  forecastEntries     ForecastEntry[]
  savingsGoals        SavingsGoal[]
}

// Person — add relations
model Person {
  // ... existing fields ...
  forecastEntries     ForecastEntry[]
  savingsGoals        SavingsGoal[]
}

// DocumentSchema — add relations
model DocumentSchema {
  // ... existing fields ...
  payslipDocuments    PayslipDocument[]
  receipts            Receipt[]
}
```

---

## Seed Data Recommendations

### Current Coverage Assessment

| Table | Seeded? | Count | Assessment |
|-------|---------|-------|------------|
| Institution | Yes | ~20 | Good — major Canadian banks covered |
| CategoryGroup | Yes | ~8 | Good — Income, Housing, Transport, etc. |
| Category | Yes | ~60+ | Good — comprehensive with hierarchy |
| Merchant | Yes | ~50+ | Good — common Canadian merchants |
| MerchantPattern | Yes | ~80+ | Good — multiple patterns per merchant |
| Employer | Yes | ~15 | Good — sample employers |
| Income | Yes | ~20 | Good — employment, government, investment |
| IncomePattern | Yes | ~30+ | Good — common deposit descriptions |
| DocumentSchema | Yes | 2 | **Needs expansion** — only Triangle MC and RBC |
| Person | No | 0 | OK — user-created |
| Account | No | 0 | OK — auto-created from imports |
| BudgetPeriod | No | 0 | OK — auto-created by cron |
| Payslip/SalaryChange | No | 0 | OK — user-created |

### Recommendations

1. **Add more DocumentSchemas**: TD Visa, BMO Mastercard, CIBC Visa, Scotiabank, Desjardins, PC Financial, Tangerine — these cover most Canadian credit cards and banks.

2. **Add payslip DocumentSchemas**: ADP, Ceridian Dayforce, Workday, BambooHR — common payroll providers.

3. **Add receipt DocumentSchemas**: Standard receipt formats for Costco, Walmart, Shoppers Drug Mart, grocery stores.

4. **Seed RecurrenceRule examples**: Common recurring expenses (rent, utilities, subscriptions) and income patterns (bi-weekly salary, monthly pension) for the forecast feature.

5. **Seed sample SavingsGoal templates**: Emergency fund, vacation, RRSP contribution, TFSA contribution — common Canadian savings goals with suggested targets.

6. **Add `source` field seed values**: When seeding MerchantPattern/IncomePattern, set `source: "seed"` to distinguish from user-created patterns.

---

## Migration Strategy

### Phase 1: Non-Breaking Index Additions
**Risk: None — additive only**

```bash
npx prisma migrate dev --name add-missing-indexes
```

Add all missing indexes listed in the analysis. This is purely additive and won't affect existing data.

### Phase 2: Rename Payslip → SalaryChange
**Risk: Low — requires code changes**

1. Create migration that:
   - Creates new `salary_change` table with identical schema to `payslip`
   - Copies all data from `payslip` to `salary_change`
   - Drops `payslip` table
2. Update all code references: `Payslip` → `SalaryChange`, `payslip` → `salaryChange`
3. Update seed data references

Files to update:
- `prisma/schema.prisma`
- `src/app/income/actions/history-actions.ts`
- `src/app/income/actions/income-source-actions.ts`
- `src/app/income/page.tsx` (if referencing payslip)

### Phase 3: Add Auto-Learning Fields to Pattern Tables
**Risk: Low — nullable fields**

```bash
npx prisma migrate dev --name add-pattern-learning-metadata
```

Add `source`, `aiConfidence`, `matchCount`, `lastMatchedAt`, `createdBy` to both pattern tables. All nullable or with defaults, so existing patterns are unaffected.

### Phase 4: Add AI Operation Log
**Risk: None — new table**

```bash
npx prisma migrate dev --name add-ai-operation-log
```

New standalone table with no FK dependencies on existing tables.

### Phase 5: Add Cascade Deletes
**Risk: Low — behavioral change**

```bash
npx prisma migrate dev --name add-cascade-deletes
```

Add `onDelete: Cascade` to:
- `StagingTransaction.import` (Import → StagingTransaction)
- `Position.employer` (Employer → Position)

### Phase 6: Add Receipt Models
**Risk: None — new tables**

```bash
npx prisma migrate dev --name add-receipt-models
```

New tables: `receipt`, `receipt_line_item`. Requires adding relation arrays to existing models.

### Phase 7: Add Payslip Document Models
**Risk: None — new tables**

```bash
npx prisma migrate dev --name add-payslip-document-models
```

New tables: `payslip_document`, `payslip_deduction`, `payslip_tax`, `payslip_benefit`.

### Phase 8: Add Forecast Models
**Risk: None — new tables**

```bash
npx prisma migrate dev --name add-forecast-models
```

New tables: `recurrence_rule`, `forecast_entry`.

### Phase 9: Add Savings Goal Models
**Risk: None — new tables**

```bash
npx prisma migrate dev --name add-savings-goal-models
```

New tables: `savings_goal`, `savings_contribution`.

---

## Additional Proposals

### Proposal 1: Tag System

A flexible tagging system that allows users to add custom labels to transactions, merchants, and receipts. Unlike categories (hierarchical, one-per-transaction), tags are flat and many-to-many.

**Use cases:**
- "reimbursable" tag for work expenses
- "shared-expense" for splitting with partner
- "tax-deductible" for tax season
- "impulse-buy" for spending awareness
- Project-based tags: "kitchen-reno", "vacation-2025"

```prisma
model Tag {
  id        Int      @id @default(autoincrement()) @map("id")
  name      String   @unique @map("name")
  color     String?  @map("color")
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  transactionTags TransactionTag[]

  @@map("tag")
}

model TransactionTag {
  id            Int         @id @default(autoincrement()) @map("id")
  transactionId Int         @map("transaction_id")
  transaction   Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  tagId         Int         @map("tag_id")
  tag           Tag         @relation(fields: [tagId], references: [id], onDelete: Cascade)
  createdAt     DateTime    @default(now()) @map("created_at")

  @@unique([transactionId, tagId])
  @@index([transactionId])
  @@index([tagId])
  @@map("transaction_tag")
}
```

### Proposal 2: Notification / Alert Model

For budget threshold alerts, upcoming bill reminders, and unusual spending notifications.

```prisma
model Alert {
  id            Int       @id @default(autoincrement()) @map("id")
  type          String    @map("type")
  // Types: budget-threshold, bill-upcoming, unusual-spending,
  //        forecast-missed, goal-milestone, pattern-detected

  title         String    @map("title")
  message       String    @map("message")
  severity      String    @default("info") @map("severity") // info, warning, critical

  // Context
  entityType    String?   @map("entity_type") // Category, ForecastEntry, SavingsGoal, etc.
  entityId      Int?      @map("entity_id")
  actionUrl     String?   @map("action_url") // Deep link to relevant page

  // Status
  isRead        Boolean   @default(false) @map("is_read")
  isDismissed   Boolean   @default(false) @map("is_dismissed")
  readAt        DateTime? @map("read_at")

  createdAt     DateTime  @default(now()) @map("created_at")
  expiresAt     DateTime? @map("expires_at")

  @@index([isRead, isDismissed])
  @@index([type])
  @@index([createdAt])
  @@map("alert")
}
```

### Proposal 3: Audit Log

Track all user-initiated data changes for accountability and undo capability. Particularly valuable for a finance app where accidental deletions or modifications could lose important data.

```prisma
model AuditLog {
  id          Int      @id @default(autoincrement()) @map("id")
  action      String   @map("action") // create, update, delete, import, approve, reject
  entityType  String   @map("entity_type") // Transaction, Merchant, Category, etc.
  entityId    Int      @map("entity_id")

  // Change details
  fieldName   String?  @map("field_name") // Which field changed (for updates)
  oldValue    String?  @map("old_value") // Previous value (JSON-encoded)
  newValue    String?  @map("new_value") // New value (JSON-encoded)

  // Context
  source      String   @default("user") @map("source") // user, system, ai, import, cron
  metadata    String?  @map("metadata") // Additional JSON context

  createdAt   DateTime @default(now()) @map("created_at")

  @@index([entityType, entityId])
  @@index([action])
  @@index([createdAt])
  @@index([source])
  @@map("audit_log")
}
```

---

## Appendix: Complete Proposed Schema

Below is the complete proposed schema with all changes integrated. Existing models show only modified/added fields with `// NEW` or `// CHANGED` comments.

```prisma
// Prisma schema for FinTrack
// Core tables: Import, StagingTransaction, Transaction
// New: PayslipDocument, Receipt, ForecastEntry, RecurrenceRule, SavingsGoal, AiOperationLog, Tag, Alert, AuditLog

generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "sqlite"
}

// ============================================================================
// IMPORT PIPELINE
// ============================================================================

model Import {
  id                   Int       @id @default(autoincrement()) @map("id")
  fileName             String    @map("file_name")
  sourceType           String    @map("source_type")
  accountId            Int?      @map("account_id")
  account              Account?  @relation(fields: [accountId], references: [id])
  periodStart          DateTime? @map("period_start")
  periodEnd            DateTime? @map("period_end")
  openingBalance       Float?    @map("opening_balance")
  closingBalance       Float?    @map("closing_balance")
  transactionCount     Int       @default(0) @map("transaction_count")
  addedCount           Int       @default(0) @map("added_count")
  matchedCount         Int       @default(0) @map("matched_count")
  unknownCount         Int       @default(0) @map("unknown_count")
  content              String?   @map("content")
  fileHash             String?   @unique @map("file_hash")
  status               String    @default("staged") @map("status")
  processedAt          DateTime? @map("processed_at")
  aiStatus             String    @default("idle") @map("ai_status")
  aiStartedAt          DateTime? @map("ai_started_at")
  aiResult             String?   @map("ai_result")
  extractDurationMs    Int?      @map("extract_duration_ms")
  extractCostUsd       Float?    @map("extract_cost_usd")
  extractInputTokens   Int?      @map("extract_input_tokens")
  extractOutputTokens  Int?      @map("extract_output_tokens")
  extractCacheTokens   Int?      @map("extract_cache_tokens")
  extractPdfSizeBytes  Int?      @map("extract_pdf_size_bytes")
  createdAt            DateTime  @default(now()) @map("created_at")
  updatedAt            DateTime  @updatedAt @map("updated_at")

  stagingTransactions StagingTransaction[]
  transactions        Transaction[]
  payslipDocuments    PayslipDocument[]       // NEW
  receipts            Receipt[]               // NEW

  @@index([status])
  @@index([accountId])                        // NEW
  @@map("import")
}

model StagingTransaction {
  id                   Int       @id @default(autoincrement()) @map("id")
  importBatchId        String    @map("import_batch_id")
  rawDate              String?   @map("raw_date")
  rawDescription       String?   @map("raw_description")
  rawAmount            Float?    @map("raw_amount")
  accountId            Int?      @map("account_id")
  account              Account?  @relation(fields: [accountId], references: [id])
  postingDate          DateTime? @map("posting_date")
  cardNumber           String?   @map("card_number")
  location             String?   @map("location")
  foreignCurrency      String?   @map("foreign_currency")
  runningBalance       Float?    @map("running_balance")
  transactionType      String?   @map("transaction_type")
  referenceNumber      String?   @map("reference_number")
  terminalId           String?   @map("terminal_id")
  targetAccount        String?   @map("target_account")
  sourceAccount        String?   @map("source_account")
  categoryHint         String?   @map("category_hint")
  resolvedDate         DateTime? @map("resolved_date")
  merchantId           Int?      @map("merchant_id")
  merchant             Merchant? @relation(fields: [merchantId], references: [id])
  categoryId           Int?      @map("category_id")
  category             Category? @relation(fields: [categoryId], references: [id])
  incomeId             Int?      @map("income_id")
  income               Income?   @relation(fields: [incomeId], references: [id])
  personId             Int?      @map("person_id")
  person               Person?   @relation(fields: [personId], references: [id])
  status               String    @default("pending") @map("status")
  matchConfidence      Float?    @map("match_confidence")
  notes                String?   @map("notes")
  createdAt            DateTime  @default(now()) @map("created_at")
  importId             Int?      @map("import_id")
  import               Import?   @relation(fields: [importId], references: [id], onDelete: Cascade) // CHANGED: added Cascade

  @@index([status])
  @@index([importBatchId])
  @@index([importId])                         // NEW
  @@index([merchantId])                       // NEW
  @@index([incomeId])                         // NEW
  @@index([categoryId])                       // NEW
  @@index([accountId])                        // NEW
  @@map("staging_transaction")
}

model Transaction {
  id                  Int       @id @default(autoincrement()) @map("id")
  date                DateTime  @map("date")
  description         String    @map("description")
  originalDescription String?   @map("original_description")
  amount              Float     @map("amount")
  accountId           Int?      @map("account_id")
  account             Account?  @relation(fields: [accountId], references: [id])
  categoryId          Int?      @map("category_id")
  category            Category? @relation(fields: [categoryId], references: [id])
  merchantId          Int?      @map("merchant_id")
  merchant            Merchant? @relation(fields: [merchantId], references: [id])
  personId            Int?      @map("person_id")
  person              Person?   @relation(fields: [personId], references: [id])
  incomeId            Int?      @map("income_id")
  income              Income?   @relation(fields: [incomeId], references: [id])
  postingDate         DateTime? @map("posting_date")
  cardNumber          String?   @map("card_number")
  location            String?   @map("location")
  foreignCurrency     String?   @map("foreign_currency")
  runningBalance      Float?    @map("running_balance")
  transactionType     String?   @map("transaction_type")
  referenceNumber     String?   @map("reference_number")
  terminalId          String?   @map("terminal_id")
  targetAccount       String?   @map("target_account")
  sourceAccount       String?   @map("source_account")
  importId            Int?      @map("import_id")
  import              Import?   @relation(fields: [importId], references: [id])
  isPredicted         Boolean   @default(false) @map("is_predicted")
  isRecurring         Boolean   @default(false) @map("is_recurring")
  recurringId         Int?      @map("recurring_id")
  hasAllocations      Boolean   @default(false) @map("has_allocations")
  notes               String?   @map("notes")
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")

  receipt              Receipt?               // NEW
  forecastEntries      ForecastEntry[]        // NEW
  savingsContributions SavingsContribution[]  // NEW
  transactionTags      TransactionTag[]       // NEW

  @@index([date])
  @@index([merchantId])                       // NEW
  @@index([incomeId])                         // NEW
  @@index([categoryId, date])                 // NEW
  @@index([accountId])                        // NEW
  @@index([personId])                         // NEW
  @@index([importId])                         // NEW
  @@map("transaction")
}

// ============================================================================
// MASTER DATA
// ============================================================================

model Merchant {
  id                Int       @id @default(autoincrement()) @map("id")
  name              String    @unique @map("name")
  categoryId        Int?      @map("category_id")
  category          Category? @relation(fields: [categoryId], references: [id])
  personId          Int?      @map("person_id")
  person            Person?   @relation(fields: [personId], references: [id])
  accountId         Int?      @map("account_id")
  account           Account?  @relation(fields: [accountId], references: [id])
  type              String?   @map("type")
  website           String?   @map("website")
  hasAlternative    Boolean   @default(false) @map("has_alternative")
  alternativeName   String?   @map("alternative_name")
  alternativeSavings Float?   @map("alternative_savings")
  isImpulseProne    Boolean   @default(false) @map("is_impulse_prone")
  isActive          Boolean   @default(true) @map("is_active")
  notes             String?   @map("notes")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  patterns             MerchantPattern[]
  stagingTransactions  StagingTransaction[]
  transactions         Transaction[]
  receipts             Receipt[]              // NEW
  forecastEntries      ForecastEntry[]        // NEW

  @@index([isActive])                         // NEW
  @@map("merchant")
}

model Institution {
  id        Int      @id @default(autoincrement()) @map("id")
  name      String   @unique @map("name")
  type      String   @map("type")
  website   String?  @map("website")
  isActive  Boolean  @default(false) @map("is_active")
  notes     String?  @map("notes")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  accounts Account[]

  @@map("institution")
}

model Person {
  id        Int      @id @default(autoincrement()) @map("id")
  name      String   @unique @map("name")
  email     String?  @map("email")
  isActive  Boolean  @default(true) @map("is_active")
  notes     String?  @map("notes")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  accounts            Account[]
  merchants           Merchant[]
  transactions        Transaction[]
  stagingTransactions StagingTransaction[]
  incomes             Income[]
  forecastEntries     ForecastEntry[]       // NEW
  savingsGoals        SavingsGoal[]         // NEW

  @@map("person")
}

model Account {
  id              Int          @id @default(autoincrement()) @map("id")
  name            String       @map("name")
  number          String?      @map("number")
  institutionId   Int?         @map("institution_id")
  institution     Institution? @relation(fields: [institutionId], references: [id])
  type            String       @map("type")
  nickname        String?      @map("nickname")
  currency        String       @default("CAD") @map("currency")
  creditLimit     Float?       @map("credit_limit")
  interestRate    Float?       @map("interest_rate")
  billingCycleDay Int?         @map("billing_cycle_day")
  monthlyLimit    Float?       @map("monthly_limit")
  isJoint         Boolean      @default(false) @map("is_joint")
  ownerId         Int?         @map("owner_id")
  owner           Person?      @relation(fields: [ownerId], references: [id])
  isActive        Boolean      @default(true) @map("is_active")
  notes           String?      @map("notes")
  createdAt       DateTime     @default(now()) @map("created_at")
  updatedAt       DateTime     @updatedAt @map("updated_at")

  imports             Import[]
  stagingTransactions StagingTransaction[]
  transactions        Transaction[]
  merchants           Merchant[]
  incomes             Income[]
  budgetPeriods       BudgetPeriod[]
  forecastEntries     ForecastEntry[]       // NEW
  savingsGoals        SavingsGoal[]         // NEW

  @@unique([name, institutionId])
  @@index([institutionId])                   // NEW
  @@index([ownerId])                         // NEW
  @@index([type])                            // NEW
  @@map("account")
}

// ============================================================================
// PATTERN MATCHING
// ============================================================================

model MerchantPattern {
  id         Int      @id @default(autoincrement()) @map("id")
  merchantId Int      @map("merchant_id")
  merchant   Merchant @relation(fields: [merchantId], references: [id], onDelete: Cascade)
  pattern    String   @unique @map("pattern")
  priority   Int      @default(0) @map("priority")
  source        String    @default("manual") @map("source")         // NEW
  aiConfidence  Float?    @map("ai_confidence")                     // NEW
  matchCount    Int       @default(0) @map("match_count")           // NEW
  lastMatchedAt DateTime? @map("last_matched_at")                   // NEW
  createdBy     String?   @map("created_by")                        // NEW
  notes      String?  @map("notes")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  @@index([source])                          // NEW
  @@map("merchant_pattern")
}

model IncomePattern {
  id        Int      @id @default(autoincrement()) @map("id")
  incomeId  Int      @map("income_id")
  income    Income   @relation(fields: [incomeId], references: [id], onDelete: Cascade)
  pattern   String   @unique @map("pattern")
  priority  Int      @default(10) @map("priority")
  source        String    @default("manual") @map("source")         // NEW
  aiConfidence  Float?    @map("ai_confidence")                     // NEW
  matchCount    Int       @default(0) @map("match_count")           // NEW
  lastMatchedAt DateTime? @map("last_matched_at")                   // NEW
  createdBy     String?   @map("created_by")                        // NEW
  notes     String?  @map("notes")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([source])                          // NEW
  @@map("income_pattern")
}

// ============================================================================
// CATEGORIES & BUDGETS
// ============================================================================

model CategoryGroup {
  id        Int      @id @default(autoincrement()) @map("id")
  name      String   @unique @map("name")
  type      String   @map("type")
  color     String?  @map("color")
  sortOrder Int?     @map("sort_order")
  isActive  Boolean  @default(true) @map("is_active")
  notes     String?  @map("notes")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  categories Category[]

  @@map("category_group")
}

model Category {
  id               Int            @id @default(autoincrement()) @map("id")
  name             String         @unique @map("name")
  groupId          Int?           @map("group_id")
  group            CategoryGroup? @relation(fields: [groupId], references: [id])
  parentId         Int?           @map("parent_id")
  parent           Category?      @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children         Category[]     @relation("CategoryHierarchy")
  color            String?        @map("color")
  necessityLevel   String         @default("Discretionary") @map("necessity_level")
  monthlyBudget    Float?         @map("monthly_budget")
  sortOrder        Int?           @map("sort_order")
  isActive         Boolean        @default(true) @map("is_active")
  notes            String?        @map("notes")
  createdAt        DateTime       @default(now()) @map("created_at")
  updatedAt        DateTime       @updatedAt @map("updated_at")

  merchants            Merchant[]
  incomes              Income[]
  stagingTransactions  StagingTransaction[]
  transactions         Transaction[]
  budgetPeriods        BudgetPeriod[]
  receiptLineItems     ReceiptLineItem[]     // NEW
  forecastEntries      ForecastEntry[]       // NEW
  savingsGoals         SavingsGoal[]         // NEW

  @@index([groupId])                         // NEW
  @@index([parentId])                        // NEW
  @@map("category")
}

model BudgetPeriod {
  id             Int       @id @default(autoincrement()) @map("id")
  categoryId     Int       @map("category_id")
  category       Category  @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  accountId      Int?      @map("account_id")
  account        Account?  @relation(fields: [accountId], references: [id])
  periodStart    DateTime  @map("period_start")
  periodEnd      DateTime  @map("period_end")
  budgetedAmount Float     @map("budgeted_amount")
  actualSpent    Float     @default(0) @map("actual_spent")
  status         String    @default("open") @map("status")
  closedAt       DateTime? @map("closed_at")
  notes          String?   @map("notes")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  @@unique([categoryId, periodStart])
  @@index([status])
  @@index([categoryId, status])              // NEW
  @@index([status, periodEnd])               // NEW
  @@map("budget_period")
}

// ============================================================================
// EMPLOYMENT & INCOME
// ============================================================================

model Employer {
  id        Int      @id @default(autoincrement()) @map("id")
  name      String   @unique @map("name")
  industry  String?  @map("industry")
  location  String?  @map("location")
  website   String?  @map("website")
  isActive  Boolean  @default(true) @map("is_active")
  notes     String?  @map("notes")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  positions Position[]

  @@map("employer")
}

model Position {
  id         Int       @id @default(autoincrement()) @map("id")
  title      String    @map("title")
  department String?   @map("department")
  employerId Int       @map("employer_id")
  employer   Employer  @relation(fields: [employerId], references: [id], onDelete: Cascade) // CHANGED: added Cascade
  startDate  DateTime? @map("start_date")
  endDate    DateTime? @map("end_date")
  isActive   Boolean   @default(true) @map("is_active")
  notes      String?   @map("notes")
  createdAt  DateTime  @default(now()) @map("created_at")
  updatedAt  DateTime  @updatedAt @map("updated_at")

  incomes Income[]

  @@unique([title, employerId])
  @@index([employerId])                      // NEW
  @@map("position")
}

model Income {
  id               Int       @id @default(autoincrement()) @map("id")
  name             String    @unique @map("name")
  type             String    @default("Employment") @map("type")
  positionId       Int?      @map("position_id")
  position         Position? @relation(fields: [positionId], references: [id])
  personId         Int?      @map("person_id")
  person           Person?   @relation(fields: [personId], references: [id])
  categoryId       Int?      @map("category_id")
  category         Category? @relation(fields: [categoryId], references: [id])
  depositAccountId Int?      @map("deposit_account_id")
  depositAccount   Account?  @relation(fields: [depositAccountId], references: [id])
  payFrequency     String?   @map("pay_frequency")
  startDate        DateTime? @map("start_date")
  endDate          DateTime? @map("end_date")
  initialGross     Float?    @map("initial_gross")
  initialNet       Float?    @map("initial_net")
  currentGross     Float?    @map("current_gross")
  currentNet       Float?    @map("current_net")
  isActive         Boolean   @default(true) @map("is_active")
  notes            String?   @map("notes")
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")

  patterns            IncomePattern[]
  salaryChanges       SalaryChange[]        // CHANGED: renamed from payslips
  payslipDocuments    PayslipDocument[]      // NEW
  stagingTransactions StagingTransaction[]
  transactions        Transaction[]
  forecastEntries     ForecastEntry[]       // NEW

  @@index([isActive])                        // NEW
  @@map("income")
}

// RENAMED from Payslip -> SalaryChange
model SalaryChange {
  id            Int      @id @default(autoincrement()) @map("id")
  incomeId      Int      @map("income_id")
  income        Income   @relation(fields: [incomeId], references: [id], onDelete: Cascade)
  effectiveDate DateTime @map("effective_date")
  previousGross Float?   @map("previous_gross")
  previousNet   Float?   @map("previous_net")
  newGross      Float    @map("new_gross")
  newNet        Float    @map("new_net")
  changeReason  String   @map("change_reason")
  notes         String?  @map("notes")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@unique([incomeId, effectiveDate])
  @@map("salary_change")
}

// ============================================================================
// DOCUMENT SCHEMAS
// ============================================================================

model DocumentSchema {
  id              Int      @id @default(autoincrement()) @map("id")
  code            String   @unique @map("code")
  name            String   @map("name")
  documentType    String   @map("document_type")
  institutionName String?  @map("institution_name")
  version         String   @default("1.0") @map("version")
  sampleData      String   @map("sample_data")
  extractionNotes String?  @map("extraction_notes")
  isActive        Boolean  @default(true) @map("is_active")
  notes           String?  @map("notes")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  payslipDocuments PayslipDocument[]       // NEW
  receipts         Receipt[]              // NEW

  @@index([documentType])
  @@index([institutionName])
  @@map("document_schema")
}

// ============================================================================
// NEW: PAYSLIP DOCUMENTS
// ============================================================================

model PayslipDocument {
  id              Int       @id @default(autoincrement()) @map("id")
  incomeId        Int       @map("income_id")
  income          Income    @relation(fields: [incomeId], references: [id], onDelete: Cascade)
  importId        Int?      @map("import_id")
  import          Import?   @relation(fields: [importId], references: [id], onDelete: SetNull)
  payDate         DateTime  @map("pay_date")
  periodStart     DateTime  @map("period_start")
  periodEnd       DateTime  @map("period_end")
  payFrequency    String?   @map("pay_frequency")
  grossPay        Float     @map("gross_pay")
  regularHours    Float?    @map("regular_hours")
  regularRate     Float?    @map("regular_rate")
  overtimeHours   Float?    @map("overtime_hours")
  overtimeRate    Float?    @map("overtime_rate")
  overtimePay     Float?    @map("overtime_pay")
  vacationPay     Float?    @map("vacation_pay")
  holidayPay      Float?    @map("holiday_pay")
  bonusPay        Float?    @map("bonus_pay")
  otherEarnings   Float?    @map("other_earnings")
  totalDeductions Float     @map("total_deductions")
  netPay          Float     @map("net_pay")
  ytdGross        Float?    @map("ytd_gross")
  ytdDeductions   Float?    @map("ytd_deductions")
  ytdNet          Float?    @map("ytd_net")
  employerName    String?   @map("employer_name")
  employeeId      String?   @map("employee_id")
  documentSchemaId Int?     @map("document_schema_id")
  documentSchema   DocumentSchema? @relation(fields: [documentSchemaId], references: [id])
  rawContent      String?   @map("raw_content")
  notes           String?   @map("notes")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  deductions      PayslipDeduction[]
  taxes           PayslipTax[]
  benefits        PayslipBenefit[]

  @@unique([incomeId, payDate])
  @@index([incomeId])
  @@index([payDate])
  @@index([importId])
  @@map("payslip_document")
}

model PayslipDeduction {
  id              Int              @id @default(autoincrement()) @map("id")
  payslipId       Int              @map("payslip_id")
  payslip         PayslipDocument  @relation(fields: [payslipId], references: [id], onDelete: Cascade)
  name            String           @map("name")
  category        String           @default("other") @map("category")
  amount          Float            @map("amount")
  ytdAmount       Float?           @map("ytd_amount")
  isPreTax        Boolean          @default(false) @map("is_pre_tax")
  notes           String?          @map("notes")
  createdAt       DateTime         @default(now()) @map("created_at")

  @@index([payslipId])
  @@map("payslip_deduction")
}

model PayslipTax {
  id              Int              @id @default(autoincrement()) @map("id")
  payslipId       Int              @map("payslip_id")
  payslip         PayslipDocument  @relation(fields: [payslipId], references: [id], onDelete: Cascade)
  name            String           @map("name")
  jurisdiction    String?          @map("jurisdiction")
  amount          Float            @map("amount")
  ytdAmount       Float?           @map("ytd_amount")
  notes           String?          @map("notes")
  createdAt       DateTime         @default(now()) @map("created_at")

  @@index([payslipId])
  @@map("payslip_tax")
}

model PayslipBenefit {
  id              Int              @id @default(autoincrement()) @map("id")
  payslipId       Int              @map("payslip_id")
  payslip         PayslipDocument  @relation(fields: [payslipId], references: [id], onDelete: Cascade)
  name            String           @map("name")
  employeeAmount  Float            @default(0) @map("employee_amount")
  employerAmount  Float            @default(0) @map("employer_amount")
  ytdEmployee     Float?           @map("ytd_employee")
  ytdEmployer     Float?           @map("ytd_employer")
  notes           String?          @map("notes")
  createdAt       DateTime         @default(now()) @map("created_at")

  @@index([payslipId])
  @@map("payslip_benefit")
}

// ============================================================================
// NEW: RECEIPTS
// ============================================================================

model Receipt {
  id                Int          @id @default(autoincrement()) @map("id")
  transactionId     Int?         @unique @map("transaction_id")
  transaction       Transaction? @relation(fields: [transactionId], references: [id], onDelete: SetNull)
  importId          Int?         @map("import_id")
  import            Import?      @relation(fields: [importId], references: [id], onDelete: SetNull)
  merchantId        Int?         @map("merchant_id")
  merchant          Merchant?    @relation(fields: [merchantId], references: [id], onDelete: SetNull)
  receiptDate       DateTime     @map("receipt_date")
  vendorName        String       @map("vendor_name")
  vendorAddress     String?      @map("vendor_address")
  vendorPhone       String?      @map("vendor_phone")
  subtotal          Float        @map("subtotal")
  taxTotal          Float        @default(0) @map("tax_total")
  tipAmount         Float        @default(0) @map("tip_amount")
  discountAmount    Float        @default(0) @map("discount_amount")
  total             Float        @map("total")
  gstAmount         Float?       @map("gst_amount")
  hstAmount         Float?       @map("hst_amount")
  pstAmount         Float?       @map("pst_amount")
  qstAmount         Float?       @map("qst_amount")
  paymentMethod     String?      @map("payment_method")
  cardLast4         String?      @map("card_last4")
  reconciliationStatus String    @default("unmatched") @map("reconciliation_status")
  reconciliationNote   String?   @map("reconciliation_note")
  amountDifference     Float?    @map("amount_difference")
  documentSchemaId  Int?         @map("document_schema_id")
  documentSchema    DocumentSchema? @relation(fields: [documentSchemaId], references: [id])
  rawContent        String?      @map("raw_content")
  currency          String       @default("CAD") @map("currency")
  notes             String?      @map("notes")
  createdAt         DateTime     @default(now()) @map("created_at")
  updatedAt         DateTime     @updatedAt @map("updated_at")

  lineItems         ReceiptLineItem[]

  @@index([merchantId])
  @@index([receiptDate])
  @@index([reconciliationStatus])
  @@index([importId])
  @@map("receipt")
}

model ReceiptLineItem {
  id          Int      @id @default(autoincrement()) @map("id")
  receiptId   Int      @map("receipt_id")
  receipt     Receipt  @relation(fields: [receiptId], references: [id], onDelete: Cascade)
  description String   @map("description")
  quantity    Float    @default(1) @map("quantity")
  unitPrice   Float    @map("unit_price")
  totalPrice  Float    @map("total_price")
  categoryId  Int?     @map("category_id")
  category    Category? @relation(fields: [categoryId], references: [id])
  sku         String?  @map("sku")
  isTaxable   Boolean  @default(true) @map("is_taxable")
  isDiscount  Boolean  @default(false) @map("is_discount")
  notes       String?  @map("notes")
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([receiptId])
  @@index([categoryId])
  @@map("receipt_line_item")
}

// ============================================================================
// NEW: FORECASTING
// ============================================================================

model RecurrenceRule {
  id            Int       @id @default(autoincrement()) @map("id")
  name          String    @map("name")
  frequency     String    @map("frequency")
  interval      Int       @default(1) @map("interval")
  dayOfMonth    Int?      @map("day_of_month")
  dayOfWeek     Int?      @map("day_of_week")
  monthOfYear   Int?      @map("month_of_year")
  weekOfMonth   Int?      @map("week_of_month")
  startDate     DateTime  @map("start_date")
  endDate       DateTime? @map("end_date")
  maxOccurrences Int?     @map("max_occurrences")
  source        String    @default("manual") @map("source")
  aiConfidence  Float?    @map("ai_confidence")
  patternSource String?   @map("pattern_source")
  lastDetected  DateTime? @map("last_detected")
  isActive      Boolean   @default(true) @map("is_active")
  notes         String?   @map("notes")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  forecastEntries ForecastEntry[]

  @@index([isActive])
  @@index([source])
  @@map("recurrence_rule")
}

model ForecastEntry {
  id                Int        @id @default(autoincrement()) @map("id")
  description       String     @map("description")
  amount            Float      @map("amount")
  type              String     @map("type")
  expectedDate      DateTime   @map("expected_date")
  actualDate        DateTime?  @map("actual_date")
  status            String     @default("projected") @map("status")
  merchantId        Int?       @map("merchant_id")
  merchant          Merchant?  @relation(fields: [merchantId], references: [id])
  incomeId          Int?       @map("income_id")
  income            Income?    @relation(fields: [incomeId], references: [id])
  categoryId        Int?       @map("category_id")
  category          Category?  @relation(fields: [categoryId], references: [id])
  accountId         Int?       @map("account_id")
  account           Account?   @relation(fields: [accountId], references: [id])
  personId          Int?       @map("person_id")
  person            Person?    @relation(fields: [personId], references: [id])
  recurrenceRuleId  Int?       @map("recurrence_rule_id")
  recurrenceRule    RecurrenceRule? @relation(fields: [recurrenceRuleId], references: [id], onDelete: SetNull)
  occurrenceIndex   Int?       @map("occurrence_index")
  transactionId     Int?       @map("transaction_id")
  transaction       Transaction? @relation(fields: [transactionId], references: [id], onDelete: SetNull)
  amountDifference  Float?     @map("amount_difference")
  dateDifference    Int?       @map("date_difference")
  aiConfidence      Float?     @map("ai_confidence")
  aiSource          String?    @map("ai_source")
  aiGeneratedAt     DateTime?  @map("ai_generated_at")
  amountMin         Float?     @map("amount_min")
  amountMax         Float?     @map("amount_max")
  amountAvg         Float?     @map("amount_avg")
  notes             String?    @map("notes")
  createdAt         DateTime   @default(now()) @map("created_at")
  updatedAt         DateTime   @updatedAt @map("updated_at")

  @@index([status])
  @@index([expectedDate])
  @@index([status, expectedDate])
  @@index([merchantId])
  @@index([incomeId])
  @@index([categoryId])
  @@index([accountId])
  @@index([recurrenceRuleId])
  @@index([transactionId])
  @@map("forecast_entry")
}

// ============================================================================
// NEW: SAVINGS GOALS
// ============================================================================

model SavingsGoal {
  id              Int       @id @default(autoincrement()) @map("id")
  name            String    @map("name")
  description     String?   @map("description")
  targetAmount    Float     @map("target_amount")
  currentAmount   Float     @default(0) @map("current_amount")
  deadline        DateTime? @map("deadline")
  accountId       Int?      @map("account_id")
  account         Account?  @relation(fields: [accountId], references: [id])
  monthlyTarget   Float?    @map("monthly_target")
  autoContribute  Boolean   @default(false) @map("auto_contribute")
  status          String    @default("active") @map("status")
  completedAt     DateTime? @map("completed_at")
  color           String?   @map("color")
  icon            String?   @map("icon")
  priority        Int       @default(0) @map("priority")
  categoryId      Int?      @map("category_id")
  category        Category? @relation(fields: [categoryId], references: [id])
  personId        Int?      @map("person_id")
  person          Person?   @relation(fields: [personId], references: [id])
  notes           String?   @map("notes")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  contributions   SavingsContribution[]

  @@index([status])
  @@index([accountId])
  @@index([deadline])
  @@map("savings_goal")
}

model SavingsContribution {
  id              Int          @id @default(autoincrement()) @map("id")
  goalId          Int          @map("goal_id")
  goal            SavingsGoal  @relation(fields: [goalId], references: [id], onDelete: Cascade)
  amount          Float        @map("amount")
  date            DateTime     @map("date")
  transactionId   Int?         @map("transaction_id")
  transaction     Transaction? @relation(fields: [transactionId], references: [id], onDelete: SetNull)
  source          String       @default("manual") @map("source")
  notes           String?      @map("notes")
  createdAt       DateTime     @default(now()) @map("created_at")

  @@index([goalId])
  @@index([date])
  @@index([transactionId])
  @@map("savings_contribution")
}

// ============================================================================
// NEW: AI OPERATION LOG
// ============================================================================

model AiOperationLog {
  id              Int       @id @default(autoincrement()) @map("id")
  operationType   String    @map("operation_type")
  entityType      String?   @map("entity_type")
  entityId        Int?      @map("entity_id")
  status          String    @default("started") @map("status")
  inputSummary    String?   @map("input_summary")
  outputSummary   String?   @map("output_summary")
  inputTokens     Int?      @map("input_tokens")
  outputTokens    Int?      @map("output_tokens")
  cacheTokens     Int?      @map("cache_tokens")
  durationMs      Int?      @map("duration_ms")
  costUsd         Float?    @map("cost_usd")
  modelName       String?   @map("model_name")
  modelProvider   String?   @map("model_provider")
  errorMessage    String?   @map("error_message")
  errorCode       String?   @map("error_code")
  userAccepted    Boolean?  @map("user_accepted")
  userFeedback    String?   @map("user_feedback")
  metadata        String?   @map("metadata")
  createdAt       DateTime  @default(now()) @map("created_at")

  @@index([operationType])
  @@index([entityType, entityId])
  @@index([status])
  @@index([createdAt])
  @@index([operationType, createdAt])
  @@map("ai_operation_log")
}

// ============================================================================
// NEW: TAGS
// ============================================================================

model Tag {
  id        Int      @id @default(autoincrement()) @map("id")
  name      String   @unique @map("name")
  color     String?  @map("color")
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  transactionTags TransactionTag[]

  @@map("tag")
}

model TransactionTag {
  id            Int         @id @default(autoincrement()) @map("id")
  transactionId Int         @map("transaction_id")
  transaction   Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  tagId         Int         @map("tag_id")
  tag           Tag         @relation(fields: [tagId], references: [id], onDelete: Cascade)
  createdAt     DateTime    @default(now()) @map("created_at")

  @@unique([transactionId, tagId])
  @@index([transactionId])
  @@index([tagId])
  @@map("transaction_tag")
}

// ============================================================================
// NEW: ALERTS
// ============================================================================

model Alert {
  id            Int       @id @default(autoincrement()) @map("id")
  type          String    @map("type")
  title         String    @map("title")
  message       String    @map("message")
  severity      String    @default("info") @map("severity")
  entityType    String?   @map("entity_type")
  entityId      Int?      @map("entity_id")
  actionUrl     String?   @map("action_url")
  isRead        Boolean   @default(false) @map("is_read")
  isDismissed   Boolean   @default(false) @map("is_dismissed")
  readAt        DateTime? @map("read_at")
  createdAt     DateTime  @default(now()) @map("created_at")
  expiresAt     DateTime? @map("expires_at")

  @@index([isRead, isDismissed])
  @@index([type])
  @@index([createdAt])
  @@map("alert")
}

// ============================================================================
// NEW: AUDIT LOG
// ============================================================================

model AuditLog {
  id          Int      @id @default(autoincrement()) @map("id")
  action      String   @map("action")
  entityType  String   @map("entity_type")
  entityId    Int      @map("entity_id")
  fieldName   String?  @map("field_name")
  oldValue    String?  @map("old_value")
  newValue    String?  @map("new_value")
  source      String   @default("user") @map("source")
  metadata    String?  @map("metadata")
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([entityType, entityId])
  @@index([action])
  @@index([createdAt])
  @@index([source])
  @@map("audit_log")
}
```

### Model Count Summary

| Category | Models | Status |
|----------|--------|--------|
| Existing (unchanged) | 8 | Institution, Person, CategoryGroup, Category, BudgetPeriod, Employer, DocumentSchema, CategoryGroup |
| Existing (modified) | 9 | Import, StagingTransaction, Transaction, Merchant, Account, MerchantPattern, IncomePattern, Position, Income |
| Renamed | 1 | Payslip → SalaryChange |
| New (Payslip) | 4 | PayslipDocument, PayslipDeduction, PayslipTax, PayslipBenefit |
| New (Receipt) | 2 | Receipt, ReceiptLineItem |
| New (Forecast) | 2 | RecurrenceRule, ForecastEntry |
| New (Savings) | 2 | SavingsGoal, SavingsContribution |
| New (AI) | 1 | AiOperationLog |
| New (Tags) | 2 | Tag, TransactionTag |
| New (Alerts) | 1 | Alert |
| New (Audit) | 1 | AuditLog |
| **Total** | **33** | 17 existing + 16 new |
