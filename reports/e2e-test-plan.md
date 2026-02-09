# Fintrack E2E Test Plan

**App URL:** http://localhost:3000
**Date:** 2026-02-08
**Total Test Cases:** 15

---

## TC-01: Fresh Dashboard Load

**Objective:** Verify the dashboard renders correctly on a freshly seeded database.

### Steps:
1. Navigate to `http://localhost:3000/`
2. Verify the page title "Dashboard" is visible
3. Verify subtitle text "Your financial command center." is visible
4. Verify **5 KPI cards** are present in a grid:
   - **Net Balance** — Look for text "Net Balance" and "Across all accounts". Value should show "$0.00" on fresh DB.
   - **Month Income** — Look for text "Month Income" and "This month". Value should show "$0.00".
   - **Month Spent** — Look for text "Month Spent" and "This month". Value should show "$0.00".
   - **Budget Left** — Look for text "Budget Left" and contains "budget" text.
   - **Staging** — Look for text "Staging" and "Pending review". Value should show "0".
5. Verify **Spending Trends** chart card exists — look for text "Spending Trends" and "Income vs expenses over 6 months"
6. Verify **Budget Progress** card exists — look for text "Budget Progress" and "Monthly budget utilization by category"
7. Verify **Recent Transactions** card exists — look for text "Recent Transactions" and "Last 10 imported transactions"
8. Since fresh DB, verify empty state message: "No transactions yet. Import a statement to get started."

### Expected Result:
- Page loads without errors
- All 5 KPI cards visible with zero/default values
- Chart areas render (may be empty)
- Recent transactions shows empty state message

---

## TC-02: Navigation - All Pages Accessible

**Objective:** Verify all sidebar navigation links work and pages load without error.

### Steps:

#### Menu Section:
1. Look at the left sidebar. It should have a **"FinTrack"** logo/text at the top.
2. Under **"Menu"** label, find these links:
   - **Dashboard** (/) — Click it, verify "Dashboard" heading appears
   - **Import** (/import) — Click it, verify "Import" heading appears
   - **Staging** (/staging) — Click it, verify "Staging" heading appears
   - **Transactions** (/transactions) — Click it, verify "Transactions" heading appears
   - **Import Log** (/log) — Click it, verify page loads (look for "Import Log" or similar heading)

