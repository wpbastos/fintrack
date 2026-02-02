"use client";

import { useState, useEffect, Fragment, useTransition, useCallback } from "react";
import { ChevronDown, ChevronRight, Check, X, Sparkles, ArrowRightCircle, Trash2, Pencil, FileJson, Copy } from "lucide-react";
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
import { approveSuggestion, rejectSuggestion, approveAllSuggestions, rejectAllSuggestions, importBatchTransactions, unmatchTransaction, deleteImportBatch, updateImportBalance, updateStagingTransaction, getStagingLookupData } from "./actions";
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
  category: { name: string; color: string | null; group: { color: string | null } | null } | null;
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
  accountName: string | null;
  content: string | null;
  aiStatus: string;
  aiStartedAt: Date | null;
  aiResult: string | null;
}

interface StagingTableProps {
  transactions: TransactionWithBalance[];
  batches: ImportBatchInfo[];
}

const statusStyles: Record<string, string> = {
  pending: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  matched: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  unknown: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  suggested: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  imported: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
};

function getStatusBadge(status: string) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${statusStyles[status] ?? statusStyles.pending}`}>
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
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium cursor-pointer hover:ring-2 hover:ring-amber-400 transition-all ${statusStyles.matched} disabled:opacity-50`}
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
  const suggestedCategory = suggestion.existingCategoryName || suggestion.newEntity?.categoryName;
  const parentCategory = suggestion.newEntity?.parentCategoryName;
  // Display as "Parent > Subcategory" if parent exists
  const categoryDisplay = parentCategory && suggestedCategory
    ? `${parentCategory} > ${suggestedCategory}`
    : suggestedCategory;
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
          {isNew && (
            <span className="shrink-0 inline-flex items-center rounded px-1 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              NEW
            </span>
          )}
          {categoryDisplay && (
            <span className="shrink-0 inline-flex items-center rounded px-1 py-0.5 text-[10px] font-medium bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300">
              {categoryDisplay}
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
  const [result, setResult] = useState<AiResolveResult | null>(() => parseAiResult(initialAiResult));
  const [showResultDialog, setShowResultDialog] = useState(false);
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
            setResult(parsed);
            setLocalStatus("complete");
            if (parsed.suggested > 0) {
              setShowResultDialog(true);
            } else {
              toast.success("AI confirmed all transactions are correctly matched");
              window.location.reload();
            }
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
          setResult(parsed);
          setLocalStatus("complete");

          if (parsed.suggested > 0) {
            setShowResultDialog(true);
          } else {
            toast.success("AI confirmed all transactions are correctly matched");
          }
        }
      }
    } catch (err) {
      clearInterval(timer);
      setLocalStatus("error");
      const message = err instanceof Error ? err.message : "AI resolve failed";
      toast.error(message);
    }
  };

  const handleDialogClose = () => {
    setShowResultDialog(false);
    if (result && result.suggested > 0) {
      window.location.reload();
    }
  };

  // Resolving state - show in batch header
  if (localStatus === "resolving" || initialAiStatus === "resolving") {
    return (
      <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-xs font-medium">
          Analyzing {transactionCount} transactions... {elapsedTime > 0 && `(${elapsedTime}s)`}
        </span>
      </div>
    );
  }

  return (
    <>
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

      {/* Results Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Analysis Complete
            </DialogTitle>
            <DialogDescription>
              Analyzed {result?.total} transactions
            </DialogDescription>
          </DialogHeader>

          {result && (
            <div className="space-y-4 py-2">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                    {result.confirmed}
                  </div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-500">Confirmed</div>
                </div>
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                    {result.suggested}
                  </div>
                  <div className="text-xs text-purple-600 dark:text-purple-500">Need Review</div>
                </div>
              </div>

              {/* Suggestion Breakdown */}
              {result.suggested > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Suggestions Breakdown</h4>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    {result.existingMatches > 0 && (
                      <div className="flex justify-between">
                        <span>Match to existing merchant/income:</span>
                        <span className="font-medium text-foreground">{result.existingMatches}</span>
                      </div>
                    )}
                    {result.newMerchants > 0 && (
                      <div className="flex justify-between">
                        <span>New merchants to create:</span>
                        <span className="font-medium text-blue-600 dark:text-blue-400">{result.newMerchants}</span>
                      </div>
                    )}
                    {result.newIncomes > 0 && (
                      <div className="flex justify-between">
                        <span>New income sources to create:</span>
                        <span className="font-medium text-blue-600 dark:text-blue-400">{result.newIncomes}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Performance Stats */}
              {(result.duration || result.cost || result.tokens) && (
                <div className="pt-2 border-t">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {result.duration && (
                      <span>Duration: {(result.duration / 1000).toFixed(1)}s</span>
                    )}
                    {result.cost && (
                      <span>Cost: ${result.cost.toFixed(4)}</span>
                    )}
                    {result.tokens && (
                      <span>Tokens: {result.tokens.input.toLocaleString()} in / {result.tokens.output.toLocaleString()} out</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={handleDialogClose}>
              {result?.suggested ? "Review Suggestions" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
      className={`h-7 w-7 ${disabled ? "text-slate-300 cursor-not-allowed dark:text-slate-600" : "text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-950"}`}
      onClick={disabled ? (e) => e.stopPropagation() : handleDelete}
      disabled={isPending || disabled}
      title={disabled ? "Review suggestions first" : "Delete import"}
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

function BatchEditBalanceButton({
  importId,
  openingBalance,
  closingBalance,
  periodStart,
  periodEnd,
  transactionSum,
  disabled = false,
}: {
  importId: number;
  openingBalance: number;
  closingBalance: number;
  periodStart: Date | null;
  disabled?: boolean;
  periodEnd: Date | null;
  transactionSum: number;
}) {
  const [open, setOpen] = useState(false);
  const [opening, setOpening] = useState(openingBalance.toString());
  const [closing, setClosing] = useState(closingBalance.toString());
  const [startDate, setStartDate] = useState(periodStart ? periodStart.toISOString().split("T")[0] : "");
  const [endDate, setEndDate] = useState(periodEnd ? periodEnd.toISOString().split("T")[0] : "");
  const [isPending, startTransition] = useTransition();

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setOpening(openingBalance.toString());
      setClosing(closingBalance.toString());
      setStartDate(periodStart ? periodStart.toISOString().split("T")[0] : "");
      setEndDate(periodEnd ? periodEnd.toISOString().split("T")[0] : "");
    }
    setOpen(newOpen);
  };

  const handleAutoCalculate = () => {
    const calculatedClosing = (parseFloat(opening) || 0) + transactionSum;
    setClosing(calculatedClosing.toFixed(2));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateImportBalance(importId, {
        openingBalance: parseFloat(opening) || 0,
        closingBalance: parseFloat(closing) || 0,
        periodStart: startDate || null,
        periodEnd: endDate || null,
      });
      if (result.success) {
        toast.success("Import updated");
        setOpen(false);
      } else {
        toast.error(result.error || "Failed to update import");
      }
    });
  };

  // Calculate what closing should be based on current opening input
  const expectedClosing = (parseFloat(opening) || 0) + transactionSum;
  const currentClosing = parseFloat(closing) || 0;
  const isBalanced = Math.abs(expectedClosing - currentClosing) < 0.01;

  return (
    <Dialog open={open} onOpenChange={disabled ? undefined : handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className={`h-7 w-7 ${disabled ? "text-slate-300 cursor-not-allowed dark:text-slate-600" : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:text-indigo-400 dark:hover:bg-indigo-950"}`}
          onClick={(e) => e.stopPropagation()}
          disabled={disabled}
          title={disabled ? "Review suggestions first" : "Edit import details"}
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Edit Import</DialogTitle>
          <DialogDescription>Update statement period and balance.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave}>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="startDate" className="text-sm font-medium">
                  Period Start
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
                  Period End
                </label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="opening" className="text-sm font-medium">
                  Opening Balance
                </label>
                <Input
                  id="opening"
                  type="number"
                  step="0.01"
                  value={opening}
                  onChange={(e) => setOpening(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="closing" className="text-sm font-medium">
                  Closing Balance
                </label>
                <div className="flex gap-2">
                  <Input
                    id="closing"
                    type="number"
                    step="0.01"
                    value={closing}
                    onChange={(e) => setClosing(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleAutoCalculate}
                    title={`Auto-calculate: ${formatCurrency(expectedClosing)}`}
                    className="shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </Button>
                </div>
              </div>
            </div>
            {/* Balance validation preview */}
            <div className={`text-xs p-2 rounded-md ${isBalanced ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>
              <div className="flex justify-between">
                <span>Transaction sum:</span>
                <span className="font-mono">{formatCurrency(transactionSum)}</span>
              </div>
              <div className="flex justify-between">
                <span>Expected closing:</span>
                <span className="font-mono">{formatCurrency(expectedClosing)}</span>
              </div>
              {!isBalanced && (
                <div className="flex justify-between font-medium mt-1 pt-1 border-t border-amber-200 dark:border-amber-800">
                  <span>Difference:</span>
                  <span className="font-mono">{formatCurrency(currentClosing - expectedClosing)}</span>
                </div>
              )}
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
      </DialogContent>
    </Dialog>
  );
}

interface LookupData {
  merchants: Array<{ id: number; name: string; categoryId: number | null }>;
  incomes: Array<{ id: number; name: string; categoryId: number | null }>;
  categories: Array<{ id: number; name: string; color: string | null; groupName: string; groupColor: string | null }>;
}

function TransactionEditDialog({
  txn,
  disabled = false,
}: {
  txn: TransactionWithBalance;
  disabled?: boolean;
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

  const handleOpenChange = async (newOpen: boolean) => {
    if (newOpen) {
      // Initialize form with current values
      setResolvedDate(txn.resolvedDate ? txn.resolvedDate.toISOString().split("T")[0] : "");
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
    <Dialog open={open} onOpenChange={disabled ? undefined : handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className={`h-6 w-6 ${disabled ? "text-slate-300 cursor-not-allowed dark:text-slate-600" : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:text-indigo-400 dark:hover:bg-indigo-950"}`}
          disabled={disabled}
          title={disabled ? "Review suggestions first" : "Edit transaction"}
        >
          <Pencil className="w-3 h-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogDescription>Update transaction details.</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-muted-foreground">Loading...</span>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <div className="space-y-4 py-4">
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
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:bg-slate-800 dark:border-slate-700"
                  >
                    <option value="">Select merchant...</option>
                    {lookupData?.merchants.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
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
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:bg-slate-800 dark:border-slate-700"
                  >
                    <option value="">Select income source...</option>
                    {lookupData?.incomes.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
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

function StagingStatusFilter({ value, onChange }: { value: "pending" | "all"; onChange: (value: "pending" | "all") => void }) {
  return (
    <div className="inline-flex rounded-lg border p-1 bg-muted/50">
      <button
        onClick={() => onChange("pending")}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          value === "pending"
            ? "bg-white dark:bg-slate-800 shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Pending
      </button>
      <button
        onClick={() => onChange("all")}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          value === "all"
            ? "bg-white dark:bg-slate-800 shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        All
      </button>
    </div>
  );
}

export function StagingTable({ transactions, batches }: StagingTableProps) {
  // Filter state: "pending" shows only not-imported, "all" shows everything
  const [statusFilter, setStatusFilter] = useState<"pending" | "all">("pending");
  // Start with all batches collapsed
  const [expandedBatches, setExpandedBatches] = useState<Set<number>>(new Set());

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

  // Group all transactions by batch first
  const transactionsByBatch = new Map<number, TransactionWithBalance[]>();
  transactions.forEach((txn) => {
    if (txn.importId) {
      if (!transactionsByBatch.has(txn.importId)) {
        transactionsByBatch.set(txn.importId, []);
      }
      transactionsByBatch.get(txn.importId)!.push(txn);
    }
  });

  // Filter batches based on status filter
  // "pending" = batches that have at least one non-imported transaction
  // "all" = all batches
  const filteredBatches = batches.filter((batch) => {
    const batchTxns = transactionsByBatch.get(batch.importId) ?? [];
    if (batchTxns.length === 0) return false;

    if (statusFilter === "pending") {
      // Show batch only if it has pending transactions (not fully imported)
      return batchTxns.some((t) => t.status !== "imported");
    }
    return true; // "all" - show all batches with transactions
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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <BulkSuggestionActions suggestedCount={suggestedCount} />
        </div>
        <StagingStatusFilter value={statusFilter} onChange={setStatusFilter} />
      </div>
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
              const matchedCount = batchTransactions.filter((t) => t.status === "matched").length;
              const batchSuggestedCount = batchTransactions.filter((t) => t.status === "suggested").length;
              const pendingCount = batchTransactions.filter((t) => t.status === "pending" || t.status === "unknown" || t.status === "suggested").length;
              // Ready to import: all transactions matched, balance verified, has transactions
              const isReadyToImport = pendingCount === 0 && matchedCount > 0 && batch.isBalanced;
              // Disable AI resolve if suggestions pending or all already matched
              const allMatched = matchedCount === batchTransactions.length;
              const aiDisabled = batchSuggestedCount > 0 || allMatched;
              const aiDisabledReason = batchSuggestedCount > 0 ? "Review suggestions first" : allMatched ? "All transactions already matched" : undefined;

              return (
                <Fragment key={batch.importId}>
                  {/* Batch Header Row */}
                  <TableRow
                    className="bg-indigo-50/50 dark:bg-indigo-950/30 border-t-2 border-indigo-200 dark:border-indigo-800 cursor-pointer hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30"
                    onClick={() => toggleBatch(batch.importId)}
                  >
                    <TableCell colSpan={7} className="py-2">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        )}
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
                          {batchNumber}
                        </span>
                        <span className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 w-24 shrink-0">
                          {batch.sourceType}
                        </span>
                        <span className="font-medium text-indigo-700 dark:text-indigo-300 truncate min-w-0">{fileName}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                          {batch.transactionCount} txns
                          {batch.periodStart && batch.periodEnd && (
                            <> · {formatDate(batch.periodStart, "MMM d")} – {formatDate(batch.periodEnd, "MMM d, yyyy")}</>
                          )}
                        </span>
                        <span className="ml-auto flex items-center gap-2">
                          <BatchAiResolveButton
                            importId={batch.importId}
                            transactionCount={batchTransactions.length}
                            aiStatus={batch.aiStatus}
                            aiStartedAt={batch.aiStartedAt}
                            aiResult={batch.aiResult}
                            disabled={aiDisabled}
                            disabledReason={aiDisabledReason}
                          />
                          <BatchImportButton
                            importId={batch.importId}
                            matchedCount={matchedCount}
                            isReady={isReadyToImport}
                            hasUnresolved={pendingCount > 0}
                            hasBalanceError={!batch.isBalanced}
                            onSuccess={collapseAll}
                          />
                          <BatchDeleteButton importId={batch.importId} fileName={fileName} disabled={suggestedCount > 0} />
                          <BatchEditBalanceButton
                            importId={batch.importId}
                            openingBalance={batch.openingBalance}
                            closingBalance={batch.closingBalance}
                            periodStart={batch.periodStart}
                            periodEnd={batch.periodEnd}
                            transactionSum={batchTransactions.reduce((sum, t) => sum + (t.rawAmount ?? 0), 0)}
                            disabled={suggestedCount > 0}
                          />
                          {batch.isBalanced ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 min-w-[200px] justify-end" title="Balance verified">
                              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="font-mono tabular-nums">{formatCurrency(batch.openingBalance)}</span>
                              <span>→</span>
                              <span className="font-mono tabular-nums">{formatCurrency(batch.closingBalance)}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs text-rose-500 dark:text-rose-400 min-w-[200px] justify-end" title="Balance mismatch">
                              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <span className="font-mono tabular-nums">{formatCurrency(batch.openingBalance)}</span>
                              <span>→</span>
                              <span className="font-mono tabular-nums">{formatCurrency(batch.closingBalance)}</span>
                            </span>
                          )}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Import Info Row (only when expanded) */}
                  {isExpanded && (
                    <TableRow className="bg-slate-50/50 dark:bg-slate-900/30">
                      <TableCell colSpan={7} className="py-2">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {batch.accountName && (
                            <span className="flex items-center gap-1">
                              <span className="font-medium text-foreground">Account:</span>
                              {batch.accountName}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <span className="font-medium text-foreground">Added:</span>
                            {batch.addedCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">Matched:</span>
                            {batch.matchedCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="font-medium text-amber-600 dark:text-amber-400">Unknown:</span>
                            {batch.unknownCount}
                          </span>
                          <span className="ml-auto">
                            <ViewContentButton content={batch.content} fileName={batch.fileName} />
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Transaction Rows (only when expanded) */}
                  {isExpanded &&
                    batchTransactions.map((txn) => {
                      const suggestion = txn.status === "suggested" ? parseSuggestion(txn.notes) : null;
                      const resolvedName = txn.merchant?.name || txn.income?.name;

                      return (
                        <TableRow key={txn.id} className={txn.status === "suggested" ? "bg-purple-50/30 dark:bg-purple-950/20" : ""}>
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
                                className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium"
                                style={{
                                  backgroundColor: `${txn.category.color || txn.category.group?.color || "#6366f1"}20`,
                                  color: txn.category.color || txn.category.group?.color || "#6366f1",
                                }}
                              >
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: txn.category.color || txn.category.group?.color || "#6366f1" }}
                                />
                                {txn.category.name}
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
                            <ClickableStatusBadge txnId={txn.id} status={txn.status} disabled={suggestedCount > 0} />
                          </TableCell>
                          <TableCell className="p-1">
                            <TransactionEditDialog txn={txn} disabled={suggestedCount > 0} />
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
