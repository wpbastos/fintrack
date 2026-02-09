"use client";

import { useState, useCallback } from "react";
import { ChevronDown, ChevronRight, FileJson, Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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

// Shared JSON Content Dialog
export function JsonContentDialog({
  content,
  title,
  description,
  open,
  onOpenChange,
}: {
  content: string | null;
  title?: string;
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"tree" | "raw">("tree");

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
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            {title || "Import Content"}
          </DialogTitle>
          <DialogDescription>{description || "Original JSON data from the import"}</DialogDescription>
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
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
