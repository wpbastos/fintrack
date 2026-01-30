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
import { Input } from "@/components/ui/input";
import { getIncomeHistory, addIncomeChange, deleteIncomeChange } from "./actions";
import { toast } from "sonner";
import { Receipt, Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";

const PAY_TYPES = [
  "Regular",
  "Initial",
  "Raise",
  "Promotion",
  "Bonus",
  "Partial Pay",
  "Back Pay",
  "Vacation Pay",
  "Other",
];

interface IncomeChange {
  id: number;
  effectiveDate: Date;
  previousGross: number | null;
  previousNet: number | null;
  newGross: number;
  newNet: number;
  changeReason: string;
  notes: string | null;
}

interface IncomeHistoryDialogProps {
  incomeSourceId: number;
  sourceName: string;
  currentGross: number | null;
  currentNet: number | null;
}

export function IncomeHistoryDialog({
  incomeSourceId,
  sourceName,
  currentGross,
  currentNet,
}: IncomeHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<IncomeChange[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    const data = await getIncomeHistory(incomeSourceId);
    setHistory(data);
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, incomeSourceId]);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this payslip?")) {
      return;
    }

    const result = await deleteIncomeChange(id);
    if (result.success) {
      toast.success("Payslip deleted");
      loadHistory();
    } else {
      toast.error(result.error || "Failed to delete payslip");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-CA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getChangePercent = (previous: number | null, current: number) => {
    if (!previous) return null;
    return ((current - previous) / previous) * 100;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          title="Payslips"
        >
          <Receipt className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payslips - {sourceName}</DialogTitle>
          <DialogDescription>
            Current: {currentGross ? formatCurrency(currentGross) : "N/A"} gross /{" "}
            {currentNet ? formatCurrency(currentNet) : "N/A"} net per pay
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Add Payslip Button - opens separate dialog */}
          <AddPayslipDialog
            incomeSourceId={incomeSourceId}
            sourceName={sourceName}
            onSuccess={loadHistory}
          />

          {/* Payslip history grouped by year */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payslips recorded yet.
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(
                history.reduce((acc, record) => {
                  const year = new Date(record.effectiveDate).getFullYear();
                  if (!acc[year]) acc[year] = [];
                  acc[year].push(record);
                  return acc;
                }, {} as Record<number, IncomeChange[]>)
              )
                .sort(([a], [b]) => Number(b) - Number(a))
                .map(([year, records]) => (
                  <div key={year} className="space-y-2">
                    <h4 className="text-sm font-semibold text-muted-foreground border-b pb-1">
                      {year}
                    </h4>
                    <div className="space-y-2">
                      {records.map((record) => {
                        const grossChange = getChangePercent(
                          record.previousGross,
                          record.newGross
                        );
                        const isIncrease = grossChange && grossChange > 0;

                        return (
                          <div
                            key={record.id}
                            className="border rounded-lg p-3 hover:bg-slate-50 dark:hover:bg-slate-900/50"
                          >
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {formatDate(record.effectiveDate)}
                                  </span>
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                    {record.changeReason}
                                  </span>
                                  {grossChange !== null && (
                                    <span
                                      className={`flex items-center gap-0.5 text-xs ${
                                        isIncrease
                                          ? "text-emerald-600"
                                          : "text-rose-600"
                                      }`}
                                    >
                                      {isIncrease ? (
                                        <TrendingUp className="h-3 w-3" />
                                      ) : (
                                        <TrendingDown className="h-3 w-3" />
                                      )}
                                      {Math.abs(grossChange).toFixed(1)}%
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  <span className="font-mono">
                                    {formatCurrency(record.newGross)}
                                  </span>{" "}
                                  gross /{" "}
                                  <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(record.newNet)}
                                  </span>{" "}
                                  net
                                  {record.previousGross && (
                                    <span className="text-xs ml-2">
                                      (prev: {formatCurrency(record.previousNet!)})
                                    </span>
                                  )}
                                </div>
                                {record.notes && (
                                  <div className="text-xs text-muted-foreground">
                                    {record.notes}
                                  </div>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDelete(record.id)}
                                className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/50 text-slate-400 hover:text-rose-600 transition-colors"
                                title="Delete payslip"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
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

// Separate dialog for adding a payslip
function AddPayslipDialog({
  incomeSourceId,
  sourceName,
  onSuccess,
}: {
  incomeSourceId: number;
  sourceName: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);

  // Form state
  const [payDate, setPayDate] = useState("");
  const [newGross, setNewGross] = useState("");
  const [newNet, setNewNet] = useState("");
  const [payType, setPayType] = useState("Regular");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Reset form when opening
      setPayDate("");
      setNewGross("");
      setNewNet("");
      setPayType("Regular");
      setNotes("");
    }
    setOpen(newOpen);
  };

  const handleAdd = async () => {
    if (!payDate) {
      toast.error("Pay date is required");
      return;
    }

    const grossValue = parseFloat(newGross);
    const netValue = parseFloat(newNet);

    if (isNaN(grossValue) || grossValue <= 0) {
      toast.error("Please enter a valid gross pay amount");
      return;
    }

    if (isNaN(netValue) || netValue <= 0) {
      toast.error("Please enter a valid net pay amount");
      return;
    }

    setSaving(true);
    const result = await addIncomeChange(incomeSourceId, {
      effectiveDate: new Date(payDate),
      newGross: grossValue,
      newNet: netValue,
      changeReason: payType,
      notes: notes.trim() || undefined,
    });

    setSaving(false);

    if (result.success) {
      toast.success("Payslip added");
      setOpen(false);
      onSuccess();
    } else {
      toast.error(result.error || "Failed to add payslip");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-violet-100 dark:bg-violet-900/50 px-3 py-2 text-sm font-medium text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800/50 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Payslip
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Payslip</DialogTitle>
          <DialogDescription>{sourceName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label htmlFor="payDate" className="text-sm font-medium">
                Pay Date *
              </label>
              <Input
                id="payDate"
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="newGross" className="text-sm font-medium">
                Gross Pay *
              </label>
              <Input
                id="newGross"
                type="number"
                step="0.01"
                value={newGross}
                onChange={(e) => setNewGross(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="newNet" className="text-sm font-medium">
                Net Pay *
              </label>
              <Input
                id="newNet"
                type="number"
                step="0.01"
                value={newNet}
                onChange={(e) => setNewNet(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="payType" className="text-sm font-medium">
                Pay Type
              </label>
              <select
                id="payType"
                value={payType}
                onChange={(e) => setPayType(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-violet-300 dark:bg-slate-800 dark:border-slate-700"
              >
                {PAY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-medium">
                Notes
              </label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={saving}
            className="px-3 py-2 text-sm text-slate-600 hover:text-slate-800 dark:text-slate-400"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving}
            className="px-3 py-2 text-sm bg-violet-600 text-white rounded-md hover:bg-violet-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Add Payslip"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
