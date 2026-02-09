# Devil's Advocate Report

## Executive Summary

Fintrack is a 27,000-line personal/household finance app with a well-structured import pipeline and two working AI integrations (PDF extraction and transaction resolution). The codebase is clean TypeScript with zero `@ts-ignore`, but carries significant risks: **zero test coverage**, **duplicated resolver logic**, and **several 1,000+ line components** that will become maintenance nightmares as features are added.

The proposed feature roadmap (7 new features, most AI-powered) would roughly **triple the codebase complexity** and could push monthly AI costs from the current ~$2-5/month to **$30-80/month** — at which point users should just buy a commercial app. Several proposed features are "AI for AI's sake" and would deliver marginal value over simpler non-AI alternatives.

**Bottom line**: The current app does its core job well. Before building any new features, invest in tests and refactoring. Then build the 2-3 features with the best effort/value ratio — without AI where it isn't necessary.

---

## AI Cost/Benefit Analysis

### Current AI Usage & Costs

Two AI integrations currently exist, both calling **Claude CLI as a subprocess**:

| Feature | File | How It Works | Estimated Cost Per Call |
|---------|------|-------------|------------------------|
| **PDF Extraction** | `src/app/import/actions.ts` (408 lines) | Spawns `claude` CLI with Read tool, 5-min timeout | $0.02-0.10 per statement (varies with page count) |
| **Transaction Resolution** | `src/app/api/ai/resolve/route.ts` (346 lines) | Spawns `claude` CLI with WebSearch + Puppeteer, 2-min timeout | $0.05-0.20 per batch (varies with unknown count) |

**Cost tracking infrastructure** is solid — the Import model stores `extractCostUsd`, `extractDurationMs`, `extractInputTokens`, `extractOutputTokens`, `extractCacheTokens`, and `extractPdfSizeBytes`. This is good engineering.

**Current monthly cost estimate** (typical household: 4-6 accounts, 2-3 imports/month):
- PDF extraction: 3 imports × ~$0.05 = **$0.15/month**
- AI resolution: 3 batches × ~$0.10 = **$0.30/month**
- **Total: ~$0.50/month** — very reasonable

### Projected Costs with All Proposed Features

| Feature | Frequency | Est. Cost/Call | Monthly Cost |
|---------|-----------|---------------|-------------|
| PDF Extraction (current) | 3/month | $0.05 | $0.15 |
| Transaction Resolution (current) | 3/month | $0.10 | $0.30 |
| **AI Auto-Learning** | 3/month | $0.10 | $0.30 |
| **6-Month Forecast** | Weekly refresh | $0.15 | $2.40 |
| **Receipt Import** (OCR + matching) | 20-40/month | $0.05 | $1.50 |
| **Payslip Import** | 2/month | $0.05 | $0.10 |
| **Smart Summaries** | Daily | $0.08 | $2.40 |
| **Anomaly Detection** | Per-import | $0.05 | $0.15 |
| **Savings Goals** (AI suggestions) | Weekly | $0.05 | $0.20 |

**Projected total: ~$7.50/month** (optimistic) to **$30-80/month** (if features are used heavily, prompts grow, or costs increase with model upgrades).

### Cost Comparison: DIY AI vs Commercial Apps

| Option | Monthly Cost | Effort | Privacy |
|--------|-------------|--------|---------|
| **Fintrack (current)** | $0.50 | Self-hosted | Full control |
| **Fintrack (all features)** | $7-80 | Significant dev time | Full control |
| **Monarch Money** | $10/month | Zero | Third-party |
| **YNAB** | $15/month | Zero | Third-party |
| **Copilot** | $10/month | Zero | Third-party |
| **Spreadsheet** | Free | Manual | Full control |

**The privacy argument is the only strong justification** for building this over using a commercial product. If AI costs climb above $15/month, the economic case evaporates — you're paying more than Monarch Money while also maintaining 27,000+ lines of code.

### Best ROI AI Features

1. **PDF Extraction** — Already built, working, and cheap. This is the killer feature. Manually typing bank statements is terrible; AI extraction is genuinely transformative. **Keep and improve.**

