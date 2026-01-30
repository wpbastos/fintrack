"use client";

import { useState, Fragment } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ImportLog {
  id: number;
  fileName: string;
  filePath: string | null;
  sourceType: string;
  accountId: number | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  openingBalance: number | null;
  closingBalance: number | null;
  transactionCount: number;
  addedCount: number;
  matchedCount: number;
  skippedCount: number;
  unknownCount: number;
  status: string;
  createdAt: Date;
}

interface ImportLogTableProps {
  logs: ImportLog[];
}

function getStatusBadge(status: string) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    Pending: "secondary",
    Processing: "secondary",
    Completed: "default",
    Failed: "destructive",
    Partial: "outline",
  };
  return <Badge variant={variants[status] ?? "secondary"}>{status}</Badge>;
}

function formatCurrency(amount: number | null) {
  if (amount === null) return "-";
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function formatDate(date: Date | null) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString();
}

export function ImportLogTable({ logs }: ImportLogTableProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead>ID</TableHead>
            <TableHead>File</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Period</TableHead>
            <TableHead className="text-right">Transactions</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Imported</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => {
            const isExpanded = expandedId === log.id;
            return (
              <Fragment key={log.id}>
                <TableRow
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleExpand(log.id)}
                >
                  <TableCell className="w-8">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">#{log.id}</TableCell>
                  <TableCell className="max-w-[200px] truncate font-medium">
                    {log.fileName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.sourceType}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.periodStart && log.periodEnd
                      ? `${formatDate(log.periodStart)} - ${formatDate(log.periodEnd)}`
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {log.transactionCount}
                  </TableCell>
                  <TableCell>{getStatusBadge(log.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(log.createdAt)}
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow key={`${log.id}-details`}>
                    <TableCell colSpan={8} className="bg-muted/30 p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Source Type</p>
                          <p className="text-sm">{log.sourceType}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Period Start</p>
                          <p className="text-sm">{formatDate(log.periodStart)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Period End</p>
                          <p className="text-sm">{formatDate(log.periodEnd)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Status</p>
                          <p className="text-sm">{getStatusBadge(log.status)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Balance</p>
                          <p className="text-sm font-mono">
                            {formatCurrency(log.openingBalance)} → {formatCurrency(log.closingBalance)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Added</p>
                          <p className="text-sm font-mono text-green-600">{log.addedCount}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Skipped</p>
                          <p className="text-sm font-mono text-orange-600">{log.skippedCount}</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
