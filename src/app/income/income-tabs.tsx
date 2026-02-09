"use client";

import { useState } from "react";
import { Wallet, Building2, Briefcase } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IncomePanel } from "./income-panel";
import { PositionsPanel } from "./positions-panel";
import { EmployersPanel } from "./employers-panel";
import { StatusFilter } from "./status-filter";
import { formatCurrency } from "@/lib/format";
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

interface PositionWithCount {
  id: number;
  title: string;
  department: string | null;
  startDate: Date | null;
  endDate: Date | null;
  isActive: boolean;
  notes: string | null;
  employer: {
    id: number;
    name: string;
    website: string | null;
  };
  _count: {
    incomes: number;
  };
}

interface EmployerWithCount {
  id: number;
  name: string;
  industry: string | null;
  location: string | null;
  website: string | null;
  isActive: boolean;
  notes: string | null;
  _count: {
    positions: number;
  };
}

interface IncomeTabsProps {
  incomeSources: Income[];
  positions: PositionWithCount[];
  employers: EmployerWithCount[];
  incomeStats: Record<number, IncomeStat>;
}

const tabs = [
  { id: "income", label: "Income", icon: Wallet },
  { id: "employers", label: "Employers", icon: Building2 },
  { id: "positions", label: "Positions", icon: Briefcase },
] as const;

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

export function IncomeTabs({ incomeSources, positions, employers, incomeStats }: IncomeTabsProps) {
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


  // Filter sources based on status
  const filteredSources = incomeSources.filter((s) =>
    statusFilter === "active" ? s.isActive : !s.isActive
  );

  // Filter positions based on status
  const filteredPositions = positions.filter((p) =>
    statusFilter === "active" ? p.isActive : !p.isActive
  );

  // Filter employers based on status
  const filteredEmployers = employers.filter((e) =>
    statusFilter === "active" ? e.isActive : !e.isActive
  );

  // Get count for current tab
  const getTabCount = (tabId: TabId) => {
    if (tabId === "income") return filteredSources.length;
    if (tabId === "positions") return filteredPositions.length;
    if (tabId === "employers") return filteredEmployers.length;
    return 0;
  };

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
                    {getTabCount(tab.id)}
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
        {activeTab === "income" && <IncomePanel incomeSources={filteredSources} incomeStats={incomeStats} />}
        {activeTab === "positions" && <PositionsPanel positions={filteredPositions} />}
        {activeTab === "employers" && <EmployersPanel employers={filteredEmployers} />}
      </div>
    </>
  );
}
