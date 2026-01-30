"use client";

import { X } from "lucide-react";
import type { NewPattern } from "../types";

interface NewPatternItemProps {
  pattern: NewPattern;
  onRemove: () => void;
}

export function NewPatternItem({ pattern, onRemove }: NewPatternItemProps) {
  return (
    <div className="flex items-center gap-2 bg-violet-50 dark:bg-violet-900/20 rounded-md px-3 py-2">
      <code className="flex-1 text-sm font-mono">{pattern.pattern}</code>
      <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-violet-200 dark:bg-violet-800 rounded">
        {pattern.priority}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/50 text-slate-400 hover:text-rose-600"
        title="Remove"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
