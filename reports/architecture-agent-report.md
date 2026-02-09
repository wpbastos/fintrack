# Architecture Agent Report

## Executive Summary

Fintrack is a well-structured personal finance management app built on Next.js 16 (App Router), Prisma/SQLite, and shadcn/ui. The codebase demonstrates solid architectural foundations: clear separation of concerns through resolvers, a well-designed import pipeline, and a thoughtful AI integration via Claude CLI. The schema is comprehensive with ~15 models covering the full financial data lifecycle.

**Key findings:**
- The import pipeline (PDF upload -> extraction -> staging -> resolution -> transaction) is the strongest part of the architecture, with clean separation across files
- AI integration works but is tightly coupled to Claude CLI subprocess spawning; two separate `callClaudeCLI` implementations exist with duplicated code
- Pattern-based merchant/income resolvers load ALL patterns into memory on every call (N+1 potential at scale)
- The staging actions file (`staging/actions.ts`) is 1,114 lines with significant code duplication between `approveSuggestion` and `approveSuggestionInternal`
- Budget system exists but is underutilized; the dashboard is minimal (4 stat cards)
- No test coverage, no error boundaries, no optimistic UI updates
- Several planned features (forecasting, receipts, payslips, savings goals) have schema groundwork but no implementation

**Top 3 priorities:**
1. Unify AI service layer to eliminate duplication and enable cost tracking
2. Build the auto-learning pipeline to reduce manual pattern management
3. Design the reconciliation engine as a shared system before implementing forecasting

---

## Current Architecture Assessment

### Strengths

1. **Clean Import Pipeline**: The 6-stage pipeline (Upload -> Import -> Staging -> Resolution -> Review -> Transaction) is well-designed. Each stage has clear responsibilities:
   - `src/app/import/actions.ts:202` — PDF upload with queue management
   - `src/app/api/import/route.ts:82` — JSON import with balance validation
   - `src/lib/staging-resolver.ts:115` — Batch resolution with statistics
   - `src/app/staging/actions.ts:766` — Finalization to permanent transactions

2. **Pattern-Based Resolution**: The merchant/income resolver pattern is simple and effective:
   - `src/lib/merchant-resolver.ts:24` — Priority + length ordering
   - `src/lib/income-resolver.ts:25` — Same pattern, mirrored for income
   - Both support case-insensitive matching with automatic pattern extraction

3. **Schema Design**: The Prisma schema is comprehensive and well-normalized:
   - `prisma/schema.prisma` — 15 models with proper relationships
   - Pattern tables (MerchantPattern, IncomePattern) enable flexible matching
   - DocumentSchema model enables extensible AI extraction
   - Metadata fields (location, foreignCurrency, etc.) preserved through pipeline

4. **Server Components by Default**: Pages like `staging/page.tsx`, `transactions/page.tsx`, `log/page.tsx` are Server Components that fetch data directly. Client components are only used when interactivity is needed.

5. **Structured Logging**: `src/lib/logger.ts` provides configurable log levels, file output, and contextual loggers with timing support.

6. **Singleton Patterns**: Database (`src/lib/db.ts:26`) and extract queue (`src/lib/extract-queue.ts:166`) use proper singletons with global caching for hot reload.

### Issues & Technical Debt

1. **Duplicated `callClaudeCLI` Functions**: Two nearly identical implementations exist:
   - `src/app/api/ai/resolve/route.ts:264` — For transaction resolution (2-minute timeout, web search tools)
   - `src/app/import/actions.ts:113` — For PDF extraction (5-minute timeout, Read tool only)
   - Both parse `ClaudeCLIResponse`, extract JSON from markdown, handle errors identically. The `ClaudeCLIResponse` interface is defined twice.

2. **Massive `staging/actions.ts` File (1,114 lines)**: This file contains:
   - `approveSuggestion` (lines 336-632) — 296 lines
   - `approveSuggestionInternal` (lines 117-329) — 212 lines, ~90% identical to `approveSuggestion`
   - `importBatchTransactions` (lines 766-856) — 90 lines
   - `importAllTransactions` (lines 1027-1113) — ~90% identical to `importBatchTransactions`
   - These should be refactored into shared utilities

