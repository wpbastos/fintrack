import { db } from "@/lib/db";
import { formatDateISO } from "@/lib/date-resolver";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResolveButton } from "./resolve-button";
import { StagingTable } from "./staging-table";

async function getStagingTransactions() {
  return db.stagingTransaction.findMany({
    orderBy: [
      { importLogId: "asc" },
      { resolvedDate: "asc" },
      { id: "asc" },
    ],
    take: 100,
    include: {
      importLog: true,
      resolvedMerchant: true,
      resolvedCategory: true,
    },
  });
}

interface TransactionWithBalance {
  id: number;
  rawDate: string | null;
  rawDescription: string | null;
  rawAmount: number | null;
  resolvedDate: Date | null;
  resolvedMerchant: { merchantName: string } | null;
  resolvedCategory: { categoryName: string } | null;
  status: string;
  balance: number | null;
  isLastOfDay: boolean;
  importLogId: number | null;
  isFirstOfBatch: boolean;
}

interface ImportBatchInfo {
  importLogId: number;
  fileName: string;
  sourceType: string;
  createdAt: Date;
  openingBalance: number;
  closingBalance: number;
  calculatedClosing: number;
  isBalanced: boolean;
  transactionCount: number;
}

interface BalanceInfo {
  openingBalance: number;
  closingBalance: number;
  transactions: TransactionWithBalance[];
  batches: ImportBatchInfo[];
}

function calculateBalances(
  transactions: Awaited<ReturnType<typeof getStagingTransactions>>
): BalanceInfo {
  if (transactions.length === 0) {
    return { openingBalance: 0, closingBalance: 0, transactions: [], batches: [] };
  }

  // Get opening balance from first transaction's import log
  const openingBalance = transactions[0]?.importLog?.openingBalance ?? 0;

  // Collect batch info and calculate sum of transactions per batch
  const batchMap = new Map<number, Omit<ImportBatchInfo, 'calculatedClosing' | 'isBalanced'>>();
  const batchSums = new Map<number, number>();
  const batchCounts = new Map<number, number>();

  transactions.forEach((txn) => {
    if (txn.importLogId && txn.importLog) {
      if (!batchMap.has(txn.importLogId)) {
        batchMap.set(txn.importLogId, {
          importLogId: txn.importLogId,
          fileName: txn.importLog.fileName,
          sourceType: txn.importLog.sourceType,
          createdAt: txn.importLog.createdAt,
          openingBalance: txn.importLog.openingBalance ?? 0,
          closingBalance: txn.importLog.closingBalance ?? 0,
          transactionCount: 0,
        });
        batchSums.set(txn.importLogId, 0);
        batchCounts.set(txn.importLogId, 0);
      }
      batchSums.set(txn.importLogId, (batchSums.get(txn.importLogId) ?? 0) + (txn.rawAmount ?? 0));
      batchCounts.set(txn.importLogId, (batchCounts.get(txn.importLogId) ?? 0) + 1);
    }
  });

  // Build final batch info with calculated closing and validation
  const batches: ImportBatchInfo[] = Array.from(batchMap.values()).map((batch) => {
    const sum = batchSums.get(batch.importLogId) ?? 0;
    const calculatedClosing = batch.openingBalance + sum;
    const isBalanced = Math.abs(calculatedClosing - batch.closingBalance) < 0.01;
    return {
      ...batch,
      calculatedClosing,
      isBalanced,
      transactionCount: batchCounts.get(batch.importLogId) ?? 0,
    };
  });

  // Group transactions by date to find last of each day (within each batch)
  const batchDateGroups = new Map<number, Map<string, number[]>>();
  transactions.forEach((txn, idx) => {
    if (!txn.importLogId) return;
    if (!batchDateGroups.has(txn.importLogId)) {
      batchDateGroups.set(txn.importLogId, new Map());
    }
    const dateGroups = batchDateGroups.get(txn.importLogId)!;
    const dateKey = txn.resolvedDate ? formatDateISO(txn.resolvedDate) : txn.rawDate ?? "unknown";
    if (!dateGroups.has(dateKey)) {
      dateGroups.set(dateKey, []);
    }
    dateGroups.get(dateKey)!.push(idx);
  });

  // Calculate running balance per batch
  const batchRunningBalances = new Map<number, number>();
  let lastImportLogId: number | null = null;

  const result = transactions.map((txn, idx) => {
    const batchId = txn.importLogId;
    if (batchId) {
      if (!batchRunningBalances.has(batchId)) {
        const batchInfo = batchMap.get(batchId);
        batchRunningBalances.set(batchId, batchInfo?.openingBalance ?? 0);
      }
      batchRunningBalances.set(batchId, (batchRunningBalances.get(batchId) ?? 0) + (txn.rawAmount ?? 0));
    }

    const runningBalance = batchId ? batchRunningBalances.get(batchId) ?? 0 : 0;

    const dateKey = txn.resolvedDate ? formatDateISO(txn.resolvedDate) : txn.rawDate ?? "unknown";
    const dateGroups = batchId ? batchDateGroups.get(batchId) : null;
    const dayIndices = dateGroups?.get(dateKey) ?? [];
    const isLastOfDay = dayIndices[dayIndices.length - 1] === idx;

    const isFirstOfBatch = txn.importLogId !== lastImportLogId;
    lastImportLogId = txn.importLogId;

    return {
      id: txn.id,
      rawDate: txn.rawDate,
      rawDescription: txn.rawDescription,
      rawAmount: txn.rawAmount,
      resolvedDate: txn.resolvedDate,
      resolvedMerchant: txn.resolvedMerchant,
      resolvedCategory: txn.resolvedCategory,
      status: txn.status,
      balance: isLastOfDay ? runningBalance : null,
      isLastOfDay,
      importLogId: txn.importLogId,
      isFirstOfBatch,
    };
  });

  return {
    openingBalance,
    closingBalance: batchRunningBalances.get(transactions[transactions.length - 1]?.importLogId ?? 0) ?? 0,
    transactions: result,
    batches,
  };
}

export default async function StagingPage() {
  const rawTransactions = await getStagingTransactions();
  const { transactions, batches } = calculateBalances(rawTransactions);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Staging</h1>
        <p className="text-muted-foreground">
          Review imported transactions before moving to final transactions.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Pending Transactions</CardTitle>
            <CardDescription>
              {transactions.length} transactions in staging
              {batches.length > 1 && ` from ${batches.length} statements`}
            </CardDescription>
          </div>
          <ResolveButton />
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions in staging. Import a statement to get started.
            </div>
          ) : (
            <StagingTable transactions={transactions} batches={batches} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
