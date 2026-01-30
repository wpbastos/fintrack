"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MerchantDialog } from "./components/merchant-dialog";
import { MerchantsTable } from "./components/merchants-table";
import { SearchInput } from "./components/search-input";
import { BulkActions } from "./components/bulk-actions";
import { toggleMerchantStatus, deleteMerchant } from "./actions";
import { toast } from "sonner";
import type { MerchantWithStatus } from "./types";

interface MerchantsPanelProps {
  merchants: MerchantWithStatus[];
}

export function MerchantsPanel({ merchants }: MerchantsPanelProps) {
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");

  const filteredMerchants = search
    ? merchants.filter((m) => {
        const query = search.toLowerCase();
        return (
          m.merchantName.toLowerCase().includes(query) ||
          (m.merchantType?.toLowerCase().includes(query) ?? false) ||
          (m.defaultCategory?.categoryName.toLowerCase().includes(query) ?? false) ||
          (m.notes?.toLowerCase().includes(query) ?? false) ||
          m.patterns.some((p) => p.pattern.toLowerCase().includes(query))
        );
      })
    : merchants;

  const handleToggleStatus = async (merchant: MerchantWithStatus) => {
    setPendingIds((prev) => new Set(prev).add(merchant.id));
    await toggleMerchantStatus(merchant.id, !merchant.isActive);
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(merchant.id);
      return next;
    });
    toast.success(`Merchant ${merchant.isActive ? "deactivated" : "activated"}`);
  };

  const handleDelete = async (merchant: MerchantWithStatus) => {
    if (!confirm(`Are you sure you want to delete "${merchant.merchantName}"?`)) {
      return;
    }

    setPendingIds((prev) => new Set(prev).add(merchant.id));
    const result = await deleteMerchant(merchant.id);
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(merchant.id);
      return next;
    });

    if (result.success) {
      toast.success("Merchant deleted");
    } else {
      toast.error(result.error || "Failed to delete merchant");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search merchants..."
        />
        <MerchantDialog />
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Merchants</CardTitle>
            <BulkActions />
          </div>
          <CardDescription>
            Merchants and their matching patterns for transaction categorization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredMerchants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? "No merchants match your search." : "No merchants found."}
            </div>
          ) : (
            <MerchantsTable
              merchants={filteredMerchants}
              pendingIds={pendingIds}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDelete}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
