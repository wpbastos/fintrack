"use client";

import { MerchantDialog } from "./merchant-dialog";
import { Pencil } from "lucide-react";
import type { Merchant } from "../types";

interface MerchantEditButtonProps {
  merchant: Merchant;
  onSuccess?: () => void;
}

export function MerchantEditButton({ merchant, onSuccess }: MerchantEditButtonProps) {
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
