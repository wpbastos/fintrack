"use server";

import { db } from "@/lib/db";
import { resolveTransaction } from "@/lib/staging-resolver";
import { revalidatePath } from "next/cache";
import { createLogger } from "@/lib/logger";

const log = createLogger("Staging");

export interface ResolveResult {
  total: number;
  datesResolved: number;
  merchantsResolved: number;
  incomesResolved: number;
  categoriesResolved: number;
  fullyResolved: number;
}

/**
 * Get lookup data for transaction editing (merchants, incomes, categories)
 */
export async function getStagingLookupData(): Promise<{
  merchants: Array<{ id: number; name: string; categoryId: number | null }>;
  incomes: Array<{ id: number; name: string; categoryId: number | null }>;
  categories: Array<{ id: number; name: string; color: string | null; groupName: string; groupColor: string | null }>;
}> {
  const [merchants, incomes, categories] = await Promise.all([
    db.merchant.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, categoryId: true },
    }),
    db.income.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, categoryId: true },
    }),
    db.category.findMany({
      orderBy: [{ groupId: "asc" }, { name: "asc" }],
      include: { group: { select: { name: true, color: true } } },
    }),
  ]);

  return {
    merchants,
    incomes,
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      groupName: c.group?.name ?? "Uncategorized",
      groupColor: c.group?.color ?? null,
    })),
  };
}

/**
 * Re-resolve all pending and unknown staging transactions
 * Useful after adding new merchant/income source patterns
 */
export async function resolveUnresolved(): Promise<ResolveResult> {
  const transactions = await db.stagingTransaction.findMany({
    where: {
      status: { in: ["pending", "unknown"] },
    },
  });

  let datesResolved = 0;
  let merchantsResolved = 0;
  let incomesResolved = 0;
  let categoriesResolved = 0;
  let fullyResolved = 0;

  for (const txn of transactions) {
    const resolution = await resolveTransaction(
      txn.rawDate,
      txn.rawDescription,
      txn.rawAmount
    );

    const hasPatternMatch = resolution.merchantId || resolution.incomeId;
    const status = hasPatternMatch ? "matched" : "unknown";

    await db.stagingTransaction.update({
      where: { id: txn.id },
      data: {
        resolvedDate: resolution.resolvedDate,
        merchantId: resolution.merchantId,
        incomeId: resolution.incomeId,
        categoryId: resolution.categoryId,
        matchConfidence: resolution.matchConfidence,
        status,
      },
    });

    const dateOk = resolution.resolvedDate !== null;
    const merchantOk = resolution.merchantId !== null;
    const incomeOk = resolution.incomeId !== null;
    const categoryOk = resolution.categoryId !== null;

    if (dateOk) datesResolved++;
    if (merchantOk) merchantsResolved++;
    if (incomeOk) incomesResolved++;
    if (categoryOk) categoriesResolved++;
    if (dateOk && (merchantOk || incomeOk)) fullyResolved++;
  }

  if (transactions.length > 0) {
    log.info("RESOLVE", `${transactions.length} txns: ${merchantsResolved} merchants, ${incomesResolved} incomes, ${transactions.length - fullyResolved} unresolved`);
  }

  revalidatePath("/staging");

  return {
    total: transactions.length,
    datesResolved,
    merchantsResolved,
    incomesResolved,
    categoriesResolved,
    fullyResolved,
  };
}
