"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  createPerson,
  updatePerson,
  togglePersonStatus,
  deletePerson,
  enableAllPersons,
  disableAllPersons,
} from "./actions";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, Power, PowerOff } from "lucide-react";

interface Person {
  id: number;
  name: string;
  email: string | null;
  isActive: boolean;
  notes: string | null;
  _count: {
    accounts: number;
    transactions: number;
  };
}

interface PersonsPanelProps {
  persons: Person[];
}

export function PersonsPanel({ persons }: PersonsPanelProps) {
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [bulkPending, setBulkPending] = useState(false);

  // Filter persons by search (name, email, or notes)
  const filteredPersons = search
    ? persons.filter((c) => {
        const query = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(query) ||
          (c.email?.toLowerCase().includes(query) ?? false) ||
          (c.notes?.toLowerCase().includes(query) ?? false)
        );
      })
    : persons;

  const handleToggleStatus = async (person: Person) => {
    setPendingIds((prev) => new Set(prev).add(person.id));
    await togglePersonStatus(person.id, !person.isActive);
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(person.id);
      return next;
    });
    toast.success(`Person ${person.isActive ? "deactivated" : "activated"}`);
  };

  const handleDelete = async (person: Person) => {
    if (!confirm(`Are you sure you want to delete "${person.name}"?`)) {
      return;
    }

    setPendingIds((prev) => new Set(prev).add(person.id));
    const result = await deletePerson(person.id);
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(person.id);
      return next;
    });

    if (result.success) {
      toast.success("Person deleted");
    } else {
      toast.error(result.error || "Failed to delete person");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <div className="relative">
          <Input
            placeholder="Search persons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 pr-8"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <PersonPanelDialog />
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Persons</CardTitle>
            <div className="flex items-center gap-1">
              <button
                onClick={async () => {
                  setBulkPending(true);
                  await enableAllPersons();
                  setBulkPending(false);
                  toast.success("All persons enabled");
                }}
                disabled={bulkPending}
                className="p-1.5 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors disabled:opacity-50"
                title="Enable all"
              >
                <Power className="h-4 w-4" />
              </button>
              <button
                onClick={async () => {
                  setBulkPending(true);
                  await disableAllPersons();
                  setBulkPending(false);
                  toast.success("All persons disabled");
                }}
                disabled={bulkPending}
                className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-50"
                title="Disable all"
              >
                <PowerOff className="h-4 w-4" />
              </button>
            </div>
          </div>
          <CardDescription>People who can use accounts and cards.</CardDescription>
        </CardHeader>
      <CardContent>
        {filteredPersons.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {search ? "No persons match your search." : "No persons found."}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table className="table-fixed w-full">
              <colgroup>
                <col style={{ width: "32%" }} />
                <col style={{ width: "32%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "6%" }} />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-center">Transactions</TableHead>
                  <TableHead className="text-center">Accounts</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="p-0"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPersons.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{person.name}</span>
                        {person.notes && (
                          <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                            {person.notes}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {person.email ? (
                        <span className="text-muted-foreground">{person.email}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-muted-foreground">
                        {person._count.transactions}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-muted-foreground">
                        {person._count.accounts}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={() => handleToggleStatus(person)}
                        disabled={pendingIds.has(person.id)}
                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                          person.isActive
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-800"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                        } ${pendingIds.has(person.id) ? "opacity-50" : ""}`}
                      >
                        {person.isActive ? "Active" : "Inactive"}
                      </button>
                    </TableCell>
                    <TableCell className="p-0">
                      <div className="flex items-center justify-center gap-1">
                        <PersonPanelDialog person={person} />
                        <button
                          type="button"
                          onClick={() => handleDelete(person)}
                          disabled={pendingIds.has(person.id)}
                          className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/50 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}

function PersonPanelDialog({ person }: { person?: Person }) {
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
        {person ? (
          <button
            type="button"
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors">
            <Plus className="h-4 w-4" />
            Add Person
          </button>
        )}
      </DialogTrigger>
      <DialogContent>
        <PersonPanelForm
          key={formKey}
          person={person}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function PersonPanelForm({
  person,
  onSuccess,
  onCancel,
}: {
  person?: Person;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [isPending, setIsPending] = useState(false);
  const [name, setName] = useState(person?.name || "");
  const [email, setEmail] = useState(person?.email || "");
  const [notes, setNotes] = useState(person?.notes || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsPending(true);

    const result = person
      ? await updatePerson(person.id, {
          name: name.trim(),
          email: email.trim() || null,
          notes: notes.trim() || null,
        })
      : await createPerson({
          name: name.trim(),
          email: email.trim() || undefined,
          notes: notes.trim() || undefined,
        });

    setIsPending(false);

    if (result.success) {
      toast.success(person ? "Person updated" : "Person created");
      onSuccess();
    } else {
      toast.error(result.error || "Failed to save person");
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{person ? "Edit Person" : "Add Person"}</DialogTitle>
        <DialogDescription>
          {person
            ? "Update the person details below."
            : "Enter the details for the new person."}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="person-name" className="text-sm font-medium">
              Name *
            </label>
            <Input
              id="person-name"
              placeholder="e.g., John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="person-email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="person-email"
              type="email"
              placeholder="e.g., john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium">
              Notes
            </label>
            <Input
              id="notes"
              placeholder="Optional notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
            {isPending ? "Saving..." : person ? "Update" : "Create"}
          </button>
        </DialogFooter>
      </form>
    </>
  );
}
