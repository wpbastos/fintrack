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
import { PositionDialog, PositionEditButton } from "./position-dialog";
import { togglePositionStatus, deletePosition } from "./actions";
import { toast } from "sonner";
import { Trash2, X, ExternalLink } from "lucide-react";

interface Position {
  id: number;
  title: string;
  department: string | null;
  startDate: Date | null;
  endDate: Date | null;
  isActive: boolean;
  notes: string | null;
  employer: {
    id: number;
    name: string;
    website: string | null;
  };
  _count: {
    incomes: number;
  };
}

interface PositionsPanelProps {
  positions: Position[];
}

export function PositionsPanel({ positions }: PositionsPanelProps) {
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");

  // Filter positions by search
  const filteredPositions = search
    ? positions.filter((p) => {
        const query = search.toLowerCase();
        return (
          p.title.toLowerCase().includes(query) ||
          (p.department?.toLowerCase().includes(query) ?? false) ||
          p.employer.name.toLowerCase().includes(query) ||
          (p.notes?.toLowerCase().includes(query) ?? false)
        );
      })
    : positions;

  // Group by employer
  const positionsByEmployer = filteredPositions.reduce((acc, position) => {
    const employerKey = position.employer.id;
    if (!acc[employerKey]) {
      acc[employerKey] = {
        employer: position.employer,
        positions: [],
      };
    }
    acc[employerKey].positions.push(position);
    return acc;
  }, {} as Record<number, { employer: Position["employer"]; positions: Position[] }>);

  const sortedGroups = Object.values(positionsByEmployer).sort((a, b) =>
    a.employer.name.localeCompare(b.employer.name)
  );

  const handleToggleStatus = async (position: Position) => {
    setPendingIds((prev) => new Set(prev).add(position.id));
    await togglePositionStatus(position.id, !position.isActive);
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(position.id);
      return next;
    });
    toast.success(`Position ${position.isActive ? "deactivated" : "activated"}`);
  };

  const handleDelete = async (position: Position) => {
    if (!confirm(`Are you sure you want to delete "${position.title}"?`)) {
      return;
    }

    setPendingIds((prev) => new Set(prev).add(position.id));
    const result = await deletePosition(position.id);
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(position.id);
      return next;
    });

    if (result.success) {
      toast.success("Position deleted");
    } else {
      toast.error(result.error || "Failed to delete position");
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-CA", {
      year: "numeric",
      month: "short",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <div className="relative">
          <Input
            placeholder="Search positions..."
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
        <PositionDialog />
      </div>

      {filteredPositions.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              {search ? "No positions match your search." : "No positions found."}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedGroups.map((group) => (
            <Card key={group.employer.id}>
              <div className="px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                  {group.employer.website ? (
                    <a
                      href={group.employer.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold hover:text-violet-600 hover:underline inline-flex items-center gap-1"
                    >
                      {group.employer.name}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="font-semibold">{group.employer.name}</span>
                  )}
                  <span className="text-sm text-muted-foreground">
                    ({group.positions.length} position{group.positions.length !== 1 ? "s" : ""})
                  </span>
                </div>
              </div>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-center">Income Sources</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="w-20 p-0"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.positions.map((position) => (
                      <TableRow key={position.id}>
                        <TableCell>
                          <span className="font-medium">{position.title}</span>
                        </TableCell>
                        <TableCell>
                          {position.department ? (
                            <span className="text-sm">{position.department}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {formatDate(position.startDate)}
                            {position.startDate && " → "}
                            {position.endDate ? formatDate(position.endDate) : position.startDate ? "Present" : ""}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {position._count.incomes > 0 ? (
                            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                              {position._count.incomes}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <button
                            onClick={() => handleToggleStatus(position)}
                            disabled={pendingIds.has(position.id)}
                            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                              position.isActive
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-800"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                            } ${pendingIds.has(position.id) ? "opacity-50" : ""}`}
                          >
                            {position.isActive ? "Active" : "Inactive"}
                          </button>
                        </TableCell>
                        <TableCell className="p-0 pr-2">
                          <div className="flex items-center justify-center gap-1">
                            <PositionEditButton position={position} />
                            <button
                              type="button"
                              onClick={() => handleDelete(position)}
                              disabled={pendingIds.has(position.id) || position._count.incomes > 0}
                              className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/50 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title={position._count.incomes > 0 ? "Cannot delete: has linked income sources" : "Delete"}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