2. **Transaction Resolution** — Already built. The web search for merchant identification is clever and saves real time. **Keep, but don't over-invest in auto-learning.**

### "AI for AI's Sake" Features

1. **Smart Summaries** — $2.40/month to tell you what you can already see in your own data. A simple threshold alert ("you spent 80% of grocery budget") is more actionable and costs nothing.

2. **AI-powered Savings Goal suggestions** — A calculator that divides (goal - saved) / months is equally useful. AI adds complexity without proportional value.

3. **Anomaly Detection** — For a personal finance app with a few hundred transactions/month, anomalies are visible by just looking at the transaction list. Statistical outlier detection (no AI needed) would work for the 1% of cases where it matters.

4. **AI-powered Forecasting** — Historical averages per category would give 80% of the value. AI pattern detection adds cost and complexity for marginal accuracy gains on inherently unpredictable personal spending.

---

## Feature-by-Feature Critique

### AI Auto-Learning

**Proposal**: When a user manually classifies an "unknown" transaction in staging, automatically create a merchant/income pattern so future transactions auto-match.

**What's good**: The pattern matching system (`merchant-resolver.ts`, `income-resolver.ts`) already works well with manual patterns. Auto-learning would reduce manual work.

**Critical challenges**:
- **Wrong matches propagate silently.** If AI suggests "AMZN" → "Amazon" and the user approves without thinking, it creates a pattern. But "AMZN MKTP" and "AMZN PRIME" might be different spending categories. The current `extractMerchantPattern()` function (line 125-172, `merchant-resolver.ts`) is heuristic-based and already makes aggressive simplifications.
- **Pattern conflicts.** What happens when auto-created patterns overlap with manually created ones? The priority system exists (patterns sorted by `priority DESC, pattern length DESC`) but auto-created patterns would all have default priority.
- **Correction UX.** Users need to find and delete bad patterns. The current codebase has no pattern management UI — merchants and income are managed, but individual patterns within them are hidden in the database.
- **Performance concern.** Both `resolveMerchant()` and `resolveIncome()` load ALL patterns on every call (`findMany({})`) and sort in JavaScript. With hundreds of auto-created patterns, this becomes a measurable overhead. There's no caching layer.

**Simpler alternative**: A "Remember this match" button that creates a pattern from the exact raw description. No AI needed — the user is already telling you what this transaction is.

**Verdict**: Build the simple version. The `createMerchantWithPattern()` function already exists (line 182-232, `merchant-resolver.ts`). Wire it to a button in the staging UI. Skip AI.

---

### 6-Month Forecast

**Proposal**: Predict future transactions based on historical patterns, with a 5-state lifecycle (predicted → confirmed → posted → missed → skipped).

**Critical challenges**:
- **Accuracy on variable expenses.** Fixed bills (rent, subscriptions) are predictable. Everything else (groceries, dining, gas) varies 20-50% month-to-month. AI pattern detection won't meaningfully improve this over simple historical averages.
- **5-state lifecycle is over-engineered.** For a personal finance tool, you need at most 3 states: expected, posted, missed. "Confirmed" and "skipped" add UX complexity (more buttons to click, more states to understand) for edge cases.
- **Reconciliation is a nightmare.** Partial payments (paying half a credit card bill), split transactions (paying one bill from two accounts), and refunds all break simple matching. The `Transaction` model already has `isRecurring` and `recurringId` fields (lines 142-143, schema) suggesting this was planned, but the reconciliation logic would need to be surprisingly sophisticated.
- **User trust erosion.** When forecasts are consistently wrong for variable expenses, users stop trusting the system entirely — including for the fixed expenses where it IS accurate. This is a well-documented UX problem in financial software.
- **The "missed" state is judgmental.** Telling users they "missed" a savings contribution or overspent on a predicted amount creates negative emotional associations with the app.

**Simpler alternative**: A "Recurring Transactions" list where users manually enter their fixed bills and expected amounts. Display as a simple checklist each month. No AI, no prediction, no reconciliation.

