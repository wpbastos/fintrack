"use client";

interface NotesCellProps {
  notes: string | null;
}

export function NotesCell({ notes }: NotesCellProps) {
  if (!notes) {
    return null;
  }

  return (
    <span
      className="text-xs text-muted-foreground truncate max-w-full block"
      title={notes}
    >
      {notes}
    </span>
  );
}
