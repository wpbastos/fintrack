"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createLogger } from "@/lib/logger";

const log = createLogger("Staging");

type StagingRow = Awaited<ReturnType<typeof db.stagingTransaction.findMany>>[number];

/**
 * Shared import logic — creates transactions from matched staging records,
 * marks them as imported, and cleans up skipped/imported staging rows.
 * Returns the count of imported and skipped transactions.
 */
async function processImport(
  matchedTransactions: StagingRow[],
  filter: { importId?: number }
): Promise<{ importedCount: number; skippedCount: number }> {
  let importedCount = 0;

  for (const staging of matchedTransactions) {
    if (!staging.resolvedDate) {
      continue;
    }

    await db.transaction.create({
      data: {
        date: staging.resolvedDate,
        description: staging.rawDescription ?? "",
        originalDescription: staging.rawDescription,
        amount: staging.rawAmount ?? 0,
        accountId: staging.accountId,
        categoryId: staging.categoryId,
        merchantId: staging.merchantId,
        incomeId: staging.incomeId,
        personId: staging.personId,
        importId: staging.importId,
        postingDate: staging.postingDate,
        cardNumber: staging.cardNumber,
        location: staging.location,
        foreignCurrency: staging.foreignCurrency,
        runningBalance: staging.runningBalance,
        transactionType: staging.transactionType,
        referenceNumber: staging.referenceNumber,
        terminalId: staging.terminalId,
        targetAccount: staging.targetAccount,
        sourceAccount: staging.sourceAccount,
      },
    });

    await db.stagingTransaction.update({
      where: { id: staging.id },
      data: { status: "imported" },
    });

    importedCount++;
  }

  // Auto-activate any inactive incomes that were linked to imported transactions
  const incomeIds = [...new Set(matchedTransactions.map((s) => s.incomeId).filter((id): id is number => id !== null))];
  if (incomeIds.length > 0) {
    await db.income.updateMany({
      where: { id: { in: incomeIds }, isActive: false },
      data: { isActive: true },
    });
  }

  // Delete skipped transactions
  const skippedResult = await db.stagingTransaction.deleteMany({
    where: { status: "skipped", ...filter },
  });

  // Delete imported transactions from staging
  await db.stagingTransaction.deleteMany({
    where: { status: "imported", ...filter },
  });

  return { importedCount, skippedCount: skippedResult.count };
}

/**
 * Move matched staging transactions from a specific import batch to the main Transaction table
 * Skipped transactions are deleted, pending/unknown/suggested are left in staging
 */
export async function importBatchTransactions(importId: number): Promise<{ success: boolean; imported: number; skipped: number; error?: string }> {
  try {
    const matchedTransactions = await db.stagingTransaction.findMany({
      where: { status: "matched", importId },
    });

    const { importedCount, skippedCount } = await processImport(matchedTransactions, { importId });

    await db.import.update({
      where: { id: importId },
      data: {
        addedCount: { increment: importedCount },
        status: "finalized",
        processedAt: new Date(),
      },
    });

    log.info("IMPORT", `Batch ${importId}: ${importedCount} imported, ${skippedCount} skipped`);

    revalidatePath("/staging");
    revalidatePath("/transactions");

    return { success: true, imported: importedCount, skipped: skippedCount };
  } catch (error) {
    log.error("IMPORT", error instanceof Error ? error.message : "Unknown");
    return { success: false, imported: 0, skipped: 0, error: error instanceof Error ? error.message : "Failed to import transactions" };
  }
}

/**
 * Move all matched staging transactions to the main Transaction table
 * Skipped transactions are deleted, pending/unknown/suggested are left in staging
 */
export async function importAllTransactions(): Promise<{ success: boolean; imported: number; skipped: number; error?: string }> {
  try {
    const matchedTransactions = await db.stagingTransaction.findMany({
      where: { status: "matched" },
    });

    const { importedCount, skippedCount } = await processImport(matchedTransactions, {});

    // Update import records with counts
    const importIds = [...new Set(matchedTransactions.map((t) => t.importId).filter(Boolean))];
    for (const importId of importIds) {
      if (!importId) continue;
      const addedCount = matchedTransactions.filter((t) => t.importId === importId).length;
      await db.import.update({
        where: { id: importId },
        data: {
          addedCount: { increment: addedCount },
          status: "finalized",
          processedAt: new Date(),
        },
      });
    }

    log.info("IMPORT", `All batches: ${importedCount} imported, ${skippedCount} skipped`);

    revalidatePath("/staging");
    revalidatePath("/transactions");

    return { success: true, imported: importedCount, skipped: skippedCount };
  } catch (error) {
    log.error("IMPORT", error instanceof Error ? error.message : "Unknown");
    return { success: false, imported: 0, skipped: 0, error: error instanceof Error ? error.message : "Failed to import transactions" };
  }
}
