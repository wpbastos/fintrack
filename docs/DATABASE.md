# FinTrack Database Documentation

## Overview

FinTrack uses SQLite with Prisma ORM. The database is designed around a staged import workflow where transactions flow from raw imports through staging to final transactions.

---

## Entity Relationship Diagram

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                    MASTER DATA                                         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐        │
│  │ Institution │──┐   │   Person    │──┐   │  Employer   │      │CategoryGroup│        │
│  └─────────────┘  │   └─────────────┘  │   └─────────────┘      └─────────────┘        │
│        │          │         │          │         │                     │               │
│        │ 1:N      │         │ 1:N      │         │ 1:N                 │ 1:N           │
│        ▼          │         ▼          │         ▼                     ▼               │
│  ┌─────────────┐  │   ┌─────────────┐  │   ┌─────────────┐      ┌─────────────┐        │
│  │   Account   │◄─┘   │   Income    │◄─┘   │  Position   │      │  Category   │◄─┐     │
│  └─────────────┘      └─────────────┘      └─────────────┘      └─────────────┘  │     │
│        │                    │                    │                     │         │     │
│        │                    │ 1:N                │ 1:N                 │ 1:N (self)    │
│        │                    ▼                    ▼                     ▼               │
│        │              ┌─────────────┐      ┌─────────────┐      ┌─────────────┐        │
│        │              │IncomePattern│      │   Payslip   │      │  (children) │        │
│        │              └─────────────┘      └─────────────┘      └─────────────┘        │
│        │                                                                               │
│        │         ┌─────────────┐                                                       │
│        │         │  Merchant   │◄───────────────────────────────────────┐              │
│        │         └─────────────┘                                        │              │
│        │               │                                                │              │
│        │               │ 1:N                                            │              │
│        │               ▼                                                │              │
│        │         ┌───────────────┐                                      │              │
│        │         │MerchantPattern|                                      │              │
│        │         └───────────────┘                                      │              │
│        │                                                                │              │
└────────┼────────────────────────────────────────────────────────────────┼──────────────┘
         │                                                                │
         │                                                                │
┌────────┼────────────────────────────────────────────────────────────────┼──────────────┐
│        │                     TRANSACTION FLOW                           │              │
├────────┼────────────────────────────────────────────────────────────────┼──────────────┤
│        │                                                                │              │
│        │    ┌─────────────┐                                             │              │
│        │    │   Import    │ ◄─── JSON Upload via /api/import            │              │
│        │    └─────────────┘                                             │              │
│        │          │                                                     │              │
│        │          │ 1:N                                                 │              │
│        │          ▼                                                     │              │
│        │    ┌─────────────────────┐                                     │              │
│        ├───►│ StagingTransaction  │◄────────────────────────────────────┤              │
│        │    └─────────────────────┘                                     │              │
│        │          │                                                     │              │
│        │          │ (after approval)                                    │              │
│        │          ▼                                                     │              │
│        │    ┌─────────────┐                                             │              │
│        └───►│ Transaction │◄────────────────────────────────────────────┘              │
│             └─────────────┘                                                            │
│                   │                                                                    │
│                   │ (budget tracking)                                                  │
│                   ▼                                                                    │
│             ┌─────────────┐                                                            │
│             │BudgetPeriod │                                                            │
│             └─────────────┘                                                            │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Tables

### Core Transaction Tables

| Table | Description | Key Fields |
|-------|-------------|------------|
| `import` | Audit trail for each import batch | fileName, sourceType, status, contentHash |
| `staging_transaction` | Temporary holding for imported transactions | rawDate, rawDescription, rawAmount, status |
| `transaction` | Final approved transactions | date, description, amount |

### Master Data Tables

| Table | Description | Key Fields |
|-------|-------------|------------|
| `institution` | Banks, credit unions, brokerages | name, type |
| `account` | Financial accounts (chequing, credit cards, etc.) | name, type, institutionId |
| `person` | Family members | name, email |
| `merchant` | Where money is spent | name, categoryId |
| `merchant_pattern` | Regex patterns for merchant matching | pattern, priority |
| `category_group` | High-level category groupings | name, type (Income/Expense/Transfer) |
| `category` | Transaction categories with budgets | name, color, monthlyBudget |
| `employer` | Companies that pay income | name, industry |
| `position` | Job roles at employers | title, employerId |
| `income` | Income sources (salary, benefits, etc.) | name, type, positionId |
| `income_pattern` | Patterns for matching income deposits | pattern, priority |
| `payslip` | Pay history tracking | incomeId, newGross, newNet |
| `budget_period` | Budget cycle tracking | categoryId, periodStart, budgetedAmount |

