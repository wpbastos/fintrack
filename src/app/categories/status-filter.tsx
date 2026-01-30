"use client";

interface StatusFilterProps {
  value: "active" | "inactive";
  onChange: (value: "active" | "inactive") => void;
}

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <div className="inline-flex rounded-lg border p-1 bg-muted/50">
      <button
        onClick={() => onChange("active")}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          value === "active"
            ? "bg-white dark:bg-slate-800 shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Active
      </button>
      <button
        onClick={() => onChange("inactive")}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          value === "inactive"
            ? "bg-white dark:bg-slate-800 shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Inactive
      </button>
    </div>
  );
}
