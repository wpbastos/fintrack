"use server";

import { db } from "@/lib/db";

export async function getSetting(key: string): Promise<string | null> {
  const setting = await db.setting.findUnique({ where: { key } });
  return setting?.value ?? null;
}

export async function getSettings(
  keys: string[]
): Promise<Record<string, string>> {
  const settings = await db.setting.findMany({
    where: { key: { in: keys } },
  });
  const result: Record<string, string> = {};
  for (const s of settings) {
    result[s.key] = s.value;
  }
  return result;
}

export async function updateSetting(key: string, value: string) {
  await db.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function getDatabaseStats() {
  const [transactions, imports, staging, merchants] = await Promise.all([
    db.transaction.count(),
    db.import.count(),
    db.stagingTransaction.count(),
    db.merchant.count(),
  ]);
  return { transactions, imports, staging, merchants };
}

export async function clearStagingData() {
  const result = await db.stagingTransaction.deleteMany({
    where: { status: { not: "imported" } },
  });
  return { deleted: result.count };
}

export async function getBudgetStatus() {
  const [openPeriods, closedPeriods, categoriesWithBudget] = await Promise.all([
    db.budgetPeriod.count({ where: { status: "open" } }),
    db.budgetPeriod.count({ where: { status: "closed" } }),
    db.category.count({
      where: { isActive: true, monthlyBudget: { not: null } },
    }),
  ]);
  return { openPeriods, closedPeriods, categoriesWithBudget };
}
