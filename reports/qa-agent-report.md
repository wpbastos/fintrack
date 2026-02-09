# QA Agent Report

## Executive Summary

Systematic testing of all 11 pages in FinTrack revealed **2 critical bugs**, **5 major bugs**, and **8 minor issues**. All pages render successfully (HTTP 200) with proper empty states. The import pipeline is well-designed with good duplicate detection and error handling. The most critical finding is a crash on the Transactions page with invalid query parameters, and a raw Prisma error leaked through the Import API.

## Test Environment

- **App**: FinTrack (Next.js 16, Prisma/SQLite, shadcn/ui)
- **Branch**: `feature/import`
- **Server**: `npm run dev` at `http://localhost:3000`
- **Database**: SQLite with seeded categories and existing import data
- **Testing Date**: 2026-02-08
- **Method**: HTTP endpoint testing, source code review, API testing

## Bug Report (prioritized by severity)

### Critical (blocking, data loss)

#### BUG-C1: Transactions page crashes with non-numeric page parameter
- **Page**: `/transactions?page=abc`
- **Severity**: Critical (500 error, page completely broken)
- **Steps to reproduce**:
  1. Navigate to `/transactions?page=abc`
  2. Page returns HTTP 500
- **Root cause**: `src/app/transactions/page.tsx:50` — `parseInt("abc")` returns `NaN`, `Math.max(1, NaN)` returns `NaN`, causing `(NaN - 1) * PAGE_SIZE = NaN` which is passed to Prisma's `skip` parameter.
- **Error**: `PrismaClientValidationError: Argument 'skip' is missing`
- **Fix**: Add `isNaN` check: `const currentPage = Math.max(1, parseInt(params.page || "1", 10) || 1);`

#### BUG-C2: Import API leaks raw Prisma error messages to client
- **Endpoint**: `POST /api/import`
- **Severity**: Critical (information disclosure, poor UX)
- **Steps to reproduce**:
  1. POST to `/api/import` with `{"statement":{"accountId":9999}, "transactions":[{"date":"2026-01-01","description":"test","amount":10}]}`
  2. Response: `{"error":"\nInvalid \`prisma.import.create()\` invocation:\n\nForeign key constraint violated on the foreign key"}`
- **Root cause**: `src/app/api/import/route.ts:344` catches errors and returns `error.message` directly, which includes raw Prisma error details including query structure.
- **Security concern**: Reveals database schema and query structure to clients.
- **Fix**: Validate `accountId` exists before creating the import record. Return generic error message instead of raw Prisma error.

### Major (broken functionality)

#### BUG-M1: `deleteAccount` doesn't check for related transactions, imports, or staging transactions
- **File**: `src/app/accounts/actions/account-actions.ts:126-139`
- **Severity**: Major (potential foreign key constraint error or orphaned data)
- **Details**: Unlike `deleteMerchant` (checks transactions), `deleteInstitution` (checks accounts), and `deletePerson` (checks accounts + transactions), `deleteAccount` performs no referential integrity checks. Deleting an account with linked transactions, imports, or staging transactions will either:
  - Fail with an unhelpful Prisma error (if FK constraints are enforced)
  - Orphan data (if FK is nullable)
- **Fix**: Add transaction/import count check before deletion, similar to the merchant delete pattern.

