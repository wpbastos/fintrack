"use client";

import { useState, useRef, useEffect } from "react";
import { updateCategoryNotes } from "./actions";

interface NotesCellProps {
  categoryId: number;
  initialNotes: string | null;
}

export function NotesCell({ categoryId, initialNotes }: NotesCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [isPending, setIsPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const trimmedNotes = notes.trim();
    const newNotes = trimmedNotes === "" ? null : trimmedNotes;

    if (newNotes === initialNotes) {
      setIsEditing(false);
      return;
    }

    setIsPending(true);
    await updateCategoryNotes(categoryId, newNotes);
    setIsPending(false);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      setNotes(initialNotes ?? "");
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={isPending}
        placeholder="Add notes..."
        className="w-full px-1 py-0.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-violet-300 dark:bg-slate-800 dark:border-slate-700"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="text-xs text-muted-foreground hover:text-foreground truncate max-w-full text-left transition-colors"
      title={initialNotes ?? "Click to add notes"}
    >
      {initialNotes || <span className="italic text-slate-400">Add notes...</span>}
    </button>
  );
}
