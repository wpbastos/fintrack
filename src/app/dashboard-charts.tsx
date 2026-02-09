"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency, formatCompactCurrency } from "@/lib/format";

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
};

interface TrendData {
  month: string;
  income: number;
  expenses: number;
}

interface BudgetItem {
  categoryName: string;
  groupName: string;
  groupColor: string;
  spent: number;
  budget: number;
}

export function SpendingTrendsChart({ data }: { data: TrendData[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        No transaction data for the past 6 months
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            tickFormatter={(v) => formatCompactCurrency(v)}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value, name) => [
              formatCurrency((value as number) ?? 0),
              name === "income" ? "Income" : "Expenses",
            ]}
            itemSorter={(item) => {
              const order: Record<string, number> = { income: 0, expenses: 1 };
              return order[item.dataKey as string] ?? 0;
            }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            content={() => (
              <div className="flex justify-center gap-6 text-sm mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#10b981" }} />
                  <span style={{ color: "#10b981" }}>Income</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#f43f5e" }} />
                  <span style={{ color: "#f43f5e" }}>Expenses</span>
                </div>
              </div>
            )}
          />
          <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
          <Bar dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BudgetProgress({
  items,
  daysRemaining,
  daysInMonth,
}: {
  items: BudgetItem[];
  daysRemaining: number;
  daysInMonth: number;
}) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        No categories with budgets configured
      </div>
    );
  }

  // Group by categoryGroup
  const grouped = new Map<string, { color: string; items: BudgetItem[] }>();
  for (const item of items) {
    const existing = grouped.get(item.groupName);
    if (existing) {
      existing.items.push(item);
    } else {
      grouped.set(item.groupName, { color: item.groupColor, items: [item] });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{daysRemaining} days remaining</span>
        <span>Day {daysInMonth - daysRemaining} of {daysInMonth}</span>
      </div>
      {Array.from(grouped.entries()).map(([groupName, group]) => (
        <div key={groupName} className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {groupName}
          </h4>
          {group.items.map((item) => {
            const pct = item.budget > 0 ? (item.spent / item.budget) * 100 : 0;
            const barColor =
              pct > 100 ? "#f43f5e" : pct >= 80 ? "#f59e0b" : "#10b981";
            const clampedPct = Math.min(pct, 100);

            return (
              <div key={item.categoryName} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate">{item.categoryName}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                    {formatCurrency(item.spent)} / {formatCurrency(item.budget)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${clampedPct}%`,
                      backgroundColor: barColor,
                    }}
                  />
                </div>
                {pct > 100 && (
                  <p className="text-xs text-rose-500">
                    {formatCurrency(item.spent - item.budget)} over budget
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
