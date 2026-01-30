"use client";

import { useState, useEffect } from "react";
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
import {
  createMerchant,
  updateMerchant,
  getCategories,
  getPatterns,
  addPattern,
  updatePattern,
  deletePattern,
} from "./actions";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";

interface Category {
  id: number;
  categoryName: string;
}

interface Pattern {
  id: number;
  pattern: string;
  priority: number;
  notes: string | null;
}

interface Merchant {
  id: number;
  merchantName: string;
  merchantType: string | null;
  defaultCategoryId: number | null;
  defaultCategory: Category | null;
  website: string | null;
  notes: string | null;
  patterns?: Pattern[];
}

interface MerchantDialogProps {
  merchant?: Merchant;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function MerchantDialog({ merchant, trigger, onSuccess }: MerchantDialogProps) {
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
            Add Merchant
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <MerchantForm
          key={formKey}
          merchant={merchant}
          onSuccess={() => {
            setOpen(false);
            onSuccess?.();
          }}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function MerchantForm({
  merchant,
  onSuccess,
  onCancel,
}: {
  merchant?: Merchant;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [isPending, setIsPending] = useState(false);
  const [categories, setCategories] = useState<{ id: number; categoryName: string; groupName: string }[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [newPatterns, setNewPatterns] = useState<{ pattern: string; priority: number }[]>([]);

  const [merchantName, setMerchantName] = useState(merchant?.merchantName || "");
  const [defaultCategoryId, setDefaultCategoryId] = useState<number | "">(
    merchant?.defaultCategoryId || ""
  );
  const [website, setWebsite] = useState(merchant?.website || "");
  const [notes, setNotes] = useState(merchant?.notes || "");

  // New pattern input
  const [newPatternInput, setNewPatternInput] = useState("");
  const [newPatternPriority, setNewPatternPriority] = useState(10);

  // Editing pattern
  const [editingPatternId, setEditingPatternId] = useState<number | null>(null);
  const [editingPatternValue, setEditingPatternValue] = useState("");
  const [editingPatternPriority, setEditingPatternPriority] = useState(10);

  useEffect(() => {
    getCategories().then(setCategories);
    if (merchant) {
      getPatterns(merchant.id).then(setPatterns);
    }
  }, [merchant]);

  const handleAddNewPattern = () => {
    const trimmed = newPatternInput.trim().toUpperCase();
    if (!trimmed) return;

    // Check for duplicates in existing patterns and new patterns
    const existsInPatterns = patterns.some((p) => p.pattern === trimmed);
    const existsInNew = newPatterns.some((p) => p.pattern === trimmed);

    if (existsInPatterns || existsInNew) {
      toast.error("This pattern already exists");
      return;
    }

    if (merchant) {
      // For existing merchant, add directly to DB
      addPattern(merchant.id, trimmed, newPatternPriority).then((result) => {
        if (result.success && result.pattern) {
          setPatterns([...patterns, { id: result.pattern.id, pattern: trimmed, priority: newPatternPriority, notes: null }]);
          toast.success("Pattern added");
        } else {
          toast.error(result.error || "Failed to add pattern");
        }
      });
    } else {
      // For new merchant, store locally
      setNewPatterns([...newPatterns, { pattern: trimmed, priority: newPatternPriority }]);
    }

    setNewPatternInput("");
    setNewPatternPriority(10);
  };

  const handleRemoveNewPattern = (index: number) => {
    setNewPatterns(newPatterns.filter((_, i) => i !== index));
  };

  const handleDeletePattern = async (patternId: number) => {
    const result = await deletePattern(patternId);
    if (result.success) {
      setPatterns(patterns.filter((p) => p.id !== patternId));
      toast.success("Pattern deleted");
    } else {
      toast.error(result.error || "Failed to delete pattern");
    }
  };

  const handleStartEditPattern = (pattern: Pattern) => {
    setEditingPatternId(pattern.id);
    setEditingPatternValue(pattern.pattern);
    setEditingPatternPriority(pattern.priority);
  };

  const handleCancelEditPattern = () => {
    setEditingPatternId(null);
    setEditingPatternValue("");
    setEditingPatternPriority(10);
  };

  const handleSaveEditPattern = async () => {
    if (!editingPatternId) return;

    const trimmed = editingPatternValue.trim().toUpperCase();
    if (!trimmed) {
      toast.error("Pattern cannot be empty");
      return;
    }

    const result = await updatePattern(editingPatternId, {
      pattern: trimmed,
      priority: editingPatternPriority,
    });

    if (result.success) {
      setPatterns(
        patterns.map((p) =>
          p.id === editingPatternId
            ? { ...p, pattern: trimmed, priority: editingPatternPriority }
            : p
        )
      );
      setEditingPatternId(null);
      toast.success("Pattern updated");
    } else {
      toast.error(result.error || "Failed to update pattern");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!merchantName.trim()) {
      toast.error("Merchant name is required");
      return;
    }

    setIsPending(true);

    const data = {
      merchantName: merchantName.trim(),
      defaultCategoryId: defaultCategoryId ? Number(defaultCategoryId) : undefined,
      website: website.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (merchant) {
      // Update existing merchant
      const result = await updateMerchant(merchant.id, {
        merchantName: data.merchantName,
        defaultCategoryId: data.defaultCategoryId ?? null,
        website: data.website ?? null,
        notes: data.notes ?? null,
      });

      setIsPending(false);

      if (result.success) {
        toast.success("Merchant updated");
        onSuccess();
      } else {
        toast.error(result.error || "Failed to save merchant");
      }
    } else {
      // Create new merchant
      const result = await createMerchant(data);

      if (result.success && result.merchant) {
        // Add patterns for new merchant
        for (const np of newPatterns) {
          await addPattern(result.merchant.id, np.pattern, np.priority);
        }
        setIsPending(false);
        toast.success("Merchant created");
        onSuccess();
      } else {
        setIsPending(false);
        toast.error(result.error || "Failed to save merchant");
      }
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

  return (
    <>
      <DialogHeader>
        <DialogTitle>{merchant ? "Edit Merchant" : "Add Merchant"}</DialogTitle>
        <DialogDescription>
          {merchant
            ? "Update the merchant details and matching patterns."
            : "Enter the details for the new merchant."}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="merchant-name" className="text-sm font-medium">
              Merchant Name *
            </label>
            <Input
              id="merchant-name"
              placeholder="e.g., Amazon, Costco"
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="default-category" className="text-sm font-medium">
              Category
            </label>
            <select
              id="default-category"
              value={defaultCategoryId}
              onChange={(e) =>
                setDefaultCategoryId(e.target.value ? parseInt(e.target.value) : "")
              }
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-violet-300 dark:bg-slate-800 dark:border-slate-700"
            >
              <option value="">Select category...</option>
              {Object.entries(groupedCategories).map(([groupName, cats]) => (
                <optgroup key={groupName} label={groupName}>
                  {cats.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.categoryName}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="website" className="text-sm font-medium">
              Website
            </label>
            <Input
              id="website"
              placeholder="https://..."
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
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

          {/* Patterns Section */}
          <div className="space-y-3 pt-2 border-t">
            <label className="text-sm font-medium">Matching Patterns</label>
            <p className="text-xs text-muted-foreground">
              Patterns are used to match transaction descriptions. Higher priority patterns are checked first.
            </p>

            {/* Existing Patterns */}
            {patterns.length > 0 && (
              <div className="space-y-2">
                {patterns.map((pattern) => (
                  <div
                    key={pattern.id}
                    className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-md px-3 py-2"
                  >
                    {editingPatternId === pattern.id ? (
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
                          title="Priority"
                        />
                        <button
                          type="button"
                          onClick={handleSaveEditPattern}
                          className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-slate-400 hover:text-emerald-600"
                          title="Save"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEditPattern}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <code className="flex-1 text-sm font-mono">{pattern.pattern}</code>
                        <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded">
                          {pattern.priority}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStartEditPattern(pattern)}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePattern(pattern.id)}
                          className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/50 text-slate-400 hover:text-rose-600"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* New Patterns (for new merchant) */}
            {!merchant && newPatterns.length > 0 && (
              <div className="space-y-2">
                {newPatterns.map((np, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-violet-50 dark:bg-violet-900/20 rounded-md px-3 py-2"
                  >
                    <code className="flex-1 text-sm font-mono">{np.pattern}</code>
                    <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-violet-200 dark:bg-violet-800 rounded">
                      {np.priority}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveNewPattern(idx)}
                      className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/50 text-slate-400 hover:text-rose-600"
                      title="Remove"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Pattern */}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Add pattern (e.g., COSTCO, AMZN)"
                value={newPatternInput}
                onChange={(e) => setNewPatternInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddNewPattern();
                  }
                }}
                className="flex-1 font-mono text-sm"
              />
              <Input
                type="number"
                value={newPatternPriority}
                onChange={(e) => setNewPatternPriority(parseInt(e.target.value) || 10)}
                className="w-16 text-sm"
                min={1}
                max={100}
                title="Priority (higher = checked first)"
              />
              <button
                type="button"
                onClick={handleAddNewPattern}
                disabled={!newPatternInput.trim()}
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
            {isPending ? "Saving..." : merchant ? "Update" : "Create"}
          </button>
        </DialogFooter>
      </form>
    </>
  );
}

export function MerchantEditButton({
  merchant,
  onSuccess,
}: {
  merchant: Merchant;
  onSuccess?: () => void;
}) {
  return (
    <MerchantDialog
      merchant={merchant}
      onSuccess={onSuccess}
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
