"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";

interface PatternInputProps {
  onAdd: (pattern: string, priority: number) => void;
}

export function PatternInput({ onAdd }: PatternInputProps) {
  const [patternInput, setPatternInput] = useState("");
  const [priority, setPriority] = useState(10);

  const handleAdd = () => {
    const trimmed = patternInput.trim().toUpperCase();
    if (!trimmed) return;

    onAdd(trimmed, priority);
    setPatternInput("");
    setPriority(10);
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Add pattern (e.g., COSTCO, AMZN)"
        value={patternInput}
        onChange={(e) => setPatternInput(e.target.value.toUpperCase())}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleAdd();
          }
        }}
        className="flex-1 font-mono text-sm"
      />
      <Input
        type="number"
        value={priority}
        onChange={(e) => setPriority(parseInt(e.target.value) || 10)}
        className="w-16 text-sm"
        min={1}
        max={100}
        title="Priority (higher = checked first)"
      />
      <button
        type="button"
        onClick={handleAdd}
        disabled={!patternInput.trim()}
        className="px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
