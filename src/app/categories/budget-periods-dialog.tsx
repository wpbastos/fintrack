"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getBudgetPeriods } from "./actions";
import { CalendarDays, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface BudgetPeriod {
  id: number;
  periodStart: Date;
  periodEnd: Date;
  budgetedAmount: number;
  actualSpent: number;
  status: string;
  notes: string | null;
}

interface BudgetPeriodsDialogProps {
  categoryId: number;
  categoryName: string;
  currentBudget: number | null;
}

export function BudgetPeriodsDialog({
  categoryId,
  categoryName,
  currentBudget,
}: BudgetPeriodsDialogProps) {
  const [open, setOpen] = useState(false);
  const [periods, setPeriods] = useState<BudgetPeriod[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPeriods = async () => {
    setLoading(true);
    const data = await getBudgetPeriods(categoryId);
    setPeriods(data);
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      loadPeriods();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, categoryId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-CA", {
      year: "numeric",
      month: "short",
    });
  };

  const getVariance = (budgeted: number, actual: number) => {
    return budgeted - actual;
  };

  const getVariancePercent = (budgeted: number, actual: number) => {
    if (budgeted === 0) return 0;
    return ((actual - budgeted) / budgeted) * 100;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="p-1 rounded hover:bg-violet-100 dark:hover:bg-violet-900/50 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
          title="Budget History"
        >
          <CalendarDays className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Budget History - {categoryName}</DialogTitle>
          <DialogDescription>
            Current monthly budget: {currentBudget ? formatCurrency(currentBudget) : "Not set"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : periods.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No budget periods recorded for this category.
            </div>
          ) : (
            <div className="space-y-2">
              {periods.map((period) => {
                const variance = getVariance(period.budgetedAmount, period.actualSpent);
                const variancePercent = getVariancePercent(period.budgetedAmount, period.actualSpent);
                const isOverBudget = variance < 0;
                const isUnderBudget = variance > 0;
                const isOnBudget = variance === 0;

                return (
                  <div
                    key={period.id}
                    className="border rounded-lg p-3 hover:bg-slate-50 dark:hover:bg-slate-900/50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {formatDate(period.periodStart)}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              period.status === "open"
                                ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            {period.status === "open" ? "Current" : "Closed"}
                          </span>
                          {!isOnBudget && (
                            <span
                              className={`flex items-center gap-0.5 text-xs ${
                                isOverBudget
                                  ? "text-rose-600"
                                  : "text-emerald-600"
                              }`}
                            >
                              {isOverBudget ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              {Math.abs(variancePercent).toFixed(0)}% {isOverBudget ? "over" : "under"}
                            </span>
                          )}
                          {isOnBudget && period.actualSpent > 0 && (
                            <span className="flex items-center gap-0.5 text-xs text-slate-500">
                              <Minus className="h-3 w-3" />
                              On budget
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Budgeted: </span>
                            <span className="font-mono">
                              {formatCurrency(period.budgetedAmount)}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Spent: </span>
                            <span className={`font-mono ${isOverBudget ? "text-rose-600" : ""}`}>
                              {formatCurrency(period.actualSpent)}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Remaining: </span>
                            <span
                              className={`font-mono ${
                                isOverBudget
                                  ? "text-rose-600"
                                  : isUnderBudget
                                  ? "text-emerald-600"
                                  : ""
                              }`}
                            >
                              {formatCurrency(variance)}
                            </span>
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div className="mt-2">
                          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                isOverBudget
                                  ? "bg-rose-500"
                                  : period.actualSpent / period.budgetedAmount > 0.8
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                              style={{
                                width: `${Math.min(
                                  100,
                                  (period.actualSpent / period.budgetedAmount) * 100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                        {period.notes && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {period.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-3 py-2 text-sm bg-violet-600 text-white rounded-md hover:bg-violet-700"
          >
            Close
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
