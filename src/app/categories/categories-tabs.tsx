"use client";

import { useState, useMemo } from "react";
import { Tags, Maximize2, Minimize2 } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { CategoriesPanel } from "./categories-panel";
import { StatusFilter } from "./status-filter";
import { SmartFilter, resolveField, applyOp } from "./smart-filter";
import type { CategoryFilter } from "./smart-filter";
import { formatCompactCurrency } from "@/lib/format";

interface Category {
  id: number;
  name: string;
  color: string | null;
  necessityLevel: string;
  monthlyBudget: number | null;
  isActive: boolean;
  notes: string | null;
  children?: Category[];
}

interface CategoryGroup {
  id: number;
  name: string;
  type: string;
  color: string | null;
  notes: string | null;
  categories: Category[];
}

interface CategoriesTabsProps {
  groups: CategoryGroup[];
  categoryStats: Record<number, { totalCount: number; totalAmount: number; yearCount: number; yearAmount: number; monthCount: number; monthAmount: number }>;
  budgetStats: Record<number, { spentThisMonth: number }>;
}

const tabs = [
  { id: "categories", label: "Categories", icon: Tags },
] as const;

type TabId = (typeof tabs)[number]["id"];

// Count all categories including children
function countCategories(categories: Category[]): number {
  return categories.reduce((sum, cat) => {
    const childCount = cat.children?.length ?? 0;
    return sum + 1 + childCount;
  }, 0);
}

// Calculate budget (if has children, sum children's budgets; otherwise use own budget)
function getEffectiveBudget(category: Category): number | null {
  if (category.children && category.children.length > 0) {
    const childBudgets = category.children
      .filter((c) => c.isActive)
      .map((c) => c.monthlyBudget ?? 0);
    if (childBudgets.length === 0) return null;
    return childBudgets.reduce((sum, b) => sum + b, 0);
  }
  return category.monthlyBudget;
}

function sumBudgets(categories: Category[]): number {
  return categories
    .filter((cat) => cat.isActive)
    .reduce((sum, cat) => sum + (getEffectiveBudget(cat) ?? 0), 0);
}

// Sum spent for a category (handles parent-child)
function sumCategorySpent(cat: Category, budgetStats: Record<number, { spentThisMonth: number }>): number {
  if (!cat.isActive) return 0;
  if (cat.children && cat.children.length > 0) {
    return cat.children
      .filter((c) => c.isActive)
      .reduce((s, c) => s + (budgetStats[c.id]?.spentThisMonth ?? 0), 0);
  }
  return budgetStats[cat.id]?.spentThisMonth ?? 0;
}

// Sum yearAmount for a category (handles parent-child)
function sumCategoryYearAmount(cat: Category, categoryStats: Record<number, { yearAmount: number }>): number {
  if (cat.children && cat.children.length > 0) {
    return cat.children.reduce((s, c) => s + Math.abs(categoryStats[c.id]?.yearAmount ?? 0), 0);
  }
  return Math.abs(categoryStats[cat.id]?.yearAmount ?? 0);
}

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
};

const MAXIMIZE_BTN = "h-7 w-7 p-0 rounded-md text-slate-500 bg-slate-100 dark:text-slate-400 dark:bg-slate-700/50 shadow-[0_2px_0_0_rgba(100,116,139,0.3)] hover:bg-slate-200 hover:shadow-[0_0_8px_2px_rgba(100,116,139,0.3)] hover:scale-110 active:shadow-none active:scale-100 active:translate-y-[1px] transition-all duration-150 dark:hover:bg-slate-600/70 flex items-center justify-center";

