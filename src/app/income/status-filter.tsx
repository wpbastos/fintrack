"use client";

interface StatusFilterProps {
  value: "active" | "inactive";
  onChange: (value: "active" | "inactive") => void;
}

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
      <button
        onClick={() => onChange("active")}
        className={`
          px-3 py-1.5 text-sm font-medium rounded-md transition-colors
          ${
            value === "active"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }
        `}
      >
        Active
      </button>
      <button
        onClick={() => onChange("inactive")}
        className={`
          px-3 py-1.5 text-sm font-medium rounded-md transition-colors
          ${
            value === "inactive"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }
        `}
      >
        Inactive
      </button>
    </div>
  );
}
