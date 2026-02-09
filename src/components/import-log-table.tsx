"use client";

import { useState, Fragment, useCallback, useMemo, useTransition } from "react";
import { ChevronDown, ChevronRight, FileJson, Trash2, Maximize2, Minimize2 } from "lucide-react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteImport } from "@/app/log/actions";
import { JsonContentDialog } from "@/components/json-viewer";
import { formatCurrency } from "@/lib/format";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface Account {
  id: number;
  name: string;
  institution: { name: string } | null;
}

interface Import {
  id: number;
  fileName: string;
  sourceType: string;
  accountId: number | null;
  account: Account | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  openingBalance: number | null;
  closingBalance: number | null;
  transactionCount: number;
  addedCount: number;
  matchedCount: number;
  unknownCount: number;
  content: string | null;
  status: string;
  processedAt: Date | null;
  aiStatus: string;
  aiStartedAt: Date | null;
  createdAt: Date;
  // PDF extraction metrics
  extractDurationMs: number | null;
  extractCostUsd: number | null;
  extractInputTokens: number | null;
  extractOutputTokens: number | null;
  extractCacheTokens: number | null;
  extractPdfSizeBytes: number | null;
}

interface ImportTableProps {
  logs: Import[];
}

function getSourceTypeBadge(type: string) {
  const styles: Record<string, string> = {
    Statement: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
    CSV: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
    OFX: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    QFX: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    QIF: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${styles[type] ?? "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"}`}>
      {type}
    </span>
  );
}

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    staged: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    finalized: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    failed: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"}`}>
      {status}
    </span>
  );
}

