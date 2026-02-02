import { db } from "@/lib/db";
import { formatDateISO } from "@/lib/date-resolver";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StagingTable } from "./staging-table";

async function getStagingTransactions() {
  return db.stagingTransaction.findMany({
    orderBy: [
      { importId: "asc" },
      { resolvedDate: "asc" },
      { id: "asc" },
    ],
    take: 100,
    include: {
      import: {
        include: {
          account: true,
        },
      },
      merchant: true,
      income: true,
      category: {
        include: {
          group: { select: { color: true } },
        },
      },
    },
  });
}

interface TransactionWithBalance {
  id: number;
  rawDate: string | null;
  rawDescription: string | null;
  rawAmount: number | null;
  resolvedDate: Date | null;
  merchant: { name: string } | null;
  income: { name: string } | null;
  category: { name: string; color: string | null; group: { color: string | null } | null } | null;
  status: string;
  notes: string | null;
  balance: number | null;
  isLastOfDay: boolean;
  importId: number | null;
  isFirstOfBatch: boolean;
}

interface ImportBatchInfo {
  importId: number;
  fileName: string;
  sourceType: string;
  createdAt: Date;
  periodStart: Date | null;
  periodEnd: Date | null;
  openingBalance: number;
  closingBalance: number;
  calculatedClosing: number;
  isBalanced: boolean;
  transactionCount: number;
  addedCount: number;
  matchedCount: number;
  unknownCount: number;
  accountName: string | null;
  content: string | null;
  aiStatus: string;
  aiStartedAt: Date | null;
  aiResult: string | null;
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
  const openingBalance = transactions[0]?.import?.openingBalance ?? 0;

  // Collect batch info and calculate sum of transactions per batch
  const batchMap = new Map<number, Omit<ImportBatchInfo, 'calculatedClosing' | 'isBalanced'>>();
  const batchSums = new Map<number, number>();
  const batchCounts = new Map<number, number>();

  transactions.forEach((txn) => {
    if (txn.importId && txn.import) {
      if (!batchMap.has(txn.importId)) {
        batchMap.set(txn.importId, {
          importId: txn.importId,
          fileName: txn.import.fileName,
          sourceType: txn.import.sourceType,
          createdAt: txn.import.createdAt,
          periodStart: txn.import.periodStart,
          periodEnd: txn.import.periodEnd,
          openingBalance: txn.import.openingBalance ?? 0,
          closingBalance: txn.import.closingBalance ?? 0,
          transactionCount: 0,
          addedCount: txn.import.addedCount,
          matchedCount: txn.import.matchedCount,
          unknownCount: txn.import.unknownCount,
          accountName: txn.import.account?.name ?? null,
          content: txn.import.content,
          aiStatus: txn.import.aiStatus,
          aiStartedAt: txn.import.aiStartedAt,
          aiResult: txn.import.aiResult,
        });
        batchSums.set(txn.importId, 0);
        batchCounts.set(txn.importId, 0);
      }
      batchSums.set(txn.importId, (batchSums.get(txn.importId) ?? 0) + (txn.rawAmount ?? 0));
      batchCounts.set(txn.importId, (batchCounts.get(txn.importId) ?? 0) + 1);
    }
  });

  // Build final batch info with calculated closing and validation
  const batches: ImportBatchInfo[] = Array.from(batchMap.values()).map((batch) => {
    const sum = batchSums.get(batch.importId) ?? 0;
    const calculatedClosing = batch.openingBalance + sum;
    const isBalanced = Math.abs(calculatedClosing - batch.closingBalance) < 0.01;
    return {
      ...batch,
      calculatedClosing,
      isBalanced,
      transactionCount: batchCounts.get(batch.importId) ?? 0,
    };
  });

  // Group transactions by date to find last of each day (within each batch)
  const batchDateGroups = new Map<number, Map<string, number[]>>();
  transactions.forEach((txn, idx) => {
    if (!txn.importId) return;
    if (!batchDateGroups.has(txn.importId)) {
      batchDateGroups.set(txn.importId, new Map());
    }
    const dateGroups = batchDateGroups.get(txn.importId)!;
    const dateKey = txn.resolvedDate ? formatDateISO(txn.resolvedDate) : txn.rawDate ?? "unknown";
    if (!dateGroups.has(dateKey)) {
      dateGroups.set(dateKey, []);
    }
    dateGroups.get(dateKey)!.push(idx);
  });

  // Calculate running balance per batch
  const batchRunningBalances = new Map<number, number>();
  let lastImportId: number | null = null;

  const result = transactions.map((txn, idx) => {
    const batchId = txn.importId;
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

    const isFirstOfBatch = txn.importId !== lastImportId;
    lastImportId = txn.importId;

    return {
      id: txn.id,
      rawDate: txn.rawDate,
      rawDescription: txn.rawDescription,
      rawAmount: txn.rawAmount,
      resolvedDate: txn.resolvedDate,
      merchant: txn.merchant,
      income: txn.income,
      category: txn.category,
      status: txn.status,
      notes: txn.notes,
      balance: isLastOfDay ? runningBalance : null,
      isLastOfDay,
      importId: txn.importId,
      isFirstOfBatch,
    };
  });

  return {
    openingBalance,
    closingBalance: batchRunningBalances.get(transactions[transactions.length - 1]?.importId ?? 0) ?? 0,
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
        <CardHeader>
          <CardTitle>Pending Transactions</CardTitle>
          <CardDescription>
            {transactions.length} transactions in staging
            {batches.length > 1 && ` from ${batches.length} statements`}
          </CardDescription>
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
