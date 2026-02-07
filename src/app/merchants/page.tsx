import { db } from "@/lib/db";
import { calculateBillingPeriod } from "@/lib/billing-cycle";
import { MerchantsTabs } from "./merchants-tabs";
import type { MerchantStat } from "./types";

export const dynamic = "force-dynamic";

async function getMerchantsWithStats() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

  const merchants = await db.merchant.findMany({
    orderBy: { name: "asc" },
    include: {
      patterns: true,
      category: {
        include: {
          group: { select: { color: true } },
        },
      },
      _count: {
        select: { transactions: true },
      },
    },
  });

  const merchantStats: Record<number, MerchantStat> = {};

  const allMerchantIds = merchants.map((m) => m.id);
  if (allMerchantIds.length === 0) return { merchants, merchantStats };

  // --- Total (all-time) ---
  const totalTxns = await db.transaction.groupBy({
    by: ["merchantId"],
    where: { merchantId: { in: allMerchantIds } },
    _count: { id: true },
    _sum: { amount: true },
  });

  for (const t of totalTxns) {
    if (t.merchantId) {
      merchantStats[t.merchantId] = {
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
    by: ["merchantId"],
    where: {
      merchantId: { in: allMerchantIds },
      date: { gte: yearStart, lte: yearEnd },
    },
    _count: { id: true },
    _sum: { amount: true },
  });

  for (const t of yearlyTxns) {
    if (t.merchantId) {
      if (!merchantStats[t.merchantId]) {
        merchantStats[t.merchantId] = {
          totalCount: 0, totalAmount: 0,
          yearCount: 0, yearAmount: 0,
          monthCount: 0, monthAmount: 0,
        };
      }
      merchantStats[t.merchantId].yearCount = t._count.id;
      merchantStats[t.merchantId].yearAmount = t._sum.amount ?? 0;
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

  let earliestStart = monthStart;
  let latestEnd = monthEnd;
  for (const [, cycleDay] of ccAccountMap) {
    const { periodStart, periodEnd } = calculateBillingPeriod(now, cycleDay);
    if (periodStart < earliestStart) earliestStart = periodStart;
    if (periodEnd > latestEnd) latestEnd = periodEnd;
  }

  const monthWindowTxns = await db.transaction.findMany({
    where: {
      merchantId: { in: allMerchantIds },
      date: { gte: earliestStart, lte: latestEnd },
    },
    select: { merchantId: true, accountId: true, amount: true, date: true },
  });

  for (const txn of monthWindowTxns) {
    if (!txn.merchantId) continue;

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
      if (!merchantStats[txn.merchantId]) {
        merchantStats[txn.merchantId] = {
          totalCount: 0, totalAmount: 0,
          yearCount: 0, yearAmount: 0,
          monthCount: 0, monthAmount: 0,
        };
      }
      merchantStats[txn.merchantId].monthCount++;
      merchantStats[txn.merchantId].monthAmount += txn.amount;
    }
  }

  return { merchants, merchantStats };
}

export default async function MerchantsPage() {
  const { merchants, merchantStats } = await getMerchantsWithStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Merchants</h1>
        <p className="text-muted-foreground">
          Manage merchants and their matching patterns.
        </p>
      </div>

      <MerchantsTabs merchants={merchants} merchantStats={merchantStats} />
    </div>
  );
}
