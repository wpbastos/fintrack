import { db } from "@/lib/db";
import { IncomeTabs } from "./income-tabs";

export default async function IncomePage() {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Income</h1>
        <p className="text-muted-foreground">
          Manage income sources, employers, and payment history.
        </p>
      </div>

      <IncomeTabs incomeSources={incomeSources} positions={positions} employers={employers} />
    </div>
  );
}
