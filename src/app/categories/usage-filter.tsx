"use client";

type UsageValue = "all" | "used" | "unused";

interface UsageFilterProps {
  value: UsageValue;
  onChange: (value: UsageValue) => void;
}

const options: { value: UsageValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "used", label: "Used" },
  { value: "unused", label: "Unused" },
];

export function UsageFilter({ value, onChange }: UsageFilterProps) {
  return (
    <div className="inline-flex rounded-lg border p-1 bg-muted/50">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            value === option.value
              ? "bg-white dark:bg-slate-800 shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
