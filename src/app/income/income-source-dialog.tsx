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
import {
  createIncome,
  updateIncome,
  addIncomePattern,
  updateIncomePattern,
  deleteIncomePattern,
  getIncomePatterns,
  getPersons,
  getIncomeCategories,
  getAccounts,
  getPositions,
} from "./actions";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";

const PAY_FREQUENCIES = [
  "Weekly",
  "Bi-weekly",
  "Semi-monthly",
  "Monthly",
  "Irregular",
];

interface Pattern {
  id: number;
  pattern: string;
  priority: number;
  notes: string | null;
}

interface Category {
  id: number;
  name: string;
  groupName: string;
}

interface PersonOption {
  id: number;
  name: string;
}

interface AccountOption {
  id: number;
  name: string;
  institutionName: string | null;
}

interface PositionOption {
  id: number;
  title: string;
  department: string | null;
  employerId: number;
  employerName: string;
}

interface Income {
  id: number;
  name: string;
  type: string;
  positionId: number | null;
  position: {
    id: number;
    title: string;
    department: string | null;
    employer: { id: number; name: string; website: string | null };
  } | null;
  personId: number | null;
  person: { id: number; name: string } | null;
  categoryId: number | null;
  category: { id: number; name: string } | null;
  depositAccountId: number | null;
  depositAccount: { id: number; name: string } | null;
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
}

interface IncomeDialogProps {
  income?: Income;
  trigger?: React.ReactNode;
}

