"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createPosition, updatePosition, getEmployers } from "./actions";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";

interface Employer {
  id: number;
  name: string;
}

interface Position {
  id: number;
  title: string;
  department: string | null;
  startDate: Date | null;
  endDate: Date | null;
  notes: string | null;
  employer: {
    id: number;
    name: string;
    website: string | null;
  };
}

interface PositionDialogProps {
  position?: Position;
  trigger?: React.ReactNode;
}

export function PositionDialog({ position, trigger }: PositionDialogProps) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setFormKey((k) => k + 1);
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <button className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors">
            <Plus className="h-4 w-4" />
            Add Position
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <PositionForm
          key={formKey}
          position={position}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function PositionForm({
  position,
  onSuccess,
  onCancel,
}: {
  position?: Position;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [isPending, setIsPending] = useState(false);

  // Form state
  const [title, setTitle] = useState(position?.title || "");
  const [department, setDepartment] = useState(position?.department || "");
  const [employerId, setEmployerId] = useState<number | "">(position?.employer.id || "");
  const [startDate, setStartDate] = useState(
    position?.startDate ? new Date(position.startDate).toISOString().split("T")[0] : ""
  );
  const [endDate, setEndDate] = useState(
    position?.endDate ? new Date(position.endDate).toISOString().split("T")[0] : ""
  );
  const [notes, setNotes] = useState(position?.notes || "");

  // Lookup data
  const [employers, setEmployers] = useState<Employer[]>([]);

  const isEdit = !!position;

  // Load employers on mount
  useEffect(() => {
    getEmployers().then(setEmployers);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Position title is required");
      return;
    }

    if (!employerId) {
      toast.error("Employer is required");
      return;
    }

    setIsPending(true);

    if (isEdit) {
      const result = await updatePosition(position.id, {
        title: title.trim(),
        department: department.trim() || null,
        employerId: employerId as number,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        notes: notes.trim() || null,
      });

      setIsPending(false);

      if (result.success) {
        toast.success("Position updated");
        onSuccess();
      } else {
        toast.error(result.error || "Failed to update position");
      }
    } else {
      const result = await createPosition({
        title: title.trim(),
        department: department.trim() || undefined,
        employerId: employerId as number,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        notes: notes.trim() || undefined,
      });

      setIsPending(false);

      if (result.success) {
        toast.success("Position created");
        onSuccess();
      } else {
        toast.error(result.error || "Failed to create position");
      }
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit Position" : "Add Position"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Update position details."
            : "Enter the details for the new position."}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 py-4">
          {/* Employer */}
          <div className="space-y-2">
            <label htmlFor="employer" className="text-sm font-medium">
              Employer *
            </label>
            <select
              id="employer"
              value={employerId}
              onChange={(e) => setEmployerId(e.target.value ? parseInt(e.target.value) : "")}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-violet-300 dark:bg-slate-800 dark:border-slate-700"
              disabled={isEdit}
            >
              <option value="">Select employer...</option>
              {employers.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Position Title *
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Senior Software Developer"
              autoFocus
            />
          </div>

          {/* Department */}
          <div className="space-y-2">
            <label htmlFor="department" className="text-sm font-medium">
              Department
            </label>
            <Input
              id="department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g., Engineering, Sales"
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="startDate" className="text-sm font-medium">
                Start Date
              </label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="endDate" className="text-sm font-medium">
                End Date
              </label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium">
              Notes
            </label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
            />
          </div>
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="px-3 py-2 text-sm text-slate-600 hover:text-slate-800 dark:text-slate-400"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-3 py-2 text-sm bg-violet-600 text-white rounded-md hover:bg-violet-700 disabled:opacity-50"
          >
            {isPending ? "Saving..." : isEdit ? "Update" : "Create"}
          </button>
        </DialogFooter>
      </form>
    </>
  );
}

// Edit button component for table rows
export function PositionEditButton({ position }: { position: Position }) {
  return (
    <PositionDialog
      position={position}
      trigger={
        <button
          type="button"
          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      }
    />
  );
}
