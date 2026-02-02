"use client";

import { useState } from "react";
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
import { createEmployer, updateEmployer } from "./actions";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";

interface Employer {
  id: number;
  name: string;
  industry: string | null;
  location: string | null;
  website: string | null;
  notes: string | null;
}

interface EmployerDialogProps {
  employer?: Employer;
  trigger?: React.ReactNode;
}

export function EmployerDialog({ employer, trigger }: EmployerDialogProps) {
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
            Add Employer
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <EmployerForm
          key={formKey}
          employer={employer}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function EmployerForm({
  employer,
  onSuccess,
  onCancel,
}: {
  employer?: Employer;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [isPending, setIsPending] = useState(false);

  // Form state
  const [name, setName] = useState(employer?.name || "");
  const [industry, setIndustry] = useState(employer?.industry || "");
  const [location, setLocation] = useState(employer?.location || "");
  const [website, setWebsite] = useState(employer?.website || "");
  const [notes, setNotes] = useState(employer?.notes || "");

  const isEdit = !!employer;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Employer name is required");
      return;
    }

    setIsPending(true);

    if (isEdit) {
      const result = await updateEmployer(employer.id, {
        name: name.trim(),
        industry: industry.trim() || null,
        location: location.trim() || null,
        website: website.trim() || null,
        notes: notes.trim() || null,
      });

      setIsPending(false);

      if (result.success) {
        toast.success("Employer updated");
        onSuccess();
      } else {
        toast.error(result.error || "Failed to update employer");
      }
    } else {
      const result = await createEmployer({
        name: name.trim(),
        industry: industry.trim() || undefined,
        location: location.trim() || undefined,
        website: website.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      setIsPending(false);

      if (result.success) {
        toast.success("Employer created");
        onSuccess();
      } else {
        toast.error(result.error || "Failed to create employer");
      }
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit Employer" : "Add Employer"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Update employer details."
            : "Enter the details for the new employer."}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Company Name *
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Shopify, CGI, Microsoft"
              autoFocus
            />
          </div>

          {/* Industry */}
          <div className="space-y-2">
            <label htmlFor="industry" className="text-sm font-medium">
              Industry
            </label>
            <Input
              id="industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g., Technology, Healthcare, Finance"
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <label htmlFor="location" className="text-sm font-medium">
              Location
            </label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Toronto, ON"
            />
          </div>

          {/* Website */}
          <div className="space-y-2">
            <label htmlFor="website" className="text-sm font-medium">
              Website
            </label>
            <Input
              id="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://..."
            />
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
export function EmployerEditButton({ employer }: { employer: Employer }) {
  return (
    <EmployerDialog
      employer={employer}
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
