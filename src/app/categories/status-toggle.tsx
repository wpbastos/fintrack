"use client";

import { useState } from "react";
import { toggleCategoryStatus } from "./actions";

interface StatusToggleProps {
  categoryId: number;
  initialValue: boolean;
}

export function StatusToggle({ categoryId, initialValue }: StatusToggleProps) {
  const [isActive, setIsActive] = useState(initialValue);
  const [isPending, setIsPending] = useState(false);

  const handleToggle = async () => {
    setIsPending(true);
    const newValue = !isActive;
    setIsActive(newValue);
    await toggleCategoryStatus(categoryId, newValue);
    setIsPending(false);
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium transition-colors ${
        isActive
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-800"
          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
      } ${isPending ? "opacity-50" : ""}`}
    >
      {isActive ? "Active" : "Inactive"}
    </button>
  );
}
