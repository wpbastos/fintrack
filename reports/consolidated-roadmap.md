# Fintrack Consolidated Roadmap

## How to Read This Document

This roadmap synthesizes findings from 5 specialized agents (UX, Architecture, Database, QA, Devil's Advocate) into a prioritized implementation plan. Each item includes effort estimates, dependencies, and where agents disagreed.

**Effort Scale**: S = 1-2 days | M = 3-5 days | L = 1-2 weeks | XL = 2-4 weeks

**Individual agent reports**: `reports/ux-agent-report.md`, `reports/architecture-agent-report.md`, `reports/database-agent-report.md`, `reports/qa-agent-report.md`, `reports/devils-advocate-report.md`

---

## Sprint 0: Foundation (Before Any Features)

These are prerequisites. All agents agree the current codebase needs stabilization before new features.

### 0.1 Fix Critical Bugs
**Effort: S | Priority: URGENT | Source: QA**

| Bug | Fix | File |
|-----|-----|------|
| **Transactions crash with `?page=abc`** | Add `\|\| 1` fallback after `parseInt` | `transactions/page.tsx:50` |
| **Import API leaks Prisma errors** | Validate `accountId` exists; return generic error message | `api/import/route.ts:344` |

### 0.2 Fix Major Bugs
**Effort: S | Priority: High | Source: QA**

| Bug | Fix |
|-----|-----|
| `deleteAccount` missing referential integrity check | Add transaction/import count check before deletion |
| `deleteChildCategory` doesn't check linked records | Check transactions, merchants, incomes before allowing |
| `deleteImportBatch` can delete finalized imports | Add status check like `log/actions.ts` does |
| Budget cron endpoint open without auth | Default to requiring `CRON_SECRET` |
| Dashboard "Total Balance" misleading | Rename to "Net Cash Flow" or calculate from closing balances |

### 0.3 Add Database Indexes
**Effort: S | Priority: High | Source: Database, Architecture**

22+ missing indexes on foreign keys. Single migration, zero risk, immediate performance benefit. Full list in `reports/database-agent-report.md` under "Missing Indexes."

Key indexes: `Transaction(merchantId, incomeId, categoryId, accountId)`, `StagingTransaction(importId, merchantId, incomeId)`, `Account(institutionId, ownerId)`, `BudgetPeriod(categoryId+status, status+periodEnd)`.

```bash
npx prisma migrate dev --name add-missing-indexes
```

### 0.4 Unify AI Service
**Effort: M | Priority: High | Source: Architecture**

Two duplicated `callClaudeCLI` functions exist:
- `src/app/import/actions.ts:113` (PDF extraction)
- `src/app/api/ai/resolve/route.ts:264` (transaction resolution)

Create `src/lib/ai-service.ts` with a single `callClaude()` function. Both callers become thin wrappers. This is a prerequisite for any new AI feature.

### 0.5 Cache Pattern Resolution
**Effort: S | Priority: High | Source: Architecture, Devil's Advocate**

Both `merchant-resolver.ts` and `income-resolver.ts` load ALL patterns from the database on every single call. For a batch of 50 transactions, that's 100 full-table-scan queries.

Create `src/lib/pattern-cache.ts` — load once per batch, invalidate on pattern creation.

### 0.6 Split staging/actions.ts
**Effort: M | Priority: Medium | Source: Architecture, UX**

1,114 lines with duplicated approval logic (`approveSuggestion` and `approveSuggestionInternal` are ~90% identical). Split into:
- `actions/suggestion-actions.ts`
- `actions/import-actions.ts`
- `actions/edit-actions.ts`
- `actions/batch-actions.ts`

Extract shared `processApproval()` function.

### 0.7 Add Cascade Deletes
**Effort: S | Priority: Medium | Source: Database**

- `StagingTransaction.import` → add `onDelete: Cascade` (orphan prevention)
- `Position.employer` → add `onDelete: Cascade`

---

## Sprint 1: Complete What's Started

### 1.1 Dashboard Enhancement
**Effort: L | Priority: High | Source: UX, Architecture**
**Depends on: 0.1 (bug fixes)**

Replace the 4-card skeleton with a real command center:

| Widget | Data Source | Component |
|--------|-----------|-----------|
| 5 KPI Cards (Net Balance, Month Income, Month Spent, Budget Left, Staging Pending) | Server queries | `page.tsx` |
| Spending Trends (6-month grouped bar chart) | `Transaction.groupBy(month)` | `dashboard/spending-trends-chart.tsx` |
| Budget Progress (horizontal bars per category group) | Existing `budgetStats` pattern | `dashboard/budget-progress.tsx` |
| Recent Transactions (last 10) | Simple query | `dashboard/recent-activity.tsx` |

Start without AI insights widget — add later if warranted. UX wireframe in `reports/ux-agent-report.md`.

### 1.2 Budget Period History UI
**Effort: M | Priority: High | Source: UX (CLAUDE.md TODO)**
**Depends on: 0.3 (indexes)**

The `BudgetPeriod` model and cron job exist. `budget-periods-dialog.tsx` exists but has no entry point. Wire it up:

1. Add "History" button to category rows with `monthlyBudget`
2. Show closed periods with budgeted vs actual + trend chart
3. Add dashboard widget with per-category progress bars
4. Color coding: green (under 80%), amber (80-100%), rose (over 100%)

### 1.3 Transaction Search & Filters
**Effort: M | Priority: High | Source: UX, QA**

The Transactions page has zero filtering. Add:
- Search bar (description, merchant name)
- Date range filter
- Account, category, type (income/expense) dropdowns
- Amount range
- CSV export button

Convert to client component with `useSearchParams` and server action for filtered queries.

### 1.4 Settings Page
**Effort: M | Priority: Medium | Source: UX, QA**

Replace "Coming Soon" placeholder. Sections:
- **General**: Currency, locale, date format, theme toggle (needs `next-themes`)
- **Import**: AI enabled, concurrency, cost limit/month
- **Budget**: Cycle day, manual reset trigger
- **Data**: CSV export, database stats, clear staging data

Add Settings link to sidebar (currently missing — BUG-m5).

Store settings as key-value pairs in a new `Setting` model or JSON config file.

### 1.5 Dark Mode
**Effort: S | Priority: Medium | Source: UX**

Components already have `dark:` variants. Missing:
- Theme toggle in header or settings
- `next-themes` ThemeProvider in layout
- `class="dark"` on `<html>` based on preference

### 1.6 Deduplicate Components
**Effort: S | Priority: Medium | Source: UX, Architecture**

| Duplication | Fix |
|------------|-----|
| JSON viewer in `import-log-table.tsx` and `staging-table.tsx` | Extract to `src/components/json-viewer.tsx` |
| `formatCurrency` in 3 files | Use centralized `src/lib/format.ts` everywhere |
| Native `confirm()` for deletes | Replace with shadcn `AlertDialog` |

### 1.7 Loading States & Error Boundaries
**Effort: S | Priority: Medium | Source: UX, Architecture, QA**

- Add `loading.tsx` with skeleton UI to all route directories
- Add `error.tsx` error boundaries to all route directories
- Prevents blank screens during data loading and unhandled errors

---

## Sprint 2: High-Value New Features (No AI Required)

### 2.1 "Remember This Match" Button
**Effort: S | Priority: High | Source: Devil's Advocate, Architecture**
**Depends on: 0.5 (pattern cache)**

> **CONFLICT**: UX and Architecture propose an AI auto-learning pipeline. Devil's Advocate argues the simpler version delivers 90% of the value at 0% AI cost.
>
> **Recommendation**: Build the button first. The function `createMerchantWithPattern()` already exists in `merchant-resolver.ts:182`. Wire it to a UI button in the staging table. If users still want AI auto-learning after using the button for a month, add it later.

When a user manually assigns a merchant/income to an "unknown" staging transaction, show a toast: "Learn this pattern? Create pattern 'AMZN MKTP' to auto-match future transactions?" with [Create Pattern] and [No thanks] buttons.

**Schema change**: Add auto-learning metadata to `MerchantPattern` and `IncomePattern` (`source`, `matchCount`, `lastMatchedAt`, `createdBy`). Full Prisma definitions in `reports/database-agent-report.md`.

### 2.2 Recurring Transaction Tracker
**Effort: M | Priority: High | Source: Devil's Advocate, UX**

> **CONFLICT**: Architecture proposes a full AI-powered forecast system with 5-state lifecycle. Devil's Advocate argues simple recurring transaction tracking delivers 80% of value.
>
> **Recommendation**: Build the simple version first. Manual entry of fixed bills + auto-detection of obvious patterns (same merchant, same amount ±5%, monthly interval). Defer AI forecasting to Sprint 3.

New page at `/recurring`:
- List of expected recurring transactions (rent, subscriptions, salary)
- Grouped by frequency (monthly, bi-weekly, annual)
- Status: expected, posted (matched to import), missed
- Auto-match on import: merchant + approximate amount + date window

**Schema**: `RecurrenceRule` model (from database report) + simplified `ForecastEntry` with 3 states instead of 5.

### 2.3 Budget Threshold Alerts
**Effort: S | Priority: Medium | Source: Devil's Advocate**

> **CONFLICT**: UX proposes AI-powered smart summaries. Devil's Advocate argues threshold alerts are more actionable and cost $0/month.
>
> **Recommendation**: Build alerts first. Add AI summaries in Sprint 4 only if users request it.

When a transaction pushes a category past 80% or 100% of monthly budget:
- Show toast notification
- Display colored indicator on dashboard budget widget
- Optional: new `Alert` model (from database report) for persistent notifications

### 2.4 Simple Savings Goals
**Effort: M | Priority: Medium | Source: UX, Devil's Advocate**
**Depends on: 1.1 (dashboard)**

> **CONFLICT**: Architecture proposes AI suggestions and virtual allocations. Devil's Advocate says keep it simple.
>
> **Recommendation**: Build the simplest version. Name, target amount, current amount (manually updated), deadline, progress bar. No AI, no virtual allocations.

New page at `/goals`:
- Goal cards with progress bars
- On-track / behind / at-risk indicators
- Required monthly contribution calculation (arithmetic, not AI)
- Dashboard widget showing active goals

**Schema**: Simplified `SavingsGoal` + `SavingsContribution` models from database report.

---

## Sprint 3: AI-Enhanced Features

### 3.1 AI-Powered Recurring Detection
**Effort: M | Priority: Medium | Source: Architecture**
**Depends on: 0.4 (unified AI service), 2.2 (recurring tracker)**

Enhance the recurring tracker with AI pattern detection:
- Analyze 6 months of transactions to find recurring patterns
- Suggest new recurring entries with confidence scores
- Background job (cron) for periodic re-detection
- Users approve/reject suggestions (builds confidence over time)

Only invoke AI for pattern detection, not for simple matching.

### 3.2 Payslip Entry Form
**Effort: M | Priority: Medium | Source: UX, Devil's Advocate**

> **CONFLICT**: UX and Architecture propose full AI PDF extraction. Devil's Advocate says manual form first.
>
> **Recommendation**: Build the manual form first using the existing Payslip model (rename to `SalaryChange`). Add new `PayslipDocument` model for detailed pay stub data. Defer AI extraction to Sprint 4.

**Schema changes** (from database report):
1. Rename `Payslip` → `SalaryChange`
2. Add `PayslipDocument`, `PayslipDeduction`, `PayslipTax`, `PayslipBenefit`

Form fields: gross, net, deductions breakdown, taxes, benefits, pay period, employer/position link.

### 3.3 Reconciliation Engine (Shared System)
**Effort: L | Priority: Medium | Source: Architecture**
**Depends on: 0.4 (unified AI service), 2.2 (recurring tracker)**

Shared fuzzy matching system at `src/lib/reconciliation/`:
- Used by: recurring transaction matching, future receipt matching, forecast reconciliation
- Matching factors: date proximity, amount match, merchant match, description similarity
- Weighted confidence scoring (0-100)
- AI-assisted fallback only when deterministic confidence < 60%
- Schema: `ReconciliationLog` model (from architecture report)

This is a **prerequisite** for forecast reconciliation and receipt matching.

---

## Sprint 4: Advanced Features (Build Only If Warranted)

### 4.1 6-Month Forecast View
**Effort: L | Priority: Low | Source: UX, Architecture**
**Depends on: 2.2 (recurring tracker), 3.1 (AI detection), 3.3 (reconciliation)**

Full forecast page at `/forecast`:
- Balance projection area chart with confidence bands
- Upcoming bills timeline
- Reconciliation review table with match confidence
- Status lifecycle: projected → confirmed → reconciled / missed / cancelled

> **Devil's Advocate concern**: 5 states may be over-engineered. Consider starting with 3 (projected, matched, missed) and adding confirmed/cancelled only if users need them.

### 4.2 Payslip AI Extraction
**Effort: M | Priority: Low | Source: Architecture**
**Depends on: 0.4 (unified AI service), 3.2 (payslip form)**

Add AI PDF extraction for payslips:
- New prompt template: `src/lib/prompts/extract-payslip.ts`
- Same queue system as bank statement extraction
- Auto-detect employer and link to existing records
- Reconcile net pay against bank deposit transaction

### 4.3 Receipt Import
**Effort: L | Priority: Low | Source: UX, Architecture**
**Depends on: 0.4 (unified AI service), 3.3 (reconciliation engine)**

> **CONFLICT**: Devil's Advocate recommends killing this feature entirely. UX and Architecture see value in line-item categorization.
>
> **Decision needed**: Is line-item spending analysis (e.g., "you spent $X on groceries vs $Y on household at Costco") worth the complexity? The bank statement already provides merchant + total.

If built:
- Upload receipt image/PDF
- AI extracts vendor, line items, tax, total
- Match to existing bank transaction via reconciliation engine
- **Schema**: `Receipt` + `ReceiptLineItem` models (from database report)

### 4.4 AI Smart Summaries
**Effort: M | Priority: Low | Source: UX**
**Depends on: 1.1 (dashboard)**

> **CONFLICT**: Devil's Advocate recommends killing this. Cost is $2.40/month for daily summaries, and charts already provide visual summaries.
>
> **Decision needed**: Is natural language insight ("You spent 23% more on groceries, mainly due to 3 Costco trips") worth $2.40/month over threshold alerts?

If built: Run weekly (not daily) to keep costs at $0.32/month. Display on dashboard as 3-4 bullet points.

---

## Sprint 5: Polish & Extended Features

### 5.1 Household Split Tracking
**Effort: M | Source: UX**

Per-person spending/income breakdowns using existing `Person` model and `Transaction.personId`. Settlement calculations for shared expenses.

### 5.2 Transaction Tags
**Effort: S | Source: Database**

Flexible many-to-many tagging system. New `Tag` + `TransactionTag` models. Use cases: "reimbursable", "tax-deductible", "shared-expense", project tags.

### 5.3 Audit Log
**Effort: M | Source: Database**

Track all data changes for accountability and undo. New `AuditLog` model. Especially valuable for a finance app where accidental deletions are costly.

### 5.4 Financial Health Score
**Effort: L | Source: Architecture**

Composite score (0-100) based on: budget adherence, savings rate, spending consistency, goal progress, debt management. Display on dashboard with trend over time.

---

## Conflicts Requiring Your Decision

### Conflict 1: AI Auto-Learning vs "Remember This Match" Button
- **UX + Architecture**: Build a full AI auto-learning pipeline that creates patterns from AI suggestions
- **Devil's Advocate**: A simple "Remember this match" button gives 90% of the value at 0% AI cost
- **My recommendation**: Start with the button (Sprint 2.1). Add AI auto-learning in Sprint 3 only if the pattern database isn't growing fast enough organically.

### Conflict 2: AI Forecast vs Simple Recurring Tracker
- **UX + Architecture**: Full AI-powered 6-month forecast with 5-state lifecycle and AI reconciliation
- **Devil's Advocate**: Simple recurring transaction checklist + category averages. Fixed bills are predictable; variable expenses aren't.
- **My recommendation**: Build recurring tracker first (Sprint 2.2). Layer AI detection on top (Sprint 3.1). Full forecast view (Sprint 4.1) only after the foundation works.

### Conflict 3: Receipt Import — Build or Kill?
- **UX + Architecture**: Full receipt import with line-item extraction and reconciliation
- **Devil's Advocate**: Kill it. Bank statements already provide merchant + amount. Line-item detail is rarely useful for personal budgeting.
- **My recommendation**: Defer to Sprint 4.3. If you personally find yourself wanting line-item data after using the app for a few months, build it then. Otherwise, skip it.

### Conflict 4: AI Smart Summaries vs Threshold Alerts
- **UX**: AI-generated natural language insights on dashboard
- **Devil's Advocate**: Threshold alerts ($0/month) are more actionable than AI summaries ($2.40/month)
- **My recommendation**: Build threshold alerts first (Sprint 2.3). Try AI summaries in Sprint 4.4 at weekly frequency ($0.32/month) if you want the natural language experience.

### Conflict 5: Payslip Import — AI or Manual Form?
- **Architecture**: Full AI extraction pipeline, same as bank statements
- **Devil's Advocate**: Manual form first (payslips come 12-26 times/year, low frequency doesn't justify AI setup)
- **My recommendation**: Manual form first (Sprint 3.2). Add AI extraction (Sprint 4.2) if you have multiple household members with different payslip formats.

