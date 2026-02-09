# UX Agent Report

## Executive Summary

FinTrack is a well-structured personal/household finance management app with strong data import and review workflows. The existing UI follows consistent patterns (shadcn/ui, 3D buttons, chart-table interaction, maximize/minimize) across most pages. However, the **Dashboard is critically underdeveloped** — it serves as the landing page but shows only 4 static number cards with no actionable insights. The management pages (Categories, Merchants, Income, Accounts) have mature KPI + Chart + Table patterns. The key gaps are: (1) a rich dashboard, (2) missing Settings functionality, (3) no Budget Period History UI despite the schema being ready, (4) no payslip/receipt import flows, (5) no savings goal tracking, and (6) no 6-month forecast view. The import pipeline and staging review workflow are sophisticated and well-executed.

---

## Existing Page Issues (prioritized by severity)

### Critical

**C1. Dashboard is a skeleton** (`src/app/page.tsx:23-88`)
- Only shows 4 static metric cards: Total Balance, Transactions, Staging, Imports
- "Total Balance" is misleading — it's the sum of all transaction amounts, not actual bank balances
- No charts, no trends, no budget progress, no recent activity, no quick actions
- **Impact**: First thing users see; sets the tone for the entire app. Currently gives no actionable information.

**C2. Settings page is a placeholder** (`src/app/settings/page.tsx:1-29`)
- Displays "Coming Soon" with zero functionality
- Has a sidebar link (Settings icon in the Setup group), so users expect to find something
- No way to configure: currency, date format, theme, notification preferences, cron settings, AI cost limits

**C3. No Budget Period History UI** (`CLAUDE.md` TODO, schema ready at `prisma/schema.prisma:315-334`)
- `BudgetPeriod` model exists with `periodStart`, `periodEnd`, `budgetedAmount`, `actualSpent`, `status`
- Cron job runs daily at midnight to close/open periods
- But zero UI to view budget period history — users cannot see historical budget vs actual spend
- The Categories page has a `budget-periods-dialog.tsx` but no visible entry point in the main flow

**C4. No dark mode toggle anywhere**
- Layout uses `<html lang="en">` with no class for dark mode (`src/app/layout.tsx:30`)
- Some components have `dark:` variants (e.g., `dark:bg-slate-800`, `dark:text-indigo-400`) but there's no user-facing toggle
- Users cannot switch between light and dark themes

### Major

**M1. Duplicated JSON Viewer component**
- `JsonLine`, `JsonValue`, `JsonNode` are duplicated between `src/components/import-log-table.tsx:148-298` and `src/app/staging/staging-table.tsx:616-760`
- Same code, same styling — should be a shared component in `/src/components/`

**M2. Duplicated `formatCurrency` function**
- `src/components/import-log-table.tsx:119-125` — local `formatCurrency` using `en-CA`
- `src/app/accounts/accounts-tabs.tsx:109-115` — local `formatCurrency` using `en-CA`
- `src/app/income/income-tabs.tsx:167-173` — local `formatCurrency` using `en-CA`
- `src/lib/format.ts:55-63` — centralized version exists but isn't used everywhere
- **Impact**: Inconsistent formatting possible if locales/options drift

**M3. Staging table is a mega-component** (`src/app/staging/staging-table.tsx` — 1873 lines)
- Contains: filters, charts, batch headers, transaction rows, edit dialog, suggestion actions, bulk actions, JSON viewer, delete buttons
- Difficult to maintain; any change risks side effects across unrelated features
- Should be decomposed into focused sub-components

**M4. Transactions page has no filters or search** (`src/app/transactions/page.tsx`)
- Only pagination — no way to filter by date range, account, category, merchant, or amount
- No search functionality for descriptions
- Compared to the rich filtering on Import Log and Staging pages, this is a significant gap

**M5. No loading states for server-component pages**
- Dashboard, Staging, Transactions, Categories, Merchants, Income, Accounts, Schemas — all are server components that fetch data synchronously
- No `loading.tsx` Suspense boundaries in any route folder
- If data is large or DB is slow, users see a blank page with no feedback

**M6. Header bar is empty** (`src/app/layout.tsx:37-40`)
- Header only contains `SidebarTrigger` and a separator
- No breadcrumbs, page title, search, notifications, or user avatar
- Wasted space that could provide contextual navigation

**M7. Sidebar "Settings" link is missing**
- The sidebar (`src/components/app-sidebar.tsx`) has a Setup group with Accounts, Categories, Merchants, Income, Schemas
- Settings page exists at `/settings` but has no sidebar link
- Users can only reach it by typing the URL directly

### Minor

**m1. Import page file input only accepts PDF** (`src/app/import/page.tsx:948`)
- `accept=".pdf"` — the CLAUDE.md mentions "PDF or JSON" but JSON upload was removed/disabled
- Should either add JSON support back or update docs

