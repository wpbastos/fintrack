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
  categoryName: string;
  necessityLevel: string;
  monthlyBudget: number | null;
  isActive: boolean;
  notes: string | null;
  childCategories?: Category[];
}

interface CategoryGroup {
  id: number;
  groupName: string;
  groupType: string;
  notes: string | null;
  categories: Category[];
}

interface CategoriesPanelProps {
  groups: CategoryGroup[];
  allGroups: CategoryGroup[];
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
  if (category.childCategories && category.childCategories.length > 0) {
    const childBudgets = category.childCategories
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
    const childCount = cat.childCategories?.length ?? 0;
    return sum + 1 + childCount;
  }, 0);
}

// Sum budgets for a list of categories (using effective budget which accounts for children)
function sumBudgets(categories: Category[]): number {
  return categories
    .filter((cat) => cat.isActive)
    .reduce((sum, cat) => sum + (getEffectiveBudget(cat) ?? 0), 0);
}

export function CategoriesPanel({ groups, allGroups }: CategoriesPanelProps) {
  const [search, setSearch] = useState("");

  // Filter categories based on search (status filtering is done in tabs)
  const filteredGroups = search
    ? groups.map((group) => ({
        ...group,
        categories: group.categories
          .map((cat) => ({
            ...cat,
            childCategories: cat.childCategories?.filter((child) => {
              const query = search.toLowerCase();
              return (
                child.categoryName.toLowerCase().includes(query) ||
                (child.notes?.toLowerCase().includes(query) ?? false)
              );
            }),
          }))
          .filter((cat) => {
            const query = search.toLowerCase();
            const matchesSearch =
              cat.categoryName.toLowerCase().includes(query) ||
              (cat.notes?.toLowerCase().includes(query) ?? false);
            const hasMatchingChildren = (cat.childCategories?.length ?? 0) > 0;
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
                  <CardTitle>{group.groupName}</CardTitle>
                  {getTypeBadge(group.groupType)}
                </div>
                <GroupActions groupId={group.id} groupName={group.groupName} groupType={group.groupType} notes={group.notes} />
              </div>
              <CardDescription className="flex items-center justify-between">
                <span>{countCategories(group.categories)} categories{group.notes && ` · ${group.notes}`}</span>
                {group.groupType !== "Income" && groupBudget > 0 && (
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
                      <TableHead className="w-[12%]">Necessity</TableHead>
                      <TableHead className="w-[16%] text-right pr-4">
                        {group.groupType !== "Income" ? "Monthly Budget" : ""}
                      </TableHead>
                      <TableHead className="w-18">Status</TableHead>
                      <TableHead className="w-28 p-0"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.categories.map((category) => {
                      const hasChildren = (category.childCategories?.length ?? 0) > 0;
                      const effectiveBudget = getEffectiveBudget(category);

                      return (
                        <Fragment key={category.id}>
                          {/* Parent row */}
                          <TableRow>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{category.categoryName}</span>
                                <NotesCell notes={category.notes} />
                              </div>
                            </TableCell>
                            <TableCell>
                              <NecessityCell value={category.necessityLevel} />
                            </TableCell>
                            <TableCell>
                              {group.groupType !== "Income" && (
                                hasChildren ? (
                                  <div className="text-right pr-2 text-sm text-muted-foreground">
                                    ${effectiveBudget?.toLocaleString() ?? "—"}
                                  </div>
                                ) : (
                                  <BudgetCell
                                    categoryId={category.id}
                                    initialBudget={category.monthlyBudget}
                                  />
                                )
                              )}
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
                                  categoryName={category.categoryName}
                                  necessityLevel={category.necessityLevel}
                                  notes={category.notes}
                                  hasChildren={hasChildren}
                                  isIncome={group.groupType === "Income"}
                                  monthlyBudget={category.monthlyBudget}
                                />
                                <AddChildButton
                                  parentId={category.id}
                                  parentName={category.categoryName}
                                />
                              </div>
                            </TableCell>
                          </TableRow>

                          {/* Child rows */}
                          {category.childCategories?.map((child) => (
                            <TableRow key={child.id} className="bg-slate-50 dark:bg-slate-900/50">
                              <TableCell>
                                <div className="flex flex-col pl-6">
                                  <span className="text-sm">↳ {child.categoryName}</span>
                                  <div className="pl-4">
                                    <NotesCell notes={child.notes} />
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <NecessityCell value={child.necessityLevel} />
                              </TableCell>
                              <TableCell>
                                {group.groupType !== "Income" && (
                                  <BudgetCell
                                    categoryId={child.id}
                                    initialBudget={child.monthlyBudget}
                                  />
                                )}
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
                                  categoryName={child.categoryName}
                                  necessityLevel={child.necessityLevel}
                                  notes={child.notes}
                                  isIncome={group.groupType === "Income"}
                                  monthlyBudget={child.monthlyBudget}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
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
