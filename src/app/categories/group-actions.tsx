"use client";

import { useState } from "react";
import { PowerOff, Power } from "lucide-react";
import { disableAllInGroup, enableAllInGroup } from "./actions";

interface GroupActionsProps {
  groupId: number;
  groupName: string;
}

export function GroupActions({ groupId, groupName }: GroupActionsProps) {
  const [isPending, setIsPending] = useState(false);

  const handleDisableAll = async () => {
    if (!confirm(`Disable all categories in "${groupName}"?`)) return;

    setIsPending(true);
    await disableAllInGroup(groupId);
    setIsPending(false);
  };

  const handleEnableAll = async () => {
    if (!confirm(`Enable all categories in "${groupName}"?`)) return;

    setIsPending(true);
    await enableAllInGroup(groupId);
    setIsPending(false);
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
    </div>
  );
}
