"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { updateChildCategory, deleteChildCategory } from "./actions";

interface ChildActionsProps {
  categoryId: number;
  categoryName: string;
  notes: string | null;
}

export function ChildActions({ categoryId, categoryName, notes }: ChildActionsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [name, setName] = useState(categoryName);
  const [notesValue, setNotesValue] = useState(notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setIsEditing(false);
        setIsDeleting(false);
        setName(categoryName);
        setNotesValue(notes ?? "");
        setError(null);
      }
    }
    if (isEditing || isDeleting) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isEditing, isDeleting, categoryName, notes]);

  const handleUpdate = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setIsPending(true);
    setError(null);

    const result = await updateChildCategory(categoryId, name.trim(), notesValue.trim() || undefined);

    if (result.success) {
      setIsEditing(false);
    } else {
      setError(result.error ?? "Failed to update");
    }
    setIsPending(false);
  };

  const handleDelete = async () => {
    setIsPending(true);
    const result = await deleteChildCategory(categoryId);

    if (!result.success) {
      setError(result.error ?? "Failed to delete");
      setIsPending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleUpdate();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setIsDeleting(false);
      setName(categoryName);
      setNotesValue(notes ?? "");
      setError(null);
    }
  };

  return (
    <div className="relative flex items-center gap-1" ref={formRef}>
      <button
        type="button"
        onClick={() => {
          setIsEditing(true);
          setIsDeleting(false);
        }}
        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        title="Edit"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => {
          setIsDeleting(true);
          setIsEditing(false);
        }}
        className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/50 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {isEditing && (
        <div className="absolute right-0 z-50 mt-1 top-full w-64 rounded-md border bg-white dark:bg-slate-900 shadow-lg p-3">
          <div className="text-xs text-muted-foreground mb-2">Edit category</div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Name</label>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-violet-300 dark:bg-slate-800 dark:border-slate-700"
                disabled={isPending}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Notes</label>
              <textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && handleKeyDown(e)}
                placeholder="Optional"
                rows={2}
                className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-violet-300 dark:bg-slate-800 dark:border-slate-700 resize-none"
                disabled={isPending}
              />
            </div>
          </div>
          {error && <div className="text-xs text-rose-600 mt-1">{error}</div>}
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setName(categoryName);
                setNotesValue(notes ?? "");
                setError(null);
              }}
              className="px-2 py-1 text-xs text-slate-600 hover:text-slate-800 dark:text-slate-400"
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpdate}
              disabled={isPending || !name.trim()}
              className="px-2 py-1 text-xs bg-violet-600 text-white rounded hover:bg-violet-700 disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      {isDeleting && (
        <div className="absolute right-0 z-50 mt-1 top-full w-64 rounded-md border bg-white dark:bg-slate-900 shadow-lg p-3">
          <div className="text-sm mb-2">
            Delete <span className="font-medium">{categoryName}</span>?
          </div>
          <div className="text-xs text-muted-foreground mb-3">This action cannot be undone.</div>
          {error && <div className="text-xs text-rose-600 mb-2">{error}</div>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsDeleting(false);
                setError(null);
              }}
              className="px-2 py-1 text-xs text-slate-600 hover:text-slate-800 dark:text-slate-400"
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="px-2 py-1 text-xs bg-rose-600 text-white rounded hover:bg-rose-700 disabled:opacity-50"
            >
              {isPending ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
