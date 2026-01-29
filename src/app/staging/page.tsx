import { Fragment } from "react";
import { db } from "@/lib/db";
import { formatDateDisplay, formatDateISO } from "@/lib/date-resolver";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ResolveButton } from "./resolve-button";

async function getStagingTransactions() {
  return db.stagingTransaction.findMany({
    orderBy: [
      { importLogId: "asc" },  // Group by batch first
      { resolvedDate: "asc" },
      { id: "asc" },
    ],
    take: 100,
    include: {
      importLog: true,
      resolvedMerchant: true,
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

  transactions.forEach((txn) => {
    if (txn.importLogId && txn.importLog) {
      // Collect batch metadata
      if (!batchMap.has(txn.importLogId)) {
        batchMap.set(txn.importLogId, {
          importLogId: txn.importLogId,
          fileName: txn.importLog.fileName,
          sourceType: txn.importLog.sourceType,
          createdAt: txn.importLog.createdAt,
          openingBalance: txn.importLog.openingBalance ?? 0,
          closingBalance: txn.importLog.closingBalance ?? 0,
        });
        batchSums.set(txn.importLogId, 0);
      }
      // Sum transaction amounts per batch
      batchSums.set(txn.importLogId, (batchSums.get(txn.importLogId) ?? 0) + (txn.rawAmount ?? 0));
    }
  });

  // Build final batch info with calculated closing and validation
  const batches: ImportBatchInfo[] = Array.from(batchMap.values()).map((batch) => {
    const sum = batchSums.get(batch.importLogId) ?? 0;
    const calculatedClosing = batch.openingBalance + sum;
    // Use small epsilon for floating point comparison
    const isBalanced = Math.abs(calculatedClosing - batch.closingBalance) < 0.01;
    return {
      ...batch,
      calculatedClosing,
      isBalanced,
    };
  });

  // Group transactions by date to find last of each day
  const dateGroups = new Map<string, number[]>();
  transactions.forEach((txn, idx) => {
    const dateKey = txn.resolvedDate ? formatDateISO(txn.resolvedDate) : txn.rawDate ?? "unknown";
    if (!dateGroups.has(dateKey)) {
      dateGroups.set(dateKey, []);
    }
    dateGroups.get(dateKey)!.push(idx);
  });

  // Calculate running balance and track batch changes
  let runningBalance = openingBalance;
  let lastImportLogId: number | null = null;

  const result = transactions.map((txn, idx) => {
    runningBalance += txn.rawAmount ?? 0;

    const dateKey = txn.resolvedDate ? formatDateISO(txn.resolvedDate) : txn.rawDate ?? "unknown";
    const dayIndices = dateGroups.get(dateKey) ?? [];
    const isLastOfDay = dayIndices[dayIndices.length - 1] === idx;

    // Check if this is the first transaction of a new batch
    const isFirstOfBatch = txn.importLogId !== lastImportLogId;
    lastImportLogId = txn.importLogId;

    return {
      id: txn.id,
      rawDate: txn.rawDate,
      rawDescription: txn.rawDescription,
      rawAmount: txn.rawAmount,
      resolvedDate: txn.resolvedDate,
      resolvedMerchant: txn.resolvedMerchant,
      status: txn.status,
      balance: isLastOfDay ? runningBalance : null,
      isLastOfDay,
      importLogId: txn.importLogId,
      isFirstOfBatch,
    };
  });

  return {
    openingBalance,
    closingBalance: runningBalance,
    transactions: result,
    batches,
  };
}

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    pending: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    matched: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    unknown: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    imported: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
    skipped: "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400",
  };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${styles[status] ?? styles.pending}`}>
      {status}
    </span>
  );
}

function formatCurrency(amount: number) {
  return amount.toLocaleString("en-CA", { style: "currency", currency: "CAD" });
}

function BatchSeparatorRow({ batch, batchNumber }: { batch: ImportBatchInfo; batchNumber: number }) {
  const fileName = batch.fileName || `Import #${batch.importLogId}`;
  const importDate = formatDateDisplay(batch.createdAt);

  return (
    <TableRow className="bg-indigo-50/50 dark:bg-indigo-950/30 border-t-2 border-indigo-200 dark:border-indigo-800">
      <TableCell colSpan={5} className="py-2">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
            {batchNumber}
          </span>
          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {batch.sourceType}
          </span>
          <span className="font-medium text-indigo-700 dark:text-indigo-300">{fileName}</span>
          <span className="text-xs text-muted-foreground">imported {importDate}</span>
          <span className="ml-auto flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">
              Opening: {formatCurrency(batch.openingBalance)}
            </span>
            {batch.isBalanced ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400" title="Balance verified">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Closing: {formatCurrency(batch.closingBalance)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-rose-500 dark:text-rose-400" title="Balance mismatch">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Closing: {formatCurrency(batch.closingBalance)}
              </span>
            )}
          </span>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default async function StagingPage() {
  const rawTransactions = await getStagingTransactions();
  const { transactions, batches } = calculateBalances(rawTransactions);

  // Track batch numbers for display
  const batchNumberMap = new Map<number, number>();
  batches.forEach((batch, idx) => {
    batchNumberMap.set(batch.importLogId, idx + 1);
  });

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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn) => {
                    const batchInfo = txn.importLogId ? batches.find(b => b.importLogId === txn.importLogId) : null;
                    const batchNumber = txn.importLogId ? batchNumberMap.get(txn.importLogId) ?? 1 : 1;

                    return (
                      <Fragment key={txn.id}>
                        {txn.isFirstOfBatch && batchInfo && batches.length > 1 && (
                          <BatchSeparatorRow
                            batch={batchInfo}
                            batchNumber={batchNumber}
                          />
                        )}
                        <TableRow>
                          <TableCell className="font-mono text-sm" title={txn.rawDate ?? ""}>
                            {txn.resolvedDate ? (
                              <span className="font-medium">{formatDateDisplay(txn.resolvedDate)}</span>
                            ) : (
                              <span className="text-muted-foreground">{txn.rawDate ?? "-"}</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate" title={txn.rawDescription ?? ""}>
                            {txn.resolvedMerchant ? (
                              <span className="font-medium">{txn.resolvedMerchant.merchantName}</span>
                            ) : (
                              <span className="text-muted-foreground">{txn.rawDescription}</span>
                            )}
                          </TableCell>
                          <TableCell
                            className={`text-right font-mono ${
                              (txn.rawAmount ?? 0) < 0
                                ? "text-rose-500 dark:text-rose-400"
                                : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {formatCurrency(txn.rawAmount ?? 0)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {txn.balance !== null ? (
                              <span className={
                                txn.balance >= 0
                                  ? "text-sky-600 dark:text-sky-400"
                                  : "text-rose-400 dark:text-rose-300"
                              }>
                                {formatCurrency(txn.balance)}
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell>{getStatusBadge(txn.status)}</TableCell>
                        </TableRow>
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
