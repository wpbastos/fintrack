/**
 * Staging Transaction Resolver
 * Combines date, merchant, and income resolution for batch processing
 */

import { db } from './db';
import { resolveDate } from './date-resolver';
import { resolveMerchant } from './merchant-resolver';
import { resolveIncome } from './income-resolver';
import { resolverLogger as log } from './logger';

/**
 * Resolution result for a single transaction
 */
export interface TransactionResolution {
  resolvedDate: Date | null;
  merchantId: number | null;
  incomeId: number | null;
  categoryId: number | null;
  matchConfidence: number;
}

/**
 * Batch resolution results
 */
export interface BatchResolutionResult {
  total: number;
  datesResolved: number;
  merchantsResolved: number;
  incomesResolved: number;
  categoriesResolved: number;
  fullyResolved: number; // Date resolved + (merchant OR income)
  unresolved: number; // Neither merchant nor income resolved
}

/**
 * Resolve a single staging transaction (date + merchant + income)
 *
 * Resolution logic:
 * 1. Try BOTH pattern tables (merchant and income)
 * 2. If only ONE matches → use that one (handles refunds, returns, etc.)
 * 3. If BOTH match → use amount sign to decide (positive = income, negative = merchant)
 * 4. If NEITHER matches → leave as unknown
 *
 * @param rawDate - Raw date string from bank statement
 * @param rawDescription - Raw description from bank statement
 * @param rawAmount - Transaction amount (used as tiebreaker when both match)
 * @returns Resolution results
 */
export async function resolveTransaction(
  rawDate: string | null,
  rawDescription: string | null,
  rawAmount?: number | null
): Promise<TransactionResolution> {
  const resolvedDate = rawDate ? resolveDate(rawDate) : null;

  // Try BOTH pattern tables
  const merchantMatch = rawDescription ? await resolveMerchant(rawDescription) : null;
  const incomeMatch = rawDescription ? await resolveIncome(rawDescription) : null;

  let merchantId: number | null = null;
  let incomeId: number | null = null;
  let categoryId: number | null = null;

  const hasMerchant = merchantMatch !== null;
  const hasIncome = incomeMatch !== null;

  if (hasMerchant && hasIncome) {
    // BOTH matched - use amount sign as tiebreaker
    // Positive = prefer income, Negative = prefer merchant
    if (rawAmount != null && rawAmount > 0) {
      incomeId = incomeMatch.incomeId;
      categoryId = incomeMatch.categoryId;
    } else {
      merchantId = merchantMatch.merchantId;
      categoryId = merchantMatch.categoryId;
    }
  } else if (hasIncome) {
    // Only income matched (could be salary, refund classified as income, etc.)
    incomeId = incomeMatch.incomeId;
    categoryId = incomeMatch.categoryId;
  } else if (hasMerchant) {
    // Only merchant matched (expense, refund, return, etc.)
    merchantId = merchantMatch.merchantId;
    categoryId = merchantMatch.categoryId;
  }
  // else: neither matched, leave all as null

  // Calculate confidence based on what was resolved
  let matchConfidence = 0;
  if (resolvedDate) matchConfidence += 0.4;
  if (merchantId || incomeId) matchConfidence += 0.5;
  // Bonus if only one type matched (clearer classification)
  if ((hasMerchant && !hasIncome) || (!hasMerchant && hasIncome)) {
    matchConfidence += 0.1;
  }

  return {
    resolvedDate,
    merchantId,
    incomeId,
    categoryId,
    matchConfidence,
  };
}

/**
 * Resolve all pending staging transactions in a batch
 * Updates ResolvedDate, ResolvedMerchantID, and ResolvedIncomeID
 *
 * @param importBatchId - The import batch ID to process
 * @param options - Resolution options
 * @returns Batch resolution statistics
 */