---

## Foreign Key Relationships

### Import → Related Tables
```
Import
  ├── accountId → Account.id
  ├── stagingTransactions[] ← StagingTransaction.importId
  └── transactions[] ← Transaction.importId
```

### StagingTransaction → Related Tables
```
StagingTransaction
  ├── importId → Import.id
  ├── accountId → Account.id
  ├── merchantId → Merchant.id
  ├── categoryId → Category.id
  ├── incomeId → Income.id
  └── personId → Person.id
```

### Transaction → Related Tables
```
Transaction
  ├── importId → Import.id
  ├── accountId → Account.id
  ├── merchantId → Merchant.id
  ├── categoryId → Category.id
  ├── incomeId → Income.id
  └── personId → Person.id
```

### Account → Related Tables
```
Account
  ├── institutionId → Institution.id
  ├── ownerId → Person.id
  ├── imports[] ← Import.accountId
  ├── stagingTransactions[] ← StagingTransaction.accountId
  ├── transactions[] ← Transaction.accountId
  ├── merchants[] ← Merchant.accountId
  ├── incomes[] ← Income.depositAccountId
  └── budgetPeriods[] ← BudgetPeriod.accountId
```

### Merchant → Related Tables
```
Merchant
  ├── categoryId → Category.id
  ├── personId → Person.id
  ├── accountId → Account.id
  ├── patterns[] ← MerchantPattern.merchantId (CASCADE DELETE)
  ├── stagingTransactions[] ← StagingTransaction.merchantId
  └── transactions[] ← Transaction.merchantId
```

### Category → Related Tables
```
Category
  ├── groupId → CategoryGroup.id
  ├── parentId → Category.id (self-reference)
  ├── children[] ← Category.parentId
  ├── merchants[] ← Merchant.categoryId
  ├── incomes[] ← Income.categoryId
  ├── stagingTransactions[] ← StagingTransaction.categoryId
  ├── transactions[] ← Transaction.categoryId
  └── budgetPeriods[] ← BudgetPeriod.categoryId (CASCADE DELETE)
```

### Income → Related Tables
```
Income
  ├── positionId → Position.id
  ├── personId → Person.id
  ├── categoryId → Category.id
  ├── depositAccountId → Account.id
  ├── patterns[] ← IncomePattern.incomeId (CASCADE DELETE)
  ├── payslips[] ← Payslip.incomeId (CASCADE DELETE)
  ├── stagingTransactions[] ← StagingTransaction.incomeId
  └── transactions[] ← Transaction.incomeId
```

---

## Import Flow

