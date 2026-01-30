"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createCardholder } from "./actions";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface CardholderDialogProps {
  onCardholderCreated: (cardholder: { id: number; name: string }) => void;
}

export function CardholderDialog({ onCardholderCreated }: CardholderDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsPending(true);
    const result = await createCardholder({
      name: name.trim(),
      email: email.trim() || undefined,
    });
    setIsPending(false);

    if (result.success && result.cardholder) {
      toast.success("Cardholder created");
      onCardholderCreated(result.cardholder);
      setOpen(false);
      setName("");
      setEmail("");
    } else {
      toast.error(result.error || "Failed to create cardholder");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md border border-input bg-transparent px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Cardholder</DialogTitle>
          <DialogDescription>
            Add a new cardholder who can be assigned to accounts.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="cardholder-name" className="text-sm font-medium">
                Name *
              </label>
              <Input
                id="cardholder-name"
                placeholder="e.g., John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="cardholder-email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="cardholder-email"
                type="email"
                placeholder="e.g., john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
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
              {isPending ? "Creating..." : "Create"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