**m2. `confirm()` used for destructive actions**
- `src/components/import-log-table.tsx:438` — `confirm()` for delete
- `src/app/staging/staging-table.tsx:590` — `confirm()` for delete
- Native `confirm()` breaks the app's polished feel; should use a shadcn/ui `AlertDialog`

**m3. Hardcoded CAD currency in import-log-table**
- `src/components/import-log-table.tsx:121` uses `currency: "CAD"` directly instead of using `src/lib/format.ts`
- While the app is Canadian-focused, the centralized format library supports configurable currency

**m4. Inconsistent empty states**
- Dashboard: No empty state at all (shows $0.00 for everything)
- Staging: Has a nice empty state card ("No transactions in staging. Import a statement to get started.")
- Transactions: Has empty state text
- Import Log: Has empty state with Card wrapper
- Should have consistent empty states with actionable CTAs (e.g., "Go to Import" button)

**m5. No keyboard shortcuts**
- No keyboard shortcuts for common actions (e.g., `Cmd+I` to open import, `Cmd+S` for staging)
- Power users would benefit from this

**m6. Sidebar Setup section default collapsed**
- `src/components/app-sidebar.tsx:91` — Setup starts collapsed unless user is on a setup page
- New users may not discover Accounts, Categories, Merchants, etc.

**m7. Transaction pagination uses links that don't preserve scroll position**
- `src/app/transactions/page.tsx:155-201` — Link-based pagination triggers full page reload
- Should consider client-side pagination for smoother UX

**m8. No favicon or PWA manifest**
- Layout metadata only has title and description (`src/app/layout.tsx:19-22`)
- No favicon, theme color, manifest.json for PWA support

---

## New Feature UI Designs

### Dashboard Enhancements

The dashboard (`src/app/page.tsx`) should become the command center of the app. Replace the current 4-card layout with a rich, multi-section dashboard.

#### Wireframe Layout

```
┌─────────────────────────────────────────────────────────┐
│ Dashboard                                                │
│ Welcome to FinTrack. Track your finances and build wealth│
├─────────┬─────────┬─────────┬─────────┬─────────────────┤
│ Net     │ Month   │ Month   │ Budget  │ Staging         │
│ Balance │ Income  │ Spent   │ Left    │ Pending (badge) │
│ $12,345 │ $8,200  │ $5,100  │ $3,100  │ 47 txns         │
├─────────┴─────────┴─────────┴─────────┴─────────────────┤
│                                                          │
│  ┌─────────────────────┐  ┌─────────────────────┐       │
│  │ Spending Trends     │  │ Budget Progress      │       │
│  │ (6-month bar chart) │  │ (horizontal bars     │       │
│  │ Income vs Expenses  │  │  by category group)  │       │
│  │ with net line       │  │ ██████████░░ 75%     │       │
│  └─────────────────────┘  │ ████████░░░░ 60%     │       │
│                            └─────────────────────┘       │
│                                                          │
│  ┌─────────────────────┐  ┌─────────────────────┐       │
│  │ Recent Transactions │  │ Upcoming / Recurring │       │
│  │ (last 10 txns,      │  │ (predicted bills     │       │
│  │  compact list)      │  │  next 30 days)       │       │
│  └─────────────────────┘  └─────────────────────┘       │
│                                                          │
│  ┌──────────────────────────────────────────────┐       │
│  │ AI Insights Summary                           │       │
│  │ "Spending up 12% vs last month"              │       │
│  │ "3 recurring charges increased this quarter" │       │
│  │ "You've saved $200 by switching to X"        │       │
│  └──────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────┘
```

#### KPI Cards (top row, grid-cols-5)

| Card | Data Source | Color |
|------|-----------|-------|
| Net Balance | Sum of latest closing balances from Import (per account) | Indigo |
| Month Income | `Transaction.sum(amount > 0, this month)` | Green |
| Month Spent | `Transaction.sum(amount < 0, this month)` | Amber |
| Budget Left | `totalBudget - monthSpent` from categories | Green/Rose |
| Staging Pending | `StagingTransaction.count(status != imported)` — link to `/staging` | Blue with badge |

#### Spending Trends Chart
- **Type**: Grouped BarChart (Recharts) with 6 bars (one per month)
- **Bars**: Income (green), Expenses (rose), with a ReferenceLine at 0
- **Data**: `Transaction.groupBy(month)` for last 6 months
- **Interaction**: Click bar to filter Recent Transactions below

#### Budget Progress Bars
- **Type**: Horizontal progress bars, one per expense CategoryGroup with a budget
- **Data**: Uses existing `budgetStats` and `categoryStats` patterns from `categories/page.tsx`
- **Visual**: Green bar if under 80%, Amber 80-100%, Rose if over. Show `$spent / $budget` and days remaining in period
- **Interaction**: Click to navigate to Categories page

