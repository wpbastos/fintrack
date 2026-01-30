"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CategorySelect } from "./category-select";
import { PatternList } from "./pattern-list";
import { createMerchant, updateMerchant, getCategories, getPatterns, addPattern } from "../actions";
import { toast } from "sonner";
import type { Merchant, Pattern, NewPattern, CategoryWithGroup } from "../types";

interface MerchantFormProps {
  merchant?: Merchant;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MerchantForm({ merchant, onSuccess, onCancel }: MerchantFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [categories, setCategories] = useState<CategoryWithGroup[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [newPatterns, setNewPatterns] = useState<NewPattern[]>([]);

  const [merchantName, setMerchantName] = useState(merchant?.merchantName || "");
  const [defaultCategoryId, setDefaultCategoryId] = useState<number | "">(
    merchant?.defaultCategoryId || ""
  );
  const [website, setWebsite] = useState(merchant?.website || "");
  const [notes, setNotes] = useState(merchant?.notes || "");

  useEffect(() => {
    getCategories().then(setCategories);
    if (merchant) {
      getPatterns(merchant.id).then(setPatterns);
    }
  }, [merchant]);

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
      const result = await createMerchant(data);

      if (result.success && result.merchant) {
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

          <CategorySelect
            categories={categories}
            value={defaultCategoryId}
            onChange={setDefaultCategoryId}
          />

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

          <PatternList
            merchantId={merchant?.id}
            patterns={patterns}
            newPatterns={newPatterns}
            onPatternsChange={setPatterns}
            onNewPatternsChange={setNewPatterns}
          />
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