export function CategoriesTabs({ groups, categoryStats, budgetStats }: CategoriesTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("categories");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive">("active");
  const [smartFilters, setSmartFilters] = useState<CategoryFilter[]>([]);
  const [maximized, setMaximized] = useState<"budget" | "donut" | null>(null);

  // =========================================================================
  // KPI computations
  // =========================================================================
  const totalBudget = groups
    .filter((g) => g.type === "Expense")
    .reduce((sum, g) => sum + sumBudgets(g.categories), 0);

  const monthSpent = groups
    .filter((g) => g.type === "Expense")
    .reduce((sum, g) => sum + g.categories.reduce((cs, cat) => cs + sumCategorySpent(cat, budgetStats), 0), 0);

  const budgetRemaining = totalBudget - monthSpent;

  const overBudgetCount = groups
    .filter((g) => g.type === "Expense")
    .reduce((count, g) => {
      return count + g.categories.reduce((catCount, cat) => {
        if (!cat.isActive) return catCount;
        if (cat.children && cat.children.length > 0) {
          return catCount + cat.children.filter((c) => {
            if (!c.isActive || !c.monthlyBudget) return false;
            return (budgetStats[c.id]?.spentThisMonth ?? 0) > c.monthlyBudget;
          }).length;
        }
        const budget = getEffectiveBudget(cat);
        if (!budget) return catCount;
        return catCount + ((budgetStats[cat.id]?.spentThisMonth ?? 0) > budget ? 1 : 0);
      }, 0);
    }, 0);

  const yearToDate = groups
    .filter((g) => g.type === "Expense")
    .reduce((sum, g) => sum + g.categories.reduce((cs, cat) => cs + sumCategoryYearAmount(cat, categoryStats), 0), 0);

  // =========================================================================
  // Chart data
  // =========================================================================
  const budgetVsSpentData = useMemo(() => {
    return groups
      .filter((g) => g.type === "Expense")
      .map((g) => {
        const groupBudget = sumBudgets(g.categories);
        const groupSpent = g.categories.reduce((s, cat) => s + sumCategorySpent(cat, budgetStats), 0);
        return {
          name: g.name,
          budget: groupBudget,
          spent: groupSpent,
          color: g.color || "#6366f1",
          isOver: groupSpent > groupBudget && groupBudget > 0,
        };
      })
      .filter((d) => d.budget > 0);
  }, [groups, budgetStats]);

  const monthSpendingByGroup = useMemo(() => {
    return groups
      .filter((g) => g.type === "Expense")
      .map((g) => {
        const groupMonthSpent = g.categories.reduce((s, cat) => s + sumCategorySpent(cat, budgetStats), 0);
        return {
          name: g.name,
          value: groupMonthSpent,
          color: g.color || "#6366f1",
        };
      })
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [groups, budgetStats]);

  const donutTotal = monthSpendingByGroup.reduce((s, d) => s + d.value, 0);

  const monthIncomeByGroup = useMemo(() => {
    return groups
      .filter((g) => g.type === "Income")
      .map((g) => {
        const groupMonthIncome = g.categories
          .filter((cat) => cat.isActive)
          .reduce((s, cat) => {
            if (cat.children && cat.children.length > 0) {
              return s + cat.children
                .filter((c) => c.isActive)
                .reduce((cs, c) => cs + (categoryStats[c.id]?.monthAmount ?? 0), 0);
            }
            return s + (categoryStats[cat.id]?.monthAmount ?? 0);
          }, 0);
        return { name: g.name, value: groupMonthIncome, color: g.color || "#10b981" };
      })
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [groups, categoryStats]);

  const incomeTotal = monthIncomeByGroup.reduce((s, d) => s + d.value, 0);
  const netAmount = incomeTotal - donutTotal;

  // =========================================================================
  // Category filtering
  // =========================================================================
  const statusFiltered = groups.map((group) => ({
    ...group,
    categories: group.categories
      .map((cat) => ({
        ...cat,
        children: cat.children?.filter((child) =>
          statusFilter === "active" ? child.isActive : !child.isActive
        ),
      }))
      .filter((cat) => {
        const matchesFilter = statusFilter === "active" ? cat.isActive : !cat.isActive;
        const hasMatchingChildren = (cat.children?.length ?? 0) > 0;
        return matchesFilter || hasMatchingChildren;
      }),
  }));

  function categoryMatchesFilters(catId: number, budget: number | null): boolean {
    if (smartFilters.length === 0) return true;
    const stat = categoryStats[catId] ?? { totalCount: 0, totalAmount: 0, yearCount: 0, yearAmount: 0, monthCount: 0, monthAmount: 0 };
    const spent = budgetStats[catId]?.spentThisMonth ?? 0;
    return smartFilters.every((f) => {
      const actual = resolveField(f.field, stat, budget, spent);
      if (actual === null) return false;
      return applyOp(f.op, actual, f.value, f.value2);
    });
  }

  const filteredGroups = smartFilters.length === 0
    ? statusFiltered
    : statusFiltered.map((group) => ({
        ...group,
        categories: group.categories
          .map((cat) => ({
            ...cat,
            children: cat.children?.filter((child) =>
              categoryMatchesFilters(child.id, child.monthlyBudget)
            ),
          }))
          .filter((cat) => {
            const hasMatchingChildren = (cat.children?.length ?? 0) > 0;
            const selfMatches = categoryMatchesFilters(cat.id, getEffectiveBudget(cat));
            return selfMatches || hasMatchingChildren;
          }),
      }));

  const filteredCount = filteredGroups.reduce(
    (sum, g) => sum + countCategories(g.categories),
    0
  );

  const barChartHeight = maximized === "budget" ? 400 : Math.max(200, budgetVsSpentData.length * 50);

  return (
    <>
      {/* Financial KPI Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Monthly Budget</CardDescription>
            <CardTitle className="text-2xl text-violet-600">
              {formatCompactCurrency(totalBudget)}
            </CardTitle>
          </CardHeader>
        </Card>
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
            <CardDescription>Budget Remaining</CardDescription>
            <CardTitle className={`text-2xl ${budgetRemaining >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {formatCompactCurrency(budgetRemaining)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Over Budget</CardDescription>
            <CardTitle className={`text-2xl ${overBudgetCount > 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {overBudgetCount}
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
      </div>

      {/* Charts Row */}
      <div className={`grid gap-6 ${maximized ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"}`}>
        {/* Chart A: Budget vs Spent by Group */}
        {(maximized === null || maximized === "budget") && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Budget vs Spent by Group</h3>
              <button
                onClick={() => setMaximized(maximized === "budget" ? null : "budget")}
                className={MAXIMIZE_BTN}
                title={maximized === "budget" ? "Minimize" : "Maximize"}
              >
                {maximized === "budget" ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>
            {budgetVsSpentData.length > 0 ? (
              <div style={{ width: "100%", height: barChartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={budgetVsSpentData}
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
                      formatter={(value, name) => [
                        formatCompactCurrency((value as number) ?? 0),
                        name === "budget" ? "Budget" : "Spent",
                      ]}
                      itemSorter={(item) => {
                        const order: Record<string, number> = { budget: 0, spent: 1 };
                        return order[item.dataKey as string] ?? 0;
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      content={() => (
                        <div className="flex justify-center gap-6 text-sm mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#7c3aed" }} />
                            <span style={{ color: "#7c3aed" }}>Budget</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#d97706" }} />
                            <span style={{ color: "#d97706" }}>Spent</span>
                          </div>
                        </div>
                      )}
                    />
                    <Bar dataKey="budget" radius={[0, 4, 4, 0]} fill="#7c3aed" barSize={16} />
                    <Bar dataKey="spent" radius={[0, 4, 4, 0]} barSize={16}>
                      {budgetVsSpentData.map((entry, index) => (
                        <Cell key={`spent-${index}`} fill={entry.isOver ? "#f43f5e" : "#d97706"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                No groups with budgets configured
              </div>
            )}
          </div>
        )}

        {/* Chart B: Income vs Spending (Nested Donut) */}
        {(maximized === null || maximized === "donut") && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Income vs Spending</h3>
              <button
                onClick={() => setMaximized(maximized === "donut" ? null : "donut")}
                className={MAXIMIZE_BTN}
                title={maximized === "donut" ? "Minimize" : "Maximize"}
              >
                {maximized === "donut" ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div
                style={{ width: maximized ? 280 : 180, height: maximized ? 280 : 180 }}
                className="relative shrink-0"
              >
                {monthSpendingByGroup.length > 0 || monthIncomeByGroup.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        {/* Outer ring: Expense groups */}
                        <Pie
                          data={monthSpendingByGroup}
                          cx="50%"
                          cy="50%"
                          innerRadius={maximized ? 70 : 45}
                          outerRadius={maximized ? 120 : 75}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {monthSpendingByGroup.map((entry, index) => (
                            <Cell key={`expense-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        {/* Inner ring: Income groups */}
                        {monthIncomeByGroup.length > 0 && (
                          <Pie
                            data={monthIncomeByGroup}
                            cx="50%"
                            cy="50%"
                            innerRadius={maximized ? 42 : 25}
                            outerRadius={maximized ? 62 : 40}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {monthIncomeByGroup.map((entry, index) => (
                              <Cell key={`income-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        )}
                        <Tooltip
                          formatter={(value) => formatCompactCurrency((value as number) ?? 0)}
                          contentStyle={TOOLTIP_STYLE}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] text-muted-foreground">Net</span>
                      <span className={`text-sm font-bold ${netAmount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {formatCompactCurrency(netAmount)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                    No data
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[180px]">
                {monthIncomeByGroup.length > 0 && (
                  <>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Income</p>
                    {monthIncomeByGroup.map((entry) => (
                      <div key={entry.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="truncate max-w-[120px]">{entry.name}</span>
                        </div>
                        <span className="font-mono text-muted-foreground">
                          {formatCompactCurrency(entry.value)}
                        </span>
                      </div>
                    ))}
                  </>
                )}
                {monthSpendingByGroup.length > 0 ? (
                  <>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">Expenses</p>
                    {monthSpendingByGroup.map((entry) => (
                      <div key={entry.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="truncate max-w-[120px]">{entry.name}</span>
                        </div>
                        <span className="font-mono text-muted-foreground">
                          {formatCompactCurrency(entry.value)}
                        </span>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="text-xs text-muted-foreground">No spending this month</div>
                )}
              </div>
            </div>
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
                    {filteredCount}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <SmartFilter filters={smartFilters} onChange={setSmartFilters} />
          <StatusFilter value={statusFilter} onChange={setStatusFilter} />
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "categories" && (
          <CategoriesPanel
            groups={filteredGroups}
            allGroups={groups}
            categoryStats={categoryStats}
            budgetStats={budgetStats}
          />
        )}
      </div>
    </>
  );
}
