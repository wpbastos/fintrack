"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
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
import { updateParentCategory, deleteParentCategory } from "./actions";
import { BudgetPeriodsDialog } from "./budget-periods-dialog";
import { toast } from "sonner";

interface CategoryActionsProps {
  categoryId: number;
  categoryName: string;
  necessityLevel: string;
  notes: string | null;
  hasChildren: boolean;
  isIncome: boolean;
  monthlyBudget: number | null;
}

const necessityOptions = ["Essential", "Important", "Discretionary", "Wasteful"] as const;

const necessityStyles: Record<string, string> = {
  Essential: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  Important: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  Discretionary: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  Wasteful: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

export function CategoryActions({
  categoryId,
  categoryName,
  necessityLevel,
  notes,
  hasChildren,
  isIncome,
  monthlyBudget,
}: CategoryActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete "${categoryName}"?${hasChildren ? " This will also delete all subcategories." : ""}`)) {
      return;
    }

    setIsDeleting(true);
    const result = await deleteParentCategory(categoryId);
    setIsDeleting(false);

    if (result.success) {
      toast.success("Category deleted");
    } else {
      toast.error(result.error || "Failed to delete category");
    }
  };

  return (
    <div className="flex items-center gap-1">
      {!isIncome && (
        <BudgetPeriodsDialog
          categoryId={categoryId}
          categoryName={categoryName}
          currentBudget={monthlyBudget}
        />
      )}
      <CategoryEditDialog
        categoryId={categoryId}
        categoryName={categoryName}
        necessityLevel={necessityLevel}
        notes={notes}
        isIncome={isIncome}
      />
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting || isPending}
        className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/50 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors disabled:opacity-50"
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function CategoryEditDialog({
  categoryId,
  categoryName,
  necessityLevel,
  notes,
  isIncome,
}: {
  categoryId: number;
  categoryName: string;
  necessityLevel: string;
  notes: string | null;
  isIncome: boolean;
}) {
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
        <button
          type="button"
          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <CategoryEditForm
          key={formKey}
          categoryId={categoryId}
          categoryName={categoryName}
          necessityLevel={necessityLevel}
          notes={notes}
          isIncome={isIncome}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function CategoryEditForm({
  categoryId,
  categoryName,
  necessityLevel,
  notes,
  isIncome,
  onSuccess,
  onCancel,
}: {
  categoryId: number;
  categoryName: string;
  necessityLevel: string;
  notes: string | null;
  isIncome: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [isPending, setIsPending] = useState(false);
  const [name, setName] = useState(categoryName);
  const [necessity, setNecessity] = useState(necessityLevel);
  const [notesValue, setNotesValue] = useState(notes ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsPending(true);

    const result = await updateParentCategory(
      categoryId,
      name.trim(),
      necessity,
      notesValue.trim() || undefined
    );

    setIsPending(false);

    if (result.success) {
      toast.success("Category updated");
      onSuccess();
    } else {
      toast.error(result.error || "Failed to update category");
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Category</DialogTitle>
        <DialogDescription>Update the category details below.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="category-name" className="text-sm font-medium">
              Name *
            </label>
            <Input
              id="category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          {!isIncome && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Necessity</label>
              <div className="flex flex-wrap gap-2">
                {necessityOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setNecessity(option)}
                    className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                      necessityStyles[option]
                    } ${
                      option === necessity
                        ? "ring-2 ring-violet-400"
                        : "opacity-60 hover:opacity-100"
                    }`}
                    disabled={isPending}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium">
              Notes
            </label>
            <Input
              id="notes"
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              placeholder="Optional notes"
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
            {isPending ? "Saving..." : "Update"}
          </button>
        </DialogFooter>
      </form>
    </>
  );
}
