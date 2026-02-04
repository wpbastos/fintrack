import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";
import { resolveBatch } from "@/lib/staging-resolver";
import {
  resolveOrCreateAccount,
  validateAccountInput,
  type AccountInput,
} from "@/lib/account-resolver";
import { importLogger as log } from "@/lib/logger";

interface AccountData {
  accountName: string;
  accountNumber?: string;
  institutionName?: string;
  accountType: string;
  currency?: string;
}

interface StatementData {
  accountId?: number;
  account?: AccountData;
  periodStart?: string;
  periodEnd?: string;
  openingBalance?: number;
  closingBalance?: number;
  sourceFile?: string;
  sourceType?: string;
}

interface LocationData {
  city?: string;
  province?: string;
  country?: string;
}

interface ForeignCurrencyData {
  amount?: number;
  currency?: string;
  rate?: number;
}

interface TransactionData {
  // Kernel fields (required)
  date: string;
  description: string;
  amount: number;
  // Optional metadata
  postingDate?: string;
  cardNumber?: string;
  location?: LocationData;
  foreignCurrency?: ForeignCurrencyData;
  balance?: number;
  transactionType?: string;
  referenceNumber?: string;
  terminalId?: string;
  targetAccount?: string;
  sourceAccount?: string;
  categoryHint?: string;
}

interface ExtractionMetrics {
  duration?: number; // Duration in milliseconds
  cost?: number; // Cost in USD
  tokens?: {
    input: number;
    output: number;
  };
  cacheTokens?: number;
  pdfSizeBytes?: number;
}

interface ImportPayload {
  statement: StatementData;
  transactions: TransactionData[];
  force?: boolean; // Force re-import if duplicate
  skipBalanceValidation?: boolean; // Skip balance validation
  fileHash?: string; // SHA-256 hash of original file
  extractionMetrics?: ExtractionMetrics; // PDF extraction metrics from Claude CLI
}