---

## Effort Summary

| Sprint | Items | Total Effort | AI Cost Impact |
|--------|-------|-------------|---------------|
| **Sprint 0: Foundation** | 7 items | ~2 weeks | $0 |
| **Sprint 1: Complete Started** | 7 items | ~3 weeks | $0 |
| **Sprint 2: High-Value (No AI)** | 4 items | ~2 weeks | $0 |
| **Sprint 3: AI-Enhanced** | 3 items | ~2-3 weeks | +$0-3/month |
| **Sprint 4: Advanced** | 4 items | ~3-4 weeks | +$2-8/month |
| **Sprint 5: Polish** | 4 items | ~2-3 weeks | $0-2/month |

**Total estimated effort**: 14-17 weeks for everything.
**Recommended MVP** (Sprints 0-2): ~7 weeks, $0/month additional AI cost.

---

## Schema Migration Roadmap

From the Database Agent's 9-phase plan:

| Phase | Migration | Sprint | Risk |
|-------|-----------|--------|------|
| 1 | Add missing indexes (22+) | 0.3 | None |
| 2 | Rename Payslip → SalaryChange | 3.2 | Low (code changes) |
| 3 | Add auto-learning fields to patterns | 2.1 | None (nullable) |
| 4 | Add AiOperationLog table | 0.4 | None |
| 5 | Add cascade deletes | 0.7 | Low (behavioral) |
| 6 | Add Receipt models | 4.3 | None |
| 7 | Add PayslipDocument models | 3.2 | None |
| 8 | Add Forecast models | 2.2 | None |
| 9 | Add SavingsGoal models | 2.4 | None |

Optional additions (Sprint 5): Tag, TransactionTag, Alert, AuditLog.

---

## Quick Reference: What Each Agent Found

| Agent | Key Finding | Report |
|-------|------------|--------|
| **UX** | 4 critical, 7 major, 8 minor UI issues. Detailed wireframes for all new features. | `ux-agent-report.md` |
| **Architecture** | 2 duplicated AI functions, 1,114-line staging/actions.ts, no pattern caching, no tests. Designs for unified AI service, auto-learning, reconciliation engine. | `architecture-agent-report.md` |
| **Database** | 22+ missing indexes, 2 missing cascades, Payslip naming conflict. 16 new models proposed with full Prisma definitions. | `database-agent-report.md` |
| **QA** | 2 critical bugs (page crash, error leak), 5 major bugs (missing delete checks, open cron endpoint), 8 minor. 1.8MB merchant page. | `qa-agent-report.md` |
| **Devil's Advocate** | Kill 3 features (receipt import, smart summaries, anomaly detection). Simplify 4 others. Current AI: $0.50/month. All features: $7-80/month. Zero test coverage is biggest risk. | `devils-advocate-report.md` |
