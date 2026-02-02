import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomUUID, createHash } from "crypto";
import { resolveBatch } from "@/lib/staging-resolver";
import {
  resolveOrCreateAccount,
  validateAccountInput,
  type AccountInput,
} from "@/lib/account-resolver";
import { importLogger as log } from "@/lib/logger";

function generateContentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

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

interface TransactionData {
  date: string;
  description: string;
  amount: number;
}

interface ImportPayload {
  statement: StatementData;
  transactions: TransactionData[];
  force?: boolean; // Force re-import if duplicate
  skipBalanceValidation?: boolean; // Skip balance validation
}

function generateFingerprint(
  accountId: number | undefined,
  periodEnd: string | undefined,
  closingBalance: number | undefined,
  txnCount: number
): string {
  return `${accountId ?? ""}|${periodEnd ?? ""}|${closingBalance ?? ""}|${txnCount}`;
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
      return NextResponse.json(
        { error: "No transactions to import" },
        { status: 400 }
      );
    }

    const { statement, transactions, force, skipBalanceValidation } = data;

    // Calculate transaction sum for balance validation
    const transactionSum = transactions.reduce((sum, txn) => sum + (txn.amount ?? 0), 0);
    const roundedSum = Math.round(transactionSum * 100) / 100;

    // Validate balance: opening + sum(transactions) should equal closing
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
      transactionSum: roundedSum,
      expectedClosing: null,
      difference: null,
    };

    if (statement.openingBalance != null && statement.closingBalance != null) {
      const expectedClosing = statement.openingBalance + transactionSum;
      const balanceDiff = Math.abs(expectedClosing - statement.closingBalance);

      balanceValidation = {
        isBalanced: balanceDiff <= 0.01,
        openingBalance: statement.openingBalance,
        closingBalance: statement.closingBalance,
        transactionSum: roundedSum,
        expectedClosing: Math.round(expectedClosing * 100) / 100,
        difference: Math.round(balanceDiff * 100) / 100,
      };

      log.debug("BALANCE", `Opening: ${statement.openingBalance}, Closing: ${statement.closingBalance}`);
      log.debug("BALANCE", `Transaction sum: ${roundedSum}, Expected closing: ${balanceValidation.expectedClosing}`);
      log.debug("BALANCE", `Difference: ${balanceValidation.difference}, Balanced: ${balanceValidation.isBalanced}`);

      if (!balanceValidation.isBalanced && !skipBalanceValidation) {
        log.warn("BALANCE", `Balance mismatch! Expected ${expectedClosing}, got ${statement.closingBalance} (diff: ${balanceDiff})`);
        return NextResponse.json(
          {
            error: "Balance mismatch",
            balanceValidation,
            message: `Transactions sum to ${roundedSum.toFixed(2)}, but opening (${statement.openingBalance}) + sum = ${balanceValidation.expectedClosing} ≠ closing (${statement.closingBalance}). Difference: ${balanceValidation.difference?.toFixed(2)}`
          },
          { status: 400 }
        );
      }

      if (balanceValidation.isBalanced) {
        log.info("BALANCE", "Balance validated successfully ✓");
      } else {
        log.warn("BALANCE", "Balance mismatch - skipped validation per request");
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
      log.debug("ACCOUNT", `Account resolved: ID=${resolvedAccountId}, created=${accountCreated}, institutionCreated=${institutionCreated}`);
    } else {
      log.debug("ACCOUNT", `Using provided accountId: ${resolvedAccountId}`);
    }

    // Generate fingerprint for duplicate detection
    const fingerprint = generateFingerprint(
      resolvedAccountId,
      statement.periodEnd,
      statement.closingBalance,
      transactions.length
    );
    log.debug("DUPLICATE", `Fingerprint: ${fingerprint}`);

    // Check for duplicate import
    const existingImport = await db.import.findUnique({
      where: { statementFingerprint: fingerprint },
    });

    if (existingImport) {
      log.debug("DUPLICATE", `Found existing import: ID=${existingImport.id}`);
      if (!force) {
        log.info("DUPLICATE", "Returning duplicate info to client");
        // Return duplicate info, let client decide
        return NextResponse.json({
          duplicate: true,
          existingImport: {
            id: existingImport.id,
            importedAt: existingImport.createdAt,
            transactionCount: existingImport.transactionCount,
          },
        });
      }

      log.debug("DUPLICATE", "Force re-import: deleting existing data...");
      // Force re-import: delete existing staging transactions
      await db.stagingTransaction.deleteMany({
        where: { importId: existingImport.id },
      });

      // Delete the old import record
      await db.import.delete({
        where: { id: existingImport.id },
      });
      log.debug("DUPLICATE", "Existing import deleted");
    }

    // Generate batch ID for this import
    const batchId = randomUUID();
    log.debug("IMPORT", `Creating import record with batchId: ${batchId}`);

    // Store original JSON content and calculate hash
    const content = JSON.stringify(data);
    const contentHash = generateContentHash(content);
    log.debug("IMPORT", `Content hash: ${contentHash.substring(0, 16)}...`);

    // Check for duplicate by content hash
    const existingByHash = await db.import.findUnique({
      where: { contentHash },
    });

    if (existingByHash && !force) {
      log.info("DUPLICATE", `Duplicate content hash found: ID=${existingByHash.id}`);
      return NextResponse.json({
        duplicate: true,
        existingImport: {
          id: existingByHash.id,
          importedAt: existingByHash.createdAt,
          transactionCount: existingByHash.transactionCount,
        },
      });
    }

    // Create import entry
    const importRecord = await db.import.create({
      data: {
        fileName: statement.sourceFile ?? "unknown",
        sourceType: statement.sourceType ?? "Statement",
        accountId: resolvedAccountId,
        periodStart: statement.periodStart ? new Date(statement.periodStart) : null,
        periodEnd: statement.periodEnd ? new Date(statement.periodEnd) : null,
        openingBalance: statement.openingBalance,
        closingBalance: statement.closingBalance,
        transactionCount: transactions.length,
        content,
        contentHash,
        statementFingerprint: fingerprint,
        status: "staged",
      },
    });

    // Create staging transactions
    log.debug("STAGING", `Creating ${transactions.length} staging transactions...`);
    const stagingTransactions = await db.stagingTransaction.createMany({
      data: transactions.map((txn) => ({
        importBatchId: batchId,
        rawDate: txn.date,
        rawDescription: txn.description,
        rawAmount: txn.amount,
        accountId: resolvedAccountId,
        status: "pending",
        importId: importRecord.id,
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