**Verdict**: Build a simple recurring transaction tracker. Skip AI forecasting entirely. If users want forecasts, show category averages from the last 3 months.

---

### Receipt Import

**Proposal**: Import photos of receipts, extract line items via AI, and match to bank statement transactions.

**Critical challenges**:
- **Receipt quality varies wildly.** Thermal paper receipts fade, crumpled receipts don't scan well, handwritten receipts can't be parsed. AI extraction confidence will be "low" for 30-50% of real-world receipts.
- **Limited user base.** Most households don't photograph receipts. Those who do (for expense reports or returns) typically need the receipt for a specific purpose, not for general expense tracking.
- **Reconciliation accuracy.** Matching a receipt to a bank transaction requires matching amount + approximate date + merchant. When the receipt total doesn't exactly match the bank charge (tips, tax differences, currency conversion), matching breaks.
- **Cost per receipt.** If a household imports 20-40 receipts/month at $0.05 each, that's $1-2/month for data that the bank statement already provides (merchant + total amount). The value-add is line-item detail, which most personal finance users don't need.
- **Schema proliferation.** The `DocumentSchema` model is already used for bank statements. Receipt formats are far more varied — every retailer has a different format. You'd need dozens of schemas, or a more generic extraction approach.

**Simpler alternative**: If users want to note what they bought, add a "notes" or "line items" text field to the transaction detail view. No AI, no OCR, no reconciliation.

**Verdict**: Kill this feature. The bank statement already tells you the amount and merchant. Line-item detail is rarely useful for personal finance budgeting.

---

### Payslip Import

**Proposal**: Import PDF payslips to track income history, deductions, and salary growth.

**Critical challenges**:
- **Format diversity.** Every employer/payroll provider (ADP, Ceridian, Workday, in-house) has a completely different payslip format. The `DocumentSchema` approach works for bank statements (a few major banks) but payslips would need a new schema per employer.
- **Low frequency.** Most employees get 12-26 payslips/year. The setup cost (creating a DocumentSchema, testing extraction) is high relative to the frequency of use.
- **The data already exists.** The `Income` model already tracks `currentGross`, `currentNet`, `initialGross`, `initialNet`. The `Payslip` model tracks pay changes. Bank statement imports already capture the deposit amount. Payslip import adds deduction breakdowns, which are useful but not essential.

**Simpler alternative**: A manual form to enter gross/net/deductions when they change. The existing `Payslip` model and `Income` model already support this. Just build the UI.

**Verdict**: Simplify significantly. Build a payslip entry form using the existing `Payslip` model. Defer AI extraction until there are at least 5 users requesting it.

---

### Savings Goals

**Proposal**: Set financial goals with timelines, track progress via virtual allocations, and get AI suggestions for optimal savings rates.

**Critical challenges**:
- **"Virtual allocation" vs reality.** If savings goals track virtual allocations (not real bank transfers), users are essentially maintaining two mental models — what the bank says and what the app says. This creates confusion and distrust.
- **AI timeline suggestions.** "Save $500/month for 12 months to reach $6,000" is arithmetic, not AI. The only AI value-add would be "based on your spending patterns, you can afford to save $X" — which requires accurate forecasting (see Forecast critique above).
- **Scope creep.** Savings goals + allocation tracking + AI suggestions is dangerously close to a full financial planner. The app is a transaction tracker — expanding into financial planning doubles the maintenance surface.
- **The `hasAllocations` flag** on Transaction (line 144, schema) suggests split-transaction tracking was planned. This is a substantial feature unto itself.

**Simpler alternative**: A standalone "Goals" page with name, target amount, current amount (manually updated), and a progress bar. No AI, no virtual allocations, no transaction linking.

**Verdict**: Build the simplest possible goal tracker. Skip AI suggestions and virtual allocations.

---

### Smart Summaries / Budget Insights

**Proposal**: AI-generated natural language summaries of spending patterns and budget performance.

