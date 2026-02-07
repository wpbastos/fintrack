"use client";

import { useState, useMemo } from "react";
import { Store, Maximize2, Minimize2 } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { MerchantsPanel } from "./merchants-panel";
import { StatusFilter } from "./status-filter";
import { MerchantSmartFilter, resolveMerchantField, applyOp } from "./merchant-smart-filter";
import type { MerchantFilter } from "./merchant-smart-filter";
import type { MerchantStat } from "./types";
import { formatCompactCurrency } from "@/lib/format";

interface Category {
  id: number;
  name: string;
  color: string | null;
  group: { color: string | null } | null;
}

interface Pattern {
  id: number;
  pattern: string;
  priority: number;
  notes: string | null;
}

interface Merchant {
  id: number;
  name: string;
  type: string | null;
  categoryId: number | null;
  category: Category | null;
  website: string | null;
  isActive: boolean;
  notes: string | null;
  hasAlternative: boolean;
  alternativeName: string | null;
  alternativeSavings: number | null;
  patterns: Pattern[];
  _count: {
    transactions: number;
  };
}

interface MerchantsTabsProps {
  merchants: Merchant[];
  merchantStats: Record<number, MerchantStat>;
}

const tabs = [{ id: "merchants", label: "Merchants", icon: Store }] as const;

type TabId = (typeof tabs)[number]["id"];

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
};

const MAXIMIZE_BTN =
  "h-7 w-7 p-0 rounded-md text-slate-500 bg-slate-100 dark:text-slate-400 dark:bg-slate-700/50 shadow-[0_2px_0_0_rgba(100,116,139,0.3)] hover:bg-slate-200 hover:shadow-[0_0_8px_2px_rgba(100,116,139,0.3)] hover:scale-110 active:shadow-none active:scale-100 active:translate-y-[1px] transition-all duration-150 dark:hover:bg-slate-600/70 flex items-center justify-center";

