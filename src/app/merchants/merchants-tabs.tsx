"use client";

import { useState } from "react";
import { Store } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MerchantsPanel } from "./merchants-panel";
import { StatusFilter } from "./status-filter";

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

interface MerchantsTabsProps {
  merchants: Merchant[];
}

const tabs = [{ id: "merchants", label: "Merchants", icon: Store }] as const;

type TabId = (typeof tabs)[number]["id"];

export function MerchantsTabs({ merchants }: MerchantsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("merchants");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive">("active");

  // Calculate stats
  const totalMerchants = merchants.length;
  const activeMerchants = merchants.filter((m) => m.isActive).length;
  const totalPatterns = merchants.reduce((sum, m) => sum + m.patterns.length, 0);
  const totalTransactions = merchants.reduce((sum, m) => sum + m._count.transactions, 0);
  const withCategory = merchants.filter((m) => m.defaultCategoryId).length;

  // Filter merchants based on status
  const filteredMerchants = merchants.filter((m) =>
    statusFilter === "active" ? m.isActive : !m.isActive
  );

  return (
    <>
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Merchants</CardDescription>
            <CardTitle className="text-2xl">{totalMerchants}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-2xl text-emerald-600">{activeMerchants}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Inactive</CardDescription>
            <CardTitle className="text-2xl text-slate-500">{totalMerchants - activeMerchants}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Patterns</CardDescription>
            <CardTitle className="text-2xl">{totalPatterns}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Transactions</CardDescription>
            <CardTitle className="text-2xl text-violet-600">{totalTransactions}</CardTitle>
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
                    {filteredMerchants.length}
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
        {activeTab === "merchants" && <MerchantsPanel merchants={filteredMerchants} />}
      </div>
    </>
  );
}