**Critical challenges**:
- **Cost at frequency.** If generated daily, $0.08 × 30 = $2.40/month. Weekly brings it to $0.32/month, but then it's only useful if users check weekly.
- **Actionability.** "You spent 15% more on dining this month" is interesting but not actionable. "You're at 85% of your grocery budget with 10 days remaining" is actionable — and can be computed without AI.
- **Staleness.** Summaries generated from yesterday's data may not reflect today's transactions. Real-time summaries require on-demand generation, which increases cost unpredictably.
- **Better alternative already exists.** The current UI has charts (Recharts BarChart with selection, custom legends) and tables that show all this data visually. A chart IS a summary — it's just not in sentence form.

**Simpler alternative**: Threshold-based alerts. "Budget alert: Groceries at 90% ($450 of $500)." No AI needed. Compute on transaction insert. More timely, more actionable, zero ongoing cost.

**Verdict**: Kill AI summaries. Build simple threshold alerts instead.

---

### Anomaly Detection

**Proposal**: Flag unusual transactions (unexpected amounts, unknown merchants, unusual frequency).

**Critical challenges**:
- **False positive rate.** For a household with 100-200 transactions/month, a 5% false positive rate means 5-10 annoying alerts per month. Users quickly learn to ignore all alerts, defeating the purpose.
- **What counts as "anomalous"?** A $200 restaurant charge is unusual — but is it an anniversary dinner or fraud? Without context, the system can't tell the difference, and the user already knows the answer.
- **Bank fraud detection exists.** Credit card companies and banks already do this with far more data (merchant reputation, location, device fingerprinting). Duplicating it at the app level adds no value for fraud detection.
- **For budgeting purposes**, anomaly detection reduces to "this transaction is larger than usual for this merchant/category." A simple statistical check (> 2 standard deviations from mean) works without AI.

**Simpler alternative**: Show a badge on transactions where the amount is significantly higher than the running average for that merchant/category. Pure math, no AI.

**Verdict**: Kill AI-powered anomaly detection. Add a simple statistical outlier badge if desired — it's a few lines of SQL.

---

## Kill List (Features to Cut or Simplify)

### Kill Entirely

| Feature | Reason | Savings |
|---------|--------|---------|
| **Receipt Import** | Bank statements already provide merchant + amount. Line-item detail rarely useful for personal budgeting. High AI cost, low accuracy, minimal user base. | ~2,000+ lines of code, $1-2/month AI costs, DocumentSchema proliferation |
| **Smart Summaries** | Charts already summarize data visually. Natural language adds no actionability over threshold alerts. $2.40/month ongoing cost. | ~1,000+ lines of code, $2.40/month AI costs |
| **Anomaly Detection (AI)** | Banks already do fraud detection. Statistical outliers are trivial to compute. AI false positives erode trust. | ~500+ lines of code, ongoing AI costs |

### Simplify Significantly

| Feature | Current Proposal | Simpler Version |
|---------|-----------------|-----------------|
| **6-Month Forecast** | AI pattern detection, 5-state lifecycle, reconciliation | Simple "Recurring Transactions" checklist. Category averages for variable expenses. 2 states: expected, posted. |
| **Payslip Import** | AI extraction from PDF payslips with DocumentSchema | Manual payslip entry form using existing `Payslip` model. UI only. |
| **Savings Goals** | AI suggestions, virtual allocations, transaction linking | Simple goal tracker: name, target, current amount, progress bar. |
| **AI Auto-Learning** | AI-powered pattern suggestion from staging review | "Remember this match" button that creates a pattern from the raw description. |

### Build Without AI First

| Feature | Why No-AI First? |
|---------|-----------------|
| **Recurring Transactions** | Fixed bills are manually entered. Only add AI prediction later if users request it. |
| **Budget Alerts** | Threshold-based alerts are computable in real-time. AI summaries can be layered on later. |
| **Goal Tracking** | Arithmetic, not AI. Simple progress tracking first. |
| **Auto-Learning** | The `createMerchantWithPattern()` function already exists. Wire it to a UI button. |

---

## Risk Assessment

### Data Privacy

**Current state**: Financial data is sent to Claude CLI (which calls Anthropic API) for PDF extraction and transaction resolution. This includes raw bank statement descriptions, amounts, merchant names, and account details.

