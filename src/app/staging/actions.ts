"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { resolveTransaction } from "@/lib/staging-resolver";

export interface ResolveResult {
  total: number;
  datesResolved: number;
  merchantsResolved: number;
  incomeSourcesResolved: number;
  categoriesResolved: number;
  fullyResolved: number;
}

/**
 * Re-resolve all pending and unknown staging transactions
 * Useful after adding new merchant/income source patterns
 */
export async function resolveUnresolved(): Promise<ResolveResult> {
  // Get transactions that need resolution (pending or unknown)
  const transactions = await db.stagingTransaction.findMany({
    where: {
      status: { in: ["pending", "unknown"] },
    },
  });

  let datesResolved = 0;
  let merchantsResolved = 0;
  let incomeSourcesResolved = 0;
  let categoriesResolved = 0;
  let fullyResolved = 0;

  for (const txn of transactions) {
    const resolution = await resolveTransaction(
      txn.rawDate,
      txn.rawDescription,
      false,
      txn.rawAmount
    );

    const hasPatternMatch = resolution.resolvedMerchantId || resolution.resolvedIncomeSourceId;
    const status = hasPatternMatch ? "matched" : "unknown";

    await db.stagingTransaction.update({
      where: { id: txn.id },
      data: {
        resolvedDate: resolution.resolvedDate,
        resolvedMerchantId: resolution.resolvedMerchantId,
        resolvedIncomeSourceId: resolution.resolvedIncomeSourceId,
        resolvedCategoryId: resolution.resolvedCategoryId,
        matchConfidence: resolution.matchConfidence,
        status,
      },
    });

    const dateOk = resolution.resolvedDate !== null;
    const merchantOk = resolution.resolvedMerchantId !== null;
    const incomeSourceOk = resolution.resolvedIncomeSourceId !== null;
    const categoryOk = resolution.resolvedCategoryId !== null;

    if (dateOk) datesResolved++;
    if (merchantOk) merchantsResolved++;
    if (incomeSourceOk) incomeSourcesResolved++;
    if (categoryOk) categoriesResolved++;
    if (dateOk && (merchantOk || incomeSourceOk)) fullyResolved++;
  }

  revalidatePath("/staging");

  return {
    total: transactions.length,
    datesResolved,
    merchantsResolved,
    incomeSourcesResolved,
    categoriesResolved,
    fullyResolved,
  };
}
