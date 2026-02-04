# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run lint         # ESLint check

# Database
npm run db:seed              # Seed database with categories and groups
npx prisma migrate dev       # Run migrations
npx prisma generate          # Regenerate Prisma client after schema changes

# Note: Database auto-initializes on first run if it doesn't exist

# Docker
docker-compose up -d         # Run containerized
docker-compose down          # Stop containers
docker-compose logs -f       # View logs
```

## Tech Stack

- **Framework**: Next.js 16 with App Router, React 19, TypeScript
- **Database**: SQLite via Prisma ORM with better-sqlite3 adapter
- **UI**: Tailwind CSS 4, shadcn/ui (new-york style), Radix UI primitives, Lucide icons
- **Charts**: Recharts (BarChart, ResponsiveContainer, Legend, Tooltip, Cell)
- **Notifications**: Sonner for toasts
- **Scheduling**: node-cron for background jobs

## Architecture

### Import Pipeline

The core workflow for importing bank statements:

1. **Upload** → PDF or JSON statement uploaded at `/import`
   - PDFs: Extracted via Claude CLI, metrics captured (duration, cost, tokens)
   - JSON: Parsed directly
2. **Import** → Record created in `Import` table with batch metadata, file hash for duplicate detection
3. **StagingTransaction** → Transactions land here with status "pending"
4. **Resolution** → `merchant-resolver.ts` and `income-resolver.ts` match raw descriptions
5. **Review** → User reviews at `/staging`, resolves unknowns, approves imports
6. **Transaction** → Approved records move to permanent transactions table

### Database Schema

**Core tables**: Import → StagingTransaction → Transaction

**Master data**: Merchant (with MerchantPattern), Income (with IncomePattern), Category (with CategoryGroup), Account, Institution

Key relationships:
- Merchants and Incomes have multiple patterns for matching raw descriptions
- Categories support parent-child hierarchy and belong to groups
- Transactions link to merchant/income, category, account, and import batch
- Import stores extraction metrics (duration, cost, tokens) for PDF imports

### Key Libraries

- `/src/lib/db.ts` - Prisma client singleton
- `/src/lib/merchant-resolver.ts` - Pattern-based merchant matching
- `/src/lib/income-resolver.ts` - Pattern-based income source matching
- `/src/lib/staging-resolver.ts` - Staging transaction resolution logic
- `/src/lib/account-resolver.ts` - Account auto-creation from statement data
- `/src/lib/date-resolver.ts` - Date parsing utilities

### Path Aliases

`@/*` maps to `./src/*` (e.g., `@/lib/db`, `@/components/ui/button`)

## Conventions

- Server Components by default; client components only when needed for interactivity
- Prisma schema at `/prisma/schema.prisma`; regenerate client after changes
- shadcn/ui components live in `/src/components/ui/`
- Sample statement files in `/samples/` for testing imports

## UI Patterns

### Table Column Alignment

When multiple tables need consistent column widths (e.g., grouped data in separate Cards), use `<colgroup>` with `<col>` elements and `table-fixed`:

```tsx
<Table className="table-fixed w-full">
  <colgroup>
    <col style={{ width: "70%" }} />
    <col style={{ width: "14%" }} />
    <col style={{ width: "10%" }} />
    <col style={{ width: "6%" }} />
  </colgroup>
  <TableHeader>...</TableHeader>
  <TableBody>...</TableBody>
</Table>
```

This ensures columns align consistently across all table instances. Add `text-center` to TableHead/TableCell for centered columns.

### 3D Action Buttons

Small action buttons (JSON, Delete, Maximize) use a 3D raised effect with glow on hover:

```tsx
<button
  className="h-7 w-7 p-0 rounded-md text-indigo-600 bg-indigo-50
    dark:text-indigo-400 dark:bg-indigo-950/50
    shadow-[0_2px_0_0_rgba(99,102,241,0.4)]
    hover:bg-indigo-100 hover:shadow-[0_0_8px_2px_rgba(99,102,241,0.4)] hover:scale-110
    active:shadow-none active:scale-100 active:translate-y-[1px]
    transition-all duration-150 dark:hover:bg-indigo-900/70
    flex items-center justify-center"
>
  <Icon className="h-4 w-4" />
</button>
```

**Color variants:**
- Indigo: primary actions (view, edit)
- Rose: destructive actions (delete)
- Slate: neutral actions (maximize/minimize)

### Recharts Patterns

For bar charts with selection and custom legends:

```tsx
// Custom legend with explicit order and colored labels
<Legend
  verticalAlign="top"
  height={36}
  content={() => (
    <div className="flex justify-center gap-6 text-sm mb-2">
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#6366f1" }} />
        <span style={{ color: "#6366f1" }}>Label</span>
      </div>
      {/* ... more items */}
    </div>
  )}
/>

// Tooltip with explicit sort order
<Tooltip
  itemSorter={(item) => {
    const order: Record<string, number> = { first: 0, second: 1, third: 2 };
    return order[item.dataKey as string] ?? 0;
  }}
