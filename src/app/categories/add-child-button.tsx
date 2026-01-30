"use client";

import { useState, useRef, useEffect } from "react";
import { PlusCircle } from "lucide-react";
import { addChildCategory } from "./actions";

interface AddChildButtonProps {
  parentId: number;
  parentName: string;
}

export function AddChildButton({ parentId, parentName }: AddChildButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [parentBudget, setParentBudget] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setName("");
        setNotes("");
        setError(null);
        setShowConfirm(false);
        setParentBudget(null);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleSubmit = async (confirmClear = false) => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setIsPending(true);
    setError(null);

    const result = await addChildCategory(parentId, name.trim(), notes.trim() || undefined, confirmClear);

    if (result.needsConfirmation) {
      setParentBudget(result.parentBudget ?? null);
      setShowConfirm(true);
      setIsPending(false);
      return;
    }

    if (result.success) {
      setIsOpen(false);
      setName("");
      setNotes("");
      setShowConfirm(false);
      setParentBudget(null);
    } else {
      setError(result.error ?? "Failed to create");
    }
    setIsPending(false);
  };

  const handleConfirmClear = async () => {
    await handleSubmit(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setName("");
      setNotes("");
      setError(null);
      setShowConfirm(false);
      setParentBudget(null);
    }
  };

  return (
    <div className="relative" ref={formRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        title={`Add subcategory to ${parentName}`}
      >
        <PlusCircle className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-64 rounded-md border bg-white dark:bg-slate-900 shadow-lg p-3">
          {showConfirm ? (
            <>
              <div className="text-sm font-medium mb-2">Clear parent budget?</div>
              <div className="text-xs text-muted-foreground mb-3">
                <span className="font-medium">{parentName}</span> has a budget of{" "}
                <span className="font-medium text-violet-600">${parentBudget?.toLocaleString()}</span>.
                Adding subcategories will clear it (budget will be calculated from children).
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirm(false);
                    setParentBudget(null);
                  }}
                  className="px-2 py-1 text-xs text-slate-600 hover:text-slate-800 dark:text-slate-400"
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClear}
                  disabled={isPending}
                  className="px-2 py-1 text-xs bg-violet-600 text-white rounded hover:bg-violet-700 disabled:opacity-50"
                >
                  {isPending ? "Adding..." : "Clear & Add"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-xs text-muted-foreground mb-2">
                Add subcategory to <span className="font-medium">{parentName}</span>
              </div>
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
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onKeyDown={(e) => e.key === "Escape" && handleKeyDown(e)}
                    placeholder="Optional"
                    rows={2}
                    className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-violet-300 dark:bg-slate-800 dark:border-slate-700 resize-none"
                    disabled={isPending}
                  />
                </div>
              </div>
              {error && (
                <div className="text-xs text-rose-600 mt-1">{error}</div>
              )}
              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setName("");
                    setNotes("");
                    setError(null);
                    setShowConfirm(false);
                    setParentBudget(null);
                  }}
                  className="px-2 py-1 text-xs text-slate-600 hover:text-slate-800 dark:text-slate-400"
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={isPending || !name.trim()}
                  className="px-2 py-1 text-xs bg-violet-600 text-white rounded hover:bg-violet-700 disabled:opacity-50"
                >
                  {isPending ? "Adding..." : "Add"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
