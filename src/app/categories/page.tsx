import { db } from "@/lib/db";
import { calculateBillingPeriod } from "@/lib/billing-cycle";
import { CategoriesTabs } from "./categories-tabs";

export const dynamic = "force-dynamic";

export interface CategoryStat {
  totalCount: number;
  totalAmount: number;
  yearCount: number;
  yearAmount: number;
  monthCount: number;
  monthAmount: number;
}

async function getCategoriesWithGroups() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

  const groups = await db.categoryGroup.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      categories: {
        where: { parentId: null },
        orderBy: { sortOrder: "asc" },
        include: {
          children: {
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  const totalTransactions = await db.transaction.count();
  const hasTransactions = totalTransactions > 0;

  const categoryStats: Record<number, CategoryStat> = {};
  const budgetStats: Record<number, { spentThisMonth: number }> = {};

  if (hasTransactions) {
    const allCategories = groups.flatMap((g) =>
      g.categories.flatMap((c) => [c.id, ...(c.children?.map((ch) => ch.id) ?? [])])
    );

    // --- Total (all-time) ---
    const totalTxns = await db.transaction.groupBy({
      by: ["categoryId"],
      where: { categoryId: { in: allCategories } },
      _count: { id: true },
      _sum: { amount: true },
    });

    for (const t of totalTxns) {
      if (t.categoryId) {
        categoryStats[t.categoryId] = {
          totalCount: t._count.id,
          totalAmount: t._sum.amount ?? 0,
          yearCount: 0,
          yearAmount: 0,
          monthCount: 0,
          monthAmount: 0,
        };
      }
    }

    // --- Current year ---
    const yearlyTxns = await db.transaction.groupBy({
      by: ["categoryId"],
      where: {
        categoryId: { in: allCategories },
        date: { gte: yearStart, lte: yearEnd },
      },
      _count: { id: true },
      _sum: { amount: true },
    });

    for (const t of yearlyTxns) {
      if (t.categoryId) {
        if (!categoryStats[t.categoryId]) {
          categoryStats[t.categoryId] = {
            totalCount: 0, totalAmount: 0,
            yearCount: 0, yearAmount: 0,
            monthCount: 0, monthAmount: 0,
          };
        }
        categoryStats[t.categoryId].yearCount = t._count.id;
        categoryStats[t.categoryId].yearAmount = t._sum.amount ?? 0;
      }
    }

    // --- Current month (billing-cycle-aware) ---
    const ccAccounts = await db.account.findMany({
      where: { billingCycleDay: { not: null }, isActive: true },
      select: { id: true, billingCycleDay: true },
    });
    const ccAccountMap = new Map(
      ccAccounts.map((a) => [a.id, a.billingCycleDay!])
    );

    // Calculate widest date window covering all billing periods + calendar month
    let earliestStart = monthStart;
    let latestEnd = monthEnd;
    for (const [, cycleDay] of ccAccountMap) {
      const { periodStart, periodEnd } = calculateBillingPeriod(now, cycleDay);
      if (periodStart < earliestStart) earliestStart = periodStart;
      if (periodEnd > latestEnd) latestEnd = periodEnd;
    }

    // Fetch individual transactions in the wide window
    const monthWindowTxns = await db.transaction.findMany({
      where: {
        categoryId: { in: allCategories },
        date: { gte: earliestStart, lte: latestEnd },
      },
      select: { categoryId: true, accountId: true, amount: true, date: true },
    });

    // Filter each transaction based on its account's period
    for (const txn of monthWindowTxns) {
      if (!txn.categoryId) continue;

      let inPeriod = false;
      if (txn.accountId && ccAccountMap.has(txn.accountId)) {
        const cycleDay = ccAccountMap.get(txn.accountId)!;
        const { periodStart, periodEnd } = calculateBillingPeriod(now, cycleDay);
        const txnDate = new Date(txn.date);
        inPeriod = txnDate >= periodStart && txnDate <= periodEnd;
      } else {
        const txnDate = new Date(txn.date);
        inPeriod = txnDate >= monthStart && txnDate <= monthEnd;
      }

      if (inPeriod) {
        if (!categoryStats[txn.categoryId]) {
          categoryStats[txn.categoryId] = {
            totalCount: 0, totalAmount: 0,
            yearCount: 0, yearAmount: 0,
            monthCount: 0, monthAmount: 0,
          };
        }
        categoryStats[txn.categoryId].monthCount++;
        categoryStats[txn.categoryId].monthAmount += txn.amount;
      }
    }

    // --- Budget stats (calendar month only, for budget comparison) ---
    const calendarMonthTxns = await db.transaction.groupBy({
      by: ["categoryId"],
      where: {
        categoryId: { in: allCategories },
        date: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    });

    for (const t of calendarMonthTxns) {
      if (t.categoryId) {
        budgetStats[t.categoryId] = {
          spentThisMonth: Math.abs(t._sum.amount ?? 0),
        };
      }
    }
  }

  return { groups, categoryStats, budgetStats };
}

export default async function CategoriesPage() {
  const { groups, categoryStats, budgetStats } = await getCategoriesWithGroups();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
        <p className="text-muted-foreground">
          Manage transaction categories and budgets.
        </p>
      </div>

      <CategoriesTabs
        groups={groups}
        categoryStats={categoryStats}
        budgetStats={budgetStats}
      />
    </div>
  );
}