function getAiStatusBadge(status: string) {
  const styles: Record<string, string> = {
    idle: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    resolving: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    complete: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    error: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.idle}`}>
      {status}
    </span>
  );
}

function formatNullableCurrency(amount: number | null) {
  if (amount === null) return "\u2014";
  return formatCurrency(amount);
}

function formatDate(date: Date | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(date: Date | null) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ContentDialog({ content, fileName }: { content: string | null; fileName: string }) {
  const [open, setOpen] = useState(false);

  if (!content) return <span className="text-muted-foreground text-xs">—</span>;

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0 rounded-md text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/50 shadow-[0_2px_0_0_rgba(99,102,241,0.4)] hover:bg-indigo-100 hover:shadow-[0_0_8px_2px_rgba(99,102,241,0.4)] hover:scale-110 active:shadow-none active:scale-100 active:translate-y-[1px] transition-all duration-150 dark:hover:bg-indigo-900/70"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        title="View JSON content"
      >
        <FileJson className="h-4 w-4" />
      </Button>
      <JsonContentDialog
        content={content}
        description={fileName}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

function DeleteImportButton({ importId, fileName, status }: { importId: number; fileName: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Only show delete button for staged imports
  if (status === "finalized") {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await deleteImport(importId);
      if (result.success) {
        toast.success("Import deleted");
      } else {
        toast.error(result.error || "Failed to delete import");
      }
    });
  };

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0 rounded-md text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/50 shadow-[0_2px_0_0_rgba(244,63,94,0.4)] hover:bg-rose-100 hover:shadow-[0_0_8px_2px_rgba(244,63,94,0.4)] hover:scale-110 active:shadow-none active:scale-100 active:translate-y-[1px] transition-all duration-150 dark:hover:bg-rose-900/70 disabled:opacity-50 disabled:shadow-[0_2px_0_0_rgba(244,63,94,0.2)] disabled:hover:scale-100 disabled:hover:shadow-[0_2px_0_0_rgba(244,63,94,0.2)]"
        onClick={handleClick}
        disabled={isPending}
        title="Delete import"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete Import"
        description={`Delete import "${fileName}" and all its staging transactions?`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleConfirm}
      />
    </>
  );
}

type TimeFilter = "year" | "all";
type StatusFilter = "all" | "staged" | "finalized";

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
        active
          ? "bg-white dark:bg-slate-800 shadow-sm text-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function TimeFilterButtons({ value, onChange }: { value: TimeFilter; onChange: (value: TimeFilter) => void }) {
  return (
    <div className="inline-flex rounded-lg border p-1 bg-muted/50">
      <FilterButton active={value === "year"} onClick={() => onChange("year")}>
        This Year
      </FilterButton>
      <FilterButton active={value === "all"} onClick={() => onChange("all")}>
        All Time
      </FilterButton>
    </div>
  );
}

function StatusFilterButtons({ value, onChange }: { value: StatusFilter; onChange: (value: StatusFilter) => void }) {
  return (
    <div className="inline-flex rounded-lg border p-1 bg-muted/50">
      <FilterButton active={value === "all"} onClick={() => onChange("all")}>
        All
      </FilterButton>
      <FilterButton active={value === "staged"} onClick={() => onChange("staged")}>
        Staged
      </FilterButton>
      <FilterButton active={value === "finalized"} onClick={() => onChange("finalized")}>
        Finalized
      </FilterButton>
    </div>
  );
}

interface AccountOption {
  id: number;
  name: string;
  institution: string | null;
}

function AccountFilterSelect({
  accounts,
  value,
  onChange,
}: {
  accounts: AccountOption[];
  value: number | "all";
  onChange: (value: number | "all") => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value === "all" ? "all" : parseInt(e.target.value, 10))}
      className="h-9 rounded-lg border bg-muted/50 px-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <option value="all">All Accounts</option>
      {accounts.map((account) => (
        <option key={account.id} value={account.id}>
          {account.name}{account.institution ? ` (${account.institution})` : ""}
        </option>
      ))}
    </select>
  );
}

interface ChartData {
  id: number;
  label: string;
  account: string;
  periodEnd: string;
  transactions: number;
  matched: number;
  unknown: number;
  opening: number;
  closing: number;
  difference: number;
}

function formatChartCurrency(value: number) {
  return value.toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

type MaximizedChart = "volume" | "balance" | null;
type VolumeBarFilter = "all" | "transactions" | "matched" | "unknown";
type BalanceBarFilter = "all" | "opening" | "difference" | "closing";

function ImportEvolutionChart({
  logs,
  selectedId,
  onSelectId
}: {
  logs: Import[];
  selectedId: number | null;
  onSelectId: (id: number | null) => void;
}) {
  const [maximized, setMaximized] = useState<MaximizedChart>(null);
  const [volumeFilter, setVolumeFilter] = useState<VolumeBarFilter>("all");
  const [balanceFilter, setBalanceFilter] = useState<BalanceBarFilter>("all");

  const toggleVolumeFilter = (bar: VolumeBarFilter) => {
    setVolumeFilter(volumeFilter === bar ? "all" : bar);
  };

  const toggleBalanceFilter = (bar: BalanceBarFilter) => {
    setBalanceFilter(balanceFilter === bar ? "all" : bar);
  };

  // Each import is its own bar, sorted by period end date
  const chartData = useMemo(() => {
    // Sort logs by periodEnd date ascending
    const sortedLogs = [...logs].sort((a, b) => {
      const dateA = a.periodEnd ? new Date(a.periodEnd).getTime() : 0;
      const dateB = b.periodEnd ? new Date(b.periodEnd).getTime() : 0;
      return dateA - dateB;
    });

    return sortedLogs.map((log) => {
      const periodEnd = log.periodEnd ? new Date(log.periodEnd) : null;
      const accountName = log.account?.name ?? "Unknown";

      return {
        id: log.id,
        label: `#${log.id}`,
        account: accountName,
        periodEnd: periodEnd?.toISOString() ?? "",
        transactions: log.transactionCount,
        matched: log.matchedCount,
        unknown: log.unknownCount,
        opening: log.openingBalance ?? 0,
        closing: log.closingBalance ?? 0,
        difference: (log.closingBalance ?? 0) - (log.openingBalance ?? 0),
      };
    });
  }, [logs]);

  const handleBarClick = (data: { payload?: ChartData }) => {
    const payload = data?.payload;
    if (!payload) return;

    if (selectedId === payload.id) {
      onSelectId(null); // Deselect if clicking the same bar
    } else {
      onSelectId(payload.id);
    }
  };

  const chartHeight = maximized ? 400 : 256;

  return (
    <div className={`grid gap-6 ${maximized ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"}`}>
        {/* Transaction Volume Chart */}
        {(maximized === null || maximized === "volume") && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Transaction Volume</h3>
            <button
              onClick={() => setMaximized(maximized === "volume" ? null : "volume")}
              className="h-7 w-7 p-0 rounded-md text-slate-500 bg-slate-100 dark:text-slate-400 dark:bg-slate-700/50 shadow-[0_2px_0_0_rgba(100,116,139,0.3)] hover:bg-slate-200 hover:shadow-[0_0_8px_2px_rgba(100,116,139,0.3)] hover:scale-110 active:shadow-none active:scale-100 active:translate-y-[1px] transition-all duration-150 dark:hover:bg-slate-600/70 flex items-center justify-center"
              title={maximized === "volume" ? "Minimize" : "Maximize"}
            >
              {maximized === "volume" ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
          <div style={{ width: "100%", height: chartHeight }}>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  labelFormatter={(label) => label}
                  formatter={(value, name) => [
                    (value as number).toLocaleString(),
                    name === "transactions" ? "Total" : name === "matched" ? "Matched" : "Unknown",
                  ]}
                  itemSorter={(item) => {
                    const order: Record<string, number> = { transactions: 0, matched: 1, unknown: 2 };
                    return order[item.dataKey as string] ?? 0;
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  content={() => (
                    <div className="flex justify-center gap-6 text-sm mb-2">
                      <button
                        onClick={() => toggleVolumeFilter("transactions")}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-all ${
                          volumeFilter === "transactions" ? "bg-indigo-100 dark:bg-indigo-900/50 ring-1 ring-indigo-300" : "hover:bg-slate-100 dark:hover:bg-slate-700"
                        }`}
                      >
                        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#6366f1" }} />
                        <span style={{ color: "#6366f1" }}>Total</span>
                      </button>
                      <button
                        onClick={() => toggleVolumeFilter("matched")}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-all ${
                          volumeFilter === "matched" ? "bg-emerald-100 dark:bg-emerald-900/50 ring-1 ring-emerald-300" : "hover:bg-slate-100 dark:hover:bg-slate-700"
                        }`}
                      >
                        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#10b981" }} />
                        <span style={{ color: "#10b981" }}>Matched</span>
                      </button>
                      <button
                        onClick={() => toggleVolumeFilter("unknown")}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-all ${
                          volumeFilter === "unknown" ? "bg-amber-100 dark:bg-amber-900/50 ring-1 ring-amber-300" : "hover:bg-slate-100 dark:hover:bg-slate-700"
                        }`}
                      >
                        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#f59e0b" }} />
                        <span style={{ color: "#f59e0b" }}>Unknown</span>
                      </button>
                    </div>
                  )}
                />
                {(volumeFilter === "all" || volumeFilter === "transactions") && (
                <Bar dataKey="transactions" radius={[4, 4, 0, 0]} name="transactions" onClick={handleBarClick} cursor="pointer">
                  {chartData.map((entry) => (
                    <Cell key={entry.id} fill="#6366f1" opacity={selectedId === null || selectedId === entry.id ? 1 : 0.3} />
                  ))}
                </Bar>
                )}
                {(volumeFilter === "all" || volumeFilter === "matched") && (
                <Bar dataKey="matched" radius={[4, 4, 0, 0]} name="matched" onClick={handleBarClick} cursor="pointer">
                  {chartData.map((entry) => (
                    <Cell key={entry.id} fill="#10b981" opacity={selectedId === null || selectedId === entry.id ? 1 : 0.3} />
                  ))}
                </Bar>
                )}
                {(volumeFilter === "all" || volumeFilter === "unknown") && (
                <Bar dataKey="unknown" radius={[4, 4, 0, 0]} name="unknown" onClick={handleBarClick} cursor="pointer">
                  {chartData.map((entry) => (
                    <Cell key={entry.id} fill="#f59e0b" opacity={selectedId === null || selectedId === entry.id ? 1 : 0.3} />
                  ))}
                </Bar>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        )}

        {/* Balance Evolution Chart */}
        {(maximized === null || maximized === "balance") && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Balance Evolution</h3>
            <button
              onClick={() => setMaximized(maximized === "balance" ? null : "balance")}
              className="h-7 w-7 p-0 rounded-md text-slate-500 bg-slate-100 dark:text-slate-400 dark:bg-slate-700/50 shadow-[0_2px_0_0_rgba(100,116,139,0.3)] hover:bg-slate-200 hover:shadow-[0_0_8px_2px_rgba(100,116,139,0.3)] hover:scale-110 active:shadow-none active:scale-100 active:translate-y-[1px] transition-all duration-150 dark:hover:bg-slate-600/70 flex items-center justify-center"
              title={maximized === "balance" ? "Minimize" : "Maximize"}
            >
              {maximized === "balance" ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
          <div style={{ width: "100%", height: chartHeight }}>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  width={60}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  labelFormatter={(label) => label}
                  formatter={(value, name) => [
                    formatChartCurrency(value as number),
                    name === "opening" ? "Opening" : name === "difference" ? "Net Change" : "Closing",
                  ]}
                  itemSorter={(item) => {
                    const order: Record<string, number> = { opening: 0, difference: 1, closing: 2 };
                    return order[item.dataKey as string] ?? 0;
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  content={() => (
                    <div className="flex justify-center gap-6 text-sm mb-2">
                      <button
                        onClick={() => toggleBalanceFilter("opening")}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-all ${
                          balanceFilter === "opening" ? "bg-slate-200 dark:bg-slate-600/50 ring-1 ring-slate-400" : "hover:bg-slate-100 dark:hover:bg-slate-700"
                        }`}
                      >
                        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#94a3b8" }} />
                        <span style={{ color: "#94a3b8" }}>Opening</span>
                      </button>
                      <button
                        onClick={() => toggleBalanceFilter("difference")}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-all ${
                          balanceFilter === "difference" ? "bg-emerald-100 dark:bg-emerald-900/50 ring-1 ring-emerald-300" : "hover:bg-slate-100 dark:hover:bg-slate-700"
                        }`}
                      >
                        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#10b981" }} />
                        <span style={{ color: "#10b981" }}>Net Change</span>
                      </button>
                      <button
                        onClick={() => toggleBalanceFilter("closing")}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-all ${
                          balanceFilter === "closing" ? "bg-blue-100 dark:bg-blue-900/50 ring-1 ring-blue-300" : "hover:bg-slate-100 dark:hover:bg-slate-700"
                        }`}
                      >
                        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#3b82f6" }} />
                        <span style={{ color: "#3b82f6" }}>Closing</span>
                      </button>
                    </div>
                  )}
                />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                {(balanceFilter === "all" || balanceFilter === "opening") && (
                <Bar dataKey="opening" radius={[4, 4, 0, 0]} name="opening" onClick={handleBarClick} cursor="pointer">
                  {chartData.map((entry) => (
                    <Cell key={entry.id} fill="#94a3b8" opacity={selectedId === null || selectedId === entry.id ? 1 : 0.3} />
                  ))}
                </Bar>
                )}
                {(balanceFilter === "all" || balanceFilter === "difference") && (
                <Bar dataKey="difference" radius={[4, 4, 0, 0]} name="difference" onClick={handleBarClick} cursor="pointer">
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.id}
                      fill={entry.difference >= 0 ? "#10b981" : "#f43f5e"}
                      opacity={selectedId === null || selectedId === entry.id ? 1 : 0.3}
                    />
                  ))}
                </Bar>
                )}
                {(balanceFilter === "all" || balanceFilter === "closing") && (
                <Bar dataKey="closing" radius={[4, 4, 0, 0]} name="closing" onClick={handleBarClick} cursor="pointer">
                  {chartData.map((entry) => (
                    <Cell key={entry.id} fill="#3b82f6" opacity={selectedId === null || selectedId === entry.id ? 1 : 0.3} />
                  ))}
                </Bar>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        )}
    </div>
  );
}

