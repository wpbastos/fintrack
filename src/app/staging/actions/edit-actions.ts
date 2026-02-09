"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createLogger } from "@/lib/logger";

const log = createLogger("Staging");

/**
 * Update a staging transaction (all editable fields)
 */
export async function updateStagingTransaction(
  transactionId: number,
  data: {
    resolvedDate?: string | null;
    merchantId?: number | null;
    incomeId?: number | null;
    categoryId?: number | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const hasMatch = data.merchantId || data.incomeId;
    const status = hasMatch ? "matched" : "unknown";

    await db.stagingTransaction.update({
      where: { id: transactionId },
      data: {
        resolvedDate: data.resolvedDate ? new Date(data.resolvedDate) : undefined,
        merchantId: data.merchantId,
        incomeId: data.incomeId,
        categoryId: data.categoryId,
        status,
        matchConfidence: hasMatch ? 100 : null,
        notes: null,
      },
    });

    // Auto-activate income if it was inactive
    if (data.incomeId) {
      await db.income.updateMany({
        where: { id: data.incomeId, isActive: false },
        data: { isActive: true },
      });
    }

    revalidatePath("/staging");
    return { success: true };
  } catch (error) {
    log.error("UPDATE", error instanceof Error ? error.message : "Unknown");
    return { success: false, error: error instanceof Error ? error.message : "Failed to update transaction" };
  }
}

/**
 * Unmatch a staging transaction - returns it to unknown status and clears resolved data
 */
export async function unmatchTransaction(transactionId: number): Promise<{ success: boolean; error?: string }> {
  try {
    await db.stagingTransaction.update({
      where: { id: transactionId },
      data: {
        status: "unknown",
        merchantId: null,
        incomeId: null,
        categoryId: null,
        matchConfidence: null,
        notes: null,
      },
    });

    revalidatePath("/staging");
    return { success: true };
  } catch (error) {
    log.error("UNMATCH", error instanceof Error ? error.message : "Unknown");
    return { success: false, error: error instanceof Error ? error.message : "Failed to unmatch transaction" };
  }
}

/**
 * Exclude a single staging transaction (mark as skipped)
 */
export async function excludeTransaction(transactionId: number): Promise<{ success: boolean; error?: string }> {
  try {
    await db.stagingTransaction.update({
      where: { id: transactionId },
      data: {
        status: "skipped",
      },
    });

    revalidatePath("/staging");
    return { success: true };
  } catch (error) {
    log.error("EXCLUDE", error instanceof Error ? error.message : "Unknown");
    return { success: false, error: error instanceof Error ? error.message : "Failed to exclude transaction" };
  }
}