### Step-by-Step Process

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: JSON Upload                                                                  │
│ Endpoint: POST /api/import                                                           │
│ File: src/app/api/import/route.ts                                                    │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  Input JSON:                                                                         │
│  {                                                                                   │
│    "statement": {                                                                    │
│      "account": { "accountName": "...", "institutionName": "...", "accountType": ""},│
│      "periodStart": "2024-01-01",                                                    │
│      "periodEnd": "2024-01-31",                                                      │
│      "openingBalance": 1000.00,                                                      │
│      "closingBalance": 1500.00                                                       │
│    },                                                                                │
│    "transactions": [                                                                 │
│      { "date": "2024-01-15", "description": "WALMART", "amount": -50.00 }            │
│    ]                                                                                 │
│  }                                                                                   │
│                                                                                      │
│  Tables Impacted:                                                                    │
│  ┌────────────────┐                                                                  │
│  │  Institution   │ ← Created if account.institutionName doesn't exist               │
│  └────────────────┘                                                                  │
│  ┌────────────────┐                                                                  │
│  │    Account     │ ← Created if account doesn't exist (by name + institution)       │
│  └────────────────┘                                                                  │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: Duplicate Detection                                                          │
│ File: src/app/api/import/route.ts                                                    │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  Checks:                                                                             │
│  1. contentHash (SHA-256 of JSON) - exact duplicate                                  │
│  2. statementFingerprint (accountId|periodEnd|closingBalance|txnCount)               │
│                                                                                      │
│  Tables Queried:                                                                     │
│  ┌────────────────┐                                                                  │
│  │     Import     │ ← Check contentHash and statementFingerprint uniqueness          │
│  └────────────────┘                                                                  │
│                                                                                      │
│  If duplicate found and force=false: Return duplicate info                           │
│  If duplicate found and force=true: Delete existing Import + StagingTransactions     │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: Balance Validation                                                           │
│ File: src/app/api/import/route.ts                                                    │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  Formula: openingBalance + sum(transactions) = closingBalance                        │
│  Tolerance: ±$0.01                                                                   │
│                                                                                      │
│  If mismatch and skipBalanceValidation=false: Return error                           │
│  If mismatch and skipBalanceValidation=true: Continue with warning                   │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ STEP 4: Create Import Record                                                         │
│ File: src/app/api/import/route.ts                                                    │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  Tables Impacted:                                                                    │
│  ┌────────────────┐                                                                  │
│  │     Import     │ ← INSERT with status="staged"                                    │
│  └────────────────┘                                                                  │
│                                                                                      │
│  Fields set:                                                                         │
│  - fileName, sourceType, accountId                                                   │
│  - periodStart, periodEnd, openingBalance, closingBalance                            │
│  - transactionCount, content, contentHash, statementFingerprint                      │
│  - status = "staged"                                                                 │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ STEP 5: Create Staging Transactions                                                  │
│ File: src/app/api/import/route.ts                                                    │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  Tables Impacted:                                                                    │
│  ┌────────────────────────┐                                                          │
│  │  StagingTransaction    │ ← INSERT MANY with status="pending"                      │
│  └────────────────────────┘                                                          │
│                                                                                      │
│  Fields set:                                                                         │
│  - importBatchId (UUID), importId                                                    │
│  - rawDate, rawDescription, rawAmount                                                │
│  - accountId                                                                         │
│  - status = "pending"                                                                │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ STEP 6: Batch Resolution                                                             │
│ File: src/lib/staging-resolver.ts                                                    │
│ Called by: src/app/api/import/route.ts → resolveBatch()                              │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  Sub-steps:                                                                          │
│                                                                                      │
│  6a. Date Resolution (src/lib/date-resolver.ts)                                      │
│      ┌────────────────────────┐                                                      │
│      │  StagingTransaction    │ ← UPDATE resolvedDate from rawDate                   │
│      └────────────────────────┘                                                      │
│                                                                                      │
│  6b. Merchant Resolution (src/lib/merchant-resolver.ts)                              │
│      Tables Queried:                                                                 │
│      ┌────────────────────────┐                                                      │
│      │   MerchantPattern      │ ← Find patterns matching rawDescription              │
│      └────────────────────────┘                                                      │
│      ┌────────────────────────┐                                                      │
│      │      Merchant          │ ← Get merchant details + default category            │
│      └────────────────────────┘                                                      │
│                                                                                      │
│      Tables Updated:                                                                 │
│      ┌────────────────────────┐                                                      │
│      │  StagingTransaction    │ ← UPDATE merchantId, categoryId, status="matched"    │
│      └────────────────────────┘                                                      │
│                                                                                      │
│  6c. Income Resolution (src/lib/income-resolver.ts)                                  │
│      Tables Queried:                                                                 │
│      ┌────────────────────────┐                                                      │
│      │    IncomePattern       │ ← Find patterns matching rawDescription (amount>0)   │
│      └────────────────────────┘                                                      │
│      ┌────────────────────────┐                                                      │
│      │       Income           │ ← Get income details + default category              │
│      └────────────────────────┘                                                      │
│                                                                                      │
│      Tables Updated:                                                                 │
│      ┌────────────────────────┐                                                      │
│      │  StagingTransaction    │ ← UPDATE incomeId, categoryId, status="matched"      │
│      └────────────────────────┘                                                      │
│                                                                                      │
│  6d. Mark Unresolved                                                                 │
│      ┌────────────────────────┐                                                      │
│      │  StagingTransaction    │ ← UPDATE status="unknown" where still "pending"      │
│      └────────────────────────┘                                                      │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ STEP 7: Update Import Stats                                                          │
│ File: src/app/api/import/route.ts                                                    │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  Tables Impacted:                                                                    │
│  ┌────────────────┐                                                                  │
│  │     Import     │ ← UPDATE addedCount, matchedCount, unknownCount, processedAt     │
│  └────────────────┘                                                                  │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ STEP 8: AI Resolution (Optional)                                                     │
│ Endpoint: POST /api/ai/resolve                                                       │
│ File: src/app/api/ai/resolve/route.ts                                                │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  Triggered by: User clicks "AI Resolve" button in staging UI                         │
│                                                                                      │
│  Tables Impacted:                                                                    │
│  ┌────────────────┐                                                                  │
│  │     Import     │ ← UPDATE aiStatus="resolving", aiStartedAt                       │
│  └────────────────┘                                                                  │
│                                                                                      │
│  AI analyzes unknown transactions and suggests:                                      │
│  - New merchants (creates in Merchant table)                                         │
│  - New patterns (creates in MerchantPattern table)                                   │
│  - Category assignments                                                              │
│                                                                                      │
│  Tables Potentially Created/Updated:                                                 │
│  ┌────────────────┐                                                                  │
│  │    Merchant    │ ← INSERT new merchants                                           │
│  └────────────────┘                                                                  │
│  ┌────────────────┐                                                                  │
│  │MerchantPattern │ ← INSERT new patterns                                            │
│  └────────────────┘                                                                  │
│  ┌────────────────────────┐                                                          │
│  │  StagingTransaction    │ ← UPDATE merchantId, categoryId, status="suggested"      │
│  └────────────────────────┘                                                          │
│  ┌────────────────┐                                                                  │
│  │     Import     │ ← UPDATE aiStatus="complete", aiResult (JSON)                    │
│  └────────────────┘                                                                  │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ STEP 9: User Review (Staging Page)                                                   │
│ Page: /staging                                                                       │
│ File: src/app/staging/page.tsx, staging-table.tsx                                    │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  User can:                                                                           │
│  - Edit individual transactions (merchant, category, date)                           │
│  - Approve AI suggestions                                                            │
│  - Skip transactions                                                                 │
│                                                                                      │
│  Tables Impacted:                                                                    │
│  ┌────────────────────────┐                                                          │
│  │  StagingTransaction    │ ← UPDATE merchantId, categoryId, incomeId, status        │
│  └────────────────────────┘                                                          │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ STEP 10: Finalize Import                                                             │
│ Action: finalizeImport()                                                             │
│ File: src/app/staging/actions.ts                                                     │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  Tables Impacted:                                                                    │
│                                                                                      │
│  ┌────────────────┐                                                                  │
│  │  Transaction   │ ← INSERT from StagingTransaction (status=matched/suggested)      │
│  └────────────────┘                                                                  │
│                                                                                      │
│  Fields copied:                                                                      │
│  - date ← resolvedDate                                                               │
│  - description ← merchant.name or income.name                                        │
│  - originalDescription ← rawDescription                                              │
│  - amount ← rawAmount                                                                │
│  - accountId, merchantId, categoryId, incomeId, personId                             │
│  - importId                                                                          │
│                                                                                      │
│  ┌────────────────────────┐                                                          │
│  │  StagingTransaction    │ ← UPDATE status="imported"                               │
│  └────────────────────────┘                                                          │
│                                                                                      │
│  ┌────────────────┐                                                                  │
│  │     Import     │ ← UPDATE status="finalized"                                      │
│  └────────────────┘                                                                  │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Status Transitions

