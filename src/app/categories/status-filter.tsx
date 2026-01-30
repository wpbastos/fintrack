"use client";

interface StatusFilterProps {
  value: "active" | "inactive";
  onChange: (value: "active" | "inactive") => void;
}

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Show:</span>
      <div className="flex rounded-md border">
        <button
          onClick={() => onChange("active")}
          className={`px-3 py-1 text-sm rounded-l-md transition-colors ${
            value === "active"
              ? "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200"
              : "hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          Active
        </button>
        <button
          onClick={() => onChange("inactive")}
          className={`px-3 py-1 text-sm rounded-r-md transition-colors ${
            value === "inactive"
              ? "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200"
              : "hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          Inactive
        </button>
      </div>
    </div>
  );
}