3. **N+1 Query Pattern in Resolvers**: Both `resolveMerchantId` and `resolveIncomeId` load ALL patterns on every call:
   - `src/lib/merchant-resolver.ts:28-37` — `findMany` with no caching
   - `src/lib/income-resolver.ts:29-33` — Same issue
   - For each staging transaction, both are called sequentially in `resolveTransaction` (`staging-resolver.ts:58-59`)
   - With 100 transactions and 200 patterns, this means 200+ database queries per batch

4. **No Error Boundaries**: No React error boundaries anywhere in the app. A server action failure or component crash shows a blank page.

5. **No Transaction Batching**: In `resolveBatch` (`staging-resolver.ts:148-173`), each transaction is updated individually in a loop. This should use a Prisma transaction for atomicity and performance.

6. **Dashboard is Minimal**: `src/app/page.tsx` shows only 4 stat cards with basic counts. No charts, no budget progress, no recent activity.

7. **Settings Page is Empty**: `src/app/settings/page.tsx` — placeholder "Coming Soon" page.

8. **Transactions Page is Read-Only**: `src/app/transactions/page.tsx` — Shows data but has no editing, filtering, search, or export capabilities.

9. **`@anthropic-ai/sdk` Dependency Unused**: `package.json:16` lists `@anthropic-ai/sdk` but all AI calls go through Claude CLI subprocess spawning, not the SDK.

### Performance Concerns

1. **Pattern Loading per Transaction**: As noted above, `resolveMerchant` and `resolveIncome` both do full table scans per call. For a batch of 50 transactions, that's 100 `findMany` queries loading all patterns. Solution: Cache patterns per batch or use a single query with SQL LIKE matching.

2. **Staging Page Data Loading**: `src/app/staging/page.tsx:297` runs 4 parallel queries then does complex in-memory balance calculations across all batches. As data grows, this will slow significantly. Should use server-side pagination.

3. **Full JSON Content in Import Records**: `src/app/api/import/route.ts:260` stores the entire import JSON payload in the `content` field. This is included in staging page queries (`staging/page.tsx:7-31`), transferring potentially large payloads. The `content` field should be excluded from list queries and loaded on demand.

4. **Sequential PDF Polling**: In `import/page.tsx:686`, PDF jobs are polled sequentially. Multiple uploads could be polled in parallel.

5. **No Indexes on Foreign Keys**: While the schema has indexes on `status` and `importBatchId`, frequently-joined columns like `merchantId`, `categoryId`, `accountId` on StagingTransaction and Transaction tables lack indexes.

---

## AI Integration Architecture

### Current State

The app uses Claude CLI in two places, both spawning subprocess calls:

**1. PDF Extraction** (`src/app/import/actions.ts:113-196`)
- Spawns `claude -p - --output-format json --allowedTools Read`
- Passes a prompt built from DocumentSchema templates
- 5-minute timeout
- Queue-managed via `ExtractQueue` singleton
- Metrics captured: duration, cost, tokens, PDF size
- Results stored in Import model

**2. Transaction Resolution** (`src/app/api/ai/resolve/route.ts:264-345`)
- Spawns `claude --print --output-format json --allowedTools mcp__puppeteer__...,WebSearch,WebFetch -p -`
- Passes all unknown transactions + existing merchants/incomes/categories
- 2-minute timeout
- No queue management (direct call)
- Results stored as JSON in `StagingTransaction.notes` field
- Status tracked on Import model (`aiStatus`, `aiStartedAt`, `aiResult`)

### Proposed Unified AI Service

Create `src/lib/ai-service.ts` as a single interface for all AI operations:

```
src/lib/ai-service.ts
├── callClaude(options: ClaudeCallOptions): Promise<ClaudeResult>
│   ├── options.prompt: string
│   ├── options.tools: string[]        // e.g., ["Read", "WebSearch"]
│   ├── options.timeout: number         // ms
│   ├── options.context?: string        // for logging
│   └── options.maxRetries?: number
│
├── ClaudeResult
│   ├── success: boolean
│   ├── data: unknown
│   ├── duration: number
│   ├── cost: number
│   ├── tokens: { input: number; output: number }
│   └── error?: string
│
├── extractPdf(filePath: string, schemas: DocumentSchemaInput[]): Promise<ExtractionResult>
├── resolveTransactions(txns: TransactionInput[], context: ResolutionContext): Promise<ClaudeSuggestion[]>
├── categorizeReceipt(filePath: string): Promise<ReceiptResult>        // future
├── extractPayslip(filePath: string): Promise<PayslipResult>           // future
└── detectRecurring(transactions: Transaction[]): Promise<RecurringPattern[]>  // future
```

