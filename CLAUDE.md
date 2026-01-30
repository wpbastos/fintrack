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

# Docker
docker-compose up -d         # Run containerized
docker-compose down          # Stop containers
docker-compose logs -f       # View logs
```

## Tech Stack

- **Framework**: Next.js 16 with App Router, React 19, TypeScript
- **Database**: SQLite via Prisma ORM with better-sqlite3 adapter
- **UI**: Tailwind CSS 4, shadcn/ui (new-york style), Radix UI primitives, Lucide icons
- **Notifications**: Sonner for toasts
- **Scheduling**: node-cron for background jobs

## Architecture

### Import Pipeline

The core workflow for importing bank statements:

1. **Upload** → JSON statement uploaded via `/api/import`
2. **ImportLog** → Audit record created tracking batch metadata, fingerprint for duplicate detection
3. **StagingTransaction** → Transactions land here with status "pending"
4. **Resolution** → `merchant-resolver.ts` matches raw descriptions to merchants via patterns
5. **Review** → User reviews at `/staging`, resolves unknowns, approves imports
6. **Transaction** → Approved records move to permanent transactions table

### Database Schema

**Core tables**: ImportLog → StagingTransaction → Transaction

**Master data**: Merchant (with MerchantPattern for matching), Category (hierarchical with CategoryGroup), Cardholder, Account, Institution

Key relationships:
- Merchants have multiple patterns for fuzzy matching raw descriptions
- Categories support parent-child hierarchy and belong to groups
- Transactions link to merchant, category, cardholder, and import batch

### Key Libraries

- `/src/lib/db.ts` - Prisma client singleton
- `/src/lib/merchant-resolver.ts` - Pattern-based merchant matching
- `/src/lib/staging-resolver.ts` - Staging transaction resolution logic
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
CRON_SECRET=your-secret-here  # Optional
```