#### Recent Transactions (compact table)
- Last 10 imported transactions, showing: Date | Description/Merchant | Category badge | Amount
- "View All" link to `/transactions`

#### Upcoming / Recurring (future)
- Predicted bills based on `Transaction.isRecurring = true`
- Shows next expected date, merchant name, expected amount
- Uses `is_predicted` and `recurring_id` fields from schema

#### AI Insights Summary
- Card with 3-4 bullet points generated from transaction data
- Examples: "Groceries up 15% vs last month", "New merchant detected: XYZ"
- Implementation: Server-side analysis of transaction patterns, no live AI call needed for basic insights

#### Implementation Notes
- File: `src/app/page.tsx` (enhance existing server component)
- Add `src/app/dashboard-charts.tsx` as client component for interactive charts
- Reuse `formatCurrency`, `formatCompactCurrency` from `src/lib/format.ts`
- Follow existing chart patterns from categories-tabs.tsx (TOOLTIP_STYLE, MAXIMIZE_BTN constants)

---

### Payslip Import

#### Flow Overview

```
Upload payslip PDF → AI extracts → Preview extracted data → Link to Income/Employer → Save
```

#### Step 1: Upload (extend `/import` page)

- Add a second drop zone or a toggle at the top: "Statement" | "Payslip" | "Receipt"
- When "Payslip" is selected, accept PDF files
- Uses same extract-queue system with a payslip-specific prompt from `src/lib/prompts/`
- DocumentSchema model already supports `documentType: "payslip"`

#### Step 2: Extracted Data Preview

```
┌──────────────────────────────────────────────┐
│ Payslip Preview                    [Save]    │
│                                              │
│ ┌──────────────┐  ┌────────────────────────┐ │
│ │ Employee     │  │ Pay Period             │ │
│ │ John Smith   │  │ Jan 1 - Jan 15, 2025  │ │
│ │ Software Dev │  │ Pay Date: Jan 20      │ │
│ │ @ Acme Inc   │  │                        │ │
│ └──────────────┘  └────────────────────────┘ │
│                                              │
│ ┌────────────────────────────────────────┐   │
│ │ Earnings                               │   │
│ │ Regular Pay      80.00 hrs    $4,000   │   │
│ │ Overtime           5.00 hrs      $375  │   │
│ │ ─────────────────────────────────────  │   │
│ │ Gross Pay                      $4,375  │   │
│ └────────────────────────────────────────┘   │
│                                              │
│ ┌────────────────────────────────────────┐   │
│ │ Deductions                             │   │
│ │ Federal Tax                    $850    │   │
│ │ Provincial Tax                 $420    │   │
│ │ CPP                            $280    │   │
│ │ EI                             $95     │   │
│ │ Benefits                       $150    │   │
│ │ ─────────────────────────────────────  │   │
│ │ Total Deductions              $1,795   │   │
│ └────────────────────────────────────────┘   │
│                                              │
│ ┌────────────────────────────────────────┐   │
│ │ Net Pay                        $2,580  │   │
│ └────────────────────────────────────────┘   │
│                                              │
│ Link to:                                     │
│ Income Source: [dropdown of Income records]   │
│ Position:      [auto-detected or dropdown]   │
│ Employer:      [auto-detected or dropdown]   │
│                                              │
│ ☐ Update currentGross/currentNet if changed  │
│ ☐ Create Payslip history record              │
└──────────────────────────────────────────────┘
```

#### Data Model Integration
- Creates a `Payslip` record linked to `Income` (model exists at `prisma/schema.prisma:424-440`)
- Optionally updates `Income.currentGross` / `currentNet` if values differ
- Updates `Import` with `sourceType: "Payslip"`
- The extracted data includes: employer name, employee name, pay period, earnings breakdown, deductions breakdown, net pay, deposit account

#### Implementation Notes
- New page: `/import/payslip` or extend existing `/import` with tabs
- New prompt: `src/lib/prompts/extract-payslip.ts`
- New action: `src/app/import/payslip-actions.ts`
- DocumentSchema already supports payslip type

---

### Receipt Import

#### Flow Overview

```
Upload receipt image/PDF → AI extracts → Preview line items → Create/match Transaction → Save
```

#### Step 1: Upload

- Same import page with "Receipt" tab/toggle
- Accepts PDF, JPG, PNG
- DocumentSchema supports `documentType: "receipt"`

#### Step 2: Extracted Data Preview

