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
import { updateChildCategory, deleteChildCategory } from "./actions";
import { toast } from "sonner";

interface ChildActionsProps {
  categoryId: number;
  categoryName: string;
  necessityLevel: string;
  color: string | null;
  notes: string | null;
  isIncome: boolean;
}

const necessityOptions = ["Essential", "Important", "Discretionary", "Wasteful"] as const;

const necessityStyles: Record<string, string> = {
  Essential: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  Important: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  Discretionary: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  Wasteful: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

const colorPalette = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e",
  "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#78716c",
];

export function ChildActions({
  categoryId,
  categoryName,
  necessityLevel,
  color,
  notes,
  isIncome,
}: ChildActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete "${categoryName}"?`)) {
      return;
    }

    setIsDeleting(true);
    const result = await deleteChildCategory(categoryId);
    setIsDeleting(false);

    if (result.success) {
      toast.success("Category deleted");
    } else {
      toast.error(result.error || "Failed to delete category");
    }
  };

  return (
    <div className="flex items-center gap-1">
      <ChildEditDialog
        categoryId={categoryId}
        categoryName={categoryName}
        necessityLevel={necessityLevel}
        color={color}
        notes={notes}
        isIncome={isIncome}
      />
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/50 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors disabled:opacity-50"
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ChildEditDialog({
  categoryId,
  categoryName,
  necessityLevel,
  color,
  notes,
  isIncome,
}: {
  categoryId: number;
  categoryName: string;
  necessityLevel: string;
  color: string | null;
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
        <ChildEditForm
          key={formKey}
          categoryId={categoryId}
          categoryName={categoryName}
          necessityLevel={necessityLevel}
          color={color}
          notes={notes}
          isIncome={isIncome}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function ChildEditForm({
  categoryId,
  categoryName,
  necessityLevel,
  color: initialColor,
  notes,
  isIncome,
  onSuccess,
  onCancel,
}: {
  categoryId: number;
  categoryName: string;
  necessityLevel: string;
  color: string | null;
  notes: string | null;
  isIncome: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [isPending, setIsPending] = useState(false);
  const [name, setName] = useState(categoryName);
  const [necessity, setNecessity] = useState(necessityLevel);
  const [color, setColor] = useState(initialColor ?? "#6366f1");
  const [notesValue, setNotesValue] = useState(notes ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsPending(true);

    const result = await updateChildCategory(
      categoryId,
      name.trim(),
      necessity,
      notesValue.trim() || undefined,
      color || undefined
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
        <DialogTitle>Edit Subcategory</DialogTitle>
        <DialogDescription>Update the subcategory details below.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="child-name" className="text-sm font-medium">
              Name *
            </label>
            <Input
              id="child-name"
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
            <label className="text-sm font-medium">Color</label>
            <div className="flex flex-wrap gap-1.5">
              {colorPalette.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-md transition-all ${
                    color === c ? "ring-2 ring-offset-2 ring-violet-500" : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                  disabled={isPending}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div
                className="w-8 h-8 rounded-md border"
                style={{ backgroundColor: color }}
              />
              <Input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#000000"
                className="w-28 font-mono text-sm"
                disabled={isPending}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="child-notes" className="text-sm font-medium">
              Notes
            </label>
            <Input
              id="child-notes"
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
