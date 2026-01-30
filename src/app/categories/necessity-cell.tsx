"use client";

import { useState, useRef, useEffect } from "react";
import { updateCategoryNecessity } from "./actions";

interface NecessityCellProps {
  categoryId: number;
  initialValue: string;
  readOnly?: boolean;
}

const necessityOptions = ["Essential", "Important", "Discretionary", "Wasteful"] as const;

const styles: Record<string, string> = {
  Essential: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  Important: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  Discretionary: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  Wasteful: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

export function NecessityCell({ categoryId, initialValue, readOnly = false }: NecessityCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState(initialValue);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = async (newValue: string) => {
    setIsOpen(false);
    if (newValue !== value) {
      setValue(newValue);
      await updateCategoryNecessity(categoryId, newValue);
    }
  };

  const badge = (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${styles[value] ?? styles.Discretionary}`}>
      {value}
    </span>
  );

  if (readOnly) {
    return badge;
  }

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="hover:ring-2 hover:ring-violet-300 dark:hover:ring-violet-700 rounded transition-all cursor-pointer"
      >
        {badge}
      </button>
      {isOpen && (
        <div className="absolute left-0 z-50 mt-1 w-36 rounded-md border bg-white dark:bg-slate-900 shadow-lg flex flex-col">
          {necessityOptions.map((option) => (
            <button
              type="button"
              key={option}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelect(option);
              }}
              className={`block w-full px-3 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800 first:rounded-t-md last:rounded-b-md ${
                option === value ? "bg-slate-50 dark:bg-slate-800" : ""
              }`}
            >
              <span className={`inline-flex items-center rounded-md px-2 py-0.5 font-medium ${styles[option]}`}>
                {option}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
