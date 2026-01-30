"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MerchantForm } from "./merchant-form";
import { Plus } from "lucide-react";
import type { Merchant } from "../types";

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