### Import.status
```
staged ──────────────────────────────────► finalized
  │                                            │
  │ (created on import)              (all transactions moved)
  │                                            │
  └────────────────────────────────────────────┘
```

### Import.aiStatus
```
idle ────► resolving ────► complete
                │              │
                │              └── (success)
                │
                └────────────► error
                               │
                               └── (API failure)
```

### StagingTransaction.status
```
pending ────► matched ────────────────────────► imported
   │            │                                   ▲
   │            │                                   │
   │            └───► suggested ──────────────────►─┤
   │                      │                         │
   │                      │ (AI suggestion)         │
   │                      │                         │
   └─────────────────────►│                         │
                          │                         │
                    unknown ────► (manual edit) ───►┘
                          │
                          └───► skipped
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/app/api/import/route.ts` | Import endpoint - creates Import + StagingTransactions |
| `src/lib/staging-resolver.ts` | Orchestrates date, merchant, income resolution |
| `src/lib/merchant-resolver.ts` | Matches descriptions to merchants via patterns |
| `src/lib/income-resolver.ts` | Matches deposits to income sources via patterns |
| `src/lib/date-resolver.ts` | Parses various date formats |
| `src/lib/account-resolver.ts` | Creates/finds accounts and institutions |
| `src/app/api/ai/resolve/route.ts` | AI-powered merchant suggestion |
| `src/app/staging/actions.ts` | Staging actions including finalizeImport |

---

## Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| `import` | `status` | Filter by staged/finalized |
| `staging_transaction` | `status` | Filter pending/matched/unknown |
| `staging_transaction` | `importBatchId` | Group by import batch |
| `transaction` | `date` | Date range queries |
| `budget_period` | `status` | Filter open/closed periods |

---

## Cascade Deletes

| Parent Table | Child Table | On Delete |
|--------------|-------------|-----------|
| Merchant | MerchantPattern | CASCADE |
| Income | IncomePattern | CASCADE |
| Income | Payslip | CASCADE |
| Category | BudgetPeriod | CASCADE |