export async function resolveBatch(
  importBatchId: string,
  options?: {
    onlyUnresolved?: boolean; // Only process transactions with null resolved fields
  }
): Promise<BatchResolutionResult> {
  const onlyUnresolved = options?.onlyUnresolved ?? true;

  // Get transactions to process
  const stagingTransactions = await db.stagingTransaction.findMany({
    where: onlyUnresolved
      ? {
          importBatchId,
          status: 'pending',
          OR: [
            { resolvedDate: null },
            { merchantId: null, incomeId: null },
          ],
        }
      : {
          importBatchId,
          status: 'pending',
        },
  });

  let datesResolved = 0;
  let merchantsResolved = 0;
  let incomesResolved = 0;
  let categoriesResolved = 0;
  let fullyResolved = 0;
  let unresolved = 0;

  // Process each transaction
  for (const transaction of stagingTransactions) {
    const resolution = await resolveTransaction(
      transaction.rawDate,
      transaction.rawDescription,
      transaction.rawAmount
    );

    // Determine status based on pattern resolution
    // - "matched" if merchant OR income found
    // - "unknown" if neither found (needs manual review)
    const hasPatternMatch = resolution.merchantId || resolution.incomeId;
    const status = hasPatternMatch ? 'matched' : 'unknown';

    // Always update - set resolved fields and status
    await db.stagingTransaction.update({
      where: { id: transaction.id },
      data: {
        resolvedDate: resolution.resolvedDate,
        merchantId: resolution.merchantId,
        incomeId: resolution.incomeId,
        categoryId: resolution.categoryId,
        matchConfidence: resolution.matchConfidence,
        status,
      },
    });

    // Track statistics
    const dateOk = resolution.resolvedDate !== null;
    const merchantOk = resolution.merchantId !== null;
    const incomeOk = resolution.incomeId !== null;
    const categoryOk = resolution.categoryId !== null;

    if (dateOk) datesResolved++;
    if (merchantOk) merchantsResolved++;
    if (incomeOk) incomesResolved++;
    if (categoryOk) categoriesResolved++;
    if (dateOk && (merchantOk || incomeOk)) fullyResolved++;
    if (!merchantOk && !incomeOk) unresolved++;
  }

  if (stagingTransactions.length > 0) {
    log.info("RESOLVE", `${stagingTransactions.length} txns: ${merchantsResolved} merchants, ${incomesResolved} incomes, ${unresolved} unknown`);
  }

  return {
    total: stagingTransactions.length,
    datesResolved,
    merchantsResolved,
    incomesResolved,
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
export async function resolveAllPending(): Promise<BatchResolutionResult> {
  const stagingTransactions = await db.stagingTransaction.findMany({
    where: {
      status: 'pending',
      OR: [
        { resolvedDate: null },
        { merchantId: null, incomeId: null },
      ],
    },
  });

  let datesResolved = 0;
  let merchantsResolved = 0;
  let incomesResolved = 0;
  let categoriesResolved = 0;
  let fullyResolved = 0;
  let unresolved = 0;

  for (const transaction of stagingTransactions) {
    const resolution = await resolveTransaction(
      transaction.rawDate,
      transaction.rawDescription,
      transaction.rawAmount
    );

    // Determine status based on pattern resolution
    const hasPatternMatch = resolution.merchantId || resolution.incomeId;
    const status = hasPatternMatch ? 'matched' : 'unknown';

    await db.stagingTransaction.update({
      where: { id: transaction.id },
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
    if (!merchantOk && !incomeOk) unresolved++;
  }

  if (stagingTransactions.length > 0) {
    log.info("RESOLVE", `Re-resolved ${stagingTransactions.length} txns: ${merchantsResolved} merchants, ${incomesResolved} incomes, ${unresolved} unknown`);
  }

  return {
    total: stagingTransactions.length,
    datesResolved,
    merchantsResolved,
    incomesResolved,
    categoriesResolved,
    fullyResolved,
    unresolved,
  };
}
