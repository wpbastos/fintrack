"use server";

import { db } from "@/lib/db";

export async function getBudgetPeriods(
  categoryId: number
): Promise<{
  id: number;
  periodStart: Date;
  periodEnd: Date;
  budgetedAmount: number;
  actualSpent: number;
  status: string;
  notes: string | null;
}[]> {
  const periods = await db.budgetPeriod.findMany({
    where: { categoryId },
    orderBy: { periodStart: "desc" },
  });

  return periods.map((p) => ({
    id: p.id,
    periodStart: p.periodStart,
    periodEnd: p.periodEnd,
    budgetedAmount: p.budgetedAmount,
    actualSpent: p.actualSpent,
    status: p.status,
    notes: p.notes,
  }));
}
