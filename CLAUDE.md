# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run lint         # ESLint check
npm run db:seed      # Seed database with categories and groups
npx prisma migrate dev   # Run migrations
npx prisma generate      # Regenerate Prisma client after schema changes
```

## Tech Stack

- **Framework**: Next.js 16 with App Router, React 19, TypeScript
- **Database**: SQLite via Prisma ORM with better-sqlite3 adapter
- **UI**: Tailwind CSS 4, shadcn/ui (new-york style), Radix UI primitives, Lucide icons
- **Notifications**: Sonner for toasts

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
