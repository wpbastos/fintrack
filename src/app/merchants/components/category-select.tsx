"use client";

import type { CategoryWithGroup } from "../types";

interface CategorySelectProps {
  categories: CategoryWithGroup[];
  value: number | "";
  onChange: (value: number | "") => void;
}

export function CategorySelect({ categories, value, onChange }: CategorySelectProps) {
  const groupedCategories = categories.reduce(
    (acc, cat) => {
      if (!acc[cat.groupName]) acc[cat.groupName] = [];
      acc[cat.groupName].push(cat);
      return acc;
    },
    {} as Record<string, CategoryWithGroup[]>
  );

  return (
    <div className="space-y-2">
      <label htmlFor="default-category" className="text-sm font-medium">
        Category
      </label>
      <select
        id="default-category"
        value={value}
        onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : "")}
        className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-violet-300 dark:bg-slate-800 dark:border-slate-700"
      >
        <option value="">Select category...</option>
        {Object.entries(groupedCategories).map(([groupName, cats]) => (
          <optgroup key={groupName} label={groupName}>
            {cats.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.categoryName}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
