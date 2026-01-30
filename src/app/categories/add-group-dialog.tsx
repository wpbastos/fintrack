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
import { createCategoryGroup } from "./actions";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const GROUP_TYPES = ["Expense", "Income", "Transfer", "Investment"] as const;

export function AddGroupDialog() {
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
        <button className="inline-flex items-center gap-2 rounded-md bg-violet-100 dark:bg-violet-900/50 px-3 py-2 text-sm font-medium text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800/50 transition-colors">
          <Plus className="h-4 w-4" />
          Add Group
        </button>
      </DialogTrigger>
      <DialogContent>
        <AddGroupForm
          key={formKey}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function AddGroupForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [isPending, setIsPending] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupType, setGroupType] = useState<string>("Expense");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!groupName.trim()) {
      toast.error("Group name is required");
      return;
    }

    setIsPending(true);

    const result = await createCategoryGroup({
      groupName: groupName.trim(),
      groupType,
      notes: notes.trim() || undefined,
    });

    setIsPending(false);

    if (result.success) {
      toast.success("Group created");
      onSuccess();
    } else {
      toast.error(result.error || "Failed to create group");
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Category Group</DialogTitle>
        <DialogDescription>Create a new category group.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="group-name" className="text-sm font-medium">
              Group Name *
            </label>
            <Input
              id="group-name"
              placeholder="e.g., Living Expenses"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="group-type" className="text-sm font-medium">
              Group Type *
            </label>
            <select
              id="group-type"
              value={groupType}
              onChange={(e) => setGroupType(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-violet-300 dark:bg-slate-800 dark:border-slate-700"
            >
              {GROUP_TYPES.map((type) => (
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
