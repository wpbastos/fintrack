"use client";

import { useState, useEffect, Fragment, useTransition, useCallback, useMemo } from "react";
import { ChevronDown, ChevronRight, Check, X, Sparkles, ArrowRightCircle, Trash2, Pencil, FileJson, Copy, Maximize2, Minimize2 } from "lucide-react";
import {
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { approveSuggestion, rejectSuggestion, approveAllSuggestions, rejectAllSuggestions, importBatchTransactions, unmatchTransaction, deleteImportBatch, updateStagingTransaction, getStagingLookupData } from "./actions";
import { formatDate, formatCurrency } from "@/lib/format";

interface ClaudeSuggestion {
  transactionId: number;
  type: "merchant" | "income";
  existingId?: number;
  existingName?: string;
  existingCategoryName?: string;
  suggestedPattern?: string;
  newEntity?: {
    name: string;
    categoryId?: number;
    categoryName?: string;
    parentCategoryId?: number;
    parentCategoryName?: string;
    pattern: string;
    employerName?: string;
  };
  confidence: "high" | "medium" | "low";
  reasoning?: string;
}

interface TransactionWithBalance {
  id: number;
  rawDate: string | null;
  rawDescription: string | null;
  rawAmount: number | null;
  resolvedDate: Date | null;
  merchant: { name: string } | null;
  income: { name: string } | null;
  category: { name: string; color: string | null; group: { name: string; color: string | null } | null } | null;
  status: string;
  notes: string | null;
  balance: number | null;
  isLastOfDay: boolean;
  importId: number | null;
  isFirstOfBatch: boolean;
}

interface ImportBatchInfo {
  importId: number;
  fileName: string;
  sourceType: string;
  createdAt: Date;
  periodStart: Date | null;
  periodEnd: Date | null;
  openingBalance: number;
  closingBalance: number;
  calculatedClosing: number;
  isBalanced: boolean;
  transactionCount: number;
  addedCount: number;
  matchedCount: number;
  unknownCount: number;
  accountId: number | null;
  accountName: string | null;
  institutionName: string | null;
  content: string | null;
  aiStatus: string;
  aiStartedAt: Date | null;
  aiResult: string | null;
  isFinalized: boolean;
}

interface AccountInfo {
  id: number;
  name: string;
  type: string;
  institution: { name: string } | null;
}

interface StagingTableProps {
  transactions: TransactionWithBalance[];
  batches: ImportBatchInfo[];
  importedTransactions?: TransactionWithBalance[];
  accounts?: AccountInfo[];
}

const statusStyles: Record<string, string> = {
  pending: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
  matched: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  unknown: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  suggested: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  imported: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
};

const sourceTypeStyles: Record<string, string> = {
  Statement: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
  CSV: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  OFX: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  QFX: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  QIF: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  PDF: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
};

function getSourceTypeBadge(type: string) {
  return (
    <span className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium w-20 shrink-0 ${sourceTypeStyles[type] ?? "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"}`}>
      {type}
    </span>
  );
}

function getStatusBadge(status: string) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${statusStyles[status] ?? statusStyles.pending}`}>
      {status}
    </span>
  );
}

