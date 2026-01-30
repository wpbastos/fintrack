"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { MerchantDialog, MerchantEditButton } from "./merchant-dialog";
import { toggleMerchantStatus, deleteMerchant, enableAllMerchants, disableAllMerchants } from "./actions";
import { toast } from "sonner";
import { Trash2, X, Power, PowerOff } from "lucide-react";

interface Category {
  id: number;
  categoryName: string;
}

interface Pattern {
  id: number;
  pattern: string;
  priority: number;
  notes: string | null;
}

interface Merchant {
  id: number;
  merchantName: string;
  merchantType: string | null;
  defaultCategoryId: number | null;
  defaultCategory: Category | null;
  website: string | null;
  isActive: boolean;
  notes: string | null;
  patterns: Pattern[];
  _count: {
    transactions: number;
  };
}

interface MerchantsPanelProps {
  merchants: Merchant[];
}

export function MerchantsPanel({ merchants }: MerchantsPanelProps) {
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [bulkPending, setBulkPending] = useState(false);

  // Filter merchants by search (name, type, category, notes, patterns)
  const filteredMerchants = search
    ? merchants.filter((m) => {
        const query = search.toLowerCase();
        return (
          m.merchantName.toLowerCase().includes(query) ||
          (m.merchantType?.toLowerCase().includes(query) ?? false) ||
          (m.defaultCategory?.categoryName.toLowerCase().includes(query) ?? false) ||
          (m.notes?.toLowerCase().includes(query) ?? false) ||
          m.patterns.some((p) => p.pattern.toLowerCase().includes(query))
        );
      })
    : merchants;

  const handleToggleStatus = async (merchant: Merchant) => {
    setPendingIds((prev) => new Set(prev).add(merchant.id));
    await toggleMerchantStatus(merchant.id, !merchant.isActive);
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(merchant.id);
      return next;
    });
    toast.success(`Merchant ${merchant.isActive ? "deactivated" : "activated"}`);
  };

  const handleDelete = async (merchant: Merchant) => {
    if (!confirm(`Are you sure you want to delete "${merchant.merchantName}"?`)) {
      return;
    }

    setPendingIds((prev) => new Set(prev).add(merchant.id));
    const result = await deleteMerchant(merchant.id);
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(merchant.id);
      return next;
    });

    if (result.success) {
      toast.success("Merchant deleted");
    } else {
      toast.error(result.error || "Failed to delete merchant");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <div className="relative">
          <Input
            placeholder="Search merchants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 pr-8"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <MerchantDialog />
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Merchants</CardTitle>
            <div className="flex items-center gap-1">
              <button
                onClick={async () => {
                  setBulkPending(true);
                  await enableAllMerchants();
                  setBulkPending(false);
                  toast.success("All merchants enabled");
                }}
                disabled={bulkPending}
                className="p-1.5 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors disabled:opacity-50"
                title="Enable all"
              >
                <Power className="h-4 w-4" />
              </button>
              <button
                onClick={async () => {
                  setBulkPending(true);
                  await disableAllMerchants();
                  setBulkPending(false);
                  toast.success("All merchants disabled");
                }}
                disabled={bulkPending}
                className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-50"
                title="Disable all"
              >
                <PowerOff className="h-4 w-4" />
              </button>
            </div>
          </div>
          <CardDescription>Merchants and their matching patterns for transaction categorization.</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredMerchants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? "No merchants match your search." : "No merchants found."}
            </div>
          ) : (
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
                <TableHeader>
                  <TableRow>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Patterns</TableHead>
                    <TableHead className="text-center">Transactions</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="p-0"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMerchants.map((merchant) => (
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
                              {merchant.merchantName}
                            </a>
                          ) : (
                            <span className="font-medium">{merchant.merchantName}</span>
                          )}
                          {merchant.notes && (
                            <span className="text-xs text-muted-foreground truncate block">
                              {merchant.notes}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {merchant.defaultCategory ? (
                          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                            {merchant.defaultCategory.categoryName}
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
                        <span className="text-muted-foreground">
                          {merchant._count.transactions}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => handleToggleStatus(merchant)}
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
                            onClick={() => handleDelete(merchant)}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
