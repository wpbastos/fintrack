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
import { IncomeDialog, IncomeEditButton } from "./income-source-dialog";
import { IncomeHistoryDialog } from "./income-history-dialog";
import { toggleIncomeStatus, deleteIncome } from "./actions";
import { toast } from "sonner";
import { Trash2, X } from "lucide-react";
import { formatCompactCurrency } from "@/lib/format";
import type { IncomeStat } from "./page";

interface CategoryGroup {
  id: number;
  name: string;
  color: string | null;
}

interface Category {
  id: number;
  name: string;
  color: string | null;
  group: CategoryGroup | null;
}

interface Person {
  id: number;
  name: string;
}

interface Account {
  id: number;
  name: string;
}

interface Position {
  id: number;
  title: string;
  department: string | null;
  employer: {
    id: number;
    name: string;
    website: string | null;
  };
}

interface Pattern {
  id: number;
  pattern: string;
  priority: number;
  notes: string | null;
}

interface Income {
  id: number;
  name: string;
  type: string;
  positionId: number | null;
  position: Position | null;
  personId: number | null;
  person: Person | null;
  categoryId: number | null;
  category: Category | null;
  depositAccountId: number | null;
  depositAccount: Account | null;
  payFrequency: string | null;
  startDate: Date | null;
  endDate: Date | null;
  initialGross: number | null;
  initialNet: number | null;
  currentGross: number | null;
  currentNet: number | null;
  isActive: boolean;
  notes: string | null;
  patterns: Pattern[];
  _count: {
    transactions: number;
  };
}

interface IncomePanelProps {
  incomeSources: Income[];
  incomeStats: Record<number, IncomeStat>;
}

// Pay frequency multipliers for annual calculation
const FREQUENCY_MULTIPLIERS: Record<string, number> = {
  Weekly: 52,
  "Bi-weekly": 26,
  "Semi-monthly": 24,
  Monthly: 12,
  Quarterly: 4,
  Annually: 1,
  Irregular: 12,
};