**Risks**:
- Bank statement PDFs contain account numbers, balances, and full transaction history.
- The `buildResolveTransactionsPrompt()` sends ALL existing merchant names, income sources, and category structures to the API.
- The transaction resolution prompt enables **WebSearch and Puppeteer** tools — meaning Claude is actively searching the web with context from user financial data.
- No data retention policy is documented for Claude CLI responses.

**Mitigations needed**:
- Document exactly what data leaves the system and where it goes.
- Consider masking account numbers before sending to AI (currently the extraction prompt says "last 4 digits only" but the full PDF is sent).
- Evaluate whether web search tools are worth the privacy trade-off in resolution.
- Add a privacy notice in the UI before first AI use.

### AI Availability & Graceful Degradation

**Current state**: If Claude CLI is unavailable, PDF extraction fails completely and transaction resolution fails with a 500 error. The queue system (`extract-queue.ts`) has no retry logic.

**Risks**:
- No offline fallback for PDF imports — users cannot import bank statements at all.
- The 5-minute timeout for PDF extraction (line 188-193, `import/actions.ts`) and 2-minute timeout for resolution (line 333-337, `resolve/route.ts`) are generous but have no retry.
- Queue jobs that fail due to transient errors are permanently marked as "error" with no recovery path.

**Mitigations needed**:
- PDF import should support manual JSON entry as a fallback (currently does — good).
- AI resolution failures should be non-blocking — transactions stay "unknown" and can be manually resolved.
- Add retry logic (1-2 retries with backoff) to the queue system.
- Display clear error messages when AI is unavailable, with manual alternatives.

### Cost Runaway Prevention

**Current state**: The queue system limits concurrency (default: 1) but has no per-day or per-month cost cap. The `@anthropic-ai/sdk` dependency exists in `package.json` but isn't used in the current AI code (Claude CLI is used instead).

**Risks**:
- A bug that re-triggers extraction in a loop could rack up significant costs before detection.
- The resolution endpoint (`POST /api/ai/resolve`) has no rate limiting — a frontend bug could call it repeatedly.
- No cost dashboard or alerting mechanism.
- If future features add more AI calls (summaries, forecasting, etc.), aggregate costs become harder to track.

**Mitigations needed**:
- Add a daily/monthly cost cap with automatic cutoff.
- Rate-limit AI endpoints (max N calls per hour).
- Add a simple cost dashboard showing cumulative costs from Import `extractCostUsd` field.
- Log all AI costs to a dedicated table for monitoring.
- The unused `@anthropic-ai/sdk` dependency should be removed or used — currently it's dead weight (or planned for future direct API use, which should be documented).

### Complexity Budget

**Current codebase**: 27,017 lines across 136 source files. Key complexity hotspots:

| File | Lines | Concern |
|------|-------|---------|
| `staging-table.tsx` | 1,872 | Single component managing staging review UI. Too large for single-file maintenance. |
| `import-log-table.tsx` | 1,292 | Complex table with charts, filters, and interactive features. |
| `import/page.tsx` | 1,175 | Upload page handling both PDF and JSON. |
| `staging/actions.ts` | 1,113 | Server actions for staging mutations. |
| Resolver files (5) | 1,105 | Duplicated pattern-matching logic across merchant/income resolvers. |

**Estimated complexity additions per proposed feature**:

| Feature | Est. New Lines | New Files | New DB Models |
|---------|---------------|-----------|---------------|
| AI Auto-Learning | 500-800 | 2-3 | 0-1 |
| 6-Month Forecast | 3,000-5,000 | 8-12 | 2-3 |
| Receipt Import | 2,000-3,000 | 5-8 | 1-2 |
| Payslip Import | 1,500-2,500 | 4-6 | 0 (model exists) |
| Savings Goals | 2,000-3,500 | 6-10 | 2-3 |
| Smart Summaries | 1,000-1,500 | 3-5 | 0-1 |
| Anomaly Detection | 800-1,500 | 3-5 | 0-1 |
| **Total** | **10,800-17,800** | **31-49** | **5-11** |

