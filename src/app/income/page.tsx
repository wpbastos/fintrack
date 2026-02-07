import { db } from "@/lib/db";
import { calculateBillingPeriod } from "@/lib/billing-cycle";
import { IncomeTabs } from "./income-tabs";

export const dynamic = "force-dynamic";

export interface IncomeStat {
  totalCount: number;
  totalAmount: number;
  yearCount: number;
  yearAmount: number;
  monthCount: number;
  monthAmount: number;
}

export default async function IncomePage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

  const [incomeSources, positions, employers] = await Promise.all([
    db.income.findMany({
      orderBy: { name: "asc" },
      include: {
        position: {
          select: {
            id: true,
            title: true,
            department: true,
            employer: {
              select: { id: true, name: true, website: true },
            },
          },
        },
        person: {
          select: { id: true, name: true },
        },
        category: {
          select: {
            id: true,
            name: true,
            color: true,
            group: {
              select: { id: true, name: true, color: true },
            },
          },
        },
        depositAccount: {
          select: { id: true, name: true },
        },
        patterns: {
          orderBy: { priority: "desc" },
        },
        _count: {
          select: { transactions: true },
        },
      },
    }),
    db.position.findMany({
      orderBy: [{ employer: { name: "asc" } }, { title: "asc" }],
      include: {
        employer: {
          select: { id: true, name: true, website: true },
        },
        _count: {
          select: { incomes: true },
        },
      },
    }),
    db.employer.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { positions: true },
        },
      },
    }),
  ]);

  // --- Income stats (transaction-based) ---
  const incomeStats: Record<number, IncomeStat> = {};
  const allIncomeIds = incomeSources.map((s) => s.id);

  if (allIncomeIds.length > 0) {
    // Total (all-time)
    const totalTxns = await db.transaction.groupBy({
      by: ["incomeId"],
      where: { incomeId: { in: allIncomeIds } },
      _count: { id: true },
      _sum: { amount: true },
    });

    for (const t of totalTxns) {
      if (t.incomeId) {
        incomeStats[t.incomeId] = {
          totalCount: t._count.id,
          totalAmount: t._sum.amount ?? 0,
          yearCount: 0, yearAmount: 0,
          monthCount: 0, monthAmount: 0,
        };
      }
    }

    // Current year
    const yearlyTxns = await db.transaction.groupBy({
      by: ["incomeId"],
      where: {
        incomeId: { in: allIncomeIds },
        date: { gte: yearStart, lte: yearEnd },
      },
      _count: { id: true },
      _sum: { amount: true },
    });

    for (const t of yearlyTxns) {
      if (t.incomeId) {
        if (!incomeStats[t.incomeId]) {
          incomeStats[t.incomeId] = {
            totalCount: 0, totalAmount: 0,
            yearCount: 0, yearAmount: 0,
            monthCount: 0, monthAmount: 0,
          };
        }
        incomeStats[t.incomeId].yearCount = t._count.id;
        incomeStats[t.incomeId].yearAmount = t._sum.amount ?? 0;
      }
    }

    // Current month (billing-cycle-aware)
    const ccAccounts = await db.account.findMany({
      where: { billingCycleDay: { not: null }, isActive: true },
      select: { id: true, billingCycleDay: true },
    });
    const ccAccountMap = new Map(
      ccAccounts.map((a) => [a.id, a.billingCycleDay!])
    );

    let earliestStart = monthStart;
    let latestEnd = monthEnd;
    for (const [, cycleDay] of ccAccountMap) {
      const { periodStart, periodEnd } = calculateBillingPeriod(now, cycleDay);
      if (periodStart < earliestStart) earliestStart = periodStart;
      if (periodEnd > latestEnd) latestEnd = periodEnd;
    }

    const monthWindowTxns = await db.transaction.findMany({
      where: {
        incomeId: { in: allIncomeIds },
        date: { gte: earliestStart, lte: latestEnd },
      },
      select: { incomeId: true, accountId: true, amount: true, date: true },
    });

    for (const txn of monthWindowTxns) {
      if (!txn.incomeId) continue;

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
        if (!incomeStats[txn.incomeId]) {
          incomeStats[txn.incomeId] = {
            totalCount: 0, totalAmount: 0,
            yearCount: 0, yearAmount: 0,
            monthCount: 0, monthAmount: 0,
          };
        }
        incomeStats[txn.incomeId].monthCount++;
        incomeStats[txn.incomeId].monthAmount += txn.amount;
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Income</h1>
        <p className="text-muted-foreground">
          Manage income sources, employers, and payment history.
        </p>
      </div>

      <IncomeTabs
        incomeSources={incomeSources}
        positions={positions}
        employers={employers}
        incomeStats={incomeStats}
      />
    </div>
  );
}