**Key design decisions:**
- Single `callClaude` function that handles subprocess spawning, JSON parsing, markdown extraction, error handling, and timeout
- Operation-specific functions (`extractPdf`, `resolveTransactions`) are thin wrappers that build prompts and parse results
- All calls go through the same cost tracking and logging pipeline
- Queue management stays in `extract-queue.ts` but is extended to support multiple operation types

### Auto-Learning Pipeline Design

When a user confirms an AI suggestion or manually assigns a merchant/income, the system should learn from it. Currently this happens in `staging/actions.ts:approveSuggestion` but only for AI suggestions.

**Proposed unified auto-learning system:**

```
src/lib/auto-learn.ts
├── learnFromAssignment(input: LearningInput): Promise<LearningResult>
│   ├── input.rawDescription: string
│   ├── input.amount: number
│   ├── input.assignmentType: "merchant" | "income"
│   ├── input.entityId: number
│   ├── input.categoryId?: number
│   └── input.source: "ai_suggestion" | "manual_assignment" | "bulk_import"
│
├── LearningResult
│   ├── patternCreated: boolean
│   ├── pattern?: string
│   ├── cascadeResolved: number  // How many other txns were auto-resolved
│   └── entityCreated: boolean
│
└── Internal:
    ├── extractAndCreatePattern(description, entityType, entityId)
    ├── cascadeResolve(newPatterns)   // Re-resolve all pending/unknown
    └── getOrCreateEntity(suggestion) // Shared merchant/income/employer creation
```

**Trigger points (where to call `learnFromAssignment`):**
1. `staging/actions.ts:approveSuggestion` — AI suggestion approval
2. `staging/actions.ts:updateStagingTransaction` — Manual merchant/income assignment
3. Future: Bulk re-categorization on the Transactions page
4. Future: Receipt/forecast reconciliation confirmation

**Cascade resolution optimization**: Instead of the current approach of iterating all unresolved transactions on every approval, batch the cascade. After all approvals in a session, run a single cascade pass.

### Cost Management Strategy

1. **Cost Tracking Table**: Create an `AICost` model to track every AI call:
   ```
   model AICost {
     id            Int      @id @default(autoincrement())
     operation     String   // "pdf_extract", "resolve_transactions", "detect_recurring"
     importId      Int?     // Link to import if applicable
     inputTokens   Int
     outputTokens  Int
     costUsd       Float
     durationMs    Int
     createdAt     DateTime @default(now())
   }
   ```

2. **Budget Alerts**: Add env vars `AI_MONTHLY_BUDGET_USD` and `AI_ALERT_THRESHOLD_PCT`. The AI service checks cumulative monthly spend before each call.

3. **Prompt Optimization**:
   - Current `resolve-transactions.ts` sends ALL merchants/incomes/categories for context. For 500 merchants, this prompt could be 10K+ tokens.
   - Optimization: Only send merchants/categories relevant to the unknown descriptions (pre-filter by first few characters of description).
   - For PDF extraction: Cache the schema prompt; schemas rarely change.

4. **Batch Size Control**: For transaction resolution, batch unknown transactions into groups of 20-30 rather than sending all at once. This keeps context manageable and allows incremental processing.

---

## New Feature Technical Designs

### Reconciliation Engine (Shared System)

A reconciliation engine matches expected transactions against actual bank statement transactions. This will be used by both the forecast system and the receipt system.

**Core abstraction:**

```
src/lib/reconciliation/
├── types.ts           // Core types
├── matcher.ts         // Fuzzy matching engine
├── reconcile.ts       // Main reconciliation logic
└── confidence.ts      // Confidence scoring
```

**Types:**
```typescript
interface ReconciliationCandidate {
  sourceType: "forecast" | "receipt";
  sourceId: number;
  expectedDate: Date;
  expectedAmount: number;
  expectedMerchant?: string;
  expectedDescription?: string;
  tolerance: { days: number; amountPercent: number };
}

interface ReconciliationMatch {
  candidateId: number;
  transactionId: number;
  confidence: number;        // 0-100
  matchFactors: {
    dateProximity: number;   // 0-1
    amountMatch: number;     // 0-1
    merchantMatch: number;   // 0-1
    descriptionSimilarity: number; // 0-1
  };
}
```

