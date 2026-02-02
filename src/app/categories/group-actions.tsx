"use client";

import { useState } from "react";
import { PowerOff, Power, Pencil, Trash2 } from "lucide-react";
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
import { disableAllInGroup, enableAllInGroup, updateCategoryGroup, deleteCategoryGroup } from "./actions";
import { toast } from "sonner";

const GROUP_TYPES = ["Expense", "Income", "Transfer", "Investment"] as const;

const colorPalette = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e",
  "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#78716c",
];

interface GroupActionsProps {
  groupId: number;
  groupName: string;
  groupType: string;
  color: string | null;
  notes: string | null;
}

export function GroupActions({ groupId, groupName, groupType, color, notes }: GroupActionsProps) {
  const [isPending, setIsPending] = useState(false);

  const handleDisableAll = async () => {
    setIsPending(true);
    await disableAllInGroup(groupId);
    setIsPending(false);
    toast.success("All categories disabled");
  };

  const handleEnableAll = async () => {
    setIsPending(true);
    await enableAllInGroup(groupId);
    setIsPending(false);
    toast.success("All categories enabled");
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${groupName}" and all its categories? This cannot be undone.`)) return;

    setIsPending(true);
    const result = await deleteCategoryGroup(groupId);
    setIsPending(false);

    if (result.success) {
      toast.success("Group deleted");
    } else {
      toast.error(result.error || "Failed to delete group");
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={handleEnableAll}
        disabled={isPending}
        className="p-1.5 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors disabled:opacity-50"
        title="Enable all categories"
      >
        <Power className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={handleDisableAll}
        disabled={isPending}
        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-50"
        title="Disable all categories"
      >
        <PowerOff className="h-4 w-4" />
      </button>
      <GroupEditDialog
        groupId={groupId}
        groupName={groupName}
        groupType={groupType}
        color={color}
        notes={notes}
      />
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="p-1.5 rounded hover:bg-rose-100 dark:hover:bg-rose-900/50 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors disabled:opacity-50"
        title="Delete group"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function GroupEditDialog({
  groupId,
  groupName,
  groupType,
  color,
  notes,
}: {
  groupId: number;
  groupName: string;
  groupType: string;
  color: string | null;
  notes: string | null;
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
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          title="Edit group"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <GroupEditForm
          key={formKey}
          groupId={groupId}
          groupName={groupName}
          groupType={groupType}
          color={color}
          notes={notes}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function GroupEditForm({
  groupId,
  groupName,
  groupType,
  color: initialColor,
  notes,
  onSuccess,
  onCancel,
}: {
  groupId: number;
  groupName: string;
  groupType: string;
  color: string | null;
  notes: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [isPending, setIsPending] = useState(false);
  const [name, setName] = useState(groupName);
  const [type, setType] = useState(groupType);
  const [color, setColor] = useState(initialColor ?? "#6366f1");
  const [notesValue, setNotesValue] = useState(notes ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsPending(true);

    const result = await updateCategoryGroup(groupId, {
      name: name.trim(),
      type: type,
      color: color || undefined,
      notes: notesValue.trim() || undefined,
    });

    setIsPending(false);

    if (result.success) {
      toast.success("Group updated");
      onSuccess();
    } else {
      toast.error(result.error || "Failed to update group");
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Group</DialogTitle>
        <DialogDescription>Update the category group details below.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="group-name" className="text-sm font-medium">
              Name *
            </label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group name"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="group-type" className="text-sm font-medium">
              Type
            </label>
            <select
              id="group-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-violet-300 dark:bg-slate-800 dark:border-slate-700"
              disabled={isPending}
            >
              {GROUP_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
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
              />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="group-notes" className="text-sm font-medium">
              Notes
            </label>
            <Input
              id="group-notes"
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