function ClickableStatusBadge({ txnId, status, disabled = false }: { txnId: number; status: string; disabled?: boolean }) {
  const [isPending, startTransition] = useTransition();

  // Only matched status is clickable (and not when disabled)
  if (status !== "matched" || disabled) {
    return getStatusBadge(status);
  }

  const handleClick = () => {
    startTransition(async () => {
      const result = await unmatchTransaction(txnId);
      if (result.success) {
        toast.info("Transaction unmatched - showing raw description");
      } else {
        toast.error(result.error || "Failed to unmatch");
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium cursor-pointer hover:ring-2 hover:ring-amber-400 transition-all ${statusStyles.matched} disabled:opacity-50`}
      title="Click to unmatch and show raw description"
    >
      {isPending ? "..." : status}
    </button>
  );
}


function parseSuggestion(notes: string | null): ClaudeSuggestion | null {
  if (!notes) return null;
  try {
    return JSON.parse(notes) as ClaudeSuggestion;
  } catch {
    return null;
  }
}

function SuggestionActions({ txnId, suggestion }: { txnId: number; suggestion: ClaudeSuggestion }) {
  const [isPending, startTransition] = useTransition();

  const handleApprove = () => {
    startTransition(async () => {
      const result = await approveSuggestion(txnId);
      if (result.success) {
        toast.success("Suggestion approved");
      } else {
        toast.error(result.error || "Failed to approve");
      }
    });
  };

  const handleReject = () => {
    startTransition(async () => {
      const result = await rejectSuggestion(txnId);
      if (result.success) {
        toast.info("Suggestion rejected");
      } else {
        toast.error(result.error || "Failed to reject");
      }
    });
  };

  const suggestedName = suggestion.existingName || suggestion.newEntity?.name || "Unknown";
  const isNew = !suggestion.existingId;
  const confidenceColors = {
    high: "text-emerald-600 dark:text-emerald-400",
    medium: "text-amber-600 dark:text-amber-400",
    low: "text-rose-600 dark:text-rose-400",
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium truncate">{suggestedName}</span>
          {isNew && suggestion.newEntity && (
            <span
              className="shrink-0 inline-flex items-center rounded px-1 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 cursor-help"
              title={[
                `Name: ${suggestion.newEntity.name}`,
                `Pattern: ${suggestion.newEntity.pattern}`,
                suggestion.newEntity.categoryName && `Category: ${suggestion.newEntity.parentCategoryName ? `${suggestion.newEntity.parentCategoryName} > ` : ""}${suggestion.newEntity.categoryName}`,
                suggestion.newEntity.employerName && `Employer: ${suggestion.newEntity.employerName}`,
              ].filter(Boolean).join("\n")}
            >
              New {suggestion.type === "merchant" ? "Merchant" : "Income"}
            </span>
          )}
          <span className={`shrink-0 text-[10px] ${confidenceColors[suggestion.confidence]}`}>
            {suggestion.confidence}
          </span>
        </div>
        {suggestion.reasoning && (
          <p className="text-[10px] text-muted-foreground truncate" title={suggestion.reasoning}>
            {suggestion.reasoning}
          </p>
        )}
      </div>
      <div className="flex gap-1 shrink-0">
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950"
          onClick={handleApprove}
          disabled={isPending}
          title="Approve suggestion"
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950"
          onClick={handleReject}
          disabled={isPending}
          title="Reject suggestion"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface AiResolveResult {
  total: number;
  suggested: number;
  confirmed: number;
  duration?: number;
  cost?: number;
  tokens?: {
    input: number;
    output: number;
  };
  newMerchants: number;
  newIncomes: number;
  existingMatches: number;
}

function parseAiResult(aiResult: string | null, suggestions?: unknown[]): AiResolveResult | null {
  if (!aiResult) return null;
  try {
    const data = JSON.parse(aiResult);
    const suggestionList = suggestions || data.suggestions || [];

    let newMerchants = 0;
    let newIncomes = 0;
    let existingMatches = 0;

    for (const s of suggestionList as Array<{ confirmed?: boolean; newEntity?: unknown; existingId?: number; type?: string }>) {
      if (s.confirmed) {
        // Confirmed transactions don't count as suggestions
      } else if (s.newEntity) {
        if (s.type === "merchant") newMerchants++;
        else newIncomes++;
      } else if (s.existingId) {
        existingMatches++;
      }
    }

    return {
      total: data.total || 0,
      suggested: data.suggested || 0,
      confirmed: (data.total || 0) - (data.suggested || 0),
      duration: data.duration,
      cost: data.cost,
      tokens: data.tokens,
      newMerchants,
      newIncomes,
      existingMatches,
    };
  } catch {
    return null;
  }
}

function BatchAiResolveButton({
  importId,
  transactionCount,
  aiStatus: initialAiStatus,
  aiStartedAt,
  aiResult: initialAiResult,
  disabled = false,
  disabledReason,
}: {
  importId: number;
  transactionCount: number;
  aiStatus: string;
  aiStartedAt: Date | null;
  aiResult: string | null;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [localStatus, setLocalStatus] = useState<"idle" | "resolving" | "complete" | "error">(
    initialAiStatus === "resolving" ? "resolving" : "idle"
  );
  const [elapsedTime, setElapsedTime] = useState(() => {
    if (initialAiStatus === "resolving" && aiStartedAt) {
      return Math.floor((Date.now() - new Date(aiStartedAt).getTime()) / 1000);
    }
    return 0;
  });

  // Poll for status when resolving (from database state)
  useEffect(() => {
    if (initialAiStatus !== "resolving") return;

    // Update elapsed time every second
    const timer = setInterval(() => {
      if (aiStartedAt) {
        setElapsedTime(Math.floor((Date.now() - new Date(aiStartedAt).getTime()) / 1000));
      }
    }, 1000);

    // Poll for completion every 3 seconds
    const pollTimer = setInterval(async () => {
      try {
        const response = await fetch(`/api/ai/status?importId=${importId}`);
        const data = await response.json();

        if (data.aiStatus === "complete") {
          clearInterval(timer);
          clearInterval(pollTimer);
          const parsed = parseAiResult(data.aiResult);
          if (parsed) {
            if (parsed.suggested > 0) {
              toast.success(`AI found ${parsed.suggested} suggestions to review`);
            } else {
              toast.success("AI confirmed all transactions are correctly matched");
            }
            window.location.reload();
          }
        } else if (data.aiStatus === "error") {
          clearInterval(timer);
          clearInterval(pollTimer);
          setLocalStatus("error");
          toast.error("AI resolution failed");
        }
      } catch {
        // Ignore poll errors
      }
    }, 3000);

    return () => {
      clearInterval(timer);
      clearInterval(pollTimer);
    };
  }, [initialAiStatus, aiStartedAt, importId]);

  const handleAiResolve = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalStatus("resolving");
    setElapsedTime(0);

    // Start elapsed time counter
    const startTime = Date.now();
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    try {
      const response = await fetch("/api/ai/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importId, includeAll: true }),
      });
      const data = await response.json();

      clearInterval(timer);

      if (data.error) {
        setLocalStatus("error");
        toast.error(data.error);
      } else {
        const parsed = parseAiResult(JSON.stringify(data), data.suggestions);
        if (parsed) {
          if (parsed.suggested > 0) {
            toast.success(`AI found ${parsed.suggested} suggestions to review`);
          } else {
            toast.success("AI confirmed all transactions are correctly matched");
          }
          window.location.reload();
        }
      }
    } catch (err) {
      clearInterval(timer);
      setLocalStatus("error");
      const message = err instanceof Error ? err.message : "AI resolve failed";
      toast.error(message);
    }
  };

  // Resolving state - show spinning icon button
  if (localStatus === "resolving" || initialAiStatus === "resolving") {
    return (
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-purple-600 dark:text-purple-400 cursor-wait"
        disabled
        title={`Analyzing ${transactionCount} transactions... ${elapsedTime > 0 ? `(${elapsedTime}s)` : ""}`}
      >
        <svg className="w-3.5 h-3.5 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        {elapsedTime > 0 ? `${elapsedTime}s` : "AI"}
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className={`h-7 px-2 ${disabled ? "text-slate-300 cursor-not-allowed dark:text-slate-600" : "text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950"}`}
      onClick={disabled ? (e) => e.stopPropagation() : handleAiResolve}
      disabled={disabled}
      title={disabled ? disabledReason : `AI analyze all ${transactionCount} transactions`}
    >
      <Sparkles className="w-3.5 h-3.5 mr-1" />
      AI
    </Button>
  );
}

function BulkSuggestionActions({ suggestedCount }: { suggestedCount: number }) {
  const [isPending, startTransition] = useTransition();

  if (suggestedCount === 0) return null;

  const handleApproveAll = () => {
    startTransition(async () => {
      const result = await approveAllSuggestions();
      if (result.success) {
        toast.success(`Approved ${result.approved} suggestions`);
      } else {
        toast.error(result.error || "Failed to approve all");
      }
    });
  };

  const handleRejectAll = () => {
    startTransition(async () => {
      const result = await rejectAllSuggestions();
      if (result.success) {
        toast.info(`Rejected ${result.rejected} suggestions`);
      } else {
        toast.error(result.error || "Failed to reject all");
      }
    });
  };

  return (
    <div className="flex items-center justify-between p-3 mb-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
      <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
        {suggestedCount} AI suggestion{suggestedCount !== 1 ? "s" : ""} pending review
      </span>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:text-rose-400 dark:border-rose-800 dark:hover:bg-rose-950"
          onClick={handleRejectAll}
          disabled={isPending}
        >
          <X className="h-4 w-4 mr-1" />
          Reject All
        </Button>
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={handleApproveAll}
          disabled={isPending}
        >
          <Check className="h-4 w-4 mr-1" />
          Approve All
        </Button>
      </div>
    </div>
  );
}

function BatchImportButton({
  importId,
  matchedCount,
  isReady,
  hasUnresolved,
  hasBalanceError,
  onSuccess
}: {
  importId: number;
  matchedCount: number;
  isReady: boolean;
  hasUnresolved: boolean;
  hasBalanceError: boolean;
  onSuccess?: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  if (matchedCount === 0 && !hasUnresolved && !hasBalanceError) return null;

  const handleImport = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent batch toggle
    if (!isReady) return;
    startTransition(async () => {
      const result = await importBatchTransactions(importId);
      if (result.success) {
        toast.success(`Imported ${result.imported} transactions`);
        onSuccess?.();
      } else {
        toast.error(result.error || "Failed to import transactions");
      }
    });
  };

  // Build disabled reason
  let disabledReason = "";
  if (hasUnresolved) disabledReason = "Resolve all transactions first";
  else if (hasBalanceError) disabledReason = "Fix balance mismatch first";

  return (
    <Button
      size="sm"
      className={`h-7 px-2 ${isReady ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400 cursor-not-allowed"}`}
      onClick={handleImport}
      disabled={isPending || !isReady}
      title={isReady ? `Import ${matchedCount} matched transactions` : disabledReason}
    >
      <ArrowRightCircle className="w-3.5 h-3.5 mr-1" />
      {isPending ? "..." : `Import ${matchedCount}`}
    </Button>
  );
}

function BatchDeleteButton({ importId, fileName, disabled = false }: { importId: number; fileName: string; disabled?: boolean }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent batch toggle
    if (disabled) return;
    if (!confirm(`Delete import "${fileName}" and all its transactions?`)) return;

    startTransition(async () => {
      const result = await deleteImportBatch(importId);
      if (result.success) {
        toast.success("Import deleted");
      } else {
        toast.error(result.error || "Failed to delete import");
      }
    });
  };

  return (
    <Button
      size="icon"
      variant="ghost"
      className={`h-7 w-7 ${disabled ? "text-slate-300 dark:text-slate-600 cursor-not-allowed" : "text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-950"}`}
      onClick={handleDelete}
      disabled={isPending || disabled}
      title={disabled ? "Cannot delete imported batch" : "Delete import"}
    >
      <Trash2 className="w-3.5 h-3.5" />
    </Button>
  );
}

// JSON Line Component - renders a single line with proper gutter alignment
function JsonLine({
  level,
  expandable = false,
  expanded = false,
  onToggle,
  children
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
      className={`flex items-start leading-6 ${expandable ? "cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-700/50" : ""}`}
      onClick={expandable ? onToggle : undefined}
    >
      <div
        className="shrink-0 flex items-center justify-center h-6"
        style={{ width: GUTTER_WIDTH, marginLeft: level * INDENT_SIZE }}
      >
        {expandable && (
          expanded ? (
            <ChevronDown className="h-3 w-3 text-slate-400" />
          ) : (
            <ChevronRight className="h-3 w-3 text-slate-400" />
          )
        )}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

// Format a primitive value with appropriate styling
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

// Collapsible JSON Node Component
function JsonNode({ data, name, level = 0, defaultExpanded = true }: {
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
        <span className="text-slate-500">{bracketOpen}{bracketClose}</span>
      </JsonLine>
    );
  }

  return (
    <>
      <JsonLine
        level={level}
        expandable
        expanded={expanded}
        onToggle={() => setExpanded(!expanded)}
      >
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

function ViewContentButton({ content, fileName }: { content: string | null; fileName?: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"tree" | "raw">("tree");

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewMode("tree");
    setOpen(true);
  };

  const handleCopy = useCallback(() => {
    if (!content) return;
    let textToCopy = content;
    try {
      textToCopy = JSON.stringify(JSON.parse(content), null, 2);
    } catch {
      // Keep original
    }
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  if (!content) return null;

  let parsedContent: unknown = null;
  let formattedContent = content;
  try {
    parsedContent = JSON.parse(content);
    formattedContent = JSON.stringify(parsedContent, null, 2);
  } catch {
    // Keep original if not valid JSON
  }

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 w-6 p-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:text-indigo-400 dark:hover:bg-indigo-950"
        onClick={handleOpen}
        title="View JSON content"
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
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5 text-indigo-600" />
              Import Content
            </DialogTitle>
            <DialogDescription>{fileName || "Original JSON data from the import"}</DialogDescription>
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
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 ml-auto"
              onClick={handleCopy}
            >
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

interface LookupData {
  merchants: Array<{ id: number; name: string; categoryId: number | null }>;
  incomes: Array<{ id: number; name: string; categoryId: number | null }>;
  categories: Array<{ id: number; name: string; color: string | null; groupName: string; groupColor: string | null }>;
}

function TransactionEditDialog({
  txn,
  suggestion,
}: {
  txn: TransactionWithBalance;
  suggestion?: ClaudeSuggestion | null;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [lookupData, setLookupData] = useState<LookupData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [resolvedDate, setResolvedDate] = useState("");
  const [assignmentType, setAssignmentType] = useState<"merchant" | "income">("merchant");
  const [merchantId, setMerchantId] = useState<number | "">("");
  const [incomeId, setIncomeId] = useState<number | "">("");
  const [categoryId, setCategoryId] = useState<number | "">("");

  // Helper to apply suggestion values to form
  const applySuggestionValues = (data: LookupData) => {
    if (!suggestion) return;

    if (suggestion.type === "merchant") {
      if (suggestion.existingId) {
        setMerchantId(suggestion.existingId);
        const merchant = data.merchants.find(m => m.id === suggestion.existingId);
        if (merchant?.categoryId) setCategoryId(merchant.categoryId);
      } else if (suggestion.existingName) {
        // Case-insensitive name matching
        const searchName = suggestion.existingName.toLowerCase();
        const merchant = data.merchants.find(m => m.name.toLowerCase() === searchName);
        if (merchant) {
          setMerchantId(merchant.id);
          if (merchant.categoryId) setCategoryId(merchant.categoryId);
        }
      }
    } else if (suggestion.type === "income") {
      if (suggestion.existingId) {
        setIncomeId(suggestion.existingId);
        const income = data.incomes.find(i => i.id === suggestion.existingId);
        if (income?.categoryId) setCategoryId(income.categoryId);
      } else if (suggestion.existingName) {
        // Case-insensitive name matching
        const searchName = suggestion.existingName.toLowerCase();
        const income = data.incomes.find(i => i.name.toLowerCase() === searchName);
        if (income) {
          setIncomeId(income.id);
          if (income.categoryId) setCategoryId(income.categoryId);
        }
      }
    }

    // If suggestion has a category, use it
    if (suggestion.existingCategoryName) {
      const searchName = suggestion.existingCategoryName.toLowerCase();
      const cat = data.categories.find(c => c.name.toLowerCase() === searchName);
      if (cat) setCategoryId(cat.id);
    } else if (suggestion.newEntity?.categoryName) {
      const searchName = suggestion.newEntity.categoryName.toLowerCase();
      const cat = data.categories.find(c => c.name.toLowerCase() === searchName);
      if (cat) setCategoryId(cat.id);
    }
  };

  const handleOpenChange = async (newOpen: boolean) => {
    if (newOpen) {
      // Initialize form with current values or suggestion values
      setResolvedDate(txn.resolvedDate ? txn.resolvedDate.toISOString().split("T")[0] : "");

      // If there's a suggestion, use its values
      if (suggestion) {
        setAssignmentType(suggestion.type);

        // Load lookup data if needed, then apply suggestion
        if (!lookupData) {
          setIsLoading(true);
          try {
            const data = await getStagingLookupData();
            setLookupData(data);
            applySuggestionValues(data);
          } finally {
            setIsLoading(false);
          }
        } else {
          // Lookup data already loaded, apply suggestion values
          applySuggestionValues(lookupData);
        }
      } else {
        // No suggestion - use current transaction values
        setAssignmentType(txn.income ? "income" : "merchant");
        setMerchantId(txn.merchant ? (lookupData?.merchants.find(m => m.name === txn.merchant?.name)?.id ?? "") : "");
        setIncomeId(txn.income ? (lookupData?.incomes.find(i => i.name === txn.income?.name)?.id ?? "") : "");
        setCategoryId(txn.category ? (lookupData?.categories.find(c => c.name === txn.category?.name)?.id ?? "") : "");

        // Load lookup data if not already loaded
        if (!lookupData) {
          setIsLoading(true);
          try {
            const data = await getStagingLookupData();
            setLookupData(data);
            // Re-initialize IDs with loaded data
            if (txn.merchant) {
              const m = data.merchants.find(m => m.name === txn.merchant?.name);
              if (m) setMerchantId(m.id);
            }
            if (txn.income) {
              const i = data.incomes.find(i => i.name === txn.income?.name);
              if (i) setIncomeId(i.id);
            }
            if (txn.category) {
              const c = data.categories.find(c => c.name === txn.category?.name);
              if (c) setCategoryId(c.id);
            }
          } finally {
            setIsLoading(false);
          }
        }
      }
    }
    setOpen(newOpen);
  };

  // Auto-set category when merchant/income changes
  const handleMerchantChange = (id: number | "") => {
    setMerchantId(id);
    if (id && lookupData) {
      const merchant = lookupData.merchants.find(m => m.id === id);
      if (merchant?.categoryId) {
        setCategoryId(merchant.categoryId);
      }
    }
  };

  const handleIncomeChange = (id: number | "") => {
    setIncomeId(id);
    if (id && lookupData) {
      const income = lookupData.incomes.find(i => i.id === id);
      if (income?.categoryId) {
        setCategoryId(income.categoryId);
      }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateStagingTransaction(txn.id, {
        resolvedDate: resolvedDate || null,
        merchantId: assignmentType === "merchant" && merchantId ? merchantId : null,
        incomeId: assignmentType === "income" && incomeId ? incomeId : null,
        categoryId: categoryId || null,
      });
      if (result.success) {
        toast.success("Transaction updated");
        setOpen(false);
      } else {
        toast.error(result.error || "Failed to update transaction");
      }
    });
  };

  const groupedCategories = lookupData?.categories.reduce(
    (acc, cat) => {
      if (!acc[cat.groupName]) acc[cat.groupName] = [];
      acc[cat.groupName].push(cat);
      return acc;
    },
    {} as Record<string, typeof lookupData.categories>
  ) ?? {};

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className={`h-6 w-6 ${suggestion ? "text-purple-500 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950" : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:text-indigo-400 dark:hover:bg-indigo-950"}`}
          title={suggestion ? "Edit with AI suggestion" : "Edit transaction"}
        >
          <Pencil className="w-3 h-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {suggestion && <Sparkles className="w-4 h-4 text-purple-500" />}
            {suggestion ? "Review AI Suggestion" : "Edit Transaction"}
          </DialogTitle>
          <DialogDescription>
            {suggestion ? "AI has suggested values for this transaction. Review and save to apply." : "Update transaction details."}
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-muted-foreground">Loading...</span>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <div className="space-y-4 py-4">
              {/* AI Suggestion Info */}
              {suggestion && (
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-purple-700 dark:text-purple-300">
                        {suggestion.newEntity ? "Create new" : "Match to existing"}: {suggestion.existingName || suggestion.newEntity?.name}
                      </p>
                      {suggestion.reasoning && (
                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">{suggestion.reasoning}</p>
                      )}
                      <p className="text-xs text-purple-500 mt-1">Confidence: {suggestion.confidence}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Raw Description (read-only) */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <p className="text-sm text-muted-foreground bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-md">
                  {txn.rawDescription || "—"}
                </p>
              </div>

              {/* Amount (read-only) */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount</label>
                <p className={`text-sm font-mono px-3 py-2 rounded-md bg-slate-50 dark:bg-slate-900 ${
                  (txn.rawAmount ?? 0) < 0 ? "text-rose-600" : "text-emerald-600"
                }`}>
                  {formatCurrency(txn.rawAmount ?? 0)}
                </p>
              </div>

              {/* Date */}
              <div className="space-y-2">
                <label htmlFor="resolvedDate" className="text-sm font-medium">
                  Date
                </label>
                <Input
                  id="resolvedDate"
                  type="date"
                  value={resolvedDate}
                  onChange={(e) => setResolvedDate(e.target.value)}
                />
                {txn.rawDate && (
                  <p className="text-xs text-muted-foreground">Original: {txn.rawDate}</p>
                )}
              </div>

              {/* Assignment Type Toggle */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={assignmentType === "merchant" ? "default" : "outline"}
                    onClick={() => setAssignmentType("merchant")}
                    className="flex-1"
                  >
                    Merchant (Expense)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={assignmentType === "income" ? "default" : "outline"}
                    onClick={() => setAssignmentType("income")}
                    className="flex-1"
                  >
                    Income
                  </Button>
                </div>
              </div>

              {/* Merchant or Income Select */}
              {assignmentType === "merchant" ? (
                <div className="space-y-2">
                  <label htmlFor="merchant" className="text-sm font-medium">
                    Merchant
                  </label>
                  <select
                    id="merchant"
                    value={merchantId}
                    onChange={(e) => handleMerchantChange(e.target.value ? parseInt(e.target.value) : "")}
                    className={`h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:bg-slate-800 dark:border-slate-700 ${suggestion?.newEntity && suggestion.type === "merchant" ? "border-purple-300 dark:border-purple-700" : "border-input"}`}
                  >
                    <option value="">Select merchant...</option>
                    {lookupData?.merchants.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  {suggestion?.newEntity && suggestion.type === "merchant" && !merchantId && (
                    <p className="text-xs text-purple-600 dark:text-purple-400">
                      AI suggests creating new: &quot;{suggestion.newEntity.name}&quot; — use Approve button to create, or select existing above
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <label htmlFor="income" className="text-sm font-medium">
                    Income Source
                  </label>
                  <select
                    id="income"
                    value={incomeId}
                    onChange={(e) => handleIncomeChange(e.target.value ? parseInt(e.target.value) : "")}
                    className={`h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:bg-slate-800 dark:border-slate-700 ${suggestion?.newEntity && suggestion.type === "income" ? "border-purple-300 dark:border-purple-700" : "border-input"}`}
                  >
                    <option value="">Select income source...</option>
                    {lookupData?.incomes.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                  {suggestion?.newEntity && suggestion.type === "income" && !incomeId && (
                    <p className="text-xs text-purple-600 dark:text-purple-400">
                      AI suggests creating new: &quot;{suggestion.newEntity.name}&quot; — use Approve button to create, or select existing above
                    </p>
                  )}
                </div>
              )}

              {/* Category */}
              <div className="space-y-2">
                <label htmlFor="category" className="text-sm font-medium">
                  Category
                </label>
                <select
                  id="category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value ? parseInt(e.target.value) : "")}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-violet-300 dark:bg-slate-800 dark:border-slate-700"
                >
                  <option value="">Select category...</option>
                  {Object.entries(groupedCategories).map(([groupName, cats]) => (
                    <optgroup key={groupName} label={groupName}>
                      {cats.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ToggleFilter<T extends string>({
  options,
  value,
  onChange
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border p-1 bg-muted/50">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            value === option.value
              ? "bg-white dark:bg-slate-800 shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function AccountFilter({
  accounts,
  value,
  onChange
}: {
  accounts: { id: number; name: string; type: string; institution: { name: string } | null }[];
  value: number | "all";
  onChange: (value: number | "all") => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value === "all" ? "all" : parseInt(e.target.value))}
      className="h-9 rounded-lg border bg-muted/50 px-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <option value="all">All Accounts</option>
      {accounts.map((account) => (
        <option key={account.id} value={account.id}>
          {account.name}{account.institution ? ` (${account.institution.name})` : ""}
        </option>
      ))}
    </select>
  );
}

type MaximizedChart = "expenses" | "income" | null;

export function StagingTable({ transactions, batches, importedTransactions = [], accounts = [] }: StagingTableProps) {
  // Filter states
  const [timeFilter, setTimeFilter] = useState<"thisYear" | "allTime">("thisYear");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "imported">("pending");
  const [accountFilter, setAccountFilter] = useState<number | "all">("all");
  const [maximized, setMaximized] = useState<MaximizedChart>(null);

  // Start with all batches collapsed
  const [expandedBatches, setExpandedBatches] = useState<Set<number>>(new Set());

  // Get current year for time filter
  const currentYear = new Date().getFullYear();

  const toggleBatch = (importId: number) => {
    setExpandedBatches((prev) => {
      const next = new Set(prev);
      if (next.has(importId)) {
        next.delete(importId);
      } else {
        next.add(importId);
      }
      return next;
    });
  };

  const collapseAll = () => {
    setExpandedBatches(new Set());
  };

  // Group staging transactions by batch
  const transactionsByBatch = new Map<number, TransactionWithBalance[]>();
  transactions.forEach((txn) => {
    if (txn.importId) {
      if (!transactionsByBatch.has(txn.importId)) {
        transactionsByBatch.set(txn.importId, []);
      }
      transactionsByBatch.get(txn.importId)!.push(txn);
    }
  });

  // Group imported transactions by batch
  const importedByBatch = new Map<number, TransactionWithBalance[]>();
  importedTransactions.forEach((txn) => {
    if (txn.importId) {
      if (!importedByBatch.has(txn.importId)) {
        importedByBatch.set(txn.importId, []);
      }
      importedByBatch.get(txn.importId)!.push(txn);
    }
  });

  // Filter batches based on all filters
  const filteredBatches = batches.filter((batch) => {
    // Status filter
    if (statusFilter === "pending" && batch.isFinalized) return false;
    if (statusFilter === "imported" && !batch.isFinalized) return false;

    // Time filter - check periodEnd year
    if (timeFilter === "thisYear" && batch.periodEnd) {
      const batchYear = new Date(batch.periodEnd).getFullYear();
      if (batchYear !== currentYear) return false;
    }

    // Account filter
    if (accountFilter !== "all") {
      if (batch.accountId !== accountFilter) return false;
    }

    return true;
  });

  // Count transactions by status (only from pending batches for accurate count)
  const pendingBatchIds = new Set(filteredBatches.map((b) => b.importId));
  const suggestedCount = transactions.filter(
    (t) => t.status === "suggested" && pendingBatchIds.has(t.importId ?? 0)
  ).length;

  // Track batch numbers for display
  const batchNumberMap = new Map<number, number>();
  batches.forEach((batch, idx) => {
    batchNumberMap.set(batch.importId, idx + 1);
  });

  // Chart data: Category Group Distribution (from expense transactions only)
  // Note: Credit card transactions are normalized on import (signs flipped)
  // so negative = expense for all account types
  const categoryChartData = useMemo(() => {
    const groupMap = new Map<string, { name: string; value: number; color: string }>();

    // Get transactions from filtered batches
    const allTxns = filteredBatches.flatMap((batch) => {
      if (batch.isFinalized) {
        return importedByBatch.get(batch.importId) ?? [];
      }
      return transactionsByBatch.get(batch.importId) ?? [];
    });

    allTxns.forEach((txn) => {
      if (txn.category?.group && txn.rawAmount !== null && txn.rawAmount < 0) {
        const groupName = txn.category.group.name;
        const color = txn.category.group.color || "#6366f1";
        const existing = groupMap.get(groupName);
        if (existing) {
          existing.value += Math.abs(txn.rawAmount);
        } else {
          groupMap.set(groupName, { name: groupName, value: Math.abs(txn.rawAmount), color });
        }
      }
    });

    return Array.from(groupMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 groups
  }, [filteredBatches, transactionsByBatch, importedByBatch]);

  // Chart data: Income by Category (from income transactions only)
  // Note: Credit card transactions are normalized on import (signs flipped)
  // so positive = income/payment for all account types
  const incomeChartData = useMemo(() => {
    const categoryMap = new Map<string, { name: string; value: number; color: string }>();

    // Get transactions from filtered batches
    const allTxns = filteredBatches.flatMap((batch) => {
      if (batch.isFinalized) {
        return importedByBatch.get(batch.importId) ?? [];
      }
      return transactionsByBatch.get(batch.importId) ?? [];
    });

    allTxns.forEach((txn) => {
      if (txn.category && txn.rawAmount !== null && txn.rawAmount > 0) {
        const categoryName = txn.category.name;
        const color = txn.category.color || txn.category.group?.color || "#10b981";
        const existing = categoryMap.get(categoryName);
        if (existing) {
          existing.value += txn.rawAmount;
        } else {
          categoryMap.set(categoryName, { name: categoryName, value: txn.rawAmount, color });
        }
      }
    });

    return Array.from(categoryMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 categories
  }, [filteredBatches, transactionsByBatch, importedByBatch]);

  return (
    <div className="space-y-4">
      {/* Charts */}
      <div className={`grid gap-6 ${maximized ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"}`}>
          {/* Category Distribution Chart */}
          {(maximized === null || maximized === "expenses") && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Expenses by Group</h3>
              <button
                onClick={() => setMaximized(maximized === "expenses" ? null : "expenses")}
                className="h-7 w-7 p-0 rounded-md text-slate-500 bg-slate-100 dark:text-slate-400 dark:bg-slate-700/50 shadow-[0_2px_0_0_rgba(100,116,139,0.3)] hover:bg-slate-200 hover:shadow-[0_0_8px_2px_rgba(100,116,139,0.3)] hover:scale-110 active:shadow-none active:scale-100 active:translate-y-[1px] transition-all duration-150 dark:hover:bg-slate-600/70 flex items-center justify-center"
                title={maximized === "expenses" ? "Minimize" : "Maximize"}
              >
                {maximized === "expenses" ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div style={{ width: maximized ? 280 : 180, height: maximized ? 280 : 180 }} className="relative">
                {categoryChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={maximized ? 70 : 45}
                        outerRadius={maximized ? 120 : 75}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatCurrency(value as number)}
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                    No data
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                {categoryChartData.length > 0 ? (
                  categoryChartData.map((cat) => (
                    <div key={cat.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="truncate max-w-[120px]">{cat.name}</span>
                      </div>
                      <span className="font-mono text-muted-foreground">
                        {formatCurrency(cat.value)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground">No categorized expenses</div>
                )}
              </div>
            </div>
          </div>
          )}

          {/* Income by Category Chart */}
          {(maximized === null || maximized === "income") && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Income by Category</h3>
              <button
                onClick={() => setMaximized(maximized === "income" ? null : "income")}
                className="h-7 w-7 p-0 rounded-md text-slate-500 bg-slate-100 dark:text-slate-400 dark:bg-slate-700/50 shadow-[0_2px_0_0_rgba(100,116,139,0.3)] hover:bg-slate-200 hover:shadow-[0_0_8px_2px_rgba(100,116,139,0.3)] hover:scale-110 active:shadow-none active:scale-100 active:translate-y-[1px] transition-all duration-150 dark:hover:bg-slate-600/70 flex items-center justify-center"
                title={maximized === "income" ? "Minimize" : "Maximize"}
              >
                {maximized === "income" ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div style={{ width: maximized ? 280 : 180, height: maximized ? 280 : 180 }} className="relative">
                {incomeChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={incomeChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={maximized ? 70 : 45}
                        outerRadius={maximized ? 120 : 75}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {incomeChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatCurrency(value as number)}
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                    No data
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                {incomeChartData.length > 0 ? (
                  incomeChartData.map((cat) => (
                    <div key={cat.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="truncate max-w-[120px]">{cat.name}</span>
                      </div>
                      <span className="font-mono text-muted-foreground">
                        {formatCurrency(cat.value)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground">No categorized income</div>
                )}
              </div>
            </div>
          </div>
          )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase">Time</span>
          <ToggleFilter
            options={[
              { value: "thisYear", label: "This Year" },
              { value: "allTime", label: "All Time" },
            ]}
            value={timeFilter}
            onChange={setTimeFilter}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase">Status</span>
          <ToggleFilter
            options={[
              { value: "all", label: "All" },
              { value: "pending", label: "Pending" },
              { value: "imported", label: "Imported" },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </div>
        {accounts.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase">Account</span>
            <AccountFilter
              accounts={accounts}
              value={accountFilter}
              onChange={setAccountFilter}
            />
          </div>
        )}
      </div>

      <BulkSuggestionActions suggestedCount={suggestedCount} />
      <div className="rounded-md border">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-32">Category</TableHead>
              <TableHead className="w-28 text-right">Amount</TableHead>
              <TableHead className="w-36 text-right">Balance</TableHead>
              <TableHead className="w-20">Status</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBatches.map((batch) => {
              const batchNumber = batchNumberMap.get(batch.importId) ?? 1;
              const isExpanded = expandedBatches.has(batch.importId);
              const batchTransactions = transactionsByBatch.get(batch.importId) ?? [];
              const fileName = batch.fileName || `Import #${batch.importId}`;

              // For finalized batches, use stored counts from import record
              const matchedCount = batch.isFinalized ? batch.transactionCount : batchTransactions.filter((t) => t.status === "matched").length;
              const batchSuggestedCount = batch.isFinalized ? 0 : batchTransactions.filter((t) => t.status === "suggested").length;
              const pendingCount = batch.isFinalized ? 0 : batchTransactions.filter((t) => t.status === "pending" || t.status === "unknown" || t.status === "suggested").length;
              // Ready to import: all transactions matched, balance verified, has transactions
              const isReadyToImport = pendingCount === 0 && matchedCount > 0 && batch.isBalanced && !batch.isFinalized;
              // Disable AI resolve if suggestions pending or all already matched or finalized
              const allMatched = batch.isFinalized || matchedCount === batchTransactions.length;
              const aiDisabled = batchSuggestedCount > 0 || allMatched || batch.isFinalized;
              const aiDisabledReason = batch.isFinalized ? "Already imported" : batchSuggestedCount > 0 ? "Review suggestions first" : allMatched ? "All transactions already matched" : undefined;

              return (
                <Fragment key={batch.importId}>
                  {/* Batch Header Row */}
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleBatch(batch.importId)}
                  >
                    <TableCell colSpan={7} className="py-2">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold bg-slate-200 dark:bg-slate-700">
                          {batch.importId}
                        </span>
                        <div className="flex flex-col flex-none overflow-hidden" style={{ width: "280px" }}>
                          <span className="font-medium truncate">
                            {batch.accountName || <span className="text-muted-foreground">No account</span>}
                          </span>
                          <span className="text-xs text-muted-foreground truncate h-4">
                            {batch.institutionName || "\u00A0"}
                          </span>
                        </div>
                        {getSourceTypeBadge(batch.sourceType)}
                        {batch.transactionCount > 0 ? (
                          <div className="relative w-9 h-9 shrink-0" title={`${batch.transactionCount} total · ${matchedCount} matched · ${batch.unknownCount} unknown`}>
                            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                              <circle
                                cx="18" cy="18" r="15.9"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                className="text-slate-100 dark:text-slate-700"
                              />
                              {matchedCount > 0 && (
                                <circle
                                  cx="18" cy="18" r="15.9"
                                  fill="none"
                                  stroke="#10b981"
                                  strokeWidth="3"
                                  strokeDasharray={`${(matchedCount / batch.transactionCount) * 100} 100`}
                                  strokeDashoffset="0"
                                />
                              )}
                              {batch.unknownCount > 0 && (
                                <circle
                                  cx="18" cy="18" r="15.9"
                                  fill="none"
                                  stroke="#f59e0b"
                                  strokeWidth="3"
                                  strokeDasharray={`${(batch.unknownCount / batch.transactionCount) * 100} 100`}
                                  strokeDashoffset={`${-((matchedCount / batch.transactionCount) * 100)}`}
                                />
                              )}
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-[10px] font-bold">{batch.transactionCount}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                        {batch.periodStart && batch.periodEnd ? (
                          <span className="text-sm text-muted-foreground whitespace-nowrap shrink-0">
                            {formatDate(batch.periodStart)} → {formatDate(batch.periodEnd)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                        <span className="ml-auto flex items-center gap-2">
                          <span className="font-mono text-sm shrink-0">
                            {formatCurrency(batch.openingBalance)} → {formatCurrency(batch.closingBalance)}
                          </span>
                          <BatchAiResolveButton
                            importId={batch.importId}
                            transactionCount={batch.isFinalized ? batch.transactionCount : batchTransactions.length}
                            aiStatus={batch.aiStatus}
                            aiStartedAt={batch.aiStartedAt}
                            aiResult={batch.aiResult}
                            disabled={aiDisabled || batch.isFinalized}
                            disabledReason={aiDisabledReason}
                          />
                          <BatchImportButton
                            importId={batch.importId}
                            matchedCount={matchedCount}
                            isReady={isReadyToImport && !batch.isFinalized}
                            hasUnresolved={pendingCount > 0}
                            hasBalanceError={!batch.isBalanced}
                            onSuccess={collapseAll}
                          />
                          <BatchDeleteButton importId={batch.importId} fileName={fileName} disabled={batch.isFinalized} />
                          <ViewContentButton content={batch.content} fileName={batch.fileName} />
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Transaction Rows (unified for both pending and imported) */}
                  {isExpanded &&
                    (batch.isFinalized ? importedByBatch.get(batch.importId) ?? [] : batchTransactions).map((txn) => {
                      const suggestion = !batch.isFinalized && txn.status === "suggested" ? parseSuggestion(txn.notes) : null;
                      const resolvedName = txn.merchant?.name || txn.income?.name;

                      return (
                        <TableRow key={batch.isFinalized ? `imported-${txn.id}` : txn.id} className={txn.status === "suggested" ? "bg-purple-50/30 dark:bg-purple-950/20" : ""}>
                          <TableCell className="font-mono text-sm" title={txn.rawDate ?? ""}>
                            {txn.resolvedDate ? (
                              <span className="font-medium">{formatDate(txn.resolvedDate)}</span>
                            ) : (
                              <span className="text-muted-foreground">{txn.rawDate ?? "-"}</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[300px]" title={txn.rawDescription ?? ""}>
                            {suggestion ? (
                              <SuggestionActions txnId={txn.id} suggestion={suggestion} />
                            ) : resolvedName ? (
                              <span className="font-medium truncate block">{resolvedName}</span>
                            ) : (
                              <span className="text-muted-foreground truncate block">{txn.rawDescription}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {txn.category ? (
                              <span
                                className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
                                style={{
                                  backgroundColor: `${txn.category.color || txn.category.group?.color || "#6366f1"}20`,
                                  color: txn.category.color || txn.category.group?.color || "#6366f1",
                                }}
                              >
                                {txn.category.name}
                              </span>
                            ) : suggestion?.existingCategoryName || suggestion?.newEntity?.categoryName ? (
                              <span
                                className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 border border-dashed border-purple-300 dark:border-purple-700"
                                title="Suggested category"
                              >
                                {suggestion.existingCategoryName || suggestion.newEntity?.categoryName}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell
                            className={`text-right font-mono ${
                              (txn.rawAmount ?? 0) < 0
                                ? "text-rose-500 dark:text-rose-400"
                                : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {formatCurrency(txn.rawAmount ?? 0)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {txn.balance !== null ? (
                              <span
                                className={
                                  txn.balance >= 0
                                    ? "text-sky-600 dark:text-sky-400"
                                    : "text-rose-400 dark:text-rose-300"
                                }
                              >
                                {formatCurrency(txn.balance)}
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            {batch.isFinalized ? (
                              getStatusBadge("imported")
                            ) : (
                              <ClickableStatusBadge txnId={txn.id} status={txn.status} disabled={txn.status === "suggested"} />
                            )}
                          </TableCell>
                          <TableCell className="p-1">
                            {!batch.isFinalized && (
                              <TransactionEditDialog txn={txn} suggestion={suggestion} />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