**Matching algorithm:**
1. **Date proximity**: Score based on |actualDate - expectedDate| / tolerance.days
2. **Amount match**: Score based on |actualAmount - expectedAmount| / (expectedAmount * tolerance.amountPercent)
3. **Merchant match**: Exact match = 1.0, pattern match = 0.8, AI fuzzy = 0.5-0.7
4. **Description similarity**: Levenshtein distance normalized to 0-1

**Weighted confidence**: `0.3 * dateProximity + 0.35 * amountMatch + 0.25 * merchantMatch + 0.1 * descriptionSimilarity`

**AI-assisted fallback**: When deterministic matching confidence < 60%, use Claude to compare the candidate against the top 3 potential matches. This keeps AI costs low (only invoked for ambiguous cases).

**Schema additions:**
```prisma
model ReconciliationLog {
  id                Int       @id @default(autoincrement())
  sourceType        String    // "forecast", "receipt"
  sourceId          Int
  transactionId     Int?
  status            String    // "matched", "unmatched", "manual"
  confidence        Float?
  matchFactors      String?   // JSON
  reconciledAt      DateTime?
  createdAt         DateTime  @default(now())
}
```

### 6-Month Forecast System

**Architecture overview:**

```
src/lib/forecast/
├── detect-recurring.ts      // Pattern detection from historical transactions
├── generate-forecasts.ts    // Project future transactions
├── reconcile-forecasts.ts   // Match forecasts against actuals (uses reconciliation engine)
└── types.ts
```

**Phase 1: Recurring Pattern Detection**

Analyze finalized transactions to find recurring patterns:

```typescript
interface RecurringPattern {
  merchantId?: number;
  incomeId?: number;
  categoryId?: number;
  frequency: "weekly" | "biweekly" | "monthly" | "quarterly" | "annual";
  averageAmount: number;
  amountVariance: number;      // Standard deviation
  typicalDayOfMonth?: number;
  confidence: number;
  lastOccurrence: Date;
  occurrenceCount: number;
}
```

Detection algorithm:
1. Group transactions by merchantId/incomeId
2. For each group with 3+ occurrences, calculate inter-transaction intervals
3. Cluster intervals around known frequencies (7, 14, 30, 90, 365 days) with ±3 day tolerance
4. Score confidence based on regularity of intervals and amount consistency
5. AI enhancement: For patterns with moderate confidence (50-80%), ask Claude to assess whether this looks like a subscription/recurring bill

**Phase 2: Forecast Generation**

```prisma
model Forecast {
  id              Int       @id @default(autoincrement())
  merchantId      Int?
  incomeId        Int?
  categoryId      Int?
  expectedDate    DateTime
  expectedAmount  Float
  frequency       String
  status          String    // "pending", "matched", "missed", "cancelled"
  transactionId   Int?      // Linked when reconciled
  confidence      Float
  notes           String?
  createdAt       DateTime  @default(now())
}
```

Background job (cron or on-demand):
1. Run pattern detection on last 6 months of transactions
2. Project forward 6 months from today
3. Create Forecast records for each projected occurrence
4. When new transactions are imported, run reconciliation against pending forecasts
5. Forecasts that pass their expected date + tolerance without matching become "missed"

**Phase 3: Dashboard Integration**

- Calendar view showing expected vs actual
- Monthly cash flow projection chart
- Missed forecast alerts (e.g., "Your Netflix subscription didn't appear this month")
- Budget impact projection ("Based on recurring expenses, you'll spend $X this month")

### Payslip Import Pipeline

Payslips use the same AI extraction pipeline as bank statements but with a different schema and post-processing:

**Prompt template**: `src/lib/prompts/extract-payslip.ts`

Expected output structure:
```typescript
interface PayslipExtraction {
  employerName: string;
  employeeName: string;
  payPeriod: { start: string; end: string };
  payDate: string;
  earnings: {
    type: string;      // "Regular", "Overtime", "Bonus", etc.
    hours?: number;
    rate?: number;
    amount: number;
  }[];
  deductions: {
    type: string;      // "Federal Tax", "CPP", "EI", "Benefits", etc.
    amount: number;
  }[];
  grossPay: number;
  netPay: number;
  ytdGross?: number;
  ytdNet?: number;
}
```

