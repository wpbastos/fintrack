"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createCategory } from "./actions";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const necessityOptions = ["Essential", "Important", "Discretionary", "Wasteful"] as const;

const necessityStyles: Record<string, string> = {
  Essential: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  Important: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  Discretionary: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  Wasteful: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

interface CategoryGroup {
  id: number;
  groupName: string;
  groupType: string;
}

interface AddCategoryDialogProps {
  groups: CategoryGroup[];
}

export function AddCategoryDialog({ groups }: AddCategoryDialogProps) {
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
        <button className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors">
          <Plus className="h-4 w-4" />
          Add Category
        </button>
      </DialogTrigger>
      <DialogContent>
        <AddCategoryForm
          key={formKey}
          groups={groups}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function AddCategoryForm({
  groups,
  onSuccess,
  onCancel,
}: {
  groups: CategoryGroup[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [isPending, setIsPending] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [groupId, setGroupId] = useState<number | "">(groups[0]?.id ?? "");
  const [necessityLevel, setNecessityLevel] = useState("Discretionary");
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [notes, setNotes] = useState("");

  const selectedGroup = groups.find((g) => g.id === groupId);
  const isIncome = selectedGroup?.groupType === "Income";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!categoryName.trim()) {
      toast.error("Category name is required");
      return;
    }

    if (!groupId) {
      toast.error("Please select a group");
      return;
    }

    setIsPending(true);

    const result = await createCategory({
      categoryName: categoryName.trim(),
      groupId: groupId as number,
      necessityLevel,
      monthlyBudget: monthlyBudget ? parseFloat(monthlyBudget) : undefined,
      notes: notes.trim() || undefined,
    });

    setIsPending(false);

    if (result.success) {
      toast.success("Category created");
      onSuccess();
    } else {
      toast.error(result.error || "Failed to create category");
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Category</DialogTitle>
        <DialogDescription>Create a new top-level category.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="category-name" className="text-sm font-medium">
              Category Name *
            </label>
            <Input
              id="category-name"
              placeholder="e.g., Groceries"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="group" className="text-sm font-medium">
              Group *
            </label>
            <select
              id="group"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value ? parseInt(e.target.value) : "")}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-violet-300 dark:bg-slate-800 dark:border-slate-700"
            >
              <option value="">Select a group...</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.groupName} ({group.groupType})
                </option>
              ))}
            </select>
          </div>

          {!isIncome && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Necessity Level</label>
              <div className="flex flex-wrap gap-1">
                {necessityOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setNecessityLevel(option)}
                    className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${
                      necessityStyles[option]
                    } ${
                      option === necessityLevel
                        ? "ring-2 ring-violet-400"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isIncome && (
            <div className="space-y-2">
              <label htmlFor="monthly-budget" className="text-sm font-medium">
                Monthly Budget
              </label>
              <Input
                id="monthly-budget"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium">
              Notes
            </label>
            <Input
              id="notes"
              placeholder="Optional notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
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
            {isPending ? "Creating..." : "Create"}
          </button>
        </DialogFooter>
      </form>
    </>
  );
}