export async function POST(request: NextRequest) {
  const endTotal = log.time("START", "Beginning import process");

  try {
    const data: ImportPayload = await request.json();
    log.debug("PARSE", `Received payload with ${data.transactions?.length ?? 0} transactions`);

    // Validate payload
    if (!data.statement || !data.transactions || !Array.isArray(data.transactions)) {
      log.warn("VALIDATE", "Invalid payload: missing statement or transactions");
      return NextResponse.json(
        { error: "Invalid payload: missing statement or transactions" },
        { status: 400 }
      );
    }

    if (data.transactions.length === 0) {
      log.warn("VALIDATE", "No transactions to import");
      return NextResponse.json({
        warning: true,
        message: "No transactions found in this statement",
        transactionCount: 0,
      });
    }

    const { statement, transactions, force, skipBalanceValidation, extractionMetrics } = data;

    // Calculate transaction sum for balance validation (will be recalculated after normalization)
    let transactionSum = transactions.reduce((sum, txn) => sum + (txn.amount ?? 0), 0);
    let roundedSum = Math.round(transactionSum * 100) / 100;

    // Validate balance: opening + sum(transactions) should equal closing
    // Note: Balance validation happens BEFORE normalization using original values
    let balanceValidation: {
      isBalanced: boolean;
      openingBalance: number | null;
      closingBalance: number | null;
      transactionSum: number;
      expectedClosing: number | null;
      difference: number | null;
    } = {
      isBalanced: true,
      openingBalance: statement.openingBalance ?? null,
      closingBalance: statement.closingBalance ?? null,
      transactionSum: Math.round(transactions.reduce((sum, txn) => sum + (txn.amount ?? 0), 0) * 100) / 100,
      expectedClosing: null,
      difference: null,
    };

    if (statement.openingBalance != null && statement.closingBalance != null) {
      const originalSum = transactions.reduce((sum, txn) => sum + (txn.amount ?? 0), 0);
      const expectedClosing = statement.openingBalance + originalSum;
      const balanceDiff = Math.abs(expectedClosing - statement.closingBalance);

      balanceValidation = {
        isBalanced: balanceDiff <= 0.01,
        openingBalance: statement.openingBalance,
        closingBalance: statement.closingBalance,
        transactionSum: Math.round(originalSum * 100) / 100,
        expectedClosing: Math.round(expectedClosing * 100) / 100,
        difference: Math.round(balanceDiff * 100) / 100,
      };

      log.debug("BALANCE", `Opening: ${statement.openingBalance}, Closing: ${statement.closingBalance}`);
      log.debug("BALANCE", `Transaction sum: ${balanceValidation.transactionSum}, Expected closing: ${balanceValidation.expectedClosing}`);
      log.debug("BALANCE", `Difference: ${balanceValidation.difference}, Balanced: ${balanceValidation.isBalanced}`);

      if (balanceValidation.isBalanced) {
        log.info("BALANCE", "Balance validated successfully ✓");
      } else {
        log.warn("BALANCE", `Balance mismatch! Expected ${expectedClosing}, got ${statement.closingBalance} (diff: ${balanceDiff}) - continuing anyway`);
      }
    } else {
      log.debug("BALANCE", "Skipping balance validation - opening or closing balance not provided");
    }
    log.debug("VALIDATE", `Statement: ${statement.sourceFile || "unknown"}, Force: ${force || false}`);

    // Resolve account: either use provided accountId or create/find from account object
    log.debug("ACCOUNT", "Resolving account...");
    let resolvedAccountId: number | undefined = statement.accountId;
    let accountCreated = false;
    let institutionCreated = false;
    let accountType: string | null = null;

    if (!resolvedAccountId && statement.account) {
      log.debug("ACCOUNT", `Creating/finding account: ${statement.account.accountName}`);
      // Validate account input
      if (!validateAccountInput(statement.account)) {
        log.warn("ACCOUNT", "Invalid account data");
        return NextResponse.json(
          { error: "Invalid account data: accountName and accountType are required" },
          { status: 400 }
        );
      }

      const accountInput: AccountInput = {
        accountName: statement.account.accountName,
        accountNumber: statement.account.accountNumber,
        institutionName: statement.account.institutionName,
        accountType: statement.account.accountType,
        currency: statement.account.currency,
      };

      const accountResult = await resolveOrCreateAccount(accountInput);
      resolvedAccountId = accountResult.accountId;
      accountCreated = accountResult.accountCreated;
      institutionCreated = accountResult.institutionCreated;
      accountType = statement.account.accountType;
      log.debug("ACCOUNT", `Account resolved: ID=${resolvedAccountId}, created=${accountCreated}, institutionCreated=${institutionCreated}`);
    } else if (resolvedAccountId) {
      // Fetch account type for existing account
      const existingAccount = await db.account.findUnique({
        where: { id: resolvedAccountId },
        select: { type: true },
      });
      accountType = existingAccount?.type ?? null;
      log.debug("ACCOUNT", `Using provided accountId: ${resolvedAccountId}, type: ${accountType}`);
    }

    // Check if this is a credit card account (signs need to be normalized)
    const isCreditCard = accountType?.toLowerCase().includes("credit") ?? false;

    // Normalize credit card values: flip signs so negative = expense, positive = income
    // This makes all accounts consistent from the user's perspective
    let normalizedOpeningBalance = statement.openingBalance;
    let normalizedClosingBalance = statement.closingBalance;

    if (isCreditCard) {
      log.debug("NORMALIZE", "Credit card detected - normalizing transaction signs");
      // Flip balances: positive debt becomes negative (you owe money)
      if (normalizedOpeningBalance != null) {
        normalizedOpeningBalance = -normalizedOpeningBalance;
      }
      if (normalizedClosingBalance != null) {
        normalizedClosingBalance = -normalizedClosingBalance;
      }
      // Recalculate transaction sum with flipped signs
      transactionSum = transactions.reduce((sum, txn) => sum + (-(txn.amount ?? 0)), 0);
      roundedSum = Math.round(transactionSum * 100) / 100;
      log.debug("NORMALIZE", `Normalized balances: ${normalizedOpeningBalance} -> ${normalizedClosingBalance}, sum: ${roundedSum}`);
    }

    // Check for duplicate by file hash
    if (data.fileHash) {
      const existingImport = await db.import.findUnique({
        where: { fileHash: data.fileHash },
      });

      if (existingImport) {
        if (!force) {
          log.info("DUPLICATE", `File already imported: ID=${existingImport.id}`);
          return NextResponse.json({
            duplicate: true,
            existingImport: {
              id: existingImport.id,
              importedAt: existingImport.createdAt,
              transactionCount: existingImport.transactionCount,
            },
          });
        }

        // Force re-import: delete existing data
        log.debug("DUPLICATE", "Force re-import: deleting existing data...");
        await db.stagingTransaction.deleteMany({
          where: { importId: existingImport.id },
        });
        await db.import.delete({
          where: { id: existingImport.id },
        });
        log.debug("DUPLICATE", "Existing import deleted");
      }
    }

    // Generate batch ID for this import
    const batchId = randomUUID();
    log.debug("IMPORT", `Creating import record with batchId: ${batchId}`);

    // Store original JSON content
    const content = JSON.stringify(data);

    // Create import entry (using normalized balances for credit cards)
    const importRecord = await db.import.create({
      data: {
        fileName: statement.sourceFile ?? "unknown",
        sourceType: statement.sourceType ?? "Statement",
        accountId: resolvedAccountId,
        periodStart: statement.periodStart ? new Date(statement.periodStart) : null,
        periodEnd: statement.periodEnd ? new Date(statement.periodEnd) : null,
        openingBalance: normalizedOpeningBalance,
        closingBalance: normalizedClosingBalance,
        transactionCount: transactions.length,
        content,
        fileHash: data.fileHash,
        status: "staged",
        // PDF extraction metrics
        extractDurationMs: extractionMetrics?.duration,
        extractCostUsd: extractionMetrics?.cost,
        extractInputTokens: extractionMetrics?.tokens?.input,
        extractOutputTokens: extractionMetrics?.tokens?.output,
        extractCacheTokens: extractionMetrics?.cacheTokens,
        extractPdfSizeBytes: extractionMetrics?.pdfSizeBytes,
      },
    });

    // Create staging transactions (normalizing amounts for credit cards)
    log.debug("STAGING", `Creating ${transactions.length} staging transactions...`);
    const stagingTransactions = await db.stagingTransaction.createMany({
      data: transactions.map((txn) => ({
        importBatchId: batchId,
        rawDate: txn.date,
        rawDescription: txn.description,
        // Normalize credit card amounts: flip sign so negative = expense, positive = income
        rawAmount: isCreditCard ? -(txn.amount ?? 0) : txn.amount,
        accountId: resolvedAccountId,
        status: "pending",
        importId: importRecord.id,
        // Optional metadata fields
        postingDate: txn.postingDate ? new Date(txn.postingDate) : null,
        cardNumber: txn.cardNumber ?? null,
        location: txn.location ? JSON.stringify(txn.location) : null,
        foreignCurrency: txn.foreignCurrency ? JSON.stringify(txn.foreignCurrency) : null,
        // Also normalize running balance for credit cards
        runningBalance: isCreditCard && txn.balance != null ? -txn.balance : txn.balance ?? null,
        transactionType: txn.transactionType ?? null,
        referenceNumber: txn.referenceNumber ?? null,
        terminalId: txn.terminalId ?? null,
        targetAccount: txn.targetAccount ?? null,
        sourceAccount: txn.sourceAccount ?? null,
        categoryHint: txn.categoryHint ?? null,
      })),
    });
    log.debug("STAGING", `Created ${stagingTransactions.count} staging transactions`);

    // Resolve dates, merchants, income sources, and categories for this batch
    const endResolve = log.time("RESOLVE", "Resolving batch");
    const resolution = await resolveBatch(batchId);
    endResolve(`Resolved: ${resolution.merchantsResolved} merchants, ${resolution.incomesResolved} incomes`);

    // Update import status with resolution counts
    await db.import.update({
      where: { id: importRecord.id },
      data: {
        status: "staged",
        addedCount: stagingTransactions.count,
        matchedCount: resolution.merchantsResolved + resolution.incomesResolved,
        unknownCount: resolution.unresolved,
      },
    });

    endTotal(`Import completed: ${stagingTransactions.count} transactions`);

    return NextResponse.json({
      importId: importRecord.id,
      transactionCount: stagingTransactions.count,
      batchId,
      accountId: resolvedAccountId,
      accountCreated,
      institutionCreated,
      reimported: !!force,
      resolution,
      balanceValidation,
    });
  } catch (error) {
    log.error("ERROR", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}