**Post-processing pipeline:**
1. Extract payslip data via Claude CLI (reuse `ai-service.callClaude`)
2. Match employer to existing Employer record (or create)
3. Match to Income source (or create with pattern from bank description)
4. Create/update Payslip record with pay details
5. Update Income.currentGross/currentNet if changed
6. Reconcile against bank transaction (using reconciliation engine):
   - Match by date (payDate ± 2 days) and amount (netPay ± $1)
   - Link payslip to transaction for cross-referencing

**Schema change**: Add `payslipImportId` to Payslip model to link back to the Import record for audit trail.

### Receipt Import Pipeline

Receipts are simpler documents but need different extraction logic:

**Prompt template**: `src/lib/prompts/extract-receipt.ts`

Expected output:
```typescript
interface ReceiptExtraction {
  merchantName: string;
  date: string;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
    category?: string;   // AI-suggested category
  }[];
  subtotal: number;
  tax: number;
  tip?: number;
  total: number;
  paymentMethod?: string;
}
```

**Post-processing:**
1. Extract receipt via Claude CLI
2. Match merchant to existing Merchant (or create)
3. Reconcile against bank transaction (using reconciliation engine):
   - Match by merchant + date ± 1 day + total ± $0.01
4. If matched, enrich the transaction with receipt line items

**Schema additions:**
```prisma
model ReceiptItem {
  id              Int       @id @default(autoincrement())
  transactionId   Int
  transaction     Transaction @relation(...)
  itemName        String
  quantity        Float     @default(1)
  unitPrice       Float
  total           Float
  categoryId      Int?
  category        Category? @relation(...)
  createdAt       DateTime  @default(now())
}
```

This enables item-level spending analysis (e.g., "You spent $X on groceries vs $Y on household items at Costco this month").

### Savings Goals System

**Schema:**
```prisma
model SavingsGoal {
  id              Int       @id @default(autoincrement())
  name            String
  targetAmount    Float
  currentAmount   Float     @default(0)
  deadline        DateTime?
  accountId       Int?      // Optional: track in specific account
  account         Account?  @relation(...)
  status          String    @default("active") // active, completed, paused
  priority        Int       @default(0)
  color           String?
  notes           String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  allocations     SavingsAllocation[]
}

model SavingsAllocation {
  id              Int           @id @default(autoincrement())
  goalId          Int
  goal            SavingsGoal   @relation(...)
  transactionId   Int?
  transaction     Transaction?  @relation(...)
  amount          Float
  date            DateTime
  notes           String?
  createdAt       DateTime      @default(now())
}
```

**Core features:**
1. **Manual allocations**: User assigns a portion of income/savings to a goal
2. **Auto-allocation rules**: "Allocate 10% of every paycheck to Emergency Fund"
3. **Progress tracking**: Visual progress bars, projected completion date based on allocation rate
4. **Goal suggestions (AI)**: Based on spending patterns, suggest savings goals (e.g., "You spend $200/month on dining out. Setting aside 20% would save $480/year")

**Integration with forecast system**: If a savings goal has a deadline, the forecast can show whether the user is on track based on projected income minus projected expenses.

### Dashboard Enhancement Architecture

The current dashboard (`src/app/page.tsx`) shows only 4 stat cards. The enhanced dashboard should be a Server Component that fetches multiple data streams:

```
src/app/page.tsx (Server Component)
├── getMonthlyOverview()        // Income vs expenses this month
├── getBudgetProgress()         // Categories with budgets and current spend
├── getRecentTransactions()     // Last 10 transactions
├── getSavingsGoalProgress()    // Active goals with progress
├── getUpcomingForecasts()      // Next 7 days of expected transactions
├── getMissedForecasts()        // Overdue expected transactions
└── getSpendingTrends()         // Last 6 months bar chart data

src/app/dashboard/
├── monthly-overview.tsx        // Income/Expense/Net summary cards
├── budget-progress.tsx         // Category budget bars
├── recent-activity.tsx         // Transaction list widget
├── savings-goals-widget.tsx    // Goal progress rings
├── upcoming-widget.tsx         // Forecast calendar widget
├── spending-trends-chart.tsx   // Recharts bar/line chart
└── alerts-widget.tsx           // Missed forecasts, budget warnings
```

