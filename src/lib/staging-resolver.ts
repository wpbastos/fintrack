/**
 * Staging Transaction Resolver
 * Combines date, merchant, and income source resolution for batch processing
 */

import { db } from './db';
import { resolveDate } from './date-resolver';
import { resolveMerchant } from './merchant-resolver';
import { resolveIncomeSource } from './income-resolver';

/**
 * Resolution result for a single transaction
 */
export interface TransactionResolution {
  resolvedDate: Date | null;
  resolvedMerchantId: number | null;
  resolvedIncomeSourceId: number | null;
  resolvedCategoryId: number | null;
  matchConfidence: number;
}

/**
 * Batch resolution results
 */
export interface BatchResolutionResult {
  total: number;
  datesResolved: number;
  merchantsResolved: number;
  incomeSourcesResolved: number;
  categoriesResolved: number;
  fullyResolved: number; // Date resolved + (merchant OR income source)
  unresolved: number; // Neither merchant nor income source resolved
}

/**
 * Resolve a single staging transaction (date + merchant + income source)
 * Tries BOTH pattern tables for every transaction - pattern match determines type
 *
 * @param rawDate - Raw date string from bank statement
 * @param rawDescription - Raw description from bank statement
 * @param preferDayFirst - If true, prefer DD/MM/YYYY format
 * @returns Resolution results
 */
export async function resolveTransaction(
  rawDate: string | null,
  rawDescription: string | null,
  preferDayFirst = false,
  rawAmount?: number | null
): Promise<TransactionResolution> {
  const resolvedDate = rawDate ? resolveDate(rawDate, preferDayFirst) : null;

  // Try BOTH pattern tables for every transaction
  // Pattern found determines transaction type (not amount sign)
  const merchantMatch = rawDescription ? await resolveMerchant(rawDescription) : null;
  const incomeSourceMatch = rawDescription ? await resolveIncomeSource(rawDescription) : null;

  const resolvedMerchantId = merchantMatch?.merchantId ?? null;
  const resolvedIncomeSourceId = incomeSourceMatch?.incomeSourceId ?? null;

  // Get category based on amount sign when both match
  // Positive = income source's category, Negative = merchant's category
  let resolvedCategoryId: number | null = null;
  if (merchantMatch && incomeSourceMatch && rawAmount != null) {
    // Both matched - use amount sign to decide
    resolvedCategoryId = rawAmount >= 0
      ? incomeSourceMatch.defaultCategoryId
      : merchantMatch.defaultCategoryId;
  } else {
    // Only one matched - use whichever is available
    resolvedCategoryId = merchantMatch?.defaultCategoryId
      ?? incomeSourceMatch?.defaultCategoryId
      ?? null;
  }

  // Calculate confidence based on what was resolved
  let matchConfidence = 0;
  if (resolvedDate) matchConfidence += 0.4;
  if (resolvedMerchantId || resolvedIncomeSourceId) matchConfidence += 0.5;
  // Bonus if only one type matched (clearer classification)
  if ((resolvedMerchantId && !resolvedIncomeSourceId) || (!resolvedMerchantId && resolvedIncomeSourceId)) {
    matchConfidence += 0.1;
  }

  return {
    resolvedDate,
    resolvedMerchantId,
    resolvedIncomeSourceId,
    resolvedCategoryId,
    matchConfidence,
  };
}

/**
 * Resolve all pending staging transactions in a batch
 * Updates ResolvedDate, ResolvedMerchantID, and ResolvedIncomeSourceID
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
          OR: [
            { resolvedDate: null },
            { resolvedMerchantId: null, resolvedIncomeSourceId: null },
          ],
        }
      : {
          importBatchId,
          status: 'pending',
        },
  });

  let datesResolved = 0;
  let merchantsResolved = 0;
  let incomeSourcesResolved = 0;
  let categoriesResolved = 0;
  let fullyResolved = 0;
  let unresolved = 0;

  // Process each transaction
  for (const transaction of stagingTransactions) {
    const resolution = await resolveTransaction(
      transaction.rawDate,
      transaction.rawDescription,
      preferDayFirst,
      transaction.rawAmount
    );

    // Determine status based on pattern resolution
    // - "matched" if merchant OR income source found
    // - "unknown" if neither found (needs manual review)
    const hasPatternMatch = resolution.resolvedMerchantId || resolution.resolvedIncomeSourceId;
    const status = hasPatternMatch ? 'matched' : 'unknown';

    // Always update - set resolved fields and status
    await db.stagingTransaction.update({
      where: { id: transaction.id },
      data: {
        resolvedDate: resolution.resolvedDate,
        resolvedMerchantId: resolution.resolvedMerchantId,
        resolvedIncomeSourceId: resolution.resolvedIncomeSourceId,
        resolvedCategoryId: resolution.resolvedCategoryId,
        matchConfidence: resolution.matchConfidence,
        status,
      },
    });

    // Track statistics
    const dateOk = resolution.resolvedDate !== null;
    const merchantOk = resolution.resolvedMerchantId !== null;
    const incomeSourceOk = resolution.resolvedIncomeSourceId !== null;
    const categoryOk = resolution.resolvedCategoryId !== null;

    if (dateOk) datesResolved++;
    if (merchantOk) merchantsResolved++;
    if (incomeSourceOk) incomeSourcesResolved++;
    if (categoryOk) categoriesResolved++;
    if (dateOk && (merchantOk || incomeSourceOk)) fullyResolved++;
    if (!merchantOk && !incomeSourceOk) unresolved++;
  }

  return {
    total: stagingTransactions.length,
    datesResolved,
    merchantsResolved,
    incomeSourcesResolved,
    categoriesResolved,
    fullyResolved,
    unresolved,
  };
}

/**
 * Resolve all staging transactions (not just a specific batch)
 * Useful for re-processing after adding new merchant/income patterns
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
      OR: [
        { resolvedDate: null },
        { resolvedMerchantId: null, resolvedIncomeSourceId: null },
      ],
    },
  });

  let datesResolved = 0;
  let merchantsResolved = 0;
  let incomeSourcesResolved = 0;
  let categoriesResolved = 0;
  let fullyResolved = 0;
  let unresolved = 0;

  for (const transaction of stagingTransactions) {
    const resolution = await resolveTransaction(
      transaction.rawDate,
      transaction.rawDescription,
      preferDayFirst,
      transaction.rawAmount
    );

    // Determine status based on pattern resolution
    const hasPatternMatch = resolution.resolvedMerchantId || resolution.resolvedIncomeSourceId;
    const status = hasPatternMatch ? 'matched' : 'unknown';

    await db.stagingTransaction.update({
      where: { id: transaction.id },
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
    if (!merchantOk && !incomeSourceOk) unresolved++;
  }

  return {
    total: stagingTransactions.length,
    datesResolved,
    merchantsResolved,
    incomeSourcesResolved,
    categoriesResolved,
    fullyResolved,
    unresolved,
  };
}
