"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { EmployerDialog, EmployerEditButton } from "./employer-dialog";
import { toggleEmployerStatus, deleteEmployer } from "./actions";
import { toast } from "sonner";
import { Trash2, X, ExternalLink } from "lucide-react";

interface Employer {
  id: number;
  name: string;
  industry: string | null;
  location: string | null;
  website: string | null;
  isActive: boolean;
  notes: string | null;
  _count: {
    positions: number;
  };
}

interface EmployersPanelProps {
  employers: Employer[];
}

export function EmployersPanel({ employers }: EmployersPanelProps) {
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");

  // Filter employers by search
  const filteredEmployers = search
    ? employers.filter((e) => {
        const query = search.toLowerCase();
        return (
          e.name.toLowerCase().includes(query) ||
          (e.industry?.toLowerCase().includes(query) ?? false) ||
          (e.location?.toLowerCase().includes(query) ?? false) ||
          (e.notes?.toLowerCase().includes(query) ?? false)
        );
      })
    : employers;

  const handleToggleStatus = async (employer: Employer) => {
    setPendingIds((prev) => new Set(prev).add(employer.id));
    await toggleEmployerStatus(employer.id, !employer.isActive);
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(employer.id);
      return next;
    });
    toast.success(`Employer ${employer.isActive ? "deactivated" : "activated"}`);
  };

  const handleDelete = async (employer: Employer) => {
    if (!confirm(`Are you sure you want to delete "${employer.name}"?`)) {
      return;
    }

    setPendingIds((prev) => new Set(prev).add(employer.id));
    const result = await deleteEmployer(employer.id);
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(employer.id);
      return next;
    });

    if (result.success) {
      toast.success("Employer deleted");
    } else {
      toast.error(result.error || "Failed to delete employer");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <div className="relative">
          <Input
            placeholder="Search employers..."
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
        <EmployerDialog />
      </div>

      {filteredEmployers.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              {search ? "No employers match your search." : "No employers found."}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-center">Positions</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="w-24 p-0"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployers.map((employer) => (
                    <TableRow key={employer.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          {employer.website ? (
                            <a
                              href={employer.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium hover:text-violet-600 hover:underline inline-flex items-center gap-1"
                            >
                              {employer.name}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="font-medium">{employer.name}</span>
                          )}
                          {employer.notes && (
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {employer.notes}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {employer.industry ? (
                          <span className="text-sm">{employer.industry}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {employer.location ? (
                          <span className="text-sm">{employer.location}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {employer._count.positions > 0 ? (
                          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                            {employer._count.positions}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => handleToggleStatus(employer)}
                          disabled={pendingIds.has(employer.id)}
                          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                            employer.isActive
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-800"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                          } ${pendingIds.has(employer.id) ? "opacity-50" : ""}`}
                        >
                          {employer.isActive ? "Active" : "Inactive"}
                        </button>
                      </TableCell>
                      <TableCell className="p-0 pr-2">
                        <div className="flex items-center justify-center gap-1">
                          <EmployerEditButton employer={employer} />
                          <button
                            type="button"
                            onClick={() => handleDelete(employer)}
                            disabled={pendingIds.has(employer.id) || employer._count.positions > 0}
                            className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/50 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={employer._count.positions > 0 ? "Cannot delete: has linked positions" : "Delete"}
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
      )}
    </div>
  );
}