Data fetching pattern: Server Component renders layout, passes data to client-only chart components. No client-side data fetching needed.

---

## Refactoring Recommendations

### 1. Extract Shared AI Service (Priority: High)

**Current state**: Two `callClaudeCLI` functions with duplicated code.

**Target state**: Single `src/lib/ai-service.ts` with:
```
callClaude(options) → ClaudeResult
```

**Files to modify:**
- Create `src/lib/ai-service.ts`
- Refactor `src/app/import/actions.ts:113-196` to use `aiService.callClaude`
- Refactor `src/app/api/ai/resolve/route.ts:264-345` to use `aiService.callClaude`
- Move `ClaudeCLIResponse` interface and `extractJsonFromMarkdown` to shared module

### 2. Cache Pattern Resolution (Priority: High)

**Current state**: Every `resolveMerchantId`/`resolveIncomeId` call loads all patterns from DB.

**Target state**: Pattern cache that's loaded once per batch operation.

```typescript
// src/lib/pattern-cache.ts
class PatternCache {
  private merchantPatterns: MerchantPatternWithMerchant[] | null = null;
  private incomePatterns: IncomePatternWithIncome[] | null = null;
  private ttl: number;

  async getMerchantPatterns(): Promise<MerchantPatternWithMerchant[]> {
    if (this.merchantPatterns) return this.merchantPatterns;
    this.merchantPatterns = await db.merchantPattern.findMany({ include: { merchant: true }, where: { merchant: { isActive: true } } });
    setTimeout(() => { this.merchantPatterns = null; }, this.ttl);
    return this.merchantPatterns;
  }

  invalidate() { this.merchantPatterns = null; this.incomePatterns = null; }
}
```

Call `cache.invalidate()` after pattern creation in auto-learning pipeline.

### 3. Split `staging/actions.ts` (Priority: Medium)

**Current state**: 1,114 lines in one file.

**Target state**:
```
src/app/staging/actions/
├── index.ts                    // Re-exports
├── resolve-actions.ts          // resolveUnresolved
├── suggestion-actions.ts       // approveSuggestion, rejectSuggestion, approveAll, rejectAll
├── import-actions.ts           // importBatchTransactions, importAllTransactions
├── edit-actions.ts             // updateStagingTransaction, unmatchTransaction, excludeTransaction
├── batch-actions.ts            // deleteImportBatch, updateImportBalance
└── lookup-actions.ts           // getStagingLookupData
```

Extract shared logic from `approveSuggestion` and `approveSuggestionInternal` into a common `processApproval` function.

### 4. Add Database Indexes (Priority: Medium)

Add indexes on frequently-queried foreign key columns:

```prisma
model StagingTransaction {
  // ... existing fields
  @@index([merchantId])
  @@index([incomeId])
  @@index([categoryId])
  @@index([accountId])
}

model Transaction {
  // ... existing fields
  @@index([merchantId])
  @@index([categoryId])
  @@index([accountId])
  @@index([incomeId])
  @@index([importId])
}
```

### 5. Wrap Batch Operations in Prisma Transactions (Priority: Medium)

In `staging-resolver.ts:resolveBatch` and `staging/actions.ts:importBatchTransactions`, use `db.$transaction()` to ensure atomicity:

```typescript
await db.$transaction(async (tx) => {
  for (const staging of matchedTransactions) {
    await tx.transaction.create({ data: { ... } });
    await tx.stagingTransaction.update({ where: { id: staging.id }, data: { status: "imported" } });
  }
});
```

### 6. Remove Unused `@anthropic-ai/sdk` Dependency (Priority: Low)

