/**
 * Staging Transaction Resolver
 * Combines date and merchant resolution for batch processing
 */

import { db } from './db';
import { resolveDate } from './date-resolver';
import { resolveMerchantId } from './merchant-resolver';

/**
 * Resolution result for a single transaction
 */
export interface TransactionResolution {
  resolvedDate: Date | null;
  resolvedMerchantId: number | null;
  matchConfidence: number;
}

/**
 * Batch resolution results
 */
export interface BatchResolutionResult {
  total: number;
  datesResolved: number;
  merchantsResolved: number;
  fullyResolved: number; // Both date and merchant resolved
  unresolved: number; // Neither resolved
}

/**
 * Resolve a single staging transaction (date + merchant)
 *
 * @param rawDate - Raw date string from bank statement
 * @param rawDescription - Raw description from bank statement
 * @param preferDayFirst - If true, prefer DD/MM/YYYY format
 * @returns Resolution results
 */
export async function resolveTransaction(
  rawDate: string | null,
  rawDescription: string | null,
  preferDayFirst = false
): Promise<TransactionResolution> {
  const resolvedDate = rawDate ? resolveDate(rawDate, preferDayFirst) : null;
  const resolvedMerchantId = rawDescription ? await resolveMerchantId(rawDescription) : null;

  // Calculate confidence based on what was resolved
  let matchConfidence = 0;
  if (resolvedDate) matchConfidence += 0.4;
  if (resolvedMerchantId) matchConfidence += 0.5;

  return {
    resolvedDate,
    resolvedMerchantId,
    matchConfidence,
  };
}

/**
 * Resolve all pending staging transactions in a batch
 * Updates ResolvedDate and ResolvedMerchantID
 *
 * @param importBatchId - The import batch ID to process
 * @param options - Resolution options
 * @returns Batch resolution statistics
 */
export async function resolveBatch(
  importBatchId: string,
  options?: {
    preferDayFirst?: boolean;
    onlyUnresolved?: boolean; // Only process transactions with null resolved fields
  }
): Promise<BatchResolutionResult> {
  const preferDayFirst = options?.preferDayFirst ?? false;
  const onlyUnresolved = options?.onlyUnresolved ?? true;

  // Get transactions to process
  const stagingTransactions = await db.stagingTransaction.findMany({
    where: onlyUnresolved
      ? {
          importBatchId,
          status: 'pending',
          OR: [{ resolvedDate: null }, { resolvedMerchantId: null }],
        }
      : {
          importBatchId,
          status: 'pending',
        },
  });

  let datesResolved = 0;
  let merchantsResolved = 0;
  let fullyResolved = 0;
  let unresolved = 0;

  // Process each transaction
  for (const transaction of stagingTransactions) {
    const resolution = await resolveTransaction(
      transaction.rawDate,
      transaction.rawDescription,
      preferDayFirst
    );

    // Determine status based on merchant resolution
    // - "matched" if merchant found
    // - "unknown" if no merchant found (needs manual review)
    const status = resolution.resolvedMerchantId ? 'matched' : 'unknown';

    // Always update - set resolved fields and status
    await db.stagingTransaction.update({
      where: { id: transaction.id },
      data: {
        resolvedDate: resolution.resolvedDate,
        resolvedMerchantId: resolution.resolvedMerchantId,
        matchConfidence: resolution.matchConfidence,
        status,
      },
    });

    // Track statistics
    const dateOk = resolution.resolvedDate !== null;
    const merchantOk = resolution.resolvedMerchantId !== null;

    if (dateOk) datesResolved++;
    if (merchantOk) merchantsResolved++;
    if (dateOk && merchantOk) fullyResolved++;
    if (!dateOk && !merchantOk) unresolved++;
  }

  return {
    total: stagingTransactions.length,
    datesResolved,
    merchantsResolved,
    fullyResolved,
    unresolved,
  };
}

/**
 * Resolve all staging transactions (not just a specific batch)
 * Useful for re-processing after adding new merchant patterns
 *
 * @param options - Resolution options
 * @returns Batch resolution statistics
 */
export async function resolveAllPending(options?: {
  preferDayFirst?: boolean;
}): Promise<BatchResolutionResult> {
  const preferDayFirst = options?.preferDayFirst ?? false;

  const stagingTransactions = await db.stagingTransaction.findMany({
    where: {
      status: 'pending',
      OR: [{ resolvedDate: null }, { resolvedMerchantId: null }],
    },
  });

  let datesResolved = 0;
  let merchantsResolved = 0;
  let fullyResolved = 0;
  let unresolved = 0;

  for (const transaction of stagingTransactions) {
    const resolution = await resolveTransaction(
      transaction.rawDate,
      transaction.rawDescription,
      preferDayFirst
    );

    // Determine status based on merchant resolution
    const status = resolution.resolvedMerchantId ? 'matched' : 'unknown';

    await db.stagingTransaction.update({
      where: { id: transaction.id },
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
    if (!dateOk && !merchantOk) unresolved++;
  }

  return {
    total: stagingTransactions.length,
    datesResolved,
    merchantsResolved,
    fullyResolved,
    unresolved,
  };
}