```
┌──────────────────────────────────────────────┐
│ Receipt Preview                    [Save]    │
│                                              │
│ ┌──────────────────────────────┐             │
│ │ Merchant: Costco Wholesale   │ [matched ✓] │
│ │ Date: Feb 5, 2025            │             │
│ │ Store: #1234, Ottawa ON      │             │
│ └──────────────────────────────┘             │
│                                              │
│ ┌────────────────────────────────────────┐   │
│ │ Line Items                             │   │
│ │ Organic Bananas (x2)          $3.98    │   │
│ │ Kirkland Chicken Breast       $24.99   │   │
│ │ Paper Towels (x3)             $18.97   │   │
│ │ Dishwasher Pods               $15.99   │   │
│ │ ─────────────────────────────────────  │   │
│ │ Subtotal                      $63.93   │   │
│ │ Tax (HST 13%)                  $8.31   │   │
│ │ Total                         $72.24   │   │
│ └────────────────────────────────────────┘   │
│                                              │
│ 🔗 Reconciliation:                           │
│ Found matching transaction:                  │
│   Feb 5 | COSTCO WHSE #1234 | -$72.24      │
│   [Link Receipt ✓]  [Create New Transaction] │
│                                              │
│ Category overrides (optional):               │
│ Line items default to merchant's category    │
│ ☐ Split by line item categories              │
└──────────────────────────────────────────────┘
```

#### Reconciliation Flow
1. AI extracts receipt data (merchant, date, total, line items)
2. System searches for matching `Transaction` by: merchant + date ± 3 days + amount ± $0.50
3. If found: show match with confidence indicator, allow user to link
4. If not found: offer to create a new Transaction directly
5. Store receipt data as JSON in Import.content

#### Implementation Notes
- Extends `/import` page with Receipt-specific preview
- New prompt: `src/lib/prompts/extract-receipt.ts`
- Reconciliation logic: `src/lib/receipt-reconciler.ts`
- Import `sourceType: "Receipt"`

---

### 6-Month Forecast

A new page at `/forecast` that provides forward-looking financial projections.

#### Wireframe

```
┌─────────────────────────────────────────────────────────┐
│ 6-Month Forecast                                        │
│ Projected cash flow based on recurring patterns         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Balance Projection Chart (Area chart)                 │ │
│ │                                                       │ │
│ │  $15K ─                    ╱──                        │ │
│ │        ╲                 ╱    ╲                       │ │
│ │  $12K ─  ╲─────╱╲─────╱       ╲──                   │ │
│ │                  ╲╱                ╲──                │ │
│ │  $10K ─                               ╲──           │ │
│ │  ────┬────┬────┬────┬────┬────┬────                  │ │
│ │     Feb  Mar  Apr  May  Jun  Jul                     │ │
│ │                                                       │ │
│ │  ── Projected (dashed)   ── Actual (solid)           │ │
│ │  ░░ Confidence band (±10%)                           │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Upcoming Bills & Income (Timeline)                    │ │
│ │                                                       │ │
│ │ Feb 10  ● Netflix            -$16.99    confirmed ✓  │ │
│ │ Feb 15  ● Salary (John)    +$3,200.00   projected    │ │
│ │ Feb 17  ● Insurance          -$189.00   projected    │ │
│ │ Feb 20  ● Mortgage         -$1,850.00   confirmed ✓  │ │
│ │ Feb 28  ● Salary (Jane)   +$2,800.00   projected    │ │
│ │ Mar 1   ● Rent             -$2,100.00   projected    │ │
│ │ ...                                                   │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Reconciliation Review                                 │ │
│ │                                                       │ │
│ │ Status   Expected    Actual     Match   Confidence   │ │
│ │ ✓ matched Netflix    -$16.99   -$16.99   100%  🟢   │ │
│ │ ✓ matched Salary     +$3,200   +$3,200   100%  🟢   │ │
│ │ ⚠ partial Insurance  -$189.00  -$195.50   97%  🟡   │ │
│ │ ✗ missed  Gym        -$49.99     —         —   🔴   │ │
│ │ 🆕 new    Amazon     —         -$67.23     —   ⚪   │ │
│ └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

#### Status Lifecycle

```
projected → confirmed → reconciled
                      → missed (if past due date with no match)
                      → cancelled (manually marked)