Building all proposed features would increase the codebase to **38,000-45,000 lines** — a **60-70% increase** — all without tests.

### SQLite Scaling

**Current state**: SQLite with better-sqlite3 adapter via Prisma. Single-user/household use case.

**Risks**:
- SQLite handles the current use case well. A household generates ~2,000-4,000 transactions/year. Even after 10 years, that's 40,000 rows — trivial for SQLite.
- **Write concurrency** is the real limit. The cron job, import pipeline, and AI resolution could conflict. SQLite uses file-level locking. The queue system (concurrency: 1) mitigates this for extraction but not for other concurrent writes.
- **Full-text search** isn't supported natively in Prisma+SQLite. If search features are added (searching transaction descriptions), this becomes a limitation.
- **No backup mechanism** is documented. SQLite files can be corrupted if copied while being written to.

**Verdict**: SQLite is fine for this use case for the foreseeable future. The bigger risk is concurrent write conflicts, not data volume.

---

## Alternative Approaches

| Proposed Feature | Simpler Alternative | Implementation Effort | AI Cost |
|-----------------|---------------------|----------------------|---------|
| AI Auto-Learning | "Remember this match" button → `createMerchantWithPattern()` | 1 day | $0/month |
| 6-Month Forecast | Recurring transaction checklist + category averages | 3-5 days | $0/month |
| Receipt Import | "Notes/items" text field on transaction detail | 0.5 days | $0/month |
| Payslip Import | Manual payslip entry form (Payslip model exists) | 2-3 days | $0/month |
| Savings Goals | Simple goal: name, target, current, progress bar | 2-3 days | $0/month |
| Smart Summaries | Budget threshold alerts (80%, 90%, 100%) | 1-2 days | $0/month |
| Anomaly Detection | Statistical outlier badge (> 2σ from mean) | 1 day | $0/month |

**Total for all simpler alternatives: ~12-16 days of development, $0/month ongoing AI cost.**

Compare to full AI-powered versions: **~60-90 days of development, $7-80/month ongoing AI cost.**

---

## What I'd Actually Build (Prioritized)

If I had to pick the **3 most impactful features** with the best effort/value ratio, after accounting for the current codebase state:

### Priority 0: Foundation (Before Any Features)

1. **Add tests.** Zero test coverage on a 27,000-line codebase is the single biggest risk. At minimum: integration tests for the import pipeline, resolver logic, and server actions. Estimated: 3-5 days.

2. **Refactor large components.** `staging-table.tsx` (1,872 lines) and `import-log-table.tsx` (1,292 lines) need to be broken into smaller, composable components. Estimated: 2-3 days.

3. **DRY the resolvers.** `merchant-resolver.ts` and `income-resolver.ts` have nearly identical pattern-matching logic. Extract a shared `PatternMatcher` utility. Estimated: 1 day.

4. **Add pattern caching.** Both resolvers do `findMany({})` on every call, loading all patterns from the database every time. Add a simple in-memory cache with TTL. Estimated: 0.5 days.

### Priority 1: "Remember This Match" Button (1-2 days)

**What**: When a user manually assigns a merchant/income to an "unknown" staging transaction, offer a "Remember this match" button that creates a pattern from the raw description.

**Why**: This is the single highest-value feature with the lowest effort. The function `createMerchantWithPattern()` already exists. The pattern extraction heuristics (`extractMerchantPattern()`, `extractIncomePattern()`) already work. It just needs a UI button and a server action.

**No AI needed.** The user is already telling you the answer.

### Priority 2: Recurring Transaction Tracker (3-5 days)

**What**: A simple page listing expected recurring transactions (rent, subscriptions, loan payments) with expected amounts and frequency. Each month, auto-generate a checklist. Mark items as posted when matched in imports.

**Why**: This addresses the "forecast" need without AI complexity. Fixed bills are the easiest to predict and the most important to track. Variable expenses don't benefit from AI prediction.

**Implementation**: New `RecurringTransaction` model (name, amount, frequency, category, account, nextExpectedDate). Simple matching on import: if a new transaction's merchant + approximate amount matches a recurring entry, auto-link them.

