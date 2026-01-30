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
import { IncomeSourceDialog, IncomeSourceEditButton } from "./income-source-dialog";
import { IncomeHistoryDialog } from "./income-history-dialog";
import { toggleIncomeSourceStatus, deleteIncomeSource } from "./actions";
import { toast } from "sonner";
import { Trash2, X } from "lucide-react";

interface Category {
  id: number;
  categoryName: string;
}

interface Person {
  id: number;
  name: string;
}

interface Account {
  id: number;
  accountName: string;
}

interface Pattern {
  id: number;
  pattern: string;
  priority: number;
  notes: string | null;
}

interface IncomeSource {
  id: number;
  sourceName: string;
  personId: number | null;
  person: Person | null;
  defaultCategoryId: number | null;
  defaultCategory: Category | null;
  depositAccountId: number | null;
  depositAccount: Account | null;
  payFrequency: string | null;
  position: string | null;
  industry: string | null;
  location: string | null;
  website: string | null;
  startDate: Date | null;
  endDate: Date | null;
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
  incomeSources: IncomeSource[];
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

export function IncomePanel({ incomeSources }: IncomePanelProps) {
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");

  // Filter income sources by search
  const filteredSources = search
    ? incomeSources.filter((s) => {
        const query = search.toLowerCase();
        return (
          s.sourceName.toLowerCase().includes(query) ||
          (s.position?.toLowerCase().includes(query) ?? false) ||
          (s.industry?.toLowerCase().includes(query) ?? false) ||
          s.person?.name.toLowerCase().includes(query) ||
          (s.depositAccount?.accountName.toLowerCase().includes(query) ?? false) ||
          (s.defaultCategory?.categoryName.toLowerCase().includes(query) ?? false) ||
          s.patterns.some((p) => p.pattern.toLowerCase().includes(query))
        );
      })
    : incomeSources;

  // Group sources by person
  const sourcesByPerson = filteredSources.reduce((acc, source) => {
    const personKey = source.person?.id ?? 0;
    const personName = source.person?.name ?? "Other Income";

    if (!acc[personKey]) {
      acc[personKey] = {
        personId: personKey,
        personName,
        sources: [],
      };
    }

    acc[personKey].sources.push(source);
    return acc;
  }, {} as Record<number, { personId: number; personName: string; sources: IncomeSource[] }>);

  // Sort: named persons first (by name), "Other Income" last
  const sortedGroups = Object.values(sourcesByPerson).sort((a, b) => {
    if (a.personId === 0) return 1;
    if (b.personId === 0) return -1;
    return a.personName.localeCompare(b.personName);
  });

  const handleToggleStatus = async (source: IncomeSource) => {
    setPendingIds((prev) => new Set(prev).add(source.id));
    await toggleIncomeSourceStatus(source.id, !source.isActive);
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(source.id);
      return next;
    });
    toast.success(`Income source ${source.isActive ? "deactivated" : "activated"}`);
  };

  const handleDelete = async (source: IncomeSource) => {
    if (!confirm(`Are you sure you want to delete "${source.sourceName}"?`)) {
      return;
    }

    setPendingIds((prev) => new Set(prev).add(source.id));
    const result = await deleteIncomeSource(source.id);
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

  const calculateGroupMonthly = (sources: IncomeSource[]): number => {
    return sources.reduce((sum, s) => sum + calculateMonthly(s.currentNet, s.payFrequency), 0);
  };

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
        <IncomeSourceDialog />
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
            const monthlyTotal = calculateGroupMonthly(group.sources);

            return (
              <Card key={group.personId}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{group.personName}</CardTitle>
                      <CardDescription>
                        {formatCurrency(monthlyTotal)}/mo · {group.sources.length} source{group.sources.length !== 1 ? "s" : ""}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table className="table-fixed w-full">
                      <colgroup>
                        <col style={{ width: "28%" }} />
                        <col style={{ width: "12%" }} />
                        <col style={{ width: "14%" }} />
                        <col style={{ width: "14%" }} />
                        <col style={{ width: "16%" }} />
                        <col style={{ width: "8%" }} />
                        <col style={{ width: "8%" }} />
                      </colgroup>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Source</TableHead>
                          <TableHead>Frequency</TableHead>
                          <TableHead className="text-right">Net/Pay</TableHead>
                          <TableHead className="text-right">Annual</TableHead>
                          <TableHead>Account</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="p-0"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.sources.map((source) => {
                          const annualIncome = calculateAnnual(source.currentNet, source.payFrequency);

                          return (
                            <TableRow key={source.id}>
                              <TableCell>
                                <div className="flex flex-col">
                                  {source.website ? (
                                    <a
                                      href={source.website}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-medium hover:text-violet-600 hover:underline"
                                    >
                                      {source.sourceName}
                                    </a>
                                  ) : (
                                    <span className="font-medium">{source.sourceName}</span>
                                  )}
                                  {source.position && (
                                    <span className="text-xs text-muted-foreground truncate">
                                      {source.position}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
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
                              <TableCell>
                                {source.depositAccount ? (
                                  <span className="text-sm truncate block">
                                    {source.depositAccount.accountName}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
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
                              <TableCell className="p-0">
                                <div className="flex items-center justify-center gap-1">
                                  <IncomeHistoryDialog
                                    incomeSourceId={source.id}
                                    sourceName={source.sourceName}
                                    currentGross={source.currentGross}
                                    currentNet={source.currentNet}
                                  />
                                  <IncomeSourceEditButton incomeSource={source} />
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
                            </TableRow>
                          );
                        })}
                      </TableBody>
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
