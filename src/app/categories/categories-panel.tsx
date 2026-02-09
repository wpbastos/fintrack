"use client";

import { Fragment, useState } from "react";
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
import { BudgetCell } from "./budget-cell";
import { NecessityCell } from "./necessity-cell";
import { StatusToggle } from "./status-toggle";
import { AddChildButton } from "./add-child-button";
import { ChildActions } from "./child-actions";
import { CategoryActions } from "./category-actions";
import { NotesCell } from "./notes-cell";
import { GroupActions } from "./group-actions";
import { AddCategoryDialog } from "./add-category-dialog";
import { AddGroupDialog } from "./add-group-dialog";
import { BudgetPeriodsDialog } from "./budget-periods-dialog";
import { X } from "lucide-react";
import { formatCompactCurrency } from "@/lib/format";

interface CategoryStat {
  totalCount: number;
  totalAmount: number;
  yearCount: number;
  yearAmount: number;
  monthCount: number;
  monthAmount: number;
}

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

interface CategoriesPanelProps {
  groups: CategoryGroup[];
  allGroups: CategoryGroup[];
  categoryStats: Record<number, CategoryStat>;
  budgetStats: Record<number, { spentThisMonth: number }>;
}

function getTypeBadge(type: string) {
  const styles: Record<string, string> = {
    Income: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    Expense: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
    Transfer: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
    Investment: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${styles[type] ?? ""}`}>
      {type}
    </span>
  );
}

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

function countCategories(categories: Category[]): number {
  return categories.reduce((sum, cat) => {
    const childCount = cat.children?.length ?? 0;
    return sum + 1 + childCount;
  }, 0);
}

function sumBudgets(categories: Category[]): number {
  return categories
    .filter((cat) => cat.isActive)
    .reduce((sum, cat) => sum + (getEffectiveBudget(cat) ?? 0), 0);
}

function sumGroupStats(
  categories: Category[],
  stats: Record<number, CategoryStat>
): CategoryStat {
  return categories.reduce((acc, cat) => {
    const s = (cat.children && cat.children.length > 0)
      ? cat.children.reduce((childAcc, child) => {
          const cs = stats[child.id];
          if (!cs) return childAcc;
          return {
            totalCount: childAcc.totalCount + cs.totalCount,
            totalAmount: childAcc.totalAmount + cs.totalAmount,
            yearCount: childAcc.yearCount + cs.yearCount,
            yearAmount: childAcc.yearAmount + cs.yearAmount,
            monthCount: childAcc.monthCount + cs.monthCount,
            monthAmount: childAcc.monthAmount + cs.monthAmount,
          };
        }, { ...EMPTY_STAT })
      : stats[cat.id] ?? { ...EMPTY_STAT };
    return {
      totalCount: acc.totalCount + s.totalCount,
      totalAmount: acc.totalAmount + s.totalAmount,
      yearCount: acc.yearCount + s.yearCount,
      yearAmount: acc.yearAmount + s.yearAmount,
      monthCount: acc.monthCount + s.monthCount,
      monthAmount: acc.monthAmount + s.monthAmount,
    };
  }, { ...EMPTY_STAT });
}

const EMPTY_STAT: CategoryStat = {
  totalCount: 0, totalAmount: 0,
  yearCount: 0, yearAmount: 0,
  monthCount: 0, monthAmount: 0,
};

function aggregateStats(
  stats: Record<number, CategoryStat>,
  category: Category
): CategoryStat {
  if (category.children && category.children.length > 0) {
    return category.children.reduce((acc, child) => {
      const s = stats[child.id];
      if (!s) return acc;
      return {
        totalCount: acc.totalCount + s.totalCount,
        totalAmount: acc.totalAmount + s.totalAmount,
        yearCount: acc.yearCount + s.yearCount,
        yearAmount: acc.yearAmount + s.yearAmount,
        monthCount: acc.monthCount + s.monthCount,
        monthAmount: acc.monthAmount + s.monthAmount,
      };
    }, { ...EMPTY_STAT });
  }
  return stats[category.id] ?? { ...EMPTY_STAT };
}

function StatCell({ count, amount }: { count: number; amount: number }) {
  if (count === 0 && amount === 0) {
    return (
      <TableCell className="text-center">
        <span className="text-xs text-muted-foreground">—</span>
      </TableCell>
    );
  }
  return (
    <TableCell className="text-center">
      <div className="flex flex-col items-center leading-tight">
        <span className="text-xs font-medium">{formatCompactCurrency(Math.abs(amount))}</span>
        <span className="text-xs text-muted-foreground">#{count}</span>
      </div>
    </TableCell>
  );
}

export function CategoriesPanel({ groups, allGroups, categoryStats, budgetStats }: CategoriesPanelProps) {
  const [search, setSearch] = useState("");

  const filteredGroups = search
    ? groups.map((group) => ({
        ...group,
        categories: group.categories
          .map((cat) => ({
            ...cat,
            children: cat.children?.filter((child) => {
              const query = search.toLowerCase();
              return (
                child.name.toLowerCase().includes(query) ||
                (child.notes?.toLowerCase().includes(query) ?? false)
              );
            }),
          }))
          .filter((cat) => {
            const query = search.toLowerCase();
            const matchesSearch =
              cat.name.toLowerCase().includes(query) ||
              (cat.notes?.toLowerCase().includes(query) ?? false);
            const hasMatchingChildren = (cat.children?.length ?? 0) > 0;
            return matchesSearch || hasMatchingChildren;
          }),
      }))
    : groups;

  const filteredTotal = filteredGroups.reduce((sum, g) => sum + g.categories.length, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <div className="relative">
          <Input
            placeholder="Search categories..."
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
        <AddCategoryDialog groups={allGroups} />
        <AddGroupDialog />
      </div>

      {filteredGroups.map((group) => {
        const originalGroup = allGroups.find((g) => g.id === group.id);
        const isTrulyEmpty = (originalGroup?.categories.length ?? 0) === 0;
        const hasFilteredCategories = group.categories.length > 0;

        if (!isTrulyEmpty && !hasFilteredCategories) return null;

        const groupBudget = sumBudgets(group.categories);
        const isIncome = group.type === "Income";
        const groupStats = sumGroupStats(group.categories, categoryStats);

        return (
          <Card key={group.id} className={isTrulyEmpty ? "opacity-60" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {group.color && (
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: group.color }}
                    />
                  )}
                  <CardTitle>{group.name}</CardTitle>
                  {getTypeBadge(group.type)}
                </div>
                <GroupActions groupId={group.id} groupName={group.name} groupType={group.type} color={group.color} notes={group.notes} />
              </div>
              <CardDescription className="flex items-center justify-between">
                <span>{countCategories(group.categories)} categories{group.notes && ` · ${group.notes}`}</span>
                <div className="flex items-center gap-2">
                  {!isIncome && groupBudget > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 dark:bg-violet-900/50 px-3 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300">
                      Budget: ${groupBudget.toLocaleString()}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                    Month: {formatCompactCurrency(Math.abs(groupStats.monthAmount))}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                    Year: {formatCompactCurrency(Math.abs(groupStats.yearAmount))}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                    Total: {formatCompactCurrency(Math.abs(groupStats.totalAmount))}
                  </span>
                </div>
              </CardDescription>
            </CardHeader>
            {isTrulyEmpty ? (
              <CardContent className="py-6 text-center text-sm text-muted-foreground italic">
                No categories in this group
              </CardContent>
            ) : (
            <CardContent>
              <div className="rounded-md border overflow-visible">
                <Table className="table-fixed w-full">
                  <colgroup>{isIncome ? (
                      <>
                        <col style={{ width: "32%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "15%" }} />
                        <col style={{ width: "15%" }} />
                        <col style={{ width: "15%" }} />
                        <col style={{ width: "5%" }} />
                        <col style={{ width: "8%" }} />
                      </>
                    ) : (
                      <>
                        <col style={{ width: "27%" }} />
                        <col style={{ width: "9%" }} />
                        <col style={{ width: "12%" }} />
                        <col style={{ width: "13%" }} />
                        <col style={{ width: "13%" }} />
                        <col style={{ width: "13%" }} />
                        <col style={{ width: "5%" }} />
                        <col style={{ width: "8%" }} />
                      </>
                    )}</colgroup>
                  <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Necessity</TableHead>
                      {!isIncome && (
                        <TableHead className="text-right pr-4">Budget</TableHead>
                      )}
                      <TableHead className="text-center">Month</TableHead>
                      <TableHead className="text-center">Year</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="p-0"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.categories.map((category) => {
                      const hasChildren = (category.children?.length ?? 0) > 0;
                      const effectiveBudget = getEffectiveBudget(category);
                      const stats = aggregateStats(categoryStats, category);

                      return (
                        <Fragment key={category.id}>
                          {/* Parent row */}
                          <TableRow>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="flex flex-col">
                                  <span className="font-medium">{category.name}</span>
                                  <NotesCell notes={category.notes} />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <NecessityCell value={category.necessityLevel} />
                            </TableCell>
                            {!isIncome && (
                              <TableCell>
                                {hasChildren ? (
                                  <div className="text-right pr-2 text-sm">
                                    {(() => {
                                      const totalSpent = category.children?.reduce((s, c) => s + (budgetStats[c.id]?.spentThisMonth ?? 0), 0) ?? 0;
                                      if (!effectiveBudget) return <span className="text-muted-foreground">—</span>;
                                      const isOver = totalSpent > effectiveBudget;
                                      return (
                                        <span className={isOver ? "text-rose-600" : ""}>
                                          ${totalSpent.toLocaleString()} <span className="text-muted-foreground">/ ${effectiveBudget.toLocaleString()}</span>
                                        </span>
                                      );
                                    })()}
                                  </div>
                                ) : (
                                  <div className="text-right pr-2 text-sm">
                                    {category.monthlyBudget ? (
                                      (() => {
                                        const spent = budgetStats[category.id]?.spentThisMonth ?? 0;
                                        const isOver = spent > category.monthlyBudget;
                                        return (
                                          <span className={isOver ? "text-rose-600" : ""}>
                                            ${spent.toLocaleString()} <span className="text-muted-foreground">/ ${category.monthlyBudget.toLocaleString()}</span>
                                          </span>
                                        );
                                      })()
                                    ) : (
                                      <BudgetCell
                                        categoryId={category.id}
                                        initialBudget={category.monthlyBudget}
                                      />
                                    )}
                                  </div>
                                )}
                              </TableCell>
                            )}
                            <StatCell count={stats.monthCount} amount={stats.monthAmount} />
                            <StatCell count={stats.yearCount} amount={stats.yearAmount} />
                            <StatCell count={stats.totalCount} amount={stats.totalAmount} />
                            <TableCell>
                              <StatusToggle
                                categoryId={category.id}
                                initialValue={category.isActive}
                              />
                            </TableCell>
                            <TableCell className="p-0 pr-1">
                              <div className="flex items-center justify-end gap-1">
                                {effectiveBudget != null && effectiveBudget > 0 && (
                                  <BudgetPeriodsDialog
                                    categoryId={category.id}
                                    categoryName={category.name}
                                    currentBudget={effectiveBudget}
                                  />
                                )}
                                <CategoryActions
                                  categoryId={category.id}
                                  categoryName={category.name}
                                  necessityLevel={category.necessityLevel}
                                  color={category.color}
                                  notes={category.notes}
                                  hasChildren={hasChildren}
                                  isIncome={isIncome}
                                />
                                <AddChildButton
                                  parentId={category.id}
                                  parentName={category.name}
                                />
                              </div>
                            </TableCell>
                          </TableRow>

                          {/* Child rows */}
                          {category.children?.map((child) => {
                            const childStats = categoryStats[child.id] ?? EMPTY_STAT;
                            const childBudgetSpent = budgetStats[child.id]?.spentThisMonth ?? 0;
                            return (
                              <TableRow key={child.id} className="bg-slate-50 dark:bg-slate-900/50">
                                <TableCell>
                                  <div className="flex items-center gap-2 pl-6">
                                    <div className="flex flex-col">
                                      <span className="text-sm">↳ {child.name}</span>
                                      <div className="pl-4">
                                        <NotesCell notes={child.notes} />
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <NecessityCell value={child.necessityLevel} />
                                </TableCell>
                                {!isIncome && (
                                  <TableCell>
                                    {child.monthlyBudget ? (
                                      <div className="text-right pr-2 text-sm">
                                        <span className={childBudgetSpent > child.monthlyBudget ? "text-rose-600" : ""}>
                                          ${childBudgetSpent.toLocaleString()} <span className="text-muted-foreground">/ ${child.monthlyBudget.toLocaleString()}</span>
                                        </span>
                                      </div>
                                    ) : (
                                      <BudgetCell
                                        categoryId={child.id}
                                        initialBudget={child.monthlyBudget}
                                      />
                                    )}
                                  </TableCell>
                                )}
                                <StatCell count={childStats.monthCount} amount={childStats.monthAmount} />
                                <StatCell count={childStats.yearCount} amount={childStats.yearAmount} />
                                <StatCell count={childStats.totalCount} amount={childStats.totalAmount} />
                                <TableCell>
                                  <StatusToggle
                                    categoryId={child.id}
                                    initialValue={child.isActive}
                                  />
                                </TableCell>
                                <TableCell className="p-0 pr-1">
                                  <div className="flex items-center justify-end gap-1">
                                    {child.monthlyBudget != null && child.monthlyBudget > 0 && (
                                      <BudgetPeriodsDialog
                                        categoryId={child.id}
                                        categoryName={child.name}
                                        currentBudget={child.monthlyBudget}
                                      />
                                    )}
                                    <ChildActions
                                      categoryId={child.id}
                                      categoryName={child.name}
                                      necessityLevel={child.necessityLevel}
                                      color={child.color}
                                      notes={child.notes}
                                      isIncome={isIncome}
                                    />
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            )}
          </Card>
        );
      })}

      {filteredTotal === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No categories found.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