export function IncomeDialog({ income, trigger }: IncomeDialogProps) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setFormKey((k) => k + 1);
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <button className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors">
            <Plus className="h-4 w-4" />
            Add Income
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <IncomeForm
          key={formKey}
          income={income}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function IncomeForm({
  income,
  onSuccess,
  onCancel,
}: {
  income?: Income;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [isPending, setIsPending] = useState(false);

  // Form state
  const [name, setSourceName] = useState(income?.name || "");
  const [personId, setPersonId] = useState<number | "">(income?.personId || "");
  const [categoryId, setCategoryId] = useState<number | "">(income?.categoryId || "");
  const [accountId, setAccountId] = useState<number | "">(income?.depositAccountId || "");
  const [payFrequency, setPayFrequency] = useState(income?.payFrequency || "");
  const [positionId, setPositionId] = useState<number | "">(income?.positionId || "");
  const [startDate, setStartDate] = useState(
    income?.startDate ? new Date(income.startDate).toISOString().split("T")[0] : ""
  );
  const [notes, setNotes] = useState(income?.notes || "");

  // Lookup data
  const [persons, setPersons] = useState<PersonOption[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [positions, setPositions] = useState<PositionOption[]>([]);

  // Pattern state
  const [patterns, setPatterns] = useState<Pattern[]>(income?.patterns || []);
  const [newPattern, setNewPattern] = useState("");
  const [newPatternPriority, setNewPatternPriority] = useState(10);
  const [editingPatternId, setEditingPatternId] = useState<number | null>(null);
  const [editingPatternValue, setEditingPatternValue] = useState("");
  const [editingPatternPriority, setEditingPatternPriority] = useState(10);

  // Pending patterns for new income sources (stored in memory until save)
  const [pendingPatterns, setPendingPatterns] = useState<{ pattern: string; priority: number }[]>([]);

  const isEdit = !!income;

  // Load lookup data on mount
  useEffect(() => {
    Promise.all([getPersons(), getIncomeCategories(), getAccounts(), getPositions()]).then(
      ([ch, cat, acc, pos]) => {
        setPersons(ch);
        setCategories(cat);
        setAccounts(acc);
        setPositions(pos);
      }
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Source name is required");
      return;
    }

    setIsPending(true);

    if (isEdit) {
      const result = await updateIncome(income.id, {
        name: name.trim(),
        personId: personId ? (personId as number) : null,
        categoryId: categoryId ? (categoryId as number) : null,
        depositAccountId: accountId ? (accountId as number) : null,
        payFrequency: payFrequency || null,
        positionId: positionId ? (positionId as number) : null,
        startDate: startDate ? new Date(startDate) : null,
        notes: notes.trim() || null,
      });

      setIsPending(false);

      if (result.success) {
        toast.success("Income source updated");
        onSuccess();
      } else {
        toast.error(result.error || "Failed to update income source");
      }
    } else {
      const result = await createIncome({
        name: name.trim(),
        personId: personId ? (personId as number) : undefined,
        categoryId: categoryId ? (categoryId as number) : undefined,
        depositAccountId: accountId ? (accountId as number) : undefined,
        payFrequency: payFrequency || undefined,
        positionId: positionId ? (positionId as number) : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        notes: notes.trim() || undefined,
      });

      if (result.success && result.income) {
        // Add pending patterns to the newly created income source
        for (const p of pendingPatterns) {
          await addIncomePattern(result.income.id, p.pattern, p.priority);
        }
        setIsPending(false);
        toast.success("Income source created");
        onSuccess();
      } else {
        setIsPending(false);
        toast.error(result.error || "Failed to create income source");
      }
    }
  };

  const handleAddPattern = async () => {
    if (!newPattern.trim()) return;

    if (isEdit && income) {
      // Edit mode: save directly to database
      const result = await addIncomePattern(
        income.id,
        newPattern.trim(),
        newPatternPriority
      );

      if (result.success && result.pattern) {
        setPatterns([
          ...patterns,
          {
            id: result.pattern.id,
            pattern: newPattern.toUpperCase().trim(),
            priority: newPatternPriority,
            notes: null,
          },
        ]);
        setNewPattern("");
        setNewPatternPriority(10);
        toast.success("Pattern added");
      } else {
        toast.error(result.error || "Failed to add pattern");
      }
    } else {
      // Create mode: store in pending patterns
      setPendingPatterns([
        ...pendingPatterns,
        { pattern: newPattern.toUpperCase().trim(), priority: newPatternPriority },
      ]);
      setNewPattern("");
      setNewPatternPriority(10);
    }
  };

  const handleRemovePendingPattern = (index: number) => {
    setPendingPatterns(pendingPatterns.filter((_, i) => i !== index));
  };

  const handleUpdatePattern = async (patternId: number) => {
    const result = await updateIncomePattern(patternId, {
      pattern: editingPatternValue.trim(),
      priority: editingPatternPriority,
    });

    if (result.success) {
      setPatterns(
        patterns.map((p) =>
          p.id === patternId
            ? {
                ...p,
                pattern: editingPatternValue.toUpperCase().trim(),
                priority: editingPatternPriority,
              }
            : p
        )
      );
      setEditingPatternId(null);
      toast.success("Pattern updated");
    } else {
      toast.error(result.error || "Failed to update pattern");
    }
  };

  const handleDeletePattern = async (patternId: number) => {
    const result = await deleteIncomePattern(patternId);
    if (result.success) {
      setPatterns(patterns.filter((p) => p.id !== patternId));
      toast.success("Pattern deleted");
    } else {
      toast.error(result.error || "Failed to delete pattern");
    }
  };

  const refreshPatterns = async () => {
    if (income) {
      const fresh = await getIncomePatterns(income.id);
      setPatterns(fresh);
    }
  };

  // Group categories by group name
  const groupedCategories = categories.reduce(
    (acc, cat) => {
      if (!acc[cat.groupName]) acc[cat.groupName] = [];
      acc[cat.groupName].push(cat);
      return acc;
    },
    {} as Record<string, typeof categories>
  );

  // Check if selected category belongs to "Employer" group
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const isEmployerCategory = selectedCategory?.groupName === "Employer";

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit Income Source" : "Add Income Source"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Update income source details and matching patterns."
            : "Enter the details for the new income source."}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 py-4">
          {/* Row 1: Name + Person */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Source Name *
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="e.g., TechCorp Inc., CRA"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="person" className="text-sm font-medium">
                Person
              </label>
              <select
                id="person"
                value={personId}
                onChange={(e) => setPersonId(e.target.value ? parseInt(e.target.value) : "")}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-violet-300 dark:bg-slate-800 dark:border-slate-700"
              >
                <option value="">Select person...</option>
                {persons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Category + Account */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="category" className="text-sm font-medium">
                Category
              </label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => {
                  const newCategoryId = e.target.value ? parseInt(e.target.value) : "";
                  setCategoryId(newCategoryId);
                  // Clear position if switching to non-Employer category
                  const newCategory = categories.find((c) => c.id === newCategoryId);
                  if (newCategory?.groupName !== "Employer") {
                    setPositionId("");
                  }
                }}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-violet-300 dark:bg-slate-800 dark:border-slate-700"
              >
                <option value="">Select category...</option>
                {Object.entries(groupedCategories).map(([groupName, cats]) => (
                  <optgroup key={groupName} label={groupName}>
                    {cats.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="account" className="text-sm font-medium">
                Deposit Account
              </label>
              <select
                id="account"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value ? parseInt(e.target.value) : "")}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-violet-300 dark:bg-slate-800 dark:border-slate-700"
              >
                <option value="">Select account...</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                    {acc.institutionName && ` (${acc.institutionName})`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Pay Frequency + Position (Position only for Employer category) */}
          <div className={`grid gap-4 ${isEmployerCategory ? "grid-cols-2" : "grid-cols-2"}`}>
            <div className="space-y-2">
              <label htmlFor="payFrequency" className="text-sm font-medium">
                Pay Frequency
              </label>
              <select
                id="payFrequency"
                value={payFrequency}
                onChange={(e) => setPayFrequency(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-violet-300 dark:bg-slate-800 dark:border-slate-700"
              >
                <option value="">Not set</option>
                {PAY_FREQUENCIES.map((freq) => (
                  <option key={freq} value={freq}>
                    {freq}
                  </option>
                ))}
              </select>
            </div>
            {isEmployerCategory && (
              <div className="space-y-2">
                <label htmlFor="position" className="text-sm font-medium">
                  Position
                </label>
                <select
                  id="position"
                  value={positionId}
                  onChange={(e) => setPositionId(e.target.value ? parseInt(e.target.value) : "")}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-violet-300 dark:bg-slate-800 dark:border-slate-700"
                >
                  <option value="">Select position...</option>
                  {Object.entries(
                    positions.reduce((acc, pos) => {
                      if (!acc[pos.employerName]) acc[pos.employerName] = [];
                      acc[pos.employerName].push(pos);
                      return acc;
                    }, {} as Record<string, typeof positions>)
                  ).map(([employerName, employerPositions]) => (
                    <optgroup key={employerName} label={employerName}>
                      {employerPositions.map((pos) => (
                        <option key={pos.id} value={pos.id}>
                          {pos.title}
                          {pos.department && ` (${pos.department})`}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Row 4: Start Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="startDate" className="text-sm font-medium">
                Start Date
              </label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium">
              Notes
            </label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
            />
          </div>

          {/* Patterns Section */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Matching Patterns</label>
              {isEdit && (
                <button
                  type="button"
                  onClick={refreshPatterns}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Refresh
                </button>
              )}
            </div>

            {/* Existing patterns (edit mode) */}
            {isEdit && patterns.length > 0 && (
              <div className="space-y-2">
                {patterns.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-md px-3 py-2"
                  >
                    {editingPatternId === p.id ? (
                      <>
                        <Input
                          value={editingPatternValue}
                          onChange={(e) => setEditingPatternValue(e.target.value.toUpperCase())}
                          className="flex-1 h-8 font-mono text-sm"
                          autoFocus
                        />
                        <Input
                          type="number"
                          value={editingPatternPriority}
                          onChange={(e) => setEditingPatternPriority(parseInt(e.target.value) || 10)}
                          className="w-16 h-8 text-sm"
                          min={1}
                          max={100}
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdatePattern(p.id)}
                          className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-slate-400 hover:text-emerald-600"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPatternId(null)}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <code className="flex-1 text-sm font-mono">{p.pattern}</code>
                        <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded">
                          {p.priority}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPatternId(p.id);
                            setEditingPatternValue(p.pattern);
                            setEditingPatternPriority(p.priority);
                          }}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePattern(p.id)}
                          className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/50 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Pending patterns (create mode) */}
            {!isEdit && pendingPatterns.length > 0 && (
              <div className="space-y-2">
                {pendingPatterns.map((p, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-md px-3 py-2"
                  >
                    <code className="flex-1 text-sm font-mono">{p.pattern}</code>
                    <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded">
                      {p.priority}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemovePendingPattern(index)}
                      className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/50 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new pattern */}
            <div className="flex items-center gap-2">
              <Input
                value={newPattern}
                onChange={(e) => setNewPattern(e.target.value.toUpperCase())}
                placeholder="Add pattern (e.g., TECHCORP PAYROLL)"
                className="flex-1 font-mono text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddPattern();
                  }
                }}
              />
              <Input
                type="number"
                value={newPatternPriority}
                onChange={(e) => setNewPatternPriority(parseInt(e.target.value) || 10)}
                className="w-16 text-sm"
                min={1}
                max={100}
              />
              <button
                type="button"
                onClick={handleAddPattern}
                disabled={!newPattern.trim()}
                className="px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="px-3 py-2 text-sm text-slate-600 hover:text-slate-800 dark:text-slate-400"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-3 py-2 text-sm bg-violet-600 text-white rounded-md hover:bg-violet-700 disabled:opacity-50"
          >
            {isPending ? "Saving..." : isEdit ? "Update" : "Create"}
          </button>
        </DialogFooter>
      </form>
    </>
  );
}

// Edit button component for table rows
export function IncomeEditButton({ income }: { income: Income }) {
  return (
    <IncomeDialog
      income={income}
      trigger={
        <button
          type="button"
          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      }
    />
  );
}
