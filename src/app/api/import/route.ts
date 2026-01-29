import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";
import { resolveBatch } from "@/lib/staging-resolver";

interface StatementData {
  accountId?: number;
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

    const { statement, transactions } = data;

    // Generate fingerprint for duplicate detection
    const fingerprint = generateFingerprint(
      statement.accountId,
      statement.periodEnd,
      statement.closingBalance,
      transactions.length
    );

    // Check for duplicate import
    const existingImport = await db.importLog.findUnique({
      where: { statementFingerprint: fingerprint },
    });

    if (existingImport) {
      return NextResponse.json(
        { error: `This statement was already imported on ${existingImport.createdAt.toLocaleDateString()}` },
        { status: 409 }
      );
    }

    // Generate batch ID for this import
    const batchId = randomUUID();

    // Create import log entry
    const importLog = await db.importLog.create({
      data: {
        fileName: statement.sourceFile ?? "unknown",
        filePath: null,
        sourceType: statement.sourceType ?? "Statement",
        accountId: statement.accountId,
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
        accountId: statement.accountId,
        sourceFile: statement.sourceFile,
        status: "pending",
        importLogId: importLog.id,
      })),
    });

    // Resolve dates and merchants for this batch
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
