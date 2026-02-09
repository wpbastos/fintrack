"use client";

import { useState } from "react";
import { Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FilterField =
  | "monthAmount"
  | "yearAmount"
  | "totalAmount"
  | "monthCount"
  | "yearCount"
  | "totalCount"
  | "budgetPct";

export type FilterOp = "gt" | "lt" | "gte" | "lte" | "eq" | "between";

export interface CategoryFilter {
  field: FilterField;
  op: FilterOp;
  value: number;
  value2?: number;
  label: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FIELD_OPTIONS: { value: FilterField; label: string }[] = [
  { value: "monthAmount", label: "Month $" },
  { value: "yearAmount", label: "Year $" },
  { value: "totalAmount", label: "Total $" },
  { value: "monthCount", label: "Month #" },
  { value: "yearCount", label: "Year #" },
  { value: "totalCount", label: "Total #" },
  { value: "budgetPct", label: "Budget %" },
];

const OP_OPTIONS: { value: FilterOp; label: string; symbol: string }[] = [
  { value: "gt", label: "greater than", symbol: ">" },
  { value: "lt", label: "less than", symbol: "<" },
  { value: "gte", label: "at least", symbol: ">=" },
  { value: "lte", label: "at most", symbol: "<=" },
  { value: "eq", label: "equals", symbol: "=" },
  { value: "between", label: "between", symbol: "↔" },
];

interface Preset {
  label: string;
  filter: CategoryFilter;
}

const PRESETS: Preset[] = [
  {
    label: "Over budget",
    filter: { field: "budgetPct", op: "gt", value: 100, label: "Over budget" },
  },
  {
    label: "Under 50% budget",
    filter: { field: "budgetPct", op: "lt", value: 50, label: "Under 50% budget" },
  },
  {
    label: "No spending this month",
    filter: { field: "monthAmount", op: "eq", value: 0, label: "No spending this month" },
  },
  {
    label: "Used (has txns)",
    filter: { field: "totalCount", op: "gt", value: 0, label: "Used (has txns)" },
  },
  {
    label: "Unused (no txns)",
    filter: { field: "totalCount", op: "eq", value: 0, label: "Unused (no txns)" },
  },
  {
    label: "Year > $1,000",
    filter: { field: "yearAmount", op: "gt", value: 1000, label: "Year > $1,000" },
  },
  {
    label: "Most used (> 20 txns/month)",
    filter: { field: "monthCount", op: "gt", value: 20, label: "> 20 txns this month" },
  },
];

// ---------------------------------------------------------------------------
// Helper: build label from field/op/value
// ---------------------------------------------------------------------------

function buildLabel(field: FilterField, op: FilterOp, value: number, value2?: number): string {
  const fieldLabel = FIELD_OPTIONS.find((f) => f.value === field)?.label ?? field;
  const opSymbol = OP_OPTIONS.find((o) => o.value === op)?.symbol ?? op;

  if (field === "budgetPct") {
    if (op === "between") return `${fieldLabel} ${value}%–${value2}%`;
    return `${fieldLabel} ${opSymbol} ${value}%`;
  }

  const isCount = field.endsWith("Count");
  const fmt = (n: number) => (isCount ? `#${n}` : `$${n.toLocaleString()}`);

  if (op === "between") return `${fieldLabel} ${fmt(value)}–${fmt(value2 ?? value)}`;
  return `${fieldLabel} ${opSymbol} ${fmt(value)}`;
}

// ---------------------------------------------------------------------------
// SmartFilter component
// ---------------------------------------------------------------------------

interface SmartFilterProps {
  filters: CategoryFilter[];
  onChange: (filters: CategoryFilter[]) => void;
}

export function SmartFilter({ filters, onChange }: SmartFilterProps) {
  const [open, setOpen] = useState(false);
  const [field, setField] = useState<FilterField>("monthAmount");
  const [op, setOp] = useState<FilterOp>("gt");
  const [value, setValue] = useState("");
  const [value2, setValue2] = useState("");

  function addPreset(preset: Preset) {
    onChange([...filters, preset.filter]);
    setOpen(false);
  }

  function addCustom() {
    const num = parseFloat(value);
    if (isNaN(num)) return;

    const num2 = op === "between" ? parseFloat(value2) : undefined;
    if (op === "between" && (num2 === undefined || isNaN(num2))) return;

    const label = buildLabel(field, op, num, num2);
    onChange([...filters, { field, op, value: num, value2: num2, label }]);

    setValue("");
    setValue2("");
    setOpen(false);
  }

  function removeFilter(index: number) {
    onChange(filters.filter((_, i) => i !== index));
  }

  function clearAll() {
    onChange([]);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Active filter chips */}
      {filters.map((f, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-900/50 px-2.5 py-1 text-xs font-medium text-violet-700 dark:text-violet-300"
        >
          {f.label}
          <button
            onClick={() => removeFilter(i)}
            className="ml-0.5 rounded-full p-0.5 hover:bg-violet-200 dark:hover:bg-violet-800 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      {filters.length > 1 && (
        <button
          onClick={clearAll}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Clear all
        </button>
      )}

      {/* Add filter button */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="inline-flex rounded-lg border p-1 bg-muted/50">
            <button className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filters.length > 0
                ? "bg-white dark:bg-slate-800 shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}>
              <Filter className="h-3.5 w-3.5" />
              {filters.length === 0 ? "Filter" : `Filter (${filters.length})`}
            </button>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          {/* Quick presets */}
          <div className="p-3 border-b">
            <p className="text-xs font-medium text-muted-foreground mb-2">Quick filters</p>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => addPreset(preset)}
                  className="rounded-full border px-2.5 py-1 text-xs hover:bg-accent transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom builder */}
          <div className="p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Custom filter</p>
            <div className="flex gap-1.5">
              <select
                value={field}
                onChange={(e) => setField(e.target.value as FilterField)}
                className="flex-1 rounded-md border bg-background px-2 py-1.5 text-xs"
              >
                {FIELD_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
              <select
                value={op}
                onChange={(e) => setOp(e.target.value as FilterOp)}
                className="w-20 rounded-md border bg-background px-2 py-1.5 text-xs"
              >
                {OP_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.symbol}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-1.5">
              <Input
                type="number"
                placeholder="Value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="h-8 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") addCustom();
                }}
              />
              {op === "between" && (
                <Input
                  type="number"
                  placeholder="To"
                  value={value2}
                  onChange={(e) => setValue2(e.target.value)}
                  className="h-8 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addCustom();
                  }}
                />
              )}
              <button
                className="h-8 px-3 text-xs font-medium rounded-md bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                onClick={addCustom}
              >
                Add
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter logic — used by categories-tabs.tsx
// ---------------------------------------------------------------------------

interface CategoryStat {
  totalCount: number;
  totalAmount: number;
  yearCount: number;
  yearAmount: number;
  monthCount: number;
  monthAmount: number;
}

export function resolveField(
  field: FilterField,
  stat: CategoryStat,
  budget: number | null,
  spent: number
): number | null {
  switch (field) {
    case "monthAmount":
      return Math.abs(stat.monthAmount);
    case "yearAmount":
      return Math.abs(stat.yearAmount);
    case "totalAmount":
      return Math.abs(stat.totalAmount);
    case "monthCount":
      return stat.monthCount;
    case "yearCount":
      return stat.yearCount;
    case "totalCount":
      return stat.totalCount;
    case "budgetPct":
      if (!budget || budget === 0) return null;
      return (spent / budget) * 100;
  }
}

export function applyOp(op: FilterOp, actual: number, value: number, value2?: number): boolean {
  switch (op) {
    case "gt":
      return actual > value;
    case "lt":
      return actual < value;
    case "gte":
      return actual >= value;
    case "lte":
      return actual <= value;
    case "eq":
      return actual === value;
    case "between":
      return actual >= value && actual <= (value2 ?? value);
  }
}
