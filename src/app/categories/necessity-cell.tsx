"use client";

interface NecessityCellProps {
  value: string;
}

const styles: Record<string, string> = {
  Essential: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  Important: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  Discretionary: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  Wasteful: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

export function NecessityCell({ value }: NecessityCellProps) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${styles[value] ?? styles.Discretionary}`}>
      {value}
    </span>
  );
}