export function MerchantsTabs({ merchants, merchantStats }: MerchantsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("merchants");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive">("active");
  const [smartFilters, setSmartFilters] = useState<MerchantFilter[]>([]);
  const [maximized, setMaximized] = useState<"spending" | "frequency" | null>(null);

  // =========================================================================
  // KPI computations
  // =========================================================================
  const monthSpent = useMemo(() => {
    return merchants
      .filter((m) => m.isActive)
      .reduce((sum, m) => sum + Math.abs(merchantStats[m.id]?.monthAmount ?? 0), 0);
  }, [merchants, merchantStats]);

  const yearToDate = useMemo(() => {
    return merchants
      .filter((m) => m.isActive)
      .reduce((sum, m) => sum + Math.abs(merchantStats[m.id]?.yearAmount ?? 0), 0);
  }, [merchants, merchantStats]);

  const monthTxnCount = useMemo(() => {
    return merchants
      .filter((m) => m.isActive)
      .reduce((sum, m) => sum + (merchantStats[m.id]?.monthCount ?? 0), 0);
  }, [merchants, merchantStats]);

  const avgTransaction = monthTxnCount > 0 ? monthSpent / monthTxnCount : 0;

  const totalSpent = useMemo(() => {
    return merchants
      .filter((m) => m.isActive)
      .reduce((sum, m) => sum + Math.abs(merchantStats[m.id]?.totalAmount ?? 0), 0);
  }, [merchants, merchantStats]);

  // =========================================================================
  // Chart data: Top 10 Merchants by Month Spending
  // =========================================================================
  const topMerchantsData = useMemo(() => {
    return merchants
      .filter((m) => m.isActive && (merchantStats[m.id]?.monthCount ?? 0) > 0)
      .map((m) => ({
        name: m.name,
        amount: Math.abs(merchantStats[m.id]?.monthAmount ?? 0),
        color: m.category?.color || m.category?.group?.color || "#6366f1",
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [merchants, merchantStats]);

  // =========================================================================
  // Chart data: Top 10 Most Frequent Merchants
  // =========================================================================
  const mostFrequentData = useMemo(() => {
    return merchants
      .filter((m) => m.isActive && (merchantStats[m.id]?.monthCount ?? 0) > 0)
      .map((m) => ({
        name: m.name,
        count: merchantStats[m.id]?.monthCount ?? 0,
        color: m.category?.color || m.category?.group?.color || "#6366f1",
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [merchants, merchantStats]);

  // =========================================================================
  // Filtering
  // =========================================================================
  const statusFiltered = merchants.filter((m) =>
    statusFilter === "active" ? m.isActive : !m.isActive
  );

  const filteredMerchants = smartFilters.length === 0
    ? statusFiltered
    : statusFiltered.filter((m) => {
        const stat = merchantStats[m.id] ?? {
          totalCount: 0, totalAmount: 0,
          yearCount: 0, yearAmount: 0,
          monthCount: 0, monthAmount: 0,
        };
        return smartFilters.every((f) => {
          const actual = resolveMerchantField(f.field, stat);
          return applyOp(f.op, actual, f.value, f.value2);
        });
      });

  const spendingChartHeight = maximized === "spending"
    ? 400
    : Math.max(200, topMerchantsData.length * 44);

  const frequencyChartHeight = maximized === "frequency"
    ? 400
    : Math.max(200, mostFrequentData.length * 44);

  return (
    <>
      {/* Financial KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Month Spent</CardDescription>
            <CardTitle className="text-2xl text-amber-600">
              {formatCompactCurrency(monthSpent)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Year to Date</CardDescription>
            <CardTitle className="text-2xl text-blue-600">
              {formatCompactCurrency(yearToDate)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Spent</CardDescription>
            <CardTitle className="text-2xl text-violet-600">
              {formatCompactCurrency(totalSpent)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Transaction</CardDescription>
            <CardTitle className="text-2xl text-slate-600">
              {formatCompactCurrency(avgTransaction)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Charts: Spending + Frequency */}
      <div className={`grid gap-6 ${maximized ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"}`}>
        {/* Chart A: Top Merchants by Spending */}
        {(maximized === null || maximized === "spending") && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Top Merchants by Spending</h3>
              <button
                onClick={() => setMaximized(maximized === "spending" ? null : "spending")}
                className={MAXIMIZE_BTN}
                title={maximized === "spending" ? "Minimize" : "Maximize"}
              >
                {maximized === "spending" ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>
            {topMerchantsData.length > 0 ? (
              <div style={{ width: "100%", height: spendingChartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topMerchantsData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                      tickFormatter={(v) => formatCompactCurrency(v)}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                      width={140}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(value) => [
                        formatCompactCurrency((value as number) ?? 0),
                        "Spent",
                      ]}
                    />
                    <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={20}>
                      {topMerchantsData.map((entry, index) => (
                        <Cell key={`spending-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                No merchant spending this month
              </div>
            )}
          </div>
        )}

        {/* Chart B: Most Frequent Merchants */}
        {(maximized === null || maximized === "frequency") && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Most Frequent Merchants</h3>
              <button
                onClick={() => setMaximized(maximized === "frequency" ? null : "frequency")}
                className={MAXIMIZE_BTN}
                title={maximized === "frequency" ? "Minimize" : "Maximize"}
              >
                {maximized === "frequency" ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>
            {mostFrequentData.length > 0 ? (
              <div style={{ width: "100%", height: frequencyChartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={mostFrequentData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                      width={140}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(value) => [
                        `${value}`,
                        "Transactions",
                      ]}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                      {mostFrequentData.map((entry, index) => (
                        <Cell key={`freq-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                No merchant transactions this month
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter and Tabs */}
      <div className="flex items-center justify-between">
        {/* Tab Navigation */}
        <div className="border-b">
          <nav className="-mb-px flex gap-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors
                    ${
                      isActive
                        ? "border-violet-600 text-violet-600"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  <span
                    className={`
                      ml-1 rounded-full px-2 py-0.5 text-xs
                      ${isActive ? "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200" : "bg-muted"}
                    `}
                  >
                    {filteredMerchants.length}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <MerchantSmartFilter filters={smartFilters} onChange={setSmartFilters} />
          <StatusFilter value={statusFilter} onChange={setStatusFilter} />
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "merchants" && <MerchantsPanel merchants={filteredMerchants} merchantStats={merchantStats} />}
      </div>
    </>
  );
}