The SDK is in `package.json` but never imported. All AI calls use Claude CLI subprocess spawning. Remove it to reduce bundle size, or migrate to SDK-based calls (see Additional Proposal #1).

---

## Additional Proposals

### Proposal 1: Migrate from Claude CLI to Anthropic SDK

**Rationale**: The current approach spawns a Claude CLI subprocess for every AI call. This has several drawbacks:
- Each subprocess call has startup overhead (~2-3 seconds)
- Error handling is string-based (parsing stderr)
- Tool usage is limited to CLI-supported tools
- No streaming support for progress feedback
- CLI must be installed on the deployment machine

**Proposed change**: Use the `@anthropic-ai/sdk` package (already in `package.json`) directly:

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();  // Uses ANTHROPIC_API_KEY env var

async function callClaude(prompt: string, options: CallOptions): Promise<ClaudeResult> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: options.maxTokens || 4096,
    messages: [{ role: "user", content: prompt }],
  });
  // Direct access to usage.input_tokens, usage.output_tokens
  // No subprocess, no JSON-in-markdown parsing needed
}
```

**Benefits**: Faster calls, streaming support, proper error types, no CLI dependency in production. Web search would need to be handled via MCP or a custom tool implementation.

**Tradeoff**: The current CLI approach allows tools like `Read` (for PDF parsing) and `WebSearch`. The SDK approach would require implementing these as MCP tools or using the tool_use API with custom implementations.

**Recommendation**: Keep CLI for PDF extraction (needs file system access via Read tool), migrate transaction resolution to SDK (doesn't need file access, just web search which can be done server-side).

### Proposal 2: Event-Driven Architecture with Action Queue

**Rationale**: Several operations trigger cascading effects (e.g., approving a suggestion re-resolves all pending transactions). Currently these are inline, blocking the UI response.

**Proposed system**:

```
src/lib/action-queue.ts
├── enqueue(action: Action): void
├── process(): Promise<void>
├── ActionTypes:
│   ├── PATTERN_CREATED      → trigger: cascade resolve all pending
│   ├── SUGGESTION_APPROVED  → trigger: cascade resolve + auto-learn
│   ├── IMPORT_FINALIZED     → trigger: reconcile forecasts + update budget periods
│   ├── TRANSACTION_CREATED  → trigger: check savings allocation rules
│   └── FORECAST_MISSED      → trigger: create alert notification
```

This decouples the user-facing action from its side effects. The UI responds immediately, and background processing handles cascading updates.

For the current scale (SQLite, single user), a simple in-process queue (similar to `ExtractQueue`) is sufficient. If the app grows to support multiple users or a PostgreSQL backend, this naturally maps to a proper job queue (Bull, pg-boss, etc.).

### Proposal 3: Financial Health Score and Insights Engine

**Rationale**: The app collects detailed financial data but doesn't synthesize it into actionable insights.

**Proposed system**:

```
src/lib/insights/
├── health-score.ts          // Calculate composite financial health score (0-100)
├── spending-anomalies.ts    // Detect unusual spending patterns
├── category-trends.ts       // Month-over-month category analysis
└── savings-rate.ts          // Track savings rate over time
```

**Health Score Components:**
1. **Budget adherence** (30%): How well categories stay within budget
2. **Savings rate** (25%): Income vs total expenses
3. **Spending consistency** (20%): Variance in monthly spending
4. **Goal progress** (15%): On-track vs behind on savings goals
5. **Debt management** (10%): Credit utilization trend

**AI-powered insights**: Monthly, run a Claude analysis on spending trends:
- "Your grocery spending increased 23% this month. The increase is mainly from 3 large Costco purchases."
- "You have 4 active subscriptions totaling $67/month. Netflix hasn't been used in 3 months based on transaction patterns."
- "Based on your spending pattern, you could save an additional $200/month by reducing dining out frequency."

This runs as a background job (weekly/monthly) to keep AI costs predictable and low.

---

## Appendix: File-by-File Notes

### `/src/lib/` — Core Libraries

| File | Lines | Purpose | Notes |
|------|-------|---------|-------|
| `db.ts` | 29 | Prisma singleton | Clean, uses `globalForPrisma` pattern |
| `db-init.ts` | 78 | Auto-init on first run | Uses `execSync` for migrations; could be async |
| `merchant-resolver.ts` | 233 | Pattern matching for merchants | Loads ALL patterns per call; needs caching |
| `income-resolver.ts` | 262 | Pattern matching for income | Same structure as merchant-resolver; duplicate logic |
| `staging-resolver.ts` | 278 | Batch resolution orchestrator | Good tiebreaker logic (amount sign); sequential updates |
| `account-resolver.ts` | 225 | Account auto-creation | Well-designed find-or-create with institution inference |
| `date-resolver.ts` | 112 | Date string parsing | Handles 4 formats; robust validation |
| `extract-queue.ts` | 167 | PDF extraction queue | Good singleton with cancellation; keeps last 100 jobs |
| `billing-cycle.ts` | 28 | Billing period calculation | Simple, correct |
| `logger.ts` | 170 | Structured logging with levels | Good: file output, timing, configurable levels |
| `format.ts` | 128 | Date/currency formatting | Uses env vars for locale configuration |
| `utils.ts` | 7 | `cn()` for Tailwind | Standard shadcn utility |
| `cron.ts` | 41 | Cron job scheduler | Uses `node-cron`; calls internal API endpoint |

### `/src/lib/prompts/` — AI Prompt Templates

| File | Lines | Purpose | Notes |
|------|-------|---------|-------|
| `extract-pdf.ts` | 111 | PDF extraction prompt builder | Well-structured with schema-aware prompts; includes AI judgment guidelines |
| `resolve-transactions.ts` | 215 | Transaction resolution prompt | Includes web search instructions; handles "include all" mode for re-classification |

### `/src/app/api/` — API Routes

| File | Lines | Purpose | Notes |
|------|-------|---------|-------|
| `ai/resolve/route.ts` | 346 | AI transaction resolution | Duplicated `callClaudeCLI`; stores suggestions in staging notes |
| `ai/status/route.ts` | 27 | AI job status polling | Simple, clean |
| `import/route.ts` | 352 | JSON import endpoint | Good: balance validation, credit card normalization, duplicate detection |
| `cron/budget-reset/route.ts` | 171 | Budget period management | Good: close expired + open new; auth with CRON_SECRET |

### `/src/app/` — Pages and Server Actions

| File | Lines | Purpose | Notes |
|------|-------|---------|-------|
| `page.tsx` | 89 | Dashboard | Minimal: 4 stat cards, no charts/insights |
| `layout.tsx` | 51 | Root layout | Standard: sidebar + content + toaster |
| `import/page.tsx` | 1176 | PDF upload page | Complex client component with queue management, polling, localStorage persistence |
| `import/actions.ts` | 408 | PDF extraction actions | Duplicated `callClaudeCLI`; good queue integration |
| `staging/page.tsx` | 392 | Staging review page | Server component with complex balance calculations |
| `staging/staging-table.tsx` | 1000+ | Staging table UI | Very large client component; handles all batch/transaction interactions |
| `staging/actions.ts` | 1114 | Staging server actions | **Largest file**: needs splitting; `approveSuggestion` duplicated |
| `transactions/page.tsx` | 210 | Transaction list | Read-only; has pagination; no search/filter/edit |
| `log/page.tsx` | 59 | Import log page | Server component, delegates to ImportTable component |
| `log/actions.ts` | 43 | Import log actions | Simple delete with status check |
| `merchants/page.tsx` | varies | Merchant management | Full CRUD with patterns, smart filters, bulk actions |
| `categories/page.tsx` | varies | Category management | Full CRUD with groups, hierarchy, budget management |
| `income/page.tsx` | varies | Income management | Full CRUD with employers, positions, patterns |
| `accounts/page.tsx` | varies | Account management | Full CRUD with institutions, persons |
| `schemas/page.tsx` | varies | Document schema management | Full CRUD with JSON sample data |
| `settings/page.tsx` | 29 | Settings | Placeholder "Coming Soon" |

### Key Architectural Patterns Used

1. **Server Component + Client Component Split**: Pages fetch data server-side, pass to client table/form components
2. **Server Actions for Mutations**: All writes use `"use server"` actions with `revalidatePath`
3. **Parallel Data Fetching**: `Promise.all` used consistently for independent queries (e.g., `staging/page.tsx:297`)
4. **Toast Notifications**: Sonner toasts for all user-facing feedback
5. **Collapsible Sidebar**: Setup section collapses, auto-expands when on setup pages
6. **Pattern-Based Entity Resolution**: Shared pattern between merchants and incomes
7. **Import Audit Trail**: Full lineage from PDF/JSON -> Import -> StagingTransaction -> Transaction

### Missing Patterns

1. **No Error Boundaries**: No `error.tsx` files in any route
2. **No Loading States**: No `loading.tsx` files for streaming/suspense
3. **No Tests**: No test files anywhere in the codebase
4. **No Optimistic UI**: Server actions block UI until complete
5. **No Middleware**: No auth, no rate limiting
6. **No Data Export**: No CSV/PDF export functionality
7. **No Search**: Global search across transactions, merchants, etc.
