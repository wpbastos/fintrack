"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MerchantEditButton } from "./merchant-edit-button";
import { Trash2, ArrowRight } from "lucide-react";
import type { MerchantWithStatus, MerchantStat } from "../types";
import { formatCompactCurrency } from "@/lib/format";

interface MerchantsTableProps {
  merchants: MerchantWithStatus[];
  merchantStats: Record<number, MerchantStat>;
  pendingIds: Set<number>;
  onToggleStatus: (merchant: MerchantWithStatus) => void;
  onDelete: (merchant: MerchantWithStatus) => void;
}

export function MerchantsTable({
  merchants,
  merchantStats,
  pendingIds,
  onToggleStatus,
  onDelete,
}: MerchantsTableProps) {
  return (
    <div className="rounded-md border">
      <Table className="table-fixed w-full">
        <colgroup>
          <col style={{ width: "34%" }} />
          <col style={{ width: "18%" }} />
          <col style={{ width: "22%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "8%" }} />
        </colgroup>
        <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
          <TableRow>
            <TableHead>Merchant</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Patterns</TableHead>
            <TableHead className="text-center">Total $</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="p-0"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {merchants.map((merchant) => (
            <TableRow key={merchant.id}>
              <TableCell>
                <div className="flex flex-col">
                  {merchant.website ? (
                    <a
                      href={merchant.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:text-violet-600 hover:underline"
                    >
                      {merchant.name}
                    </a>
                  ) : (
                    <span className="font-medium">{merchant.name}</span>
                  )}
                  {merchant.notes && (
                    <span className="text-xs text-muted-foreground truncate block">
                      {merchant.notes}
                    </span>
                  )}
                  {merchant.hasAlternative && merchant.alternativeName && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                      <ArrowRight className="h-3 w-3" />
                      {merchant.alternativeName}
                      {merchant.alternativeSavings != null && (
                        <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                          (save ${merchant.alternativeSavings})
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {merchant.category ? (
                  <span
                    className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: `${merchant.category.color || merchant.category.group?.color || "#6366f1"}20`,
                      color: merchant.category.color || merchant.category.group?.color || "#6366f1",
                    }}
                  >
                    {merchant.category.name}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {merchant.patterns.slice(0, 2).map((p) => (
                    <code
                      key={p.id}
                      className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded truncate max-w-[100px]"
                      title={p.pattern}
                    >
                      {p.pattern}
                    </code>
                  ))}
                  {merchant.patterns.length > 2 && (
                    <span className="text-xs text-muted-foreground">
                      +{merchant.patterns.length - 2}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <span className="font-mono text-muted-foreground text-xs">
                  {formatCompactCurrency(Math.abs(merchantStats[merchant.id]?.totalAmount ?? 0))}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <button
                  onClick={() => onToggleStatus(merchant)}
                  disabled={pendingIds.has(merchant.id)}
                  className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                    merchant.isActive
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-800"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  } ${pendingIds.has(merchant.id) ? "opacity-50" : ""}`}
                >
                  {merchant.isActive ? "Active" : "Inactive"}
                </button>
              </TableCell>
              <TableCell className="p-0">
                <div className="flex items-center justify-center gap-1">
                  <MerchantEditButton merchant={merchant} />
                  <button
                    type="button"
                    onClick={() => onDelete(merchant)}
                    disabled={pendingIds.has(merchant.id)}
                    className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/50 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