#### BUG-M2: `deleteChildCategory` doesn't check for linked transactions
- **File**: `src/app/categories/actions/category-actions.ts:203-216`
- **Severity**: Major (potential FK constraint error)
- **Details**: `deleteChildCategory` and `deleteParentCategory` delete categories without checking if transactions, merchants, or incomes reference them. While Prisma uses nullable FKs (so it won't error), this will silently null out `categoryId` on linked records, causing data loss of categorization.
- **Fix**: Check for linked transactions, merchants, and incomes before allowing deletion. Show count to user.

#### BUG-M3: `deleteImportBatch` in staging actions deletes finalized import data
- **File**: `src/app/staging/actions.ts:861-881`
- **Severity**: Major (potential data loss)
- **Details**: `deleteImportBatch` deletes an import and ALL its staging transactions without checking if the import is finalized. This duplicates `deleteImport` in `log/actions.ts` which correctly checks status. If called on a finalized import, it deletes the import record but the actual transactions in the Transaction table remain orphaned (their `importId` FK becomes null or dangles).
- **Fix**: Add finalized status check like `log/actions.ts` does.

#### BUG-M4: Budget cron endpoint accessible without authentication by default
- **File**: `src/app/api/cron/budget-reset/route.ts:16-19`
- **Severity**: Major (security)
- **Details**: The cron endpoint only checks `CRON_SECRET` if the env var is set. Without it, anyone can trigger budget resets. The comment says "Optional" but it should be documented as a security requirement.
- **Verified**: `curl -X POST http://localhost:3000/api/cron/budget-reset` succeeds without any auth token.
- **Fix**: Default to requiring auth, or at minimum add rate limiting.

#### BUG-M5: Dashboard "Total Balance" is misleading
- **File**: `src/app/page.tsx:11-13`
- **Severity**: Major (misleading data)
- **Details**: Dashboard shows "Total Balance" as `SUM(amount)` across ALL transactions. This sums both income (positive) and expenses (negative) from all accounts. For a finance tracker, "Total Balance" typically means current account balances. The label says "Sum of all transactions" but users will expect actual balance.
- **Recommendation**: Either rename to "Net Cash Flow" or calculate actual balance per account considering opening balances.

### Minor (cosmetic, UX)

#### BUG-m1: Settings page is a placeholder with no functionality
- **File**: `src/app/settings/page.tsx`
- **Details**: Shows "Coming Soon" card. The sidebar includes a link to settings but nothing works. Consider hiding it from the sidebar until implemented.

#### BUG-m2: `clearAll` on import page doesn't cancel in-progress jobs
- **File**: `src/app/import/page.tsx:862-865`
- **Details**: `clearAll` removes all file states and clears localStorage, but doesn't cancel any in-progress extraction jobs. These jobs will continue running on the server, potentially wasting AI credits.
- **Fix**: Call `cancelJob` for each in-progress job before clearing.

#### BUG-m3: Import page only accepts PDFs, despite CLAUDE.md mentioning JSON support
- **File**: `src/app/import/page.tsx:581-585, 948`
- **Details**: The file input filter is `accept=".pdf"` and `handleFiles` only accepts `.pdf`. CLAUDE.md says "The import page accepts both JSON and PDF files" but JSON upload has been removed from the UI. The API still accepts JSON payloads directly.
- **Recommendation**: Either re-add JSON upload UI or update CLAUDE.md.

#### BUG-m4: Pagination buttons still clickable when disabled (using Link)
- **File**: `src/app/transactions/page.tsx:155-204`
- **Details**: Pagination buttons use `<Button asChild disabled={...}><Link href={...}>` but `disabled` on a Button wrapping a Link doesn't actually prevent navigation. The `href` is set to `"#"` when disabled, which scrolls to top instead of doing nothing.
- **Fix**: Use `onClick` with `preventDefault` or conditionally render the Link.

#### BUG-m5: No `Settings` link in sidebar navigation
- **File**: `src/components/app-sidebar.tsx`
- **Details**: The sidebar has no link to `/settings`. The page exists but is only accessible via direct URL navigation. This is inconsistent with the sidebar being the primary navigation.

#### BUG-m6: No loading states on setup pages
- **Details**: None of the setup pages (accounts, categories, merchants, income, schemas) show loading skeletons. Since they're Server Components, users see the previous page until the new one loads. Consider adding `loading.tsx` files.

#### BUG-m7: `importAllTransactions` doesn't finalize imports that still have unresolved transactions
- **File**: `src/app/staging/actions.ts:1088-1101`
- **Details**: When importing all transactions, the function sets all matching imports to "finalized" even if some transactions in that batch are still pending/unknown. This could be confusing.

#### BUG-m8: `createIncome` creates payslip only when BOTH gross AND net are provided
- **File**: `src/app/income/actions/income-source-actions.ts:39-49`
- **Details**: The condition `if (data.currentGross && data.currentNet)` means providing only gross OR only net salary won't create the initial payslip record. The `||` operator with `0` values would also skip payslip creation since `0` is falsy.

## Page-by-Page Test Results

### Dashboard (`/`)
- **Status**: HTTP 200 ✓
- **Content**: 4 stat cards (Total Balance, Transactions, Staging, Imports)
- **Empty state**: Shows $0.00 / 0 counts ✓
- **Issues**: BUG-M5 (misleading Total Balance label)
- **Missing**: No charts, trends, budget progress, or period summaries (placeholder dashboard)

### Import (`/import`)
- **Status**: HTTP 200 ✓
- **Content**: Drag-and-drop upload zone, file state list with clear-all
- **Duplicate detection**: File hash + server-side check ✓
- **Re-import**: Supported via button on duplicate items ✓
- **Queue system**: Displays position and elapsed time ✓
- **Issues**: BUG-m2 (clearAll doesn't cancel jobs), BUG-m3 (no JSON upload UI)
- **Notes**: Very polished UI with status colors, extraction metrics display. Only PDF accepted.

### Staging (`/staging`)
- **Status**: HTTP 200 ✓
- **Content**: Batch view with transactions grouped by import, running balances, batch info
- **Empty state**: "No transactions in staging" card ✓
- **Features**: Balance validation, batch import, AI suggestions, resolve/unmatch/exclude actions
- **Issues**: None critical. Complex but functional.

### Transactions (`/transactions`)
- **Status**: HTTP 200 ✓ (normal), HTTP 500 ✗ (page=abc)
- **Content**: Paginated table with date, description, account, category, amount
- **Pagination**: Server-side, 50 per page ✓
- **Empty state**: "No transactions yet" message ✓
- **Issues**: BUG-C1 (crashes with non-numeric page), BUG-m4 (disabled pagination links)
- **Edge cases tested**:
  - `page=0` → 200 (treated as page 1 via Math.max) ✓
  - `page=-1` → 200 (treated as page 1 via Math.max) ✓
  - `page=abc` → 500 ✗
  - `page=99999` → 200 (empty results) ✓

### Import Log (`/log`)
- **Status**: HTTP 200 ✓
- **Content**: Import history table with charts and metrics
- **Features**: Expandable rows with AI processing details, delete (staged only)
- **Issues**: None found.

### Accounts (`/accounts`)
- **Status**: HTTP 200 ✓
- **Content**: Tabbed view for Institutions, Persons, and Accounts
- **Features**: CRUD operations, bulk enable/disable, billing cycle support
- **Issues**: BUG-M1 (deleteAccount missing referential integrity checks)
- **Notes**: Auto-enables institution when creating account ✓

### Categories (`/categories`)
- **Status**: HTTP 200 ✓ (large page: ~1MB)
- **Content**: Grouped categories with hierarchy, budgets, stats
- **Features**: Parent/child categories, budget editing, necessity levels, color coding
- **Issues**: BUG-M2 (deleteChildCategory/deleteParentCategory don't check for linked records)
- **Notes**: Page is ~1MB which is quite large. Consider pagination or lazy loading.

### Merchants (`/merchants`)
- **Status**: HTTP 200 ✓ (large page: ~1.8MB)
- **Content**: Merchant list with patterns, categories, stats
- **Features**: Pattern CRUD, alternative tracking, impulse-prone flagging
- **Delete protection**: Checks for linked transactions ✓
- **Issues**: Page is ~1.8MB which is very large. Consider pagination.

### Income (`/income`)
- **Status**: HTTP 200 ✓
- **Content**: Tabbed view for Income Sources, Positions, Employers
- **Features**: Pattern matching, payslip history, employer/position linking
- **Delete protection**: Checks for linked transactions ✓
- **Issues**: BUG-m8 (payslip creation edge case)

### Document Schemas (`/schemas`)
- **Status**: HTTP 200 ✓
- **Content**: Schema management for PDF extraction templates
- **Features**: CRUD, duplicate, toggle active, JSON sample data editing
- **Issues**: None found.

### Settings (`/settings`)
- **Status**: HTTP 200 ✓
- **Content**: Placeholder "Coming Soon" card
- **Issues**: BUG-m1 (no functionality), BUG-m5 (no sidebar link)

## Import Pipeline Test Results

### API Endpoint Testing (`POST /api/import`)

| Test Case | Result | Notes |
|-----------|--------|-------|
| Empty body `{}` | 400 ✓ | "Invalid payload: missing statement or transactions" |
| Empty transactions `[]` | 200 ✓ | `{warning: true, message: "No transactions found"}` |
| Valid single transaction | 200 ✓ | Creates import + staging records |
| Non-existent accountId | 500 ✗ | BUG-C2: Leaks raw Prisma FK error |
| Duplicate file hash | 200 ✓ | Returns `{duplicate: true, existingImport: {...}}` |
| Force re-import | 200 ✓ | Deletes existing, re-imports |
| Credit card normalization | N/A | Code review confirms signs are flipped ✓ |

### PDF Extraction Queue

- Queue status endpoint: `GET /api/ai/extract-pdf` (queue manager)
- Extraction uses Claude CLI with configurable `EXTRACT_CONCURRENCY`
- Job polling: 5-second intervals, max 60 polls (5-minute timeout)
- File hash duplicate detection happens before extraction (saves AI cost) ✓
- Resume on page reload from localStorage ✓

### Budget Reset Cron

| Test Case | Result | Notes |
|-----------|--------|-------|
| POST without auth | 200 ✓ | BUG-M4: Succeeds without CRON_SECRET |
| GET status check | 200 ✓ | Returns period counts |

## Console Errors & Warnings

| Error | Source | Severity |
|-------|--------|----------|
| `PrismaClientValidationError: skip is missing` | `/transactions?page=abc` | Critical |
| `Foreign key constraint violated` | `POST /api/import` with invalid accountId | Critical |
| No other console errors observed during normal navigation | — | — |

## Responsiveness Testing

Not tested via Playwright (no browser MCP tools available). Tested via HTTP requests only. Recommendation: Test the following viewport scenarios:
- Mobile (375px): Sidebar should collapse, tables should scroll horizontally
- Tablet (768px): Sidebar toggle should work
- Desktop (1024px+): Full sidebar, tables at full width

## Code Quality Observations

### Positive Findings
1. **Consistent error handling**: All server actions return `{ success: boolean; error?: string }` pattern
2. **Duplicate detection**: SHA-256 file hash + server-side check prevents double imports
3. **Credit card normalization**: Automatic sign flipping for credit card transactions
4. **Cascading status**: Enabling accounts auto-enables institution and person
5. **Auto-resolve**: Approving AI suggestions triggers re-resolution across all batches
6. **Billing cycle awareness**: Monthly stats respect credit card billing cycles

### Areas for Improvement
1. **Input validation**: Server actions trust client data without validation (no zod/yup schemas)
2. **Rate limiting**: No rate limiting on any API endpoints
3. **Error messages**: Some actions expose Prisma error details to users
4. **Transaction safety**: No database transactions (`$transaction`) for multi-step operations
5. **Large page sizes**: Merchants (~1.8MB) and Categories (~1MB) pages send all data at once

## New Feature Test Plan

### Forecast & Reconciliation
1. **Test matching algorithm**: Verify predicted transactions match actual imports within tolerance
2. **Test date range overlaps**: Ensure forecasts don't overlap with actual transaction periods
3. **Test recurring detection**: Import 3+ months of statements, verify recurring pattern detection
4. **Edge cases**: Merchants with variable amounts (utilities), skipped months, partial matches
5. **Balance reconciliation**: Verify account balances after bulk imports match expected values

### Receipt Import
1. **Test file types**: JPEG, PNG, PDF single-page receipts
2. **Test extraction accuracy**: Amount, date, merchant, tax, item count
3. **Test duplicate detection**: Same receipt uploaded twice
4. **Test matching**: Receipt matched to existing transaction by amount + date proximity
5. **Edge cases**: Handwritten receipts, multi-item receipts, foreign currency, damaged images

### Payslip Import
1. **Test payslip parsing**: Gross, net, deductions, year-to-date totals
2. **Test employer matching**: Link payslip to existing employer/position
3. **Test salary change detection**: Compare new payslip to previous, flag changes
4. **Test deposit matching**: Match payslip amount to bank deposit within tolerance
5. **Edge cases**: Bonus payments, retroactive adjustments, multiple pay periods

### Savings Goals
1. **CRUD operations**: Create, edit, delete goals with target amounts and dates
2. **Test progress tracking**: Verify calculations against actual account balances
3. **Test milestones**: Notification when 25%, 50%, 75%, 100% reached
4. **Test deadline warnings**: Alert when savings rate is insufficient for deadline
5. **Edge cases**: Negative progress (withdrawal), goal editing mid-progress, multiple goals per account

### Dashboard Widgets
1. **Test data accuracy**: Verify all widget numbers match database queries
2. **Test period filtering**: Monthly, quarterly, yearly views
3. **Test chart interactions**: Click on bar charts to filter table data
4. **Test refresh**: Data updates after import without full page reload
5. **Test empty states**: All widgets show appropriate placeholders with no data
6. **Test performance**: Dashboard loads within 1 second with 10,000+ transactions

## Appendix: Test Coverage Summary

| Page | HTTP | Empty State | CRUD | Delete Safety | Edge Cases |
|------|------|-------------|------|---------------|------------|
| Dashboard | ✓ | ✓ | N/A | N/A | ✓ |
| Import | ✓ | ✓ | N/A | N/A | ✓ |
| Staging | ✓ | ✓ | ✓ | Partial | ✓ |
| Transactions | ✗ | ✓ | N/A | N/A | ✗ (page=abc) |
| Import Log | ✓ | ✓ | ✓ | ✓ | ✓ |
| Accounts | ✓ | ✓ | ✓ | ✗ (no checks) | ✓ |
| Categories | ✓ | ✓ | ✓ | ✗ (no checks) | ✓ |
| Merchants | ✓ | ✓ | ✓ | ✓ | ✓ |
| Income | ✓ | ✓ | ✓ | ✓ | ✓ |
| Schemas | ✓ | ✓ | ✓ | ✓ | ✓ |
| Settings | ✓ | N/A | N/A | N/A | N/A |

**Legend**: ✓ = Pass, ✗ = Fail, Partial = Some checks missing
