"use client";

import { useState } from "react";
import { Tags } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoriesPanel } from "./categories-panel";
import { StatusFilter } from "./status-filter";

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
  categoryStats: Record<number, { monthCount: number; totalCount: number }>;
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

function countActiveCategories(categories: Category[]): number {
  return categories.reduce((sum, cat) => {
    const activeChildren = cat.children?.filter((c) => c.isActive).length ?? 0;
    return sum + (cat.isActive ? 1 : 0) + activeChildren;
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

export function CategoriesTabs({ groups, categoryStats, budgetStats }: CategoriesTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("categories");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive">("active");

  // Calculate stats
  const totalCategories = groups.reduce((sum, g) => sum + countCategories(g.categories), 0);
  const activeCategories = groups.reduce((sum, g) => sum + countActiveCategories(g.categories), 0);
  const totalBudget = groups
    .filter((g) => g.type === "Expense")
    .reduce((sum, g) => sum + sumBudgets(g.categories), 0);

  // Filter categories based on status (including children)
  const filteredGroups = groups.map((group) => ({
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

  const filteredCount = filteredGroups.reduce(
    (sum, g) => sum + countCategories(g.categories),
    0
  );

  return (
    <>
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Categories</CardDescription>
            <CardTitle className="text-2xl">{totalCategories}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-2xl text-emerald-600">{activeCategories}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Inactive</CardDescription>
            <CardTitle className="text-2xl text-slate-500">{totalCategories - activeCategories}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Groups</CardDescription>
            <CardTitle className="text-2xl">{groups.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Budget</CardDescription>
            <CardTitle className="text-2xl text-violet-600">${totalBudget.toLocaleString()}</CardTitle>
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
                    {filteredCount}
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