const FREQUENCY_STYLES: Record<string, string> = {
  Weekly: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  "Bi-weekly": "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  "Semi-monthly": "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  Monthly: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  Quarterly: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  Annually: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  Irregular: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export function IncomePanel({ incomeSources, incomeStats }: IncomePanelProps) {
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");

  // Filter income sources by search
  const filteredSources = search
    ? incomeSources.filter((s) => {
        const query = search.toLowerCase();
        return (
          s.name.toLowerCase().includes(query) ||
          (s.position?.title.toLowerCase().includes(query) ?? false) ||
          (s.position?.department?.toLowerCase().includes(query) ?? false) ||
          (s.position?.employer.name.toLowerCase().includes(query) ?? false) ||
          s.person?.name.toLowerCase().includes(query) ||
          (s.depositAccount?.name.toLowerCase().includes(query) ?? false) ||
          (s.category?.name.toLowerCase().includes(query) ?? false) ||
          s.patterns.some((p) => p.pattern.toLowerCase().includes(query))
        );
      })
    : incomeSources;

  // Group sources by category group
  const sourcesByCategoryGroup = filteredSources.reduce((acc, source) => {
    const groupKey = source.category?.group?.id ?? 0;
    const groupName = source.category?.group?.name ?? "Uncategorized";

    if (!acc[groupKey]) {
      acc[groupKey] = {
        groupId: groupKey,
        groupName,
        sources: [],
      };
    }

    acc[groupKey].sources.push(source);
    return acc;
  }, {} as Record<number, { groupId: number; groupName: string; sources: Income[] }>);

  // Sort: named groups first (by name), "Uncategorized" last
  const sortedGroups = Object.values(sourcesByCategoryGroup).sort((a, b) => {
    if (a.groupId === 0) return 1;
    if (b.groupId === 0) return -1;
    return a.groupName.localeCompare(b.groupName);
  });

  const handleToggleStatus = async (source: Income) => {
    setPendingIds((prev) => new Set(prev).add(source.id));
    await toggleIncomeStatus(source.id, !source.isActive);
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(source.id);
      return next;
    });
    toast.success(`Income source ${source.isActive ? "deactivated" : "activated"}`);
  };

  const handleDelete = async (source: Income) => {
    if (!confirm(`Are you sure you want to delete "${source.name}"?`)) {
      return;
    }

    setPendingIds((prev) => new Set(prev).add(source.id));
    const result = await deleteIncome(source.id);
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(source.id);
      return next;
    });

    if (result.success) {
      toast.success("Income source deleted");
    } else {
      toast.error(result.error || "Failed to delete income source");
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "—";
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateAnnual = (net: number | null, frequency: string | null): number | null => {
    if (net === null || !frequency) return null;
    const multiplier = FREQUENCY_MULTIPLIERS[frequency] ?? 12;
    return net * multiplier;
  };

  const calculateMonthly = (net: number | null, frequency: string | null): number => {
    if (net === null || !frequency) return 0;
    const multiplier = FREQUENCY_MULTIPLIERS[frequency] ?? 12;
    return (net * multiplier) / 12;
  };

  const calculateGroupMonthly = (sources: Income[]): number => {
    return sources.reduce((sum, s) => sum + calculateMonthly(s.currentNet, s.payFrequency), 0);
  };

  const calculateGroupActualMonth = (sources: Income[]): number => {
    return sources.reduce((sum, s) => sum + (incomeStats[s.id]?.monthAmount ?? 0), 0);
  };

  const isEarnedIncome = (groupName: string) => groupName === "Earned Income";

  // Shared cells
  const renderSourceCell = (source: Income) => (
    <TableCell>
      <div className="flex flex-col">
        {source.position?.employer.website ? (
          <a
            href={source.position.employer.website}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium hover:text-violet-600 hover:underline"
          >
            {source.name}
          </a>
        ) : (
          <span className="font-medium">{source.name}</span>
        )}
        {source.position && (
          <span className="text-xs text-muted-foreground truncate">
            {source.position.title} @ {source.position.employer.name}
          </span>
        )}
      </div>
    </TableCell>
  );

  const renderCategoryCell = (source: Income) => (
    <TableCell>
      {source.category ? (
        <span
          className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: `${source.category.color || source.category.group?.color || "#6366f1"}20`,
            color: source.category.color || source.category.group?.color || "#6366f1",
          }}
        >
          {source.category.name}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </TableCell>
  );

  const renderStatusCell = (source: Income) => (
    <TableCell className="text-center">
      <button
        onClick={() => handleToggleStatus(source)}
        disabled={pendingIds.has(source.id)}
        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium transition-colors ${
          source.isActive
            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-800"
            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
        } ${pendingIds.has(source.id) ? "opacity-50" : ""}`}
      >
        {source.isActive ? "Active" : "Inactive"}
      </button>
    </TableCell>
  );

  const renderActionsCell = (source: Income, showHistory: boolean) => (
    <TableCell className="p-0">
      <div className="flex items-center justify-center gap-1">
        {showHistory && (
          <IncomeHistoryDialog
            incomeId={source.id}
            name={source.name}
            currentGross={source.currentGross}
            currentNet={source.currentNet}
          />
        )}
        <IncomeEditButton income={source} />
        <button
          type="button"
          onClick={() => handleDelete(source)}
          disabled={pendingIds.has(source.id)}
          className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/50 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors disabled:opacity-50"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </TableCell>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <div className="relative">
          <Input
            placeholder="Search income sources..."
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
        <IncomeDialog />
      </div>

      {filteredSources.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              {search ? "No income sources match your search." : "No income sources found."}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedGroups.map((group) => {
            const earned = isEarnedIncome(group.groupName);
            const monthlyTotal = earned
              ? calculateGroupMonthly(group.sources)
              : calculateGroupActualMonth(group.sources);

            return (
              <Card key={group.groupId}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{group.groupName}</CardTitle>
                      <CardDescription>
                        {earned
                          ? `${formatCurrency(monthlyTotal)}/mo · ${group.sources.length} source${group.sources.length !== 1 ? "s" : ""}`
                          : `${formatCompactCurrency(monthlyTotal)} this month · ${group.sources.length} source${group.sources.length !== 1 ? "s" : ""}`
                        }
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table className="table-fixed w-full">
                      {earned ? (
                        <>
                          {/* Earned Income layout: Source, Frequency, Net/Pay, Annual, Category, Status, Actions */}
                          <colgroup>
                            <col style={{ width: "28%" }} />
                            <col style={{ width: "12%" }} />
                            <col style={{ width: "14%" }} />
                            <col style={{ width: "14%" }} />
                            <col style={{ width: "16%" }} />
                            <col style={{ width: "8%" }} />
                            <col style={{ width: "8%" }} />
                          </colgroup>
                          <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                            <TableRow>
                              <TableHead>Source</TableHead>
                              <TableHead>Frequency</TableHead>
                              <TableHead className="text-right">Net/Pay</TableHead>
                              <TableHead className="text-right">Annual</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead className="text-center">Status</TableHead>
                              <TableHead className="p-0"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.sources.map((source) => {
                              const annualIncome = calculateAnnual(source.currentNet, source.payFrequency);
                              return (
                                <TableRow key={source.id}>
                                  {renderSourceCell(source)}
                                  <TableCell>
                                    {source.payFrequency ? (
                                      <span
                                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                                          FREQUENCY_STYLES[source.payFrequency] ?? FREQUENCY_STYLES.Irregular
                                        }`}
                                      >
                                        {source.payFrequency}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <span className="text-sm font-mono">
                                      {formatCurrency(source.currentNet)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <span className="text-sm font-mono font-medium text-emerald-600 dark:text-emerald-400">
                                      {formatCurrency(annualIncome)}
                                    </span>
                                  </TableCell>
                                  {renderCategoryCell(source)}
                                  {renderStatusCell(source)}
                                  {renderActionsCell(source, true)}
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </>
                      ) : (
                        <>
                          {/* Other Income layout: Source, Category, Patterns, Month $, Year $, Status, Actions */}
                          <colgroup>
                            <col style={{ width: "28%" }} />
                            <col style={{ width: "16%" }} />
                            <col style={{ width: "20%" }} />
                            <col style={{ width: "12%" }} />
                            <col style={{ width: "12%" }} />
                            <col style={{ width: "6%" }} />
                            <col style={{ width: "6%" }} />
                          </colgroup>
                          <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                            <TableRow>
                              <TableHead>Source</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Patterns</TableHead>
                              <TableHead className="text-right">Month</TableHead>
                              <TableHead className="text-right">Year</TableHead>
                              <TableHead className="text-center">Status</TableHead>
                              <TableHead className="p-0"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.sources.map((source) => {
                              const stat = incomeStats[source.id];
                              return (
                                <TableRow key={source.id}>
                                  {renderSourceCell(source)}
                                  {renderCategoryCell(source)}
                                  <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                      {source.patterns.slice(0, 2).map((p) => (
                                        <code
                                          key={p.id}
                                          className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded truncate max-w-[100px]"
                                          title={p.pattern}
                                        >
                                          {p.pattern}
                                        </code>
                                      ))}
                                      {source.patterns.length > 2 && (
                                        <span className="text-xs text-muted-foreground">
                                          +{source.patterns.length - 2}
                                        </span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <span className="text-sm font-mono text-emerald-600 dark:text-emerald-400">
                                      {formatCompactCurrency(stat?.monthAmount ?? 0)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <span className="text-sm font-mono text-muted-foreground">
                                      {formatCompactCurrency(stat?.yearAmount ?? 0)}
                                    </span>
                                  </TableCell>
                                  {renderStatusCell(source)}
                                  {renderActionsCell(source, false)}
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </>
                      )}
                    </Table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
