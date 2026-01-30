"use client";

import { PatternItem } from "./pattern-item";
import { NewPatternItem } from "./new-pattern-item";
import { PatternInput } from "./pattern-input";
import { addPattern } from "../actions";
import { toast } from "sonner";
import type { Pattern, NewPattern } from "../types";

interface PatternListProps {
  merchantId?: number;
  patterns: Pattern[];
  newPatterns: NewPattern[];
  onPatternsChange: (patterns: Pattern[]) => void;
  onNewPatternsChange: (patterns: NewPattern[]) => void;
}

export function PatternList({
  merchantId,
  patterns,
  newPatterns,
  onPatternsChange,
  onNewPatternsChange,
}: PatternListProps) {
  const handleAddPattern = async (pattern: string, priority: number) => {
    const existsInPatterns = patterns.some((p) => p.pattern === pattern);
    const existsInNew = newPatterns.some((p) => p.pattern === pattern);

    if (existsInPatterns || existsInNew) {
      toast.error("This pattern already exists");
      return;
    }

    if (merchantId) {
      const result = await addPattern(merchantId, pattern, priority);
      if (result.success && result.pattern) {
        onPatternsChange([
          ...patterns,
          { id: result.pattern.id, pattern, priority, notes: null },
        ]);
        toast.success("Pattern added");
      } else {
        toast.error(result.error || "Failed to add pattern");
      }
    } else {
      onNewPatternsChange([...newPatterns, { pattern, priority }]);
    }
  };

  const handleDeletePattern = (patternId: number) => {
    onPatternsChange(patterns.filter((p) => p.id !== patternId));
  };

  const handleUpdatePattern = (patternId: number, pattern: string, priority: number) => {
    onPatternsChange(
      patterns.map((p) =>
        p.id === patternId ? { ...p, pattern, priority } : p
      )
    );
  };

  const handleRemoveNewPattern = (index: number) => {
    onNewPatternsChange(newPatterns.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3 pt-2 border-t">
      <label className="text-sm font-medium">Matching Patterns</label>
      <p className="text-xs text-muted-foreground">
        Patterns are used to match transaction descriptions. Higher priority patterns are checked first.
      </p>

      {patterns.length > 0 && (
        <div className="space-y-2">
          {patterns.map((pattern) => (
            <PatternItem
              key={pattern.id}
              pattern={pattern}
              onDelete={handleDeletePattern}
              onUpdate={handleUpdatePattern}
            />
          ))}
        </div>
      )}

      {!merchantId && newPatterns.length > 0 && (
        <div className="space-y-2">
          {newPatterns.map((np, idx) => (
            <NewPatternItem
              key={idx}
              pattern={np}
              onRemove={() => handleRemoveNewPattern(idx)}
            />
          ))}
        </div>
      )}

      <PatternInput onAdd={handleAddPattern} />
    </div>
  );
}
