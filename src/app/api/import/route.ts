import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";
import { resolveBatch } from "@/lib/staging-resolver";
import {
  resolveOrCreateAccount,
  validateAccountInput,
  type AccountInput,
} from "@/lib/account-resolver";

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
  force?: boolean;
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
  try {
    const data: ImportPayload = await request.json();

    // Validate payload
    if (!data.statement || !data.transactions || !Array.isArray(data.transactions)) {
      return NextResponse.json(
        { error: "Invalid payload: missing statement or transactions" },
        { status: 400 }
      );
    }

    if (data.transactions.length === 0) {
      return NextResponse.json(
        { error: "No transactions to import" },
        { status: 400 }
      );
    }

    const { statement, transactions, force } = data;

    // Resolve account: either use provided accountId or create/find from account object
    let resolvedAccountId: number | undefined = statement.accountId;
    let accountCreated = false;
    let institutionCreated = false;

    if (!resolvedAccountId && statement.account) {
      // Validate account input
      if (!validateAccountInput(statement.account)) {
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
    }

    // Generate fingerprint for duplicate detection
    const fingerprint = generateFingerprint(
      resolvedAccountId,
      statement.periodEnd,
      statement.closingBalance,
      transactions.length
    );

    // Check for duplicate import
    const existingImport = await db.importLog.findUnique({
      where: { statementFingerprint: fingerprint },
    });

    if (existingImport) {
      if (!force) {
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

      // Force re-import: delete existing staging transactions
      await db.stagingTransaction.deleteMany({
        where: { importLogId: existingImport.id },
      });

      // Delete the old import log
      await db.importLog.delete({
        where: { id: existingImport.id },
      });
    }

    // Generate batch ID for this import
    const batchId = randomUUID();

    // Create import log entry
    const importLog = await db.importLog.create({
      data: {
        fileName: statement.sourceFile ?? "unknown",
        filePath: null,
        sourceType: statement.sourceType ?? "Statement",
        accountId: resolvedAccountId,
        periodStart: statement.periodStart ? new Date(statement.periodStart) : null,
        periodEnd: statement.periodEnd ? new Date(statement.periodEnd) : null,
        openingBalance: statement.openingBalance,
        closingBalance: statement.closingBalance,
        transactionCount: transactions.length,
        statementFingerprint: fingerprint,
        status: "Processing",
      },
    });

    // Create staging transactions
    const stagingTransactions = await db.stagingTransaction.createMany({
      data: transactions.map((txn) => ({
        importBatchId: batchId,
        rawDate: txn.date,
        rawDescription: txn.description,
        rawAmount: txn.amount,
        accountId: resolvedAccountId,
        sourceFile: statement.sourceFile,
        status: "pending",
        importLogId: importLog.id,
      })),
    });

    // Resolve dates, merchants, income sources, and categories for this batch
    const resolution = await resolveBatch(batchId);

    // Update import log status
    await db.importLog.update({
      where: { id: importLog.id },
      data: {
        status: "Completed",
        addedCount: stagingTransactions.count,
        processedAt: new Date(),
      },
    });

    return NextResponse.json({
      importId: importLog.id,
      transactionCount: stagingTransactions.count,
      batchId,
      accountId: resolvedAccountId,
      accountCreated,
      institutionCreated,
      reimported: !!force,
      resolution,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}
