"use client";

import { useState } from "react";
import { Power, PowerOff } from "lucide-react";
import { enableAllMerchants, disableAllMerchants } from "../actions";
import { toast } from "sonner";

export function BulkActions() {
  const [isPending, setIsPending] = useState(false);

  const handleEnableAll = async () => {
    setIsPending(true);
    await enableAllMerchants();
    setIsPending(false);
    toast.success("All merchants enabled");
  };

  const handleDisableAll = async () => {
    setIsPending(true);
    await disableAllMerchants();
    setIsPending(false);
    toast.success("All merchants disabled");
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleEnableAll}
        disabled={isPending}
        className="p-1.5 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors disabled:opacity-50"
        title="Enable all"
      >
        <Power className="h-4 w-4" />
      </button>
      <button
        onClick={handleDisableAll}
        disabled={isPending}
        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-50"
        title="Disable all"
      >
        <PowerOff className="h-4 w-4" />
      </button>
    </div>
  );
}
