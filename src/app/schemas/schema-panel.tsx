"use client";

import { useState, useTransition } from "react";
import { Search, Plus, Pencil, Trash2, Copy, Power, PowerOff, FileJson, ChevronDown, ChevronRight, Check } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toggleSchemaStatus, deleteSchema, duplicateSchema } from "./actions";
import { SchemaDialog } from "./schema-dialog";
import type { DocumentSchema } from "./types";
import { DOCUMENT_TYPES } from "./types";

interface SchemaPanelProps {
  schemas: DocumentSchema[];
  statusFilter: "active" | "inactive";
}

function getDocumentTypeLabel(type: string): string {
  return DOCUMENT_TYPES.find((t) => t.value === type)?.label || type;
}

function getDocumentTypeBadgeStyle(type: string): string {
  switch (type) {
    case "credit_card_statement":
      return "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200";
    case "bank_statement":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
    case "payslip":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
    case "receipt":
      return "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200";
    case "invoice":
      return "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200";
    default:
      return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200";
  }
}

// JSON Line Component
function JsonLine({
  level,
  expandable = false,
  expanded = false,
  onToggle,
  children,
}: {
  level: number;
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}) {
  const INDENT_SIZE = 20;
  const GUTTER_WIDTH = 16;

  return (
    <div
      className={`flex items-start leading-6 ${
        expandable ? "cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-700/50" : ""
      }`}
      onClick={expandable ? onToggle : undefined}
    >
      <div
        className="shrink-0 flex items-center justify-center h-6"
        style={{ width: GUTTER_WIDTH, marginLeft: level * INDENT_SIZE }}
      >
        {expandable &&
          (expanded ? (
            <ChevronDown className="h-3 w-3 text-slate-400" />
          ) : (
            <ChevronRight className="h-3 w-3 text-slate-400" />
          ))}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function JsonValue({ value }: { value: unknown }) {
  if (typeof value === "string") {
    return <span className="text-amber-600 dark:text-amber-400">&quot;{value}&quot;</span>;
  }
  if (typeof value === "number") {
    return <span className="text-blue-600 dark:text-blue-400">{value}</span>;
  }
  if (typeof value === "boolean") {
    return <span className="text-purple-600 dark:text-purple-400">{String(value)}</span>;
  }
  if (value === null) {
    return <span className="text-slate-400 dark:text-slate-500">null</span>;
  }
  return <span>{String(value)}</span>;
}

function JsonNode({
  data,
  name,
  level = 0,
  defaultExpanded = true,
}: {
  data: unknown;
  name?: string;
  level?: number;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded && level < 2);

  const isObject = data !== null && typeof data === "object";
  const isArray = Array.isArray(data);
  const isEmpty = isObject && Object.keys(data as object).length === 0;

  if (!isObject || data === null) {
    return (
      <JsonLine level={level}>
        {name !== undefined && (
          <>
            <span className="text-rose-600 dark:text-rose-400">&quot;{name}&quot;</span>
            <span className="text-slate-500">: </span>
          </>
        )}
        <JsonValue value={data} />
      </JsonLine>
    );
  }

  const entries = Object.entries(data as object);
  const bracketOpen = isArray ? "[" : "{";
  const bracketClose = isArray ? "]" : "}";

  if (isEmpty) {
    return (
      <JsonLine level={level}>
        {name !== undefined && (
          <>
            <span className="text-rose-600 dark:text-rose-400">&quot;{name}&quot;</span>
            <span className="text-slate-500">: </span>
          </>
        )}
        <span className="text-slate-500">
          {bracketOpen}
          {bracketClose}
        </span>
      </JsonLine>
    );
  }

  return (
    <>
      <JsonLine level={level} expandable expanded={expanded} onToggle={() => setExpanded(!expanded)}>
        {name !== undefined && (
          <>
            <span className="text-rose-600 dark:text-rose-400">&quot;{name}&quot;</span>
            <span className="text-slate-500">: </span>
          </>
        )}
        <span className="text-slate-500">{bracketOpen}</span>
        {!expanded && (
          <>
            <span className="text-slate-400 ml-1">
              {isArray ? `${entries.length} items` : `${entries.length} keys`}
            </span>
            <span className="text-slate-500 ml-1">{bracketClose}</span>
          </>
        )}
      </JsonLine>

      {expanded && (
        <>
          {entries.map(([key, value]) => (
            <JsonNode
              key={key}
              data={value}
              name={isArray ? undefined : key}
              level={level + 1}
              defaultExpanded={level < 1}
            />
          ))}
          <JsonLine level={level}>
            <span className="text-slate-500">{bracketClose}</span>
          </JsonLine>
        </>
      )}
    </>
  );
}

function JsonViewDialog({ content, title }: { content: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"tree" | "raw">("tree");
  const [copied, setCopied] = useState(false);

  let parsedContent: unknown = null;
  let formattedContent = content;
  try {
    parsedContent = JSON.parse(content);
    formattedContent = JSON.stringify(parsedContent, null, 2);
  } catch {
    // Keep original
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0 rounded-md text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/50 shadow-[0_2px_0_0_rgba(99,102,241,0.4)] hover:bg-indigo-100 hover:shadow-[0_0_8px_2px_rgba(99,102,241,0.4)] hover:scale-110 active:shadow-none active:scale-100 active:translate-y-[1px] transition-all duration-150 dark:hover:bg-indigo-900/70"
        onClick={() => setOpen(true)}
        title="View JSON"
      >
        <FileJson className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          style={{
            display: "flex",
            flexDirection: "column",
            maxWidth: "56rem",
            height: "85vh",
            overflow: "hidden",
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5 text-indigo-600" />
              {title}
            </DialogTitle>
            <DialogDescription>JSON data structure</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 border-b pb-2">
            <div className="inline-flex rounded-lg border p-0.5 bg-muted/50">
              <button
                onClick={() => setViewMode("tree")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  viewMode === "tree"
                    ? "bg-white dark:bg-slate-800 shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Tree View
              </button>
              <button
                onClick={() => setViewMode("raw")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  viewMode === "raw"
                    ? "bg-white dark:bg-slate-800 shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Raw JSON
              </button>
            </div>
            <Button size="sm" variant="outline" className="h-7 px-2 ml-auto" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <div
            style={{ flex: 1, minHeight: 0, overflowY: "auto" }}
            className="rounded-md bg-slate-50 dark:bg-slate-900 p-4"
          >
            {viewMode === "tree" && parsedContent !== null ? (
              <div className="text-xs font-mono">
                <JsonNode data={parsedContent} defaultExpanded={true} />
              </div>
            ) : (
              <pre className="text-xs font-mono whitespace-pre">{formattedContent}</pre>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function SchemaPanel({ schemas, statusFilter }: SchemaPanelProps) {
  const [search, setSearch] = useState("");
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [, startTransition] = useTransition();

  const filteredSchemas = schemas.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      (s.institutionName?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const handleToggleStatus = (id: number, currentStatus: boolean) => {
    setPendingIds((prev) => new Set(prev).add(id));
    startTransition(async () => {
      const result = await toggleSchemaStatus(id, !currentStatus);
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (result.success) {
        toast.success(currentStatus ? "Schema deactivated" : "Schema activated");
      } else {
        toast.error(result.error || "Failed to update status");
      }
    });
  };

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Delete schema "${name}"? This cannot be undone.`)) return;

    setPendingIds((prev) => new Set(prev).add(id));
    startTransition(async () => {
      const result = await deleteSchema(id);
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (result.success) {
        toast.success("Schema deleted");
      } else {
        toast.error(result.error || "Failed to delete schema");
      }
    });
  };

  const handleDuplicate = (id: number) => {
    setPendingIds((prev) => new Set(prev).add(id));
    startTransition(async () => {
      const result = await duplicateSchema(id);
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (result.success) {
        toast.success("Schema duplicated");
      } else {
        toast.error(result.error || "Failed to duplicate schema");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Document Schemas</CardTitle>
            <CardDescription>
              {filteredSchemas.length} schema{filteredSchemas.length !== 1 ? "s" : ""}{" "}
              {statusFilter === "active" ? "active" : "inactive"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search schemas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <SchemaDialog
              trigger={
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Schema
                </Button>
              }
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredSchemas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {search ? "No schemas match your search" : "No schemas found"}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table className="table-fixed w-full">
              <colgroup>
                <col style={{ width: "22%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "12%" }} />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead className="text-center">Version</TableHead>
                  <TableHead className="text-center">JSON</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSchemas.map((schema) => {
                  const isItemPending = pendingIds.has(schema.id);
                  return (
                    <TableRow key={schema.id} className={isItemPending ? "opacity-50" : ""}>
                      <TableCell>
                        <div className="font-medium truncate" title={schema.name}>
                          {schema.name}
                        </div>
                        {schema.notes && (
                          <p className="text-xs text-muted-foreground truncate" title={schema.notes}>
                            {schema.notes}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {schema.code}
                        </code>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${getDocumentTypeBadgeStyle(
                            schema.documentType
                          )}`}
                        >
                          {getDocumentTypeLabel(schema.documentType)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground truncate block">
                          {schema.institutionName || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-xs text-muted-foreground">{schema.version}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <JsonViewDialog
                            content={schema.sampleData}
                            title={`Sample Data: ${schema.name}`}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <SchemaDialog
                            schema={schema}
                            trigger={
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:text-indigo-400 dark:hover:bg-indigo-950"
                                title="Edit"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            }
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-slate-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:text-violet-400 dark:hover:bg-violet-950"
                            onClick={() => handleDuplicate(schema.id)}
                            disabled={isItemPending}
                            title="Duplicate"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={`h-7 w-7 p-0 ${
                              schema.isActive
                                ? "text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:text-amber-400 dark:hover:bg-amber-950"
                                : "text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:text-emerald-400 dark:hover:bg-emerald-950"
                            }`}
                            onClick={() => handleToggleStatus(schema.id, schema.isActive)}
                            disabled={isItemPending}
                            title={schema.isActive ? "Deactivate" : "Activate"}
                          >
                            {schema.isActive ? (
                              <PowerOff className="h-3.5 w-3.5" />
                            ) : (
                              <Power className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-950"
                            onClick={() => handleDelete(schema.id, schema.name)}
                            disabled={isItemPending}
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
