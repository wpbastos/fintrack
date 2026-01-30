"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { resolveTransaction } from "@/lib/staging-resolver";
import { randomUUID } from "crypto";

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

interface TransactionData {
  date: string;
  description: string;
  amount: number;
}

interface StatementData {
  openingBalance?: number;
  closingBalance?: number;
  periodStart?: string;
  periodEnd?: string;
}

export interface ReloadResult {
  added: number;
  updated: number;
  deleted: number;
  unchanged: number;
}

/**
 * Reload a statement from file - syncs transactions with the file contents
 * Updates existing, adds new, deletes removed transactions
 */
export async function reloadStatement(
  importLogId: number,
  statement: StatementData,
  transactions: TransactionData[]
): Promise<ReloadResult> {
  // Get existing staging transactions for this import
  const existing = await db.stagingTransaction.findMany({
    where: { importLogId },
    orderBy: { id: "asc" },
  });

  // Create a key for matching transactions (date|description|amount)
  const makeKey = (date: string, desc: string, amount: number) =>
    `${date}|${desc}|${amount}`;

  // Map existing transactions by key
  const existingMap = new Map<string, typeof existing[0]>();
  const existingUsed = new Set<number>();

  for (const txn of existing) {
    const key = makeKey(txn.rawDate ?? "", txn.rawDescription ?? "", txn.rawAmount ?? 0);
    // Only store first occurrence to handle duplicates properly
    if (!existingMap.has(key)) {
      existingMap.set(key, txn);
    }
  }

  // Get the batchId from existing transactions (or create new one)
  const batchId = existing[0]?.importBatchId ?? randomUUID();

  let added = 0;
  let updated = 0;
  let unchanged = 0;

  // Process incoming transactions
  for (const txn of transactions) {
    const key = makeKey(txn.date, txn.description, txn.amount);
    const existingTxn = existingMap.get(key);

    if (existingTxn && !existingUsed.has(existingTxn.id)) {
      // Mark as used so we don't delete it
      existingUsed.add(existingTxn.id);
      unchanged++;
    } else {
      // New transaction - add it
      const resolution = await resolveTransaction(txn.date, txn.description);

      await db.stagingTransaction.create({
        data: {
          importBatchId: batchId,
          rawDate: txn.date,
          rawDescription: txn.description,
          rawAmount: txn.amount,
          resolvedDate: resolution.resolvedDate,
          resolvedMerchantId: resolution.resolvedMerchantId,
          matchConfidence: resolution.matchConfidence,
          status: resolution.resolvedMerchantId ? "matched" : "unknown",
          importLogId,
        },
      });
      added++;
    }
  }

  // Delete transactions that are no longer in the file
  const toDelete = existing.filter((txn) => !existingUsed.has(txn.id));
  if (toDelete.length > 0) {
    await db.stagingTransaction.deleteMany({
      where: { id: { in: toDelete.map((t) => t.id) } },
    });
  }

  // Update import log with new statement data
  await db.importLog.update({
    where: { id: importLogId },
    data: {
      openingBalance: statement.openingBalance,
      closingBalance: statement.closingBalance,
      periodStart: statement.periodStart ? new Date(statement.periodStart) : undefined,
      periodEnd: statement.periodEnd ? new Date(statement.periodEnd) : undefined,
      transactionCount: transactions.length,
    },
  });

  revalidatePath("/staging");

  return {
    added,
    updated,
    deleted: toDelete.length,
    unchanged,
  };
}