### Priority 3: Budget Threshold Alerts (1-2 days)

**What**: When a transaction is imported that pushes a category past 80% or 100% of its monthly budget, show an alert. Display on the dashboard as colored indicators.

**Why**: More actionable than AI summaries. The `BudgetPeriod` model and cron system already exist. Computing "current spend vs budget" is a simple database query.

**No AI needed.** This is arithmetic.

---

## Appendix: Complexity Metrics

### Codebase Summary

| Metric | Value |
|--------|-------|
| Total source lines | 27,017 |
| Source files | 136 |
| Prisma schema | 467 lines, 18 models |
| API routes | 4 |
| Server action files | 8 |
| Page components | 11 |
| UI components | 18 (shadcn/ui) + 2 custom |
| Production dependencies | 30 |
| Dev dependencies | 14 |
| Test files | **0** |
| Test coverage | **0%** |
| TODO/FIXME in source | 0 (3 in generated Prisma code) |
| eslint-disable in source | 4 instances |
| @ts-ignore | 0 |

### Files Over 500 Lines (Complexity Hotspots)

| File | Lines | Type |
|------|-------|------|
| `staging-table.tsx` | 1,872 | Client component |
| `import-log-table.tsx` | 1,292 | Client component |
| `import/page.tsx` | 1,175 | Page component |
| `staging/actions.ts` | 1,113 | Server actions |
| `income-source-dialog.tsx` | 705 | Dialog component |
| `ui/sidebar.tsx` | 725 | UI component |
| `account-dialog.tsx` | 470 | Dialog component |

### AI Integration Code

| File | Lines | Purpose |
|------|-------|---------|
| `src/app/import/actions.ts` | 408 | PDF extraction via Claude CLI |
| `src/app/api/ai/resolve/route.ts` | 346 | Transaction resolution via Claude CLI |
| `src/lib/prompts/resolve-transactions.ts` | 214 | Resolution prompt builder |
| `src/lib/extract-queue.ts` | 167 | Extraction job queue |
| `src/lib/prompts/extract-pdf.ts` | 110 | PDF extraction prompt builder |
| `src/app/api/ai/status/route.ts` | 26 | AI status polling |
| **Total AI-related code** | **1,271 lines** | ~4.7% of codebase |

### Resolver Duplication

The merchant and income resolvers share nearly identical logic:

| Function | merchant-resolver.ts | income-resolver.ts |
|----------|--------------------|--------------------|
| `resolve[Type]Id()` | Lines 24-58 | Lines 25-54 |
| `resolve[Type]()` | Lines 66-109 | Lines 62-100 |
| `extract[Type]Pattern()` | Lines 125-172 | Lines 116-197 |
| `create[Type]WithPattern()` | Lines 182-232 | Lines 207-261 |

Pattern-matching core logic (load all → sort by priority/length → case-insensitive includes) is identical. This should be a shared utility.

### Dependency Analysis

**Potentially unused**: `@anthropic-ai/sdk` (^0.72.1) — present in `package.json` but all current AI calls use Claude CLI (`spawn("claude", ...)`). Either remove it or migrate from CLI to SDK.

**Heavy dependencies**:
- `recharts` (3.7.0) — large charting library, but actively used
- `radix-ui` (1.4.3) + 7 individual `@radix-ui/*` packages — significant overlap, could use the monorepo package exclusively

### Database Model Count

18 models in schema, with these table relationships:
- **Core pipeline**: Import → StagingTransaction → Transaction (3 models)
- **Master data**: Merchant, MerchantPattern, Income, IncomePattern, Category, CategoryGroup, Account, Institution, Person, Employer, Position (11 models)
- **Supporting**: BudgetPeriod, Payslip, DocumentSchema (3 models)
- **Unused/future**: Payslip model exists but has no UI; Employer/Position models have limited integration

---

*Report generated by Devil's Advocate Agent. The goal is not to kill innovation but to ensure every feature earns its complexity cost. Build the simplest thing that could work, measure whether it's actually useful, then iterate.*
