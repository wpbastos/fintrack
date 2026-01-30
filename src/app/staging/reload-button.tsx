"use client";

import { useRef, useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { reloadStatement, ReloadResult } from "./actions";

interface ReloadButtonProps {
  importLogId: number;
  fileName: string;
}

export function ReloadButton({ importLogId, fileName }: ReloadButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ReloadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset state
    setResult(null);
    setError(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.statement || !data.transactions || !Array.isArray(data.transactions)) {
        setError("Invalid file format");
        return;
      }

      startTransition(async () => {
        const res = await reloadStatement(importLogId, data.statement, data.transactions);
        setResult(res);
      });
    } catch {
      setError("Failed to parse file");
    }

    // Reset input so same file can be selected again
    e.target.value = "";
  };

  return (
    <div className="flex items-center gap-2">
      {result && (
        <span className="text-xs text-muted-foreground">
          +{result.added} -{result.deleted}
        </span>
      )}
      {error && <span className="text-xs text-rose-500">{error}</span>}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        onClick={handleClick}
        disabled={isPending}
        title={`Reload ${fileName}`}
        className="p-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 disabled:opacity-50"
      >
        <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
}
