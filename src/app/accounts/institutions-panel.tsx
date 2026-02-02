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
  createInstitution,
  updateInstitution,
  toggleInstitutionStatus,
  deleteInstitution,
  enableAllInstitutionsByType,
  disableAllInstitutionsByType,
} from "./actions";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Power, PowerOff, X } from "lucide-react";

const INSTITUTION_TYPES = ["Bank", "Credit Union", "Brokerage", "Other"];

interface Institution {
  id: number;
  name: string;
  type: string;
  website: string | null;
  isActive: boolean;
  notes: string | null;
  _count: {
    accounts: number;
  };
}

interface InstitutionsPanelProps {
  institutions: Institution[];
}

export function InstitutionsPanel({ institutions }: InstitutionsPanelProps) {
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");

  // Filter institutions by search (name or notes)
  const filteredInstitutions = search
    ? institutions.filter((i) => {
        const query = search.toLowerCase();
        return (
          i.name.toLowerCase().includes(query) ||
          (i.notes?.toLowerCase().includes(query) ?? false)
        );
      })
    : institutions;

  // Group institutions by type
  const groupedInstitutions = INSTITUTION_TYPES.map((type) => ({
    type,
    institutions: filteredInstitutions.filter((i) => i.type === type),
  })).filter((group) => group.institutions.length > 0);

  const handleToggleStatus = async (institution: Institution) => {
    setPendingIds((prev) => new Set(prev).add(institution.id));
    await toggleInstitutionStatus(institution.id, !institution.isActive);
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(institution.id);
      return next;
    });
    toast.success(`Institution ${institution.isActive ? "deactivated" : "activated"}`);
  };

  const handleDelete = async (institution: Institution) => {
    if (!confirm(`Are you sure you want to delete "${institution.name}"?`)) {
      return;
    }

    setPendingIds((prev) => new Set(prev).add(institution.id));
    const result = await deleteInstitution(institution.id);
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(institution.id);
      return next;
    });

    if (result.success) {
      toast.success("Institution deleted");
    } else {
      toast.error(result.error || "Failed to delete institution");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <div className="relative">
          <Input
            placeholder="Search institutions..."
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
        <InstitutionDialog />
      </div>

      {groupedInstitutions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No institutions found.
          </CardContent>
        </Card>
      ) : (
        groupedInstitutions.map((group) => (
            <Card key={group.type}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{group.type}</CardTitle>
                  <TypeActions institutionType={group.type} />
                </div>
                <CardDescription>
                  {group.institutions.length} institution{group.institutions.length !== 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table className="table-fixed w-full">
                    <colgroup>
                      <col style={{ width: "74%" }} />
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "6%" }} />
                    </colgroup>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Institution</TableHead>
                        <TableHead className="text-center">Accounts</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="p-0"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.institutions.map((institution) => (
                        <TableRow key={institution.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              {institution.website ? (
                                <a
                                  href={institution.website.startsWith("http") ? institution.website : `https://${institution.website}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium text-violet-600 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-300 hover:underline"
                                >
                                  {institution.name}
                                </a>
                              ) : (
                                <span className="font-medium">{institution.name}</span>
                              )}
                              {institution.notes && (
                                <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                                  {institution.notes}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-muted-foreground">
                              {institution._count.accounts}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <button
                              onClick={() => handleToggleStatus(institution)}
                              disabled={pendingIds.has(institution.id)}
                              className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                                institution.isActive
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-800"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                              } ${pendingIds.has(institution.id) ? "opacity-50" : ""}`}
                            >
                              {institution.isActive ? "Active" : "Inactive"}
                            </button>
                          </TableCell>
                          <TableCell className="p-0">
                            <div className="flex items-center justify-center gap-1">
                              <InstitutionDialog institution={institution} />
                              <button
                                type="button"
                                onClick={() => handleDelete(institution)}
                                disabled={pendingIds.has(institution.id)}
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
              </CardContent>
            </Card>
          ))
      )}
    </div>
  );
}

function TypeActions({ institutionType }: { institutionType: string }) {
  const [isPending, setIsPending] = useState(false);

  const handleEnableAll = async () => {
    setIsPending(true);
    await enableAllInstitutionsByType(institutionType);
    setIsPending(false);
    toast.success(`All ${institutionType} institutions enabled`);
  };

  const handleDisableAll = async () => {
    setIsPending(true);
    await disableAllInstitutionsByType(institutionType);
    setIsPending(false);
    toast.success(`All ${institutionType} institutions disabled`);
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleEnableAll}
        disabled={isPending}
        className="p-1.5 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors disabled:opacity-50"
        title="Enable all"
      >
        <Power className="h-4 w-4" />
      </button>
      <button
        onClick={handleDisableAll}
        disabled={isPending}
        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-50"
        title="Disable all"
      >
        <PowerOff className="h-4 w-4" />
      </button>
    </div>
  );
}

function InstitutionDialog({ institution }: { institution?: Institution }) {
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
        {institution ? (
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
            Add Institution
          </button>
        )}
      </DialogTrigger>
      <DialogContent>
        <InstitutionForm
          key={formKey}
          institution={institution}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function InstitutionForm({
  institution,
  onSuccess,
  onCancel,
}: {
  institution?: Institution;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [isPending, setIsPending] = useState(false);
  const [institutionName, setInstitutionName] = useState(institution?.name || "");
  const [institutionType, setInstitutionType] = useState(institution?.type || "Bank");
  const [website, setWebsite] = useState(institution?.website || "");
  const [notes, setNotes] = useState(institution?.notes || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!institutionName.trim()) {
      toast.error("Institution name is required");
      return;
    }

    setIsPending(true);

    const result = institution
      ? await updateInstitution(institution.id, {
          name: institutionName.trim(),
          type: institutionType,
          website: website.trim() || null,
          notes: notes.trim() || null,
        })
      : await createInstitution({
          name: institutionName.trim(),
          type: institutionType,
          website: website.trim() || undefined,
          notes: notes.trim() || undefined,
        });

    setIsPending(false);

    if (result.success) {
      toast.success(institution ? "Institution updated" : "Institution created");
      onSuccess();
    } else {
      toast.error(result.error || "Failed to save institution");
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{institution ? "Edit Institution" : "Add Institution"}</DialogTitle>
        <DialogDescription>
          {institution
            ? "Update the institution details below."
            : "Enter the details for the new institution."}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="institution-name" className="text-sm font-medium">
              Institution Name *
            </label>
            <Input
              id="institution-name"
              placeholder="e.g., TD Bank"
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="institution-type" className="text-sm font-medium">
              Type
            </label>
            <select
              id="institution-type"
              value={institutionType}
              onChange={(e) => setInstitutionType(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-violet-300 dark:bg-slate-800 dark:border-slate-700"
            >
              {INSTITUTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="website" className="text-sm font-medium">
              Website
            </label>
            <Input
              id="website"
              placeholder="https://..."
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
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
            {isPending ? "Saving..." : institution ? "Update" : "Create"}
          </button>
        </DialogFooter>
      </form>
    </>
  );
}
