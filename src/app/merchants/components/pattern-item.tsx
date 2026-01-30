"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, X, Check } from "lucide-react";
import { updatePattern, deletePattern } from "../actions";
import { toast } from "sonner";
import type { Pattern } from "../types";

interface PatternItemProps {
  pattern: Pattern;
  onDelete: (patternId: number) => void;
  onUpdate: (patternId: number, pattern: string, priority: number) => void;
}

export function PatternItem({ pattern, onDelete, onUpdate }: PatternItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(pattern.pattern);
  const [editPriority, setEditPriority] = useState(pattern.priority);

  const handleSave = async () => {
    const trimmed = editValue.trim().toUpperCase();
    if (!trimmed) {
      toast.error("Pattern cannot be empty");
      return;
    }

    const result = await updatePattern(pattern.id, {
      pattern: trimmed,
      priority: editPriority,
    });

    if (result.success) {
      onUpdate(pattern.id, trimmed, editPriority);
      setIsEditing(false);
      toast.success("Pattern updated");
    } else {
      toast.error(result.error || "Failed to update pattern");
    }
  };

  const handleDelete = async () => {
    const result = await deletePattern(pattern.id);
    if (result.success) {
      onDelete(pattern.id);
      toast.success("Pattern deleted");
    } else {
      toast.error(result.error || "Failed to delete pattern");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(pattern.pattern);
    setEditPriority(pattern.priority);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-md px-3 py-2">
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value.toUpperCase())}
          className="flex-1 h-8 font-mono text-sm"
          autoFocus
        />
        <Input
          type="number"
          value={editPriority}
          onChange={(e) => setEditPriority(parseInt(e.target.value) || 10)}
          className="w-16 h-8 text-sm"
          min={1}
          max={100}
          title="Priority"
        />
        <button
          type="button"
          onClick={handleSave}
          className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-slate-400 hover:text-emerald-600"
          title="Save"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600"
          title="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-md px-3 py-2">
      <code className="flex-1 text-sm font-mono">{pattern.pattern}</code>
      <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded">
        {pattern.priority}
      </span>
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600"
        title="Edit"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={handleDelete}
        className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/50 text-slate-400 hover:text-rose-600"
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
