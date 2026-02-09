"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Download } from "lucide-react";
import { toast } from "sonner";
import { exportTransactionsCsv, type TransactionFilters } from "./actions";

interface FilterOption {
  id: number;
  name: string;
  group?: { name: string; color: string | null } | null;
  institution?: { name: string } | null;
}

interface TransactionFiltersProps {
  accounts: FilterOption[];
  categories: FilterOption[];
}

export function TransactionFilterBar({ accounts, categories }: TransactionFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentFilters: TransactionFilters = {
    search: searchParams.get("search") || undefined,
    dateFrom: searchParams.get("dateFrom") || undefined,
    dateTo: searchParams.get("dateTo") || undefined,
    accountId: searchParams.get("accountId") || undefined,
    categoryId: searchParams.get("categoryId") || undefined,
    type: (searchParams.get("type") as TransactionFilters["type"]) || undefined,
    amountMin: searchParams.get("amountMin") || undefined,
    amountMax: searchParams.get("amountMax") || undefined,
  };

  const hasFilters = Object.values(currentFilters).some(Boolean);

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      // Reset to page 1 on filter change
      params.delete("page");
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router]
  );

  const clearFilters = useCallback(() => {
    router.push(pathname);
  }, [pathname, router]);

  const handleExport = async () => {
    try {
      const csv = await exportTransactionsCsv(currentFilters);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transactions-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported");
    } catch {
      toast.error("Failed to export CSV");
    }
  };

  // Group categories by their group name
  const groupedCategories = categories.reduce<Record<string, FilterOption[]>>((acc, cat) => {
    const groupName = cat.group?.name || "Other";
    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(cat);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      {/* Row 1: Search + Type toggle + Export */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search description, merchant..."
            className="pl-9 h-9"
            defaultValue={currentFilters.search || ""}
            onChange={(e) => {
              const value = e.target.value;
              // Debounce search input
              const timeout = setTimeout(() => {
                updateParams({ search: value || undefined });
              }, 300);
              return () => clearTimeout(timeout);
            }}
          />
        </div>

        {/* Type Toggle */}
        <div className="inline-flex rounded-lg border p-1 bg-muted/50">
          {(["all", "expense", "income"] as const).map((t) => (
            <button
              key={t}
              onClick={() => updateParams({ type: t === "all" ? undefined : t })}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                (currentFilters.type || "all") === t
                  ? "bg-white dark:bg-slate-800 shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "all" ? "All" : t === "expense" ? "Expenses" : "Income"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-muted-foreground"
              onClick={clearFilters}
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Row 2: Date range, Account, Category, Amount range */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase shrink-0">From</span>
          <Input
            type="date"
            className="h-9 w-[150px]"
            value={currentFilters.dateFrom || ""}
            onChange={(e) => updateParams({ dateFrom: e.target.value || undefined })}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase shrink-0">To</span>
          <Input
            type="date"
            className="h-9 w-[150px]"
            value={currentFilters.dateTo || ""}
            onChange={(e) => updateParams({ dateTo: e.target.value || undefined })}
          />
        </div>

        <select
          value={currentFilters.accountId || ""}
          onChange={(e) => updateParams({ accountId: e.target.value || undefined })}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
              {a.institution ? ` (${a.institution.name})` : ""}
            </option>
          ))}
        </select>

        <select
          value={currentFilters.categoryId || ""}
          onChange={(e) => updateParams({ categoryId: e.target.value || undefined })}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Categories</option>
          {Object.entries(groupedCategories).map(([groupName, cats]) => (
            <optgroup key={groupName} label={groupName}>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase shrink-0">Amount</span>
          <Input
            type="number"
            placeholder="Min"
            className="h-9 w-[90px]"
            min="0"
            step="0.01"
            value={currentFilters.amountMin || ""}
            onChange={(e) => updateParams({ amountMin: e.target.value || undefined })}
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="number"
            placeholder="Max"
            className="h-9 w-[90px]"
            min="0"
            step="0.01"
            value={currentFilters.amountMax || ""}
            onChange={(e) => updateParams({ amountMax: e.target.value || undefined })}
          />
        </div>
      </div>
    </div>
  );
}