export function ImportTable({ logs }: ImportTableProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("year");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [accountFilter, setAccountFilter] = useState<number | "all">("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleSelectId = useCallback((id: number | null) => {
    setSelectedId(id);
  }, []);

  // Extract unique accounts from logs
  const accounts = useMemo(() => {
    const accountMap = new Map<number, AccountOption>();
    logs.forEach((log) => {
      if (log.account) {
        accountMap.set(log.account.id, {
          id: log.account.id,
          name: log.account.name,
          institution: log.account.institution?.name ?? null,
        });
      }
    });
    return Array.from(accountMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [logs]);

  // Filter and sort logs based on all filters
  const currentYear = new Date().getFullYear();
  const filteredLogs = useMemo(() => {
    const filtered = logs.filter((log) => {
      // Time filter
      if (timeFilter === "year" && new Date(log.createdAt).getFullYear() !== currentYear) {
        return false;
      }
      // Status filter
      if (statusFilter !== "all" && log.status !== statusFilter) {
        return false;
      }
      // Account filter
      if (accountFilter !== "all" && log.accountId !== accountFilter) {
        return false;
      }
      return true;
    });

    // Sort by periodEnd date ascending
    return filtered.sort((a, b) => {
      const dateA = a.periodEnd ? new Date(a.periodEnd).getTime() : 0;
      const dateB = b.periodEnd ? new Date(b.periodEnd).getTime() : 0;
      return dateA - dateB;
    });
  }, [logs, timeFilter, statusFilter, accountFilter, currentYear]);

  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import History</CardTitle>
          <CardDescription>Review your imported statement files</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No imports yet. Go to Import to upload your first statement.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Evolution Charts */}
      <ImportEvolutionChart logs={filteredLogs} selectedId={selectedId} onSelectId={handleSelectId} />

      {/* Filters Row - Right aligned */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase">Time</span>
          <TimeFilterButtons value={timeFilter} onChange={setTimeFilter} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase">Status</span>
          <StatusFilterButtons value={statusFilter} onChange={setStatusFilter} />
        </div>
        {accounts.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase">Account</span>
            <AccountFilterSelect accounts={accounts} value={accountFilter} onChange={setAccountFilter} />
          </div>
        )}
      </div>

      {/* Import History Table */}
      <div className="rounded-md border">
      <Table className="table-fixed w-full">
        <colgroup>
          <col style={{ width: "3%" }} />
          <col style={{ width: "5%" }} />
          <col style={{ width: "24%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "20%" }} />
          <col style={{ width: "20%" }} />
          <col style={{ width: "6%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "6%" }} />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead className="p-0"></TableHead>
            <TableHead className="text-center">ID</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Balance</TableHead>
            <TableHead className="text-center">Txns</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredLogs.map((log) => {
            const isExpanded = expandedId === log.id;
            const balanceChange = log.openingBalance !== null && log.closingBalance !== null
              ? log.closingBalance - log.openingBalance
              : null;

            const isSelected = selectedId === log.id;

            return (
              <Fragment key={log.id}>
                <TableRow
                  className={`cursor-pointer hover:bg-muted/50 transition-opacity ${
                    selectedId !== null && !isSelected ? "opacity-40" : ""
                  } ${isSelected ? "bg-indigo-50 dark:bg-indigo-950/30" : ""}`}
                  onClick={() => toggleExpand(log.id)}
                >
                  <TableCell className="p-0 pl-2">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-200 dark:bg-slate-700 hover:bg-indigo-100 dark:hover:bg-indigo-900"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectId(isSelected ? null : log.id);
                      }}
                      title={isSelected ? "Click to deselect" : "Click to select"}
                    >
                      {log.id}
                    </span>
                  </TableCell>
                  <TableCell>
                    {log.account ? (
                      <div className="flex flex-col">
                        <span className="font-medium">{log.account.name}</span>
                        {log.account.institution && (
                          <span className="text-xs text-muted-foreground">
                            {log.account.institution.name}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{getSourceTypeBadge(log.sourceType)}</TableCell>
                  <TableCell className="text-sm">
                    {log.periodStart && log.periodEnd ? (
                      <span className="text-muted-foreground">
                        {formatDate(log.periodStart)} → {formatDate(log.periodEnd)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {log.openingBalance !== null && log.closingBalance !== null ? (
                      <span className="font-mono text-sm">
                        {formatNullableCurrency(log.openingBalance)} → {formatNullableCurrency(log.closingBalance)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      {log.transactionCount > 0 ? (
                        <div className="relative w-9 h-9">
                          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                            <circle
                              cx="18" cy="18" r="15.9"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              className="text-slate-100 dark:text-slate-700"
                            />
                            {log.matchedCount > 0 && (
                              <circle
                                cx="18" cy="18" r="15.9"
                                fill="none"
                                stroke="#10b981"
                                strokeWidth="3"
                                strokeDasharray={`${(log.matchedCount / log.transactionCount) * 100} 100`}
                                strokeDashoffset="0"
                              />
                            )}
                            {log.unknownCount > 0 && (
                              <circle
                                cx="18" cy="18" r="15.9"
                                fill="none"
                                stroke="#f59e0b"
                                strokeWidth="3"
                                strokeDasharray={`${(log.unknownCount / log.transactionCount) * 100} 100`}
                                strokeDashoffset={`${-((log.matchedCount / log.transactionCount) * 100)}`}
                              />
                            )}
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[10px] font-bold">{log.transactionCount}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{getStatusBadge(log.status)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <ContentDialog content={log.content} fileName={log.fileName} />
                      <DeleteImportButton importId={log.id} fileName={log.fileName} status={log.status} />
                    </div>
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow key={`${log.id}-details`}>
                    <TableCell colSpan={9} className="bg-muted/20 p-4">
                      {/* Header with filename */}
                      <div className="flex items-center gap-3 mb-4">
                        <div>
                          <p className="font-medium">{log.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            Imported {formatDateTime(log.createdAt)}
                            {log.processedAt && ` · Processed ${formatDateTime(log.processedAt)}`}
                          </p>
                        </div>
                      </div>

                      {/* Stats cards - horizontal layout */}
                      <div className="flex flex-wrap gap-4">
                        {/* Transactions Card with Pie Chart - smaller fixed width */}
                        <div className="bg-white dark:bg-slate-800 rounded-lg border p-4 w-[200px] shrink-0">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Transactions</p>
                          <div className="flex items-center gap-3">
                            {/* Pie Chart */}
                            {log.transactionCount > 0 ? (
                              <div className="relative w-16 h-16 shrink-0">
                                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                  <circle
                                    cx="18" cy="18" r="15.9"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    className="text-slate-100 dark:text-slate-700"
                                  />
                                  {log.matchedCount > 0 && (
                                    <circle
                                      cx="18" cy="18" r="15.9"
                                      fill="none"
                                      stroke="#10b981"
                                      strokeWidth="3"
                                      strokeDasharray={`${(log.matchedCount / log.transactionCount) * 100} 100`}
                                      strokeDashoffset="0"
                                    />
                                  )}
                                  {log.unknownCount > 0 && (
                                    <circle
                                      cx="18" cy="18" r="15.9"
                                      fill="none"
                                      stroke="#f59e0b"
                                      strokeWidth="3"
                                      strokeDasharray={`${(log.unknownCount / log.transactionCount) * 100} 100`}
                                      strokeDashoffset={`${-((log.matchedCount / log.transactionCount) * 100)}`}
                                    />
                                  )}
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-sm font-bold">{log.transactionCount}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                <span className="text-sm font-bold text-muted-foreground">0</span>
                              </div>
                            )}
                            {/* Legend */}
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-xs"><span className="font-semibold">{log.matchedCount}</span> <span className="text-muted-foreground">matched</span></span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                <span className="text-xs"><span className="font-semibold">{log.unknownCount}</span> <span className="text-muted-foreground">unknown</span></span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Balance Card - Opening → Closing, Change below, vertically centered */}
                        <div className="bg-white dark:bg-slate-800 rounded-lg border p-4 flex-1 min-w-[280px] flex flex-col">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Balance</p>
                          <div className="flex-1 flex flex-col items-center justify-center">
                            <div className="flex items-center justify-between w-full">
                              <div>
                                <p className="text-xs text-muted-foreground">Opening</p>
                                <p className="font-mono font-medium">{formatNullableCurrency(log.openingBalance)}</p>
                              </div>
                              <div className="text-muted-foreground text-xl">→</div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Closing</p>
                                <p className="font-mono font-medium">{formatNullableCurrency(log.closingBalance)}</p>
                              </div>
                            </div>
                            {balanceChange !== null && (
                              <p className={`font-mono font-semibold mt-2 ${balanceChange >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                {balanceChange >= 0 ? "+" : ""}{formatCurrency(balanceChange)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* AI Status Card */}
                        <div className="bg-white dark:bg-slate-800 rounded-lg border p-4 flex-1 min-w-[280px]">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">AI Processing</p>
                          {/* PDF Extraction Metrics */}
                          {log.extractDurationMs !== null && (
                            <div className="space-y-2 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                              <p className="text-xs font-medium text-purple-600 dark:text-purple-400">PDF Extraction</p>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">Duration</span>
                                  <span className="font-mono">{(log.extractDurationMs / 1000).toFixed(1)}s</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">Cost</span>
                                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                                    ${log.extractCostUsd?.toFixed(4) ?? "—"}
                                  </span>
                                </div>
                                {(log.extractInputTokens !== null || log.extractOutputTokens !== null) && (
                                  <>
                                    <div className="flex items-center justify-between">
                                      <span className="text-muted-foreground">Input</span>
                                      <span className="font-mono text-xs">
                                        {log.extractInputTokens?.toLocaleString() ?? "—"} tok
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-muted-foreground">Output</span>
                                      <span className="font-mono text-xs">
                                        {log.extractOutputTokens?.toLocaleString() ?? "—"} tok
                                      </span>
                                    </div>
                                  </>
                                )}
                                {log.extractPdfSizeBytes !== null && (
                                  <div className="flex items-center justify-between col-span-2">
                                    <span className="text-muted-foreground">PDF Size</span>
                                    <span className="font-mono text-xs">
                                      {(log.extractPdfSizeBytes / 1024).toFixed(0)} KB
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          {/* AI Resolution Status */}
                          {log.aiStatus === "idle" && !log.extractDurationMs ? (
                            <div className="flex items-center justify-center h-12 text-muted-foreground text-sm">
                              Not started
                            </div>
                          ) : log.aiStatus !== "idle" ? (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Resolution</p>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Status</span>
                                {getAiStatusBadge(log.aiStatus)}
                              </div>
                              {log.aiStartedAt && (
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-muted-foreground">Started</span>
                                  <span className="text-sm">{formatDateTime(log.aiStartedAt)}</span>
                                </div>
                              )}
                            </div>
                          ) : null}
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
    </div>
  );
}
