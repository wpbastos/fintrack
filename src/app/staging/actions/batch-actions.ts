"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createLogger } from "@/lib/logger";

const log = createLogger("Staging");

/**
 * Delete an import batch and all its staging transactions
 */
export async function deleteImportBatch(importId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const importRecord = await db.import.findUnique({
      where: { id: importId },
      select: { status: true },
    });

    if (!importRecord) {
      return { success: false, error: "Import not found" };
    }

    if (importRecord.status === "finalized") {
      return { success: false, error: "Cannot delete finalized imports" };
    }

    const deletedTxns = await db.stagingTransaction.deleteMany({
      where: { importId },
    });

    await db.import.delete({
      where: { id: importId },
    });

    log.info("DELETE", `Batch ${importId}: ${deletedTxns.count} transactions removed`);

    revalidatePath("/staging");
    return { success: true };
  } catch (error) {
    log.error("DELETE", error instanceof Error ? error.message : "Unknown");
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete import" };
  }
}

/**
 * Update import batch details (balance and period dates)
 */
export async function updateImportBalance(
  importId: number,
  data: {
    openingBalance: number;
    closingBalance: number;
    periodStart?: string | null;
    periodEnd?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.import.update({
      where: { id: importId },
      data: {
        openingBalance: data.openingBalance,
        closingBalance: data.closingBalance,
        periodStart: data.periodStart ? new Date(data.periodStart) : null,
        periodEnd: data.periodEnd ? new Date(data.periodEnd) : null,
      },
    });

    revalidatePath("/staging");
    return { success: true };
  } catch (error) {
    log.error("UPDATE", error instanceof Error ? error.message : "Unknown");
    return { success: false, error: error instanceof Error ? error.message : "Failed to update import" };
  }
}
