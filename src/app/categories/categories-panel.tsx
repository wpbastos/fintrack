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
import { X } from "lucide-react";

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
  categoryStats: Record<number, { monthCount: number; totalCount: number }>;
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

// Calculate budget: if has children, sum children's budgets; otherwise use own budget
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

// Count all categories including children
function countCategories(categories: Category[]): number {
  return categories.reduce((sum, cat) => {
    const childCount = cat.children?.length ?? 0;
    return sum + 1 + childCount;
  }, 0);
}

// Sum budgets for a list of categories (using effective budget which accounts for children)
function sumBudgets(categories: Category[]): number {
  return categories
    .filter((cat) => cat.isActive)
    .reduce((sum, cat) => sum + (getEffectiveBudget(cat) ?? 0), 0);
}

export function CategoriesPanel({ groups, allGroups, categoryStats, budgetStats }: CategoriesPanelProps) {
  const [search, setSearch] = useState("");

  // Filter categories based on search (status filtering is done in tabs)
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
        // Check if this group is truly empty (no categories in DB) vs just filtered out
        const originalGroup = allGroups.find((g) => g.id === group.id);
        const isTrulyEmpty = (originalGroup?.categories.length ?? 0) === 0;
        const hasFilteredCategories = group.categories.length > 0;

        // Skip groups that have categories but they're all filtered out
        if (!isTrulyEmpty && !hasFilteredCategories) return null;

        const groupBudget = sumBudgets(group.categories);

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
                {group.type !== "Income" && groupBudget > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 dark:bg-violet-900/50 px-3 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300">
                    Budget: ${groupBudget.toLocaleString()}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            {isTrulyEmpty ? (
              <CardContent className="py-6 text-center text-sm text-muted-foreground italic">
                No categories in this group
              </CardContent>
            ) : (
            <CardContent>
              <div className="rounded-md border overflow-visible">
                <Table className="table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      {group.type !== "Income" && (
                        <TableHead className="w-[14%] text-right pr-4">Budget</TableHead>
                      )}
                      <TableHead className="w-[10%]">Necessity</TableHead>
                      <TableHead className="w-[12%] text-center">Transactions</TableHead>
                      <TableHead className="w-16">Status</TableHead>
                      <TableHead className="w-28 p-0"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.categories.map((category) => {
                      const hasChildren = (category.children?.length ?? 0) > 0;
                      const effectiveBudget = getEffectiveBudget(category);

                      return (
                        <Fragment key={category.id}>
                          {/* Parent row */}
                          <TableRow>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {category.color && (
                                  <div
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: category.color }}
                                  />
                                )}
                                <div className="flex flex-col">
                                  <span className="font-medium">{category.name}</span>
                                  <NotesCell notes={category.notes} />
                                </div>
                              </div>
                            </TableCell>
                            {group.type !== "Income" && (
                              <TableCell>
                                {hasChildren ? (
                                  <div className="text-right pr-2 text-sm">
                                    {(() => {
                                      // Sum only children's spent (not parent)
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
                            <TableCell>
                              <NecessityCell value={category.necessityLevel} />
                            </TableCell>
                            <TableCell className="text-center">
                              {(() => {
                                // If has children, sum only children stats; otherwise use parent stats
                                if (hasChildren) {
                                  const childStats = category.children?.map((c) => categoryStats[c.id]).filter(Boolean) ?? [];
                                  const monthCount = childStats.reduce((s, c) => s + (c?.monthCount ?? 0), 0);
                                  const totalCount = childStats.reduce((s, c) => s + (c?.totalCount ?? 0), 0);
                                  return (
                                    <span className="text-xs">
                                      <span className="font-medium">{monthCount}</span>
                                      <span className="text-muted-foreground"> / {totalCount}</span>
                                    </span>
                                  );
                                }
                                const stats = categoryStats[category.id];
                                return (
                                  <span className="text-xs">
                                    <span className="font-medium">{stats?.monthCount ?? 0}</span>
                                    <span className="text-muted-foreground"> / {stats?.totalCount ?? 0}</span>
                                  </span>
                                );
                              })()}
                            </TableCell>
                            <TableCell>
                              <StatusToggle
                                categoryId={category.id}
                                initialValue={category.isActive}
                              />
                            </TableCell>
                            <TableCell className="p-0 pr-1">
                              <div className="flex items-center gap-1">
                                <CategoryActions
                                  categoryId={category.id}
                                  categoryName={category.name}
                                  necessityLevel={category.necessityLevel}
                                  color={category.color}
                                  notes={category.notes}
                                  hasChildren={hasChildren}
                                  isIncome={group.type === "Income"}
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
                            const childTxnStats = categoryStats[child.id];
                            const childBudgetSpent = budgetStats[child.id]?.spentThisMonth ?? 0;
                            return (
                              <TableRow key={child.id} className="bg-slate-50 dark:bg-slate-900/50">
                                <TableCell>
                                  <div className="flex items-center gap-2 pl-6">
                                    {child.color && (
                                      <div
                                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: child.color }}
                                      />
                                    )}
                                    <div className="flex flex-col">
                                      <span className="text-sm">↳ {child.name}</span>
                                      <div className="pl-4">
                                        <NotesCell notes={child.notes} />
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                                {group.type !== "Income" && (
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
                                <TableCell>
                                  <NecessityCell value={child.necessityLevel} />
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className="text-xs">
                                    <span className="font-medium">{childTxnStats?.monthCount ?? 0}</span>
                                    <span className="text-muted-foreground"> / {childTxnStats?.totalCount ?? 0}</span>
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <StatusToggle
                                    categoryId={child.id}
                                    initialValue={child.isActive}
                                  />
                                </TableCell>
                                <TableCell className="p-0 pr-1">
                                  <ChildActions
                                    categoryId={child.id}
                                    categoryName={child.name}
                                    necessityLevel={child.necessityLevel}
                                    color={child.color}
                                    notes={child.notes}
                                    isIncome={group.type === "Income"}
                                  />
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
