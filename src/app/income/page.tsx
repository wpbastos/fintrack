import { db } from "@/lib/db";
import { IncomeTabs } from "./income-tabs";

export default async function IncomePage() {
  const incomeSources = await db.incomeSource.findMany({
    orderBy: { sourceName: "asc" },
    include: {
      person: {
        select: { id: true, name: true },
      },
      defaultCategory: {
        select: { id: true, categoryName: true },
      },
      depositAccount: {
        select: { id: true, accountName: true },
      },
      patterns: {
        orderBy: { priority: "desc" },
      },
      _count: {
        select: { transactions: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Income</h1>
        <p className="text-muted-foreground">
          Manage income sources, matching patterns, and payment history.
        </p>
      </div>

      <IncomeTabs incomeSources={incomeSources} />
    </div>
  );
}
