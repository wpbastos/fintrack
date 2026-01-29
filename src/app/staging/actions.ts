"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { resolveTransaction } from "@/lib/staging-resolver";

export interface ResolveResult {
  total: number;
  datesResolved: number;
  merchantsResolved: number;
  fullyResolved: number;
}

/**
 * Re-resolve all pending and unknown staging transactions
 * Useful after adding new merchant patterns
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
  let fullyResolved = 0;

  for (const txn of transactions) {
    const resolution = await resolveTransaction(
      txn.rawDate,
      txn.rawDescription
    );

    const status = resolution.resolvedMerchantId ? "matched" : "unknown";

    await db.stagingTransaction.update({
      where: { id: txn.id },
      data: {
        resolvedDate: resolution.resolvedDate,
        resolvedMerchantId: resolution.resolvedMerchantId,
        matchConfidence: resolution.matchConfidence,
        status,
      },
    });

    const dateOk = resolution.resolvedDate !== null;
    const merchantOk = resolution.resolvedMerchantId !== null;

    if (dateOk) datesResolved++;
    if (merchantOk) merchantsResolved++;
    if (dateOk && merchantOk) fullyResolved++;
  }

  revalidatePath("/staging");

  return {
    total: transactions.length,
    datesResolved,
    merchantsResolved,
    fullyResolved,
  };
}
