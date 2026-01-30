"use client";

import { useState, useRef, useEffect } from "react";
import { updateCategoryBudget } from "./actions";

interface BudgetCellProps {
  categoryId: number;
  initialBudget: number | null;
  readOnly?: boolean;
}

function formatCurrency(amount: number | null) {
  if (amount === null) return "—";
  return amount.toLocaleString("en-CA", { style: "currency", currency: "CAD" });
}

export function BudgetCell({ categoryId, initialBudget, readOnly = false }: BudgetCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialBudget?.toString() ?? "");
  const [displayValue, setDisplayValue] = useState(initialBudget);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (readOnly) {
    return (
      <span className="block w-full text-right font-mono text-muted-foreground">
        {formatCurrency(initialBudget)}
      </span>
    );
  }

  const handleSave = async () => {
    setIsEditing(false);
    const numValue = value === "" ? null : parseFloat(value);

    if (numValue !== displayValue) {
      setDisplayValue(numValue);
      await updateCategoryBudget(categoryId, numValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setValue(displayValue?.toString() ?? "");
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="w-full text-right font-mono text-sm bg-transparent border border-violet-300 dark:border-violet-700 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
        placeholder="0.00"
      />
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="w-full text-right font-mono hover:bg-violet-50 dark:hover:bg-violet-950 rounded px-2 py-0.5 transition-colors"
      title="Click to edit"
    >
      {formatCurrency(displayValue)}
    </button>
  );
}