```

#### Balance Projection Algorithm
1. Get latest account balances from most recent Import closing balances
2. Add projected recurring income (from `Transaction.isRecurring = true` patterns)
3. Subtract projected recurring expenses
4. Apply confidence bands (±10% for variable amounts like groceries)
5. As real transactions come in, overlay actual vs projected

#### AI Match Confidence Indicators
- **100% (Green)**: Exact amount, same merchant, within expected date window
- **90-99% (Yellow)**: Same merchant but amount differs by <5%
- **<90% (Orange)**: Same merchant but amount differs significantly, or date is off
- **Unmatched (Red)**: Projected transaction with no match past expected date
- **New (Gray)**: Actual transaction with no projection (unexpected expense)

#### Implementation Notes
- New page: `src/app/forecast/page.tsx`
- Client component: `src/app/forecast/forecast-charts.tsx`
- Data: Query recurring transactions, apply pattern-based prediction
- Uses `Transaction.isRecurring`, `Transaction.recurringId` fields (schema already has these)
- Sidebar link: Add to main navigation between "Transactions" and "Import Log"

---

### Savings Goals

#### Overview
Users define savings goals with target amounts and deadlines. The app tracks progress based on actual savings rate (income minus expenses).

#### Wireframe

```
┌─────────────────────────────────────────────────────────┐
│ Savings Goals                           [+ New Goal]    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ┌──────────────────────────────────────┐                │
│ │ Emergency Fund          Target: $15K │                │
│ │ ██████████████████░░░░░  $11,250     │                │
│ │ 75% complete · $3,750 remaining      │                │
│ │ At current pace: reached by May 2025 │                │
│ │ Monthly contribution: $625           │                │
│ └──────────────────────────────────────┘                │
│                                                          │
│ ┌──────────────────────────────────────┐                │
│ │ Vacation 2025           Target: $5K  │                │
│ │ ████████████░░░░░░░░░░  $2,400       │                │
│ │ 48% · $2,600 remaining              │                │
│ │ Deadline: Jul 2025 · On track ✓     │                │
│ │ Need: $520/mo                        │                │
│ └──────────────────────────────────────┘                │
│                                                          │
│ ┌──────────────────────────────────────┐                │
│ │ New Car Down Payment    Target: $10K │                │
│ │ ██████░░░░░░░░░░░░░░░  $2,800       │                │
│ │ 28% · $7,200 remaining              │                │
│ │ Deadline: Dec 2025 · Behind ⚠       │                │
│ │ Need: $654/mo (currently saving $400)│                │
│ └──────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────┘
```

#### Goal Creation Dialog

```
┌──────────────────────────────────────┐
│ New Savings Goal                      │
│                                       │
│ Name:     [Emergency Fund          ]  │
│ Target:   [$15,000                 ]  │
│ Deadline: [2025-12-31              ]  │
│ Current:  [$11,250                 ]  │
│ Priority: [High ▼]                    │
│ Account:  [Savings Account ▼]         │
│                                       │
│ Monthly contribution: Auto-calculated │
│ based on remaining amount / months    │
│                                       │
│           [Cancel]  [Create Goal]     │
└──────────────────────────────────────┘
```

#### Data Model (new table)
```prisma
model SavingsGoal {
  id              Int       @id @default(autoincrement())
  name            String
  targetAmount    Float
  currentAmount   Float     @default(0)
  deadline        DateTime?
  priority        String    @default("medium") // low, medium, high
  accountId       Int?      // linked savings account
  status          String    @default("active") // active, completed, cancelled
  notes           String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

#### Progress Tracking
- Manual: User updates `currentAmount` periodically
- Auto (future): Link to a designated savings Account and calculate balance difference over time
- Visual: Progress bar with color coding (green on track, amber behind, rose at risk)

#### Implementation Notes
- New page: `src/app/goals/page.tsx`
- Sidebar: Add to main navigation
- Follow existing KPI + Card pattern from other management pages

---

### Budget Period History

The `BudgetPeriod` model already exists. This design implements the TODO from CLAUDE.md.

#### Categories Page Enhancement

Add a "History" button to each category row that has `monthlyBudget` set.

```
┌──────────────────────────────────────────────────────────┐
│ Category: Groceries          Budget: $800/mo  [History]  │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ Budget Period History                                     │
│                                                           │
│ Period           Budgeted    Actual    Diff     Status   │
│ Jan 1-31, 2025    $800       $723    +$77 ✅   closed   │
│ Dec 1-31, 2024    $800       $892    -$92 🔴   closed   │
│ Nov 1-30, 2024    $750       $681    +$69 ✅   closed   │
│ Oct 1-31, 2024    $750       $745    +$5  ✅   closed   │
│                                                           │
│ Current Period: Feb 1-28, 2025                           │
│ Budget: $800 · Spent: $312 · Remaining: $488            │
│ ████████████░░░░░░░░░░ 39% (14 days remaining)          │
│                                                           │
│ ┌──────────────────────────────────────────────┐         │
│ │ 6-Month Trend (bar chart)                     │         │
│ │ Budget (violet) vs Actual (amber/rose)       │         │
│ └──────────────────────────────────────────────┘         │
└──────────────────────────────────────────────────────────┘
```

#### Dashboard Widget

In the enhanced dashboard (see Dashboard Enhancements above), add a "Budget Progress" section:

```
Budget Progress (Feb 2025 · 14 days left)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Groceries      ██████████░░░░ $312/$800   39%
Dining Out     ████████████░░ $178/$250   71%
Entertainment  ████████████████ $210/$200 105% ⚠
Utilities      ██████░░░░░░░░ $89/$180    49%
Transport      ███████████░░░ $245/$350   70%
```

#### Implementation Notes
- File: `src/app/categories/budget-periods-dialog.tsx` (already exists, needs wiring)
- Add trigger button to category rows in `src/app/categories/categories-panel.tsx`
- Data: Query `BudgetPeriod` by `categoryId`, ordered by `periodStart desc`
- Chart: Reuse existing horizontal BarChart pattern from categories-tabs.tsx

---

### Settings Page

Replace the "Coming Soon" placeholder with actual functionality.

#### Wireframe

```
┌─────────────────────────────────────────────────────────┐
│ Settings                                                 │
│ Manage your application preferences                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ┌─ General ──────────────────────────────────────────┐  │
│ │ Currency:          [CAD ▼]                          │  │
│ │ Locale:            [en-CA ▼]                        │  │
│ │ Date Format:       [MMM d, yyyy ▼]                  │  │
│ │ Theme:             [System ▼] / Light / Dark        │  │
│ │ Sidebar Default:   [Collapsed ▼] / Expanded         │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ ┌─ Import Settings ──────────────────────────────────┐  │
│ │ Default Source Type: [Statement ▼]                  │  │
│ │ AI Extraction:       [Enabled ▼]                    │  │
│ │ Concurrency:         [1 ▼]                          │  │
│ │ Auto-resolve:        [☐ Enabled]                    │  │
│ │ Cost Limit/month:    [$5.00              ]          │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ ┌─ Budget Settings ──────────────────────────────────┐  │
│ │ Budget Cycle:        [Monthly ▼]                    │  │
│ │ Reset Day:           [1st ▼]                        │  │
│ │ Cron Status:         Running ✓  (last run: 12:00AM)│  │
│ │ [Trigger Budget Reset Now]                          │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ ┌─ Data Management ──────────────────────────────────┐  │
│ │ [Export All Transactions (CSV)]                     │  │
│ │ [Export Categories (JSON)]                          │  │
│ │ [Re-seed Categories]                                │  │
│ │ [Clear All Staging Data]                            │  │
│ │ Database Size: 12.4 MB · 3,247 transactions        │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│                               [Save Settings]           │
└─────────────────────────────────────────────────────────┘
```

#### Implementation Notes
- Settings stored as key-value pairs in a new `Setting` model or a JSON file
- Environment variables (NEXT_PUBLIC_*) become defaults, user settings override
- Theme toggle needs `next-themes` integration in layout.tsx
- CSV export: Server action that queries all transactions and streams as CSV
- Budget reset trigger: Call existing `/api/cron/budget-reset` endpoint
- Add Settings link to sidebar (currently missing)

---

## AI-Powered UX Elements

### Confidence Indicators

Currently used in staging suggestions. Standardize across all AI features:

```tsx
// Shared component: src/components/ai-confidence.tsx
<ConfidenceBadge level="high" />   // 🟢 Green dot + "high"
<ConfidenceBadge level="medium" /> // 🟡 Amber dot + "medium"
<ConfidenceBadge level="low" />    // 🔴 Rose dot + "low"
```

Visual design:
- Green (`#10b981`): High confidence — auto-approve eligible
- Amber (`#f59e0b`): Medium confidence — human review needed
- Rose (`#f43f5e`): Low confidence — likely incorrect, needs manual resolution

### AI Suggestion Badges

For the staging table and any future AI-assisted flows:

```
[🤖 AI Suggested] — purple badge when AI has provided a suggestion
[🤖 AI Created]   — blue badge when AI created a new merchant/income
[🤖 AI Matched]   — green badge when AI confirmed an existing match
```

### "AI Detected" Labels

In the import flow, when PDF extraction identifies specific data:
- Schema detection: `"AI detected: Triangle Mastercard Statement"` with confidence
- Account auto-creation: `"AI created new account: Triangle MC ending 1234"`
- These already partially exist in the import page (`extractionMeta.schema`, `extractionMeta.confidence`) but should be more prominent

### Loading States for AI Operations

Currently, the AI resolve button in staging (`BatchAiResolveButton`) shows a spinner with elapsed time. Standardize this pattern:

```tsx
// Shared component: src/components/ai-loading.tsx
<AiProcessingIndicator
  label="Analyzing transactions"
  elapsed={45}
  estimatedTotal={60}
/>
```

Visual: Purple-themed spinner + progress text + elapsed time + estimated time remaining (based on historical durations from `Import.extractDurationMs`)

### Auto-Learn Confirmation

When a user manually assigns a merchant/category to a transaction, offer to create a pattern:

```
┌─────────────────────────────────────────┐
│ 💡 Learn this pattern?                  │
│                                          │
│ You matched "AMZN MKTP CA" → Amazon     │
│                                          │
│ Create pattern "AMZN MKTP" to auto-     │
│ match future transactions?              │
│                                          │
│        [No thanks]  [Create Pattern ✓]  │
└─────────────────────────────────────────┘
```

This appears as a toast or inline prompt after saving a manual transaction edit in the staging table. Implementation: After `updateStagingTransaction` succeeds, check if `rawDescription` matches any existing pattern. If not, show the prompt.

---

## Additional Feature Proposals

### 1. Transaction Search & Filters (Global)

**Problem**: The Transactions page (`/transactions`) has zero filtering capability. Users can only paginate through all transactions sequentially.

**Proposal**: Add a search bar + filter panel to the Transactions page:

```
┌─────────────────────────────────────────────────────────┐
│ 🔍 [Search descriptions, merchants...          ]       │
│                                                          │
│ Filters:                                                │
│ Date: [From] → [To]    Account: [All ▼]                │
│ Category: [All ▼]      Amount: [Min] → [Max]           │
│ Type: [All] [Expense] [Income] [Transfer]               │
│                                                          │
│ 1,247 results                    [Export CSV] [Clear]   │
├─────────────────────────────────────────────────────────┤
│ Date    | Description    | Account  | Category | Amount │
│ Feb 5   | Costco        | CIBC Visa| Groceries| -$72   │
│ ...                                                      │
└─────────────────────────────────────────────────────────┘
```

**Implementation**: Convert to client component with `useSearchParams`, debounced search, and server actions for filtered queries. Add CSV export button.

### 2. Recurring Transaction Detection & Management

**Problem**: The schema has `isRecurring` and `recurringId` fields on Transaction, but there's no UI to:
- View all detected recurring transactions
- Mark transactions as recurring
- Set expected amounts and frequencies
- Get alerts when a recurring charge changes

**Proposal**: New page at `/recurring` or a tab on the Transactions page:

```
┌─────────────────────────────────────────────────────────┐
│ Recurring Transactions                                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Monthly (12)                                             │
│ ┌───────────────────────────────────────────────────┐   │
│ │ Netflix          $16.99/mo    Next: Feb 15   ✓   │   │
│ │ Spotify          $11.99/mo    Next: Feb 20   ✓   │   │
│ │ Mortgage       $1,850/mo      Next: Feb 20   ✓   │   │
│ │ Car Insurance    $189/mo      Next: Feb 17   ⚠   │   │
│ │   ⚠ Amount changed: was $175, now $189           │   │
│ └───────────────────────────────────────────────────┘   │
│                                                          │
│ Bi-weekly (2)                                            │
│ ┌───────────────────────────────────────────────────┐   │
│ │ Salary (John)  +$3,200/2wk   Next: Feb 14   ✓   │   │
│ │ Salary (Jane)  +$2,800/2wk   Next: Feb 28   ✓   │   │
│ └───────────────────────────────────────────────────┘   │
│                                                          │
│ Annual (3)                                               │
│ ┌───────────────────────────────────────────────────┐   │
│ │ Amazon Prime     $99/yr       Next: Oct 2025  ✓  │   │
│ │ Property Tax   $3,200/yr      Next: Jun 2025  ✓  │   │
│ └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Detection Algorithm**: Group transactions by merchant/income, detect repeating patterns (same merchant, similar amount ±5%, regular interval). Mark as recurring with confidence score.

**Data Model**: Add `RecurringRule` table with `merchantId/incomeId`, `expectedAmount`, `frequency`, `nextExpectedDate`, `tolerance`.

### 3. Household Split Tracking

**Problem**: The app has a `Person` model and transactions can be linked to persons, but there's no UI for:
- Tracking who-owes-whom in a household
- Splitting transactions between family members
- Viewing per-person spending summaries

**Proposal**: A "Household" dashboard tab or page showing per-person breakdowns:

```
┌─────────────────────────────────────────────────────────┐
│ Household Overview              Feb 2025                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│ │ John         │  │ Jane         │  │ Shared       │   │
│ │ Spent: $1,200│  │ Spent: $950  │  │ Spent: $2,900│   │
│ │ Income: $3,200│ │ Income: $2,800│ │ (mortgage,   │   │
│ │ Net: +$2,000 │  │ Net: +$1,850 │  │  groceries)  │   │
│ └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                          │
│ Settlement:                                              │
│ John owes Jane $475 (John's share of shared expenses    │
│ exceeds his proportional contribution)                   │
│                                                          │
│ Spending by Person (Pie chart)                          │
│ [Chart showing distribution]                             │
└─────────────────────────────────────────────────────────┘
```

**Implementation**: Uses existing `Person` and `Transaction.personId` fields. Add allocation logic for shared expenses (50/50 split or income-proportional). New page or dashboard widget.

---

## Appendix: Page-by-Page Audit

### `/` (Dashboard) — `src/app/page.tsx`
- **Type**: Server Component
- **Lines**: 88
- **Issues**: C1 (skeleton dashboard), m4 (no empty state with CTA)
- **Missing**: Charts, budget progress, recent activity, quick actions, AI insights

### `/import` — `src/app/import/page.tsx`
- **Type**: Client Component (1175 lines)
- **Strengths**: Excellent drag-and-drop UX, queue management, duplicate detection, real-time polling, localStorage persistence across sessions, multi-file upload
- **Issues**: m1 (PDF only, no JSON), long file (could extract FileImportCard)
- **Accessibility**: File input has label association ✓, disabled states ✓, status text for screen readers ✓

### `/staging` — `src/app/staging/page.tsx` + `staging-table.tsx`
- **Type**: Server Component (page) + Client Component (table, 1873 lines)
- **Strengths**: Batch-grouped transactions, running balance, AI resolve integration, bulk suggestion actions, edit dialog with AI pre-fill, pie charts, filter system
- **Issues**: M1 (duplicated JSON viewer), M3 (mega-component), m2 (confirm() for deletes)
- **Empty State**: Good — shows card with helpful message

### `/transactions` — `src/app/transactions/page.tsx`
- **Type**: Server Component (209 lines)
- **Strengths**: Clean table layout, pagination, category badges, color-coded amounts
- **Issues**: M4 (no filters or search), m7 (full page reload pagination)

### `/log` — `src/app/log/page.tsx` + `src/components/import-log-table.tsx`
- **Type**: Server Component (page) + Client Component (table, 1292 lines)
- **Strengths**: Evolution charts with chart-table sync, expandable rows, filter system (time/status/account), pie charts for transaction breakdown, AI processing metrics card, 3D action buttons
- **Issues**: M2 (local formatCurrency), long component file
- **Patterns**: Follows all CLAUDE.md conventions (maximize/minimize, color conventions, chart-table interaction)

### `/merchants` — `src/app/merchants/page.tsx` + `merchants-tabs.tsx`
- **Type**: Server Component (page) + Client Component (tabs)
- **Strengths**: KPI cards, top merchant charts (spending + frequency), smart filter, status filter, well-organized sub-components in `components/` subfolder
- **Issues**: None significant
- **Components**: merchant-dialog, merchant-form, merchants-table, bulk-actions, search-input, pattern management

### `/income` — `src/app/income/page.tsx` + `income-tabs.tsx`
- **Type**: Server Component (page) + Client Component (tabs)
- **Strengths**: Household income KPIs, employer/position management, pay history dialog, deduction percentage calculation
- **Issues**: No charts (unlike merchants/categories pages)
- **Missing**: Income trend chart, salary growth visualization

### `/categories` — `src/app/categories/page.tsx` + `categories-tabs.tsx`
- **Type**: Server Component (page) + Client Component (tabs)
- **Strengths**: 5 KPI cards, Budget vs Spent chart, Income vs Spending donut, smart filter, budget cell with inline editing, necessity level cell, parent-child hierarchy
- **Issues**: C3 (budget-periods-dialog exists but no visible entry point)
- **Components**: add-category-dialog, add-group-dialog, budget-cell, budget-periods-dialog, category-actions, smart-filter

### `/accounts` — `src/app/accounts/page.tsx` + `accounts-tabs.tsx`
- **Type**: Server Component (page) + Client Component (tabs)
- **Strengths**: 3-tab layout (Accounts, Institutions, Persons), KPI cards, status filter, institution lookup
- **Issues**: No charts (unlike merchants/categories pages)
- **Missing**: Account balance trend, credit utilization chart

### `/schemas` — `src/app/schemas/page.tsx` + `schema-tabs.tsx`
- **Type**: Server Component (page) + Client Component (tabs)
- **Strengths**: 5 KPI cards, type-based tabs (Credit Cards, Bank, Payslip, Other), schema panel with JSON editor
- **Issues**: StatusFilter component is redefined locally instead of using shared one
- **Components**: schema-dialog, schema-panel

### `/settings` — `src/app/settings/page.tsx`
- **Type**: Server Component (28 lines)
- **Issues**: C2 (placeholder only)

### Shared Components — `src/components/`
- **app-sidebar.tsx**: Sidebar with collapsible Setup section. Issues: M7 (no Settings link)
- **import-log-table.tsx**: Full-featured import log with charts. Issues: M1 (duplicated JSON viewer), M2 (local formatCurrency)
- **ui/**: Standard shadcn/ui components — badge, button, card, dialog, dropdown-menu, input, label, popover, scroll-area, select, separator, sheet, sidebar, skeleton, sonner, table, textarea, tooltip
