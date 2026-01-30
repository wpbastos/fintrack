"use client";

import { useState, Fragment } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

interface StagingTableProps {
  transactions: TransactionWithBalance[];
  batches: ImportBatchInfo[];
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

function formatDateDisplay(date: Date) {
  return new Date(date).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function StagingTable({ transactions, batches }: StagingTableProps) {
  // Start with all batches collapsed
  const [expandedBatches, setExpandedBatches] = useState<Set<number>>(new Set());

  const toggleBatch = (importLogId: number) => {
    setExpandedBatches((prev) => {
      const next = new Set(prev);
      if (next.has(importLogId)) {
        next.delete(importLogId);
      } else {
        next.add(importLogId);
      }
      return next;
    });
  };

  // Track batch numbers for display
  const batchNumberMap = new Map<number, number>();
  batches.forEach((batch, idx) => {
    batchNumberMap.set(batch.importLogId, idx + 1);
  });

  // Group transactions by batch
  const transactionsByBatch = new Map<number, TransactionWithBalance[]>();
  transactions.forEach((txn) => {
    if (txn.importLogId) {
      if (!transactionsByBatch.has(txn.importLogId)) {
        transactionsByBatch.set(txn.importLogId, []);
      }
      transactionsByBatch.get(txn.importLogId)!.push(txn);
    }
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {batches.map((batch) => {
            const batchNumber = batchNumberMap.get(batch.importLogId) ?? 1;
            const isExpanded = expandedBatches.has(batch.importLogId);
            const batchTransactions = transactionsByBatch.get(batch.importLogId) ?? [];
            const fileName = batch.fileName || `Import #${batch.importLogId}`;
            const importDate = formatDateDisplay(batch.createdAt);

            return (
              <Fragment key={batch.importLogId}>
                {/* Batch Header Row */}
                <TableRow
                  className="bg-indigo-50/50 dark:bg-indigo-950/30 border-t-2 border-indigo-200 dark:border-indigo-800 cursor-pointer hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30"
                  onClick={() => toggleBatch(batch.importLogId)}
                >
                  <TableCell colSpan={6} className="py-2">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      )}
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
                        {batchNumber}
                      </span>
                      <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {batch.sourceType}
                      </span>
                      <span className="font-medium text-indigo-700 dark:text-indigo-300">{fileName}</span>
                      <span className="text-xs text-muted-foreground">
                        {batch.transactionCount} txns · {importDate}
                      </span>
                      <span className="ml-auto flex items-center gap-3">
                        {batch.isBalanced ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400" title="Balance verified">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {formatCurrency(batch.openingBalance)} → {formatCurrency(batch.closingBalance)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-rose-500 dark:text-rose-400" title="Balance mismatch">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            {formatCurrency(batch.openingBalance)} → {formatCurrency(batch.closingBalance)}
                          </span>
                        )}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>

                {/* Transaction Rows (only when expanded) */}
                {isExpanded &&
                  batchTransactions.map((txn) => (
                    <TableRow key={txn.id}>
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
                      <TableCell>
                        {txn.resolvedCategory ? (
                          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                            {txn.resolvedCategory.categoryName}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
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
                          <span
                            className={
                              txn.balance >= 0
                                ? "text-sky-600 dark:text-sky-400"
                                : "text-rose-400 dark:text-rose-300"
                            }
                          >
                            {formatCurrency(txn.balance)}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>{getStatusBadge(txn.status)}</TableCell>
                    </TableRow>
                  ))}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
