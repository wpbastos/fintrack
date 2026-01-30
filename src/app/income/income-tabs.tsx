"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IncomePanel } from "./income-panel";
import { StatusFilter } from "./status-filter";

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

interface IncomeTabsProps {
  incomeSources: IncomeSource[];
}

const tabs = [{ id: "income", label: "Income Sources", icon: Wallet }] as const;

type TabId = (typeof tabs)[number]["id"];

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

export function IncomeTabs({ incomeSources }: IncomeTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("income");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive">("active");

  // Calculate stats for ACTIVE sources only
  const activeSources = incomeSources.filter((s) => s.isActive);

  // Calculate annual/monthly income
  const calculateAnnual = (amount: number | null, frequency: string | null): number => {
    if (amount === null || !frequency) return 0;
    const multiplier = FREQUENCY_MULTIPLIERS[frequency] ?? 12;
    return amount * multiplier;
  };

  // Totals
  const totalAnnualNet = activeSources.reduce(
    (sum, s) => sum + calculateAnnual(s.currentNet, s.payFrequency),
    0
  );
  const totalAnnualGross = activeSources.reduce(
    (sum, s) => sum + calculateAnnual(s.currentGross, s.payFrequency),
    0
  );
  const totalMonthlyNet = totalAnnualNet / 12;

  // Deduction percentage
  const deductionPercent = totalAnnualGross > 0
    ? ((totalAnnualGross - totalAnnualNet) / totalAnnualGross) * 100
    : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Filter sources based on status
  const filteredSources = incomeSources.filter((s) =>
    statusFilter === "active" ? s.isActive : !s.isActive
  );

  return (
    <>
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Household Monthly</CardDescription>
            <CardTitle className="text-2xl text-emerald-600">
              {formatCurrency(totalMonthlyNet)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Household Annual</CardDescription>
            <CardTitle className="text-2xl text-emerald-600">
              {formatCurrency(totalAnnualNet)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Annual Gross</CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(totalAnnualGross)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Deductions</CardDescription>
            <CardTitle className="text-2xl text-amber-600">
              {deductionPercent.toFixed(0)}%
              <span className="text-sm font-normal text-muted-foreground ml-1">
                ({formatCurrency(totalAnnualGross - totalAnnualNet)}/yr)
              </span>
            </CardTitle>
          </CardHeader>
        </Card>
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
                    {filteredSources.length}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        <StatusFilter value={statusFilter} onChange={setStatusFilter} />
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "income" && <IncomePanel incomeSources={filteredSources} />}
      </div>
    </>
  );
}
