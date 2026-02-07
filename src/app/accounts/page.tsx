import { db } from "@/lib/db";
import { calculateBillingPeriod } from "@/lib/billing-cycle";
import { AccountsTabs } from "./accounts-tabs";

export const dynamic = "force-dynamic";

export interface AccountStat {
  monthCount: number;
  monthAmount: number;
  yearCount: number;
  yearAmount: number;
}

async function getInstitutions() {
  return db.institution.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { accounts: true },
      },
    },
  });
}

async function getPersons() {
  return db.person.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          accounts: true,
          transactions: true,
        },
      },
    },
  });
}

async function getAccounts() {
  return db.account.findMany({
    orderBy: { name: "asc" },
    include: {
      institution: true,
      owner: true,
    },
  });
}

export default async function AccountsPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

  const [institutions, persons, accounts] = await Promise.all([
    getInstitutions(),
    getPersons(),
    getAccounts(),
  ]);

  // --- Account spending stats ---
  const accountStats: Record<number, AccountStat> = {};
  const allAccountIds = accounts.map((a) => a.id);

  if (allAccountIds.length > 0) {
    // Current year
    const yearlyTxns = await db.transaction.groupBy({
      by: ["accountId"],
      where: {
        accountId: { in: allAccountIds },
        date: { gte: yearStart, lte: yearEnd },
      },
      _count: { id: true },
      _sum: { amount: true },
    });

    for (const t of yearlyTxns) {
      if (t.accountId) {
        accountStats[t.accountId] = {
          yearCount: t._count.id,
          yearAmount: t._sum.amount ?? 0,
          monthCount: 0,
          monthAmount: 0,
        };
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
        accountId: { in: allAccountIds },
        date: { gte: earliestStart, lte: latestEnd },
      },
      select: { accountId: true, amount: true, date: true },
    });

    for (const txn of monthWindowTxns) {
      if (!txn.accountId) continue;

      let inPeriod = false;
      if (ccAccountMap.has(txn.accountId)) {
        const cycleDay = ccAccountMap.get(txn.accountId)!;
        const { periodStart, periodEnd } = calculateBillingPeriod(now, cycleDay);
        const txnDate = new Date(txn.date);
        inPeriod = txnDate >= periodStart && txnDate <= periodEnd;
      } else {
        const txnDate = new Date(txn.date);
        inPeriod = txnDate >= monthStart && txnDate <= monthEnd;
      }

      if (inPeriod) {
        if (!accountStats[txn.accountId]) {
          accountStats[txn.accountId] = {
            yearCount: 0,
            yearAmount: 0,
            monthCount: 0,
            monthAmount: 0,
          };
        }
        accountStats[txn.accountId].monthCount++;
        accountStats[txn.accountId].monthAmount += txn.amount;
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
        <p className="text-muted-foreground">
          Manage institutions, persons, and financial accounts.
        </p>
      </div>

      <AccountsTabs
        institutions={institutions}
        persons={persons}
        accounts={accounts}
        accountStats={accountStats}
      />
    </div>
  );
}