/>

// Bars with selection highlighting via Cell
<Bar dataKey="value" onClick={handleBarClick} cursor="pointer">
  {chartData.map((entry) => (
    <Cell
      key={entry.id}
      fill="#6366f1"
      opacity={selectedId === null || selectedId === entry.id ? 1 : 0.3}
    />
  ))}
</Bar>
```

### Chart-Table Interaction

When charts and tables show the same data, sync selection between them:

1. Add `selectedId` state in parent component
2. Pass to both chart and table
3. On chart bar click: toggle selection
4. On table row: highlight with opacity and background color
5. Non-selected items dim to 30-40% opacity

### Maximize/Minimize Charts

Add toggle button to expand charts to full width:

```tsx
const [maximized, setMaximized] = useState<"chart1" | "chart2" | null>(null);
const chartHeight = maximized ? 400 : 256;

// Grid adjusts based on maximized state
<div className={`grid gap-6 ${maximized ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"}`}>
  {(maximized === null || maximized === "chart1") && (
    <div>/* Chart with maximize button */</div>
  )}
</div>
```

### Color Conventions

| Color | Hex | Usage |
|-------|-----|-------|
| Indigo | #6366f1 | Primary actions, totals |
| Green | #10b981 | Positive, matched, net change |
| Amber | #f59e0b | Warnings, unknown items |
| Rose | #f43f5e | Delete, danger, negative |
| Blue | #3b82f6 | Closing balance, info |
| Slate | #94a3b8 | Neutral, opening balance |

## Budget Cycle System

### BudgetPeriod Table

Tracks historical budget cycles for each category:
- `periodStart` / `periodEnd` - Cycle dates
- `budgetedAmount` - Snapshot of budget at period start
- `actualSpent` - Calculated from transactions when period closes
- `status` - "open" or "closed"

### Cron Jobs

Budget reset runs daily at midnight via node-cron:
1. Closes expired open periods (calculates actual spent)
2. Opens new periods for active categories with budgets

**Files:**
- `/src/lib/cron.ts` - Cron scheduler initialization
- `/src/app/api/cron/budget-reset/route.ts` - Reset endpoint
- `/src/instrumentation.ts` - Initializes cron on app start

**Manual trigger:**
```bash
curl -X POST http://localhost:3000/api/cron/budget-reset
```

**Environment variables:**
- `CRON_SECRET` - Optional auth token for cron endpoint
- `NEXT_PUBLIC_APP_URL` - Base URL for internal API calls

### Budget Period History UI (TODO)

Display budget period history with these views:

1. **Categories Page** - Add "History" button per category
   - Shows list of closed periods with budgeted vs actual
   - Visual indicator (green/red) for under/over budget

2. **Dashboard Widget** - Current period summary
   - Progress bars showing spent vs budget per category
   - Days remaining in period

3. **Reports Page** (future)
   - Monthly/yearly budget trends
   - Category-level spending analysis
   - Export to CSV

**Account Integration:**
- Credit card accounts with `billingCycleDay` can have custom period dates
- Link budget periods to account via `accountId` field
- When viewing account details, show related budget periods

## Docker

### Commands

```bash
docker build -t fintrack .           # Build image
docker-compose up -d                 # Run with compose
docker-compose down                  # Stop
docker-compose logs -f fintrack      # View logs
```

### Configuration

- SQLite database persisted in Docker volume `fintrack-data`
- Standalone Next.js output for minimal image size
- Health check on `/api/cron/budget-reset` endpoint

### Environment Variables

```bash
DATABASE_URL=file:/app/data/fintrack.db
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=your-secret-here      # Optional - auth for cron endpoint
EXTRACT_CONCURRENCY=1             # Max concurrent PDF extractions (default: 1)
```

## PDF Import with AI Extraction

The import page accepts both JSON and PDF files. PDFs are processed using Claude CLI.

### Queue System

PDF extraction uses a queue to limit concurrent Claude CLI calls:
- `EXTRACT_CONCURRENCY` env var controls max concurrent extractions (default: 1)
- Multiple uploads are queued and processed sequentially
- Queue status available at `GET /api/ai/extract-pdf`

### Extraction Metrics

Claude CLI response metrics are captured and stored in the Import model:
- `extractDurationMs` - Extraction duration in milliseconds
- `extractCostUsd` - Cost in USD (from Claude CLI)
- `extractInputTokens` / `extractOutputTokens` - Token usage
- `extractCacheTokens` - Cached tokens (if applicable)
- `extractPdfSizeBytes` - Original PDF file size

Metrics are displayed in the Import Log page when expanding a row (AI Processing card).

### Files

- `/src/lib/extract-queue.ts` - Queue manager singleton
- `/src/lib/prompts/extract-pdf.ts` - Prompt builder for PDF extraction
- `/src/app/import/actions.ts` - Server actions for extraction jobs
- `/prisma/schema.prisma` - `DocumentSchema` model for extraction templates