#### Setup Section (Collapsible):
3. Find the **"Setup"** section with a chevron icon. It should be collapsed by default (unless you're on a setup page).
4. **Click the "Setup" text/button** to expand it. Verify the chevron rotates and the following links appear:
   - **Accounts** (/accounts) — Click it, verify "Accounts" heading
   - **Categories** (/categories) — Click it, verify "Categories" heading or category groups visible
   - **Merchants** (/merchants) — Click it, verify "Merchants" heading
   - **Income** (/income) — Click it, verify "Income" heading
   - **Schemas** (/schemas) — Click it, verify "Schemas" heading
5. Click "Setup" again to collapse it. Verify links are hidden.

#### Settings:
6. At the **bottom of the sidebar**, find the **"Settings"** link (with a cog icon).
7. Click it, verify "Settings" heading appears on the page.

### Expected Result:
- All 10+ pages load without error (no error boundary triggered)
- Setup section expands/collapses properly
- Active page is highlighted in sidebar
- Settings link at bottom works

---

## TC-03: Dark Mode Toggle

**Objective:** Verify the theme toggle works in the header.

### Steps:
1. Navigate to `http://localhost:3000/`
2. In the **header area** (top-right), find a small icon button — it will be a **Sun**, **Moon**, or **Monitor** icon depending on current theme.
3. Click the theme toggle button. A dropdown menu should appear with three options:
   - **Light** (Sun icon)
   - **Dark** (Moon icon)
   - **System** (Monitor icon)
4. Click **"Dark"**. Verify:
   - The page background changes to a dark color
   - The `<html>` element should have class "dark"
   - The toggle button icon changes to a Moon
5. Click the toggle again and select **"Light"**. Verify:
   - The page returns to light colors
   - The `<html>` element should NOT have class "dark"
   - The toggle icon changes to a Sun
6. Click toggle and select **"System"**. Verify it applies system preference.

### Expected Result:
- Theme toggle dropdown appears on click
- Dark mode applies dark background/text
- Light mode returns to normal
- Theme persists across page navigation

---

## TC-04: Categories Page

**Objective:** Verify seeded category groups and categories are displayed.

### Steps:
1. Navigate to `http://localhost:3000/categories`
2. Verify the heading "Categories" is visible (or equivalent heading from the page)
3. Look for **category group cards**. The seeded database should have groups like:
   - Look for group names with type badges (e.g., "Expense", "Income", "Transfer")
   - Each group card has a colored dot, title, and type badge
4. Within each group card, verify a **table** is shown with columns:
   - Category, Necessity, Budget (for Expense groups), Month, Year, Total, Status, Actions
5. Verify **search input** exists — look for placeholder "Search categories..."
6. Type a category name in the search box. Verify the list filters.
7. Clear the search (click the X button or clear the input). Verify all categories return.
8. Look for **"Add Category"** and **"Add Group"** buttons in the top-right area.
9. If any category has a budget set, look for a **"History" button** (clock icon) in the actions column — this opens the BudgetPeriodsDialog.

### Expected Result:
- Multiple category groups are shown in cards
- Categories listed in tables within each group
- Search filtering works
- Budget history button visible for categories with budgets

---

## TC-05: Merchants Page

**Objective:** Verify the merchants page loads with seeded data.

### Steps:
1. Navigate to `http://localhost:3000/merchants`
2. Verify the heading "Merchants" is visible
3. Look for a **list or table of merchants**. On a fresh seeded DB, there should be pre-seeded merchants.
4. Verify each merchant entry shows its name
5. Look for patterns associated with merchants (if visible in the UI)
6. Check for any **Add Merchant** or similar action button

### Expected Result:
- Merchants page loads without errors
- Seeded merchants are listed
- Page structure is intact (cards, tables, or list)

---

## TC-06: Income Page

**Objective:** Verify the income sources page loads.

### Steps:
1. Navigate to `http://localhost:3000/income`
2. Verify the heading "Income" is visible
3. Look for a **list or table of income sources**
4. On a fresh seeded DB, verify that income sources appear (if seeded)
5. Check for any **Add Income** button or similar action

### Expected Result:
- Income page loads without errors
- Income sources listed (if any seeded)
- Page structure intact

---

## TC-07: Schemas Page

**Objective:** Verify the document schemas page loads.

### Steps:
1. Navigate to `http://localhost:3000/schemas`
2. Verify the heading "Schemas" is visible
3. Look for a **list of document schemas** used for PDF extraction
4. Schemas should include information about document types, institutions, and codes
5. Check for any **Add Schema** button
6. If schemas exist, verify they show: code, name, document type, institution name

### Expected Result:
- Schemas page loads without errors
- Document schemas listed
- Schema details are visible

---

## TC-08: Accounts Page (Empty State)

**Objective:** Verify the accounts page handles empty/initial state.

### Steps:
1. Navigate to `http://localhost:3000/accounts`
2. Verify the heading "Accounts" is visible
3. On a **fresh database**, the accounts list may be empty (accounts are auto-created during import)
4. Verify an appropriate empty state message or empty table is shown
5. Look for any **Add Account** button
6. Verify no error is thrown for empty state

### Expected Result:
- Accounts page loads without errors
- Shows empty state gracefully OR shows any pre-existing accounts
- No crash on empty data

---

## TC-09: Settings Page

**Objective:** Verify all 4 settings sections render with correct data.

### Steps:
1. Navigate to `http://localhost:3000/settings`
2. Verify the heading **"Settings"** is visible
3. Verify subtitle **"Manage your application preferences."** is visible

#### General Section:
4. Find the **"General"** card (has a DollarSign icon)
5. Verify **Currency Display** dropdown exists with options (CAD, USD, EUR, GBP)
6. Verify **Date Format** dropdown exists with options (YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, MMM DD, YYYY)
7. Verify **Theme** section has 3 buttons: **Light**, **Dark**, **System**

#### Import Settings Section:
8. Find the **"Import Settings"** card (has a Cpu icon)
9. Verify **PDF Extract Concurrency** badge shows a number (default "1")
10. Verify description mentions EXTRACT_CONCURRENCY environment variable

#### Budget Settings Section:
11. Find the **"Budget Settings"** card (has a Clock icon)
12. Verify 3 stats are shown: **Open**, **Closed**, **With Budget** (with numbers)
13. Verify **"Check Budget Status"** button exists

#### Data Management Section:
14. Find the **"Data Management"** card (has a Database icon)
15. Verify 4 stats are shown:
    - **Transactions** count
    - **Imports** count
    - **Staging** count
    - **Merchants** count
16. Verify **"Clear Staging Data"** button exists (should be disabled if staging count is 0)

### Expected Result:
- All 4 cards render correctly
- Dropdowns are functional
- Stats show numeric values
- Theme buttons match current theme state

---

## TC-10: Import First PDF

**Objective:** Upload a PDF bank statement and verify the extraction pipeline works.

**NOTE:** This test requires Claude CLI to be available. Extraction may take 60-120 seconds.

### Steps:
1. Navigate to `http://localhost:3000/import`
2. Verify the Import page loads with an upload area
3. Look for a **file input** or **drag-and-drop zone** for uploading PDFs
4. Upload the file: `/Users/wpbastos/Projects/wpbastos/fintrack/samples/Security Statement-1749 2025-12-02.pdf`
   - This is a ~80KB PDF, one of the smaller samples
5. After upload, the system should show:
   - A **processing indicator** (e.g., "Processing...", spinner, or queue status)
   - The job enters the extraction queue
6. **Wait for extraction to complete** (up to 120 seconds). Watch for:
   - Status changing from "queued" → "processing" → "complete"
   - Success message or green indicator
7. Once complete, verify:
   - The extraction result shows transaction count
   - The import was created in the system
   - No error messages displayed

### Expected Result:
- PDF upload accepted
- Extraction completes successfully (may take 60-120s)
- Import record created
- Transactions extracted from the statement

---

## TC-11: Check Import Log

**Objective:** Verify the import from TC-10 appears in the Import Log.

**Prerequisite:** TC-10 must pass.

### Steps:
1. Navigate to `http://localhost:3000/log`
2. Verify the Import Log page loads
3. Look for the import from TC-10:
   - File name should contain "Security Statement-1749 2025-12-02"
   - Source type should be "pdf"
4. Verify import details are visible:
   - **Created date** — should be today
   - **Transaction count** — should be > 0
   - **Status** indicators (e.g., matched, unknown counts)
5. If the page has an expandable row or details view, click to expand
6. Check for **AI Processing** metrics (duration, cost, tokens) if available

### Expected Result:
- Import log shows the PDF import
- Details include file name, date, transaction count
- AI metrics visible (if shown in this view)

---

## TC-12: Check Staging Transactions

**Objective:** Verify extracted transactions appear in staging for review.

**Prerequisite:** TC-10 must pass.

### Steps:
1. Navigate to `http://localhost:3000/staging`
2. Verify the heading "Staging" and subtitle "Review imported transactions before moving to final transactions."
3. The page should NO LONGER show the empty state ("No transactions in staging")
4. Look for a **batch** from the import:
   - Batch should show the import file name
   - Should show account name, institution, period dates
   - Should show opening/closing balance
5. Verify **transactions table** is visible with columns like:
   - Date, Description, Amount, Balance, Status
6. Check transaction details:
   - Dates should be reasonable (Nov-Dec 2025 range for this statement)
   - Amounts should be numeric values
   - Some transactions may show "matched" status (green) and some "unknown" (amber)
7. Verify batch header shows counts:
   - Total transaction count
   - Matched count
   - Unknown count
8. Look for action buttons on the batch or individual transactions

### Expected Result:
- Staging shows transactions from the import
- Transaction table renders with data
- Batch metadata (balances, dates) visible
- Status indicators (matched/unknown) shown

---

## TC-13: Approve Import Batch

**Objective:** Import/approve the batch of staging transactions to move them to the permanent transactions table.

**Prerequisite:** TC-12 must pass.

### Steps:
1. On the `/staging` page, locate the batch from TC-10
2. Look for an **"Import"** or **"Approve"** button on the batch header area
   - This should be a button that imports all transactions in the batch
3. If there are **unknown/unresolved transactions** that need resolution first:
   - Look for an AI resolve button (Sparkles icon) to auto-resolve unknowns
   - Or manually resolve by editing transaction details
4. Click the **Import batch** button
5. A confirmation dialog may appear — confirm the import
6. Wait for the import to complete
7. Verify:
   - Success toast notification appears
   - The batch status changes to "finalized" or "imported"
   - The staging page updates (batch may move to a "finalized" section or disappear)

### Expected Result:
- Batch import succeeds
- Transactions moved to permanent table
- Staging page reflects the change
- Success notification shown

---

## TC-14: Verify Transactions Page

**Objective:** Verify imported transactions appear on the Transactions page with working filters.

**Prerequisite:** TC-13 must pass.

### Steps:
1. Navigate to `http://localhost:3000/transactions`
2. Verify the heading **"Transactions"** and subtitle **"All imported and verified transactions."**
3. Verify **Transaction History** card shows a non-zero count (e.g., "X transactions")
4. The table should show columns: **Date, Description, Account, Category, Amount**
5. Verify transaction data:
   - Dates are formatted correctly
   - Descriptions show merchant/income names where resolved
   - Amounts are colored (red for expenses, green for income)
   - Account column shows account name and institution

#### Test Filters:
6. **Search filter:** Type part of a merchant name or description in the search box. Verify table filters.
7. **Type toggle:** Click "Expenses" toggle. Verify only negative amounts show. Click "Income" to see only positive. Click "All" to reset.
8. **Account filter:** If there's an account dropdown, select the account. Verify results filter.
9. **Category filter:** If there's a category dropdown, select a category. Verify results filter.
10. **Clear filters:** Click the "Clear" button (X icon). Verify all transactions return.

#### Test CSV Export:
11. Click the **"Export CSV"** button. Verify a CSV file downloads.

#### Test Pagination:
12. If there are enough transactions for pagination (>50 per page), verify:
    - Page numbers shown (e.g., "1 / 2")
    - Navigation arrows work (first, prev, next, last)
    - "Showing X-Y of Z" text updates correctly

### Expected Result:
- Transactions from the import are listed
- All filter controls work (search, type toggle, dropdowns, amount range, date range)
- CSV export downloads a file
- Pagination works if enough records

---

## TC-15: Dashboard After Import

**Objective:** Verify the dashboard updates to reflect imported transaction data.

**Prerequisite:** TC-13 must pass (transactions imported).

### Steps:
1. Navigate to `http://localhost:3000/`
2. Verify **KPI cards** now show updated values:
   - **Net Balance** — Should now show a non-zero amount (based on closing balance of imported statement)
   - **Month Income** — May show income if the statement period includes current month
   - **Month Spent** — May show spending if the statement period includes current month
   - **Budget Left** — Should reflect budget minus any spending in current month categories
   - **Staging** — Should show 0 (or reduced count) if all staging was imported
3. Check **Spending Trends** chart:
   - If import data falls within the last 6 months, bars should appear in the chart
4. Check **Budget Progress**:
   - If imported transactions match budget categories, progress bars should show spending
5. Check **Recent Transactions**:
   - Should now show up to 10 recent transactions instead of empty state
   - "No transactions yet" message should be gone
   - Transaction rows should show date, description, category, amount
   - "View all transactions" link should appear at the bottom

### Expected Result:
- KPI cards reflect imported data (non-zero values where applicable)
- Charts show data if transactions fall within displayed time ranges
- Recent transactions table is populated
- Dashboard reflects the current state of the database

---

## Test Execution Results — 2026-02-08

**Result: 15/15 PASS (100%)**

| TC | Name | Status | Notes |
|----|------|--------|-------|
| TC-01 | Fresh Dashboard Load | PASS | 5 KPI cards, charts, empty state all verified. Budget Left shows $11,265 (seeded budgets). |
| TC-02 | Navigation - All Pages | PASS | All 11 pages load without error. Setup expand/collapse works. Active link highlighting confirmed. |
| TC-03 | Dark Mode Toggle | PASS | Header dropdown (Light/Dark/System) and Settings page buttons both work. HTML "dark" class toggled correctly. Theme persists across navigation. |
| TC-04 | Categories Page | PASS | 16 groups, 83 categories, 9 child categories (↳ prefix). Search filtering works. 40 Budget History buttons found. KPI cards and charts present. |
| TC-05 | Merchants Page | PASS | 286 merchants with patterns. Search "costco" filtered to 2 rows. KPI cards, charts (empty), Add Merchant button all present. |
| TC-06 | Income Page | PASS | Empty state (0 income sources) — expected, income sources created during import pipeline. 3 tabs (Income/Employers/Positions), Add Income button present. |
| TC-07 | Schemas Page | PASS | 2 schemas: "RBC Statement" (rbc-statement, Bank Statement) and "Triangle Mastercard Statement" (triangle-mastercard, Credit Card). 5 tabs, search, Add Schema button. |
| TC-08 | Accounts Page | PASS | Empty state — "No accounts found." Accounts auto-created during import. 3 tabs (Accounts/Institutions/Persons), Add Account button present. |
| TC-09 | Settings Page | PASS | All 4 sections render. Currency change triggers toast. Budget status check works. Data stats: 0 txns, 0 imports, 0 staging, 286 merchants. Clear Staging disabled (0 records). |
| TC-10 | Import First PDF | PASS | Uploaded Security Statement-1749 2025-12-02.pdf (78KB). Extraction: 12.1s, $0.1820, schema rbc-statement (high confidence). 1 transaction extracted. Auto-imported to staging. |
| TC-11 | Check Import Log | PASS | Import #1 visible: RBC High Interest eSavings, Nov 2–Dec 1 2025, 1 txn, staged. Expanded details show AI metrics (12.1s, $0.1820, 6+327 tokens, 78KB). Charts present. |
| TC-12 | Check Staging | PASS | Batch visible (after switching to "All Time" filter). 1 total, 0 matched, 1 unknown. Transaction: Nov 3 2025, "Deposit interest", $0.06, unknown status. All action buttons present. |
| TC-13 | Approve Import Batch | PASS | AI resolve identified "Deposit interest" as "Bank Interest" (new income source, pattern DEPOSIT INTEREST, category Interest Income, high confidence). Approved via "Approve All". Import 1 clicked → toast "Imported 1 transactions". Staging cleared. |
| TC-14 | Verify Transactions | PASS | 1 transaction: Nov 3 2025, Bank Interest, RBC High Interest eSavings, Interest Income, $0.06. Search, type toggle, account/category filters all work. CSV export downloads file. No pagination (correct for 1 record). |
| TC-15 | Dashboard After Import | PASS | Net Balance: $0.06 (updated). Month Income/Spent: $0.00 (correct — txn from Nov 2025). Staging: 0. Recent Transactions shows Bank Interest row. "View all transactions" link present. Budget Progress unchanged. |

### Observations & Minor Notes
1. **Staging default filter**: "This Year" excludes Nov-Dec 2025 data — users must switch to "All Time" to see older imports
2. **Recharts warnings**: 2 console warnings about width/height being -1 on initial chart render (cosmetic only)
3. **next-themes hydration**: 1 attribute mismatch console error on Settings page (known next-themes issue, cosmetic)
4. **Import page heading**: "Import Statements" (not just "Import")
5. **Schemas page heading**: "Document Schemas" (not just "Schemas")
6. **Extract concurrency**: Environment had EXTRACT_CONCURRENCY=5 (not default 1)
7. **PDF extraction speed**: 12.1 seconds for 78KB PDF — well within expected range

**Key:**
- PASS = All steps verified
- FAIL = One or more steps failed (details in Notes)
- SKIP = Skipped due to dependency failure
- BLOCK = Blocked by external issue
