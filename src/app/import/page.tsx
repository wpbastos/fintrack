"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Upload,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  X,
  Loader2,
  FileType,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { startExtractionJob, getJobStatus, checkFileHash, cancelJob } from "./actions";

interface ImportResult {
  success: boolean;
  message?: string;
  importId?: number;
  transactionCount?: number;
  reimported?: boolean;
  fileName?: string;
}

interface DuplicateInfo {
  id: number;
  importedAt: string;
  transactionCount: number;
  fileName?: string;
}

interface ExtractedData {
  detectedSchema: string;
  confidence: "high" | "medium" | "low";
  statement: {
    account: {
      accountName: string;
      accountNumber: string;
      institutionName: string;
      accountType: string;
      currency: string;
    };
    periodStart: string;
    periodEnd: string;
    openingBalance: number;
    closingBalance: number;
    sourceFile?: string;
    sourceType?: string;
  };
  transactions: Array<{
    date: string;
    description: string;
    amount: number;
  }>;
  extractionNotes?: string;
}

interface FileImportState {
  id: string; // Unique ID for localStorage
  fileName: string;
  fileType: "pdf";
  status:
    | "pending"
    | "processing"
    | "extracting"
    | "queued" // Waiting in extraction queue
    | "extracted"
    | "success"
    | "warning" // Completed with warning (e.g., no transactions)
    | "error"
    | "duplicate"
    | "cancelled"; // User cancelled while processing/queued
  warningMessage?: string;
  result?: ImportResult;
  duplicate?: DuplicateInfo;
  extractedData?: ExtractedData;
  extractionMeta?: {
    duration?: number;
    cost?: number;
    confidence?: string;
    schema?: string;
    tokens?: {
      input: number;
      output: number;
    };
    pdfSizeBytes?: number;
  };
  jobId?: string; // Job ID for polling
  queuePosition?: number;
  fileHash?: string; // Hash of file content for duplicate detection
  startedAt?: string;
  completedAt?: string;
}

const STORAGE_KEY = "fintrack-import-states";

// Calculate SHA-256 hash of file content
async function calculateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function loadStatesFromStorage(): FileImportState[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveStatesToStorage(states: FileImportState[]) {
  if (typeof window === "undefined") return;
  try {
    // Only keep last 20 items and completed/error states from last 24h
    const now = Date.now();
    const filtered = states
      .filter((s) => {
        // Keep in-progress items
        if (["pending", "processing", "extracting", "queued"].includes(s.status)) {
          return true;
        }
        // Keep completed/error items from last 24h
        if (s.completedAt) {
          const completedTime = new Date(s.completedAt).getTime();
          return now - completedTime < 24 * 60 * 60 * 1000;
        }
        return true;
      })
      .slice(-20);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    // Ignore storage errors
  }
}

export default function ImportPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileStates, setFileStates] = useState<FileImportState[]>([]);
  const [now, setNow] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load states from localStorage on mount (client-side only)
  useEffect(() => {
    setFileStates(loadStatesFromStorage());
    setNow(Date.now());
    setIsHydrated(true);
  }, []);

  // Save states to localStorage whenever they change
  useEffect(() => {
    if (isHydrated && fileStates.length > 0) {
      saveStatesToStorage(fileStates);
    }
  }, [fileStates, isHydrated]);

  // Update elapsed time display every second when processing
  useEffect(() => {
    const hasActive = fileStates.some((s) =>
      ["pending", "processing", "extracting", "queued"].includes(s.status)
    );
    if (!hasActive) return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [fileStates]);

  const updateFileState = useCallback(
    (id: string, updates: Partial<FileImportState>) => {
      setFileStates((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
      );
    },
    []
  );

  // Resume polling for incomplete jobs on page load
  useEffect(() => {
    if (!isHydrated) return; // Wait for localStorage data to load

    const incompleteJobs = fileStates.filter(
      (s) => (s.status === "extracting" || s.status === "queued") && s.jobId
    );

    if (incompleteJobs.length === 0) return;

    let cancelled = false;

    const resumeAndPoll = async () => {
      for (const job of incompleteJobs) {
        if (cancelled || !job.jobId) continue;

        // Poll until complete or error
        const maxPolls = 60;
        const pollInterval = 5000;

        for (let i = 0; i < maxPolls && !cancelled; i++) {
          try {
            const result = await getJobStatus(job.jobId);

            if (!result.found) {
              updateFileState(job.id, {
                status: "error",
                result: {
                  success: false,
                  message: "Extraction job expired. Please re-upload the file.",
                  fileName: job.fileName,
                },
                completedAt: new Date().toISOString(),
              });
              break;
            }

            if (result.status === "complete") {
              if (result.result?.success && result.result?.data) {
                // Auto-import the extracted data
                updateFileState(job.id, { status: "processing" });

                const importData = {
                  statement: result.result.data.statement,
                  transactions: result.result.data.transactions,
                  fileHash: job.fileHash,
                  extractionMetrics: {
                    duration: result.result.duration,
                    cost: result.result.cost,
                    tokens: result.result.tokens,
                    pdfSizeBytes: result.result.pdfSizeBytes,
                  },
                };

                const importResponse = await fetch("/api/import", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(importData),
                });
                const importResult = await importResponse.json();

                if (importResult.duplicate) {
                  // Already imported
                  updateFileState(job.id, {
                    status: "duplicate",
                    extractedData: result.result.data,
                    extractionMeta: {
                      duration: result.result.duration,
                      cost: result.result.cost,
                      confidence: result.result.data?.confidence,
                      schema: result.result.data?.detectedSchema,
                      tokens: result.result.tokens,
                      pdfSizeBytes: result.result.pdfSizeBytes,
                    },
                    duplicate: {
                      id: importResult.existingImport?.id || 0,
                      importedAt: importResult.existingImport?.importedAt || "previously",
                      transactionCount: importResult.existingImport?.transactionCount || 0,
                      fileName: job.fileName,
                    },
                    completedAt: new Date().toISOString(),
                  });
                  toast.info(`${job.fileName} was already imported`);
                } else if (importResult.warning) {
                  // Warning (e.g., no transactions)
                  updateFileState(job.id, {
                    status: "warning",
                    warningMessage: importResult.message,
                    extractedData: result.result.data,
                    extractionMeta: {
                      duration: result.result.duration,
                      cost: result.result.cost,
                      confidence: result.result.data?.confidence,
                      schema: result.result.data?.detectedSchema,
                      tokens: result.result.tokens,
                      pdfSizeBytes: result.result.pdfSizeBytes,
                    },
                    result: {
                      success: true,
                      transactionCount: 0,
                      fileName: job.fileName,
                    },
                    completedAt: new Date().toISOString(),
                  });
                  toast.warning(`${job.fileName}: ${importResult.message}`);
                } else if (importResult.importId) {
                  updateFileState(job.id, {
                    status: "success",
                    extractedData: result.result.data,
                    extractionMeta: {
                      duration: result.result.duration,
                      cost: result.result.cost,
                      confidence: result.result.data?.confidence,
                      schema: result.result.data?.detectedSchema,
                      tokens: result.result.tokens,
                      pdfSizeBytes: result.result.pdfSizeBytes,
                    },
                    result: {
                      success: true,
                      importId: importResult.importId,
                      transactionCount: importResult.transactionCount,
                      fileName: job.fileName,
                    },
                    completedAt: new Date().toISOString(),
                  });
                  toast.success(`Resumed: ${job.fileName} imported successfully`);
                } else if (importResponse.ok) {
                  // Response OK but no importId - still success
                  updateFileState(job.id, {
                    status: "success",
                    extractedData: result.result.data,
                    extractionMeta: {
                      duration: result.result.duration,
                      cost: result.result.cost,
                      confidence: result.result.data?.confidence,
                      schema: result.result.data?.detectedSchema,
                      tokens: result.result.tokens,
                      pdfSizeBytes: result.result.pdfSizeBytes,
                    },
                    result: {
                      success: true,
                      importId: importResult.importId,
                      transactionCount: importResult.transactionCount,
                      fileName: job.fileName,
                    },
                    completedAt: new Date().toISOString(),
                  });
                  toast.success(`Resumed: ${job.fileName} imported successfully`);
                } else {
                  updateFileState(job.id, {
                    status: "error",
                    result: {
                      success: false,
                      message: importResult.error || "Import failed",
                      fileName: job.fileName,
                    },
                    completedAt: new Date().toISOString(),
                  });
                }
              } else {
                updateFileState(job.id, {
                  status: "error",
                  result: {
                    success: false,
                    message: result.result?.error || "Extraction failed",
                    fileName: job.fileName,
                  },
                  completedAt: new Date().toISOString(),
                });
              }
              break;
            } else if (result.status === "error") {
              updateFileState(job.id, {
                status: "error",
                result: {
                  success: false,
                  message: result.error || "Extraction failed",
                  fileName: job.fileName,
                },
                completedAt: new Date().toISOString(),
              });
              break;
            } else if (result.status === "cancelled") {
              updateFileState(job.id, {
                status: "cancelled",
                completedAt: new Date().toISOString(),
              });
              break;
            }

            // Update queue position if still waiting
            if (result.status === "queued") {
              updateFileState(job.id, { queuePosition: result.queuePosition });
            } else if (result.status === "processing") {
              updateFileState(job.id, { status: "extracting", queuePosition: undefined });
            }

            // Wait before next poll
            await new Promise((resolve) => setTimeout(resolve, pollInterval));
          } catch {
            // Network error - continue polling
            await new Promise((resolve) => setTimeout(resolve, pollInterval));
          }
        }
      }
    };

    resumeAndPoll();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated]); // Run after hydration

  const doImport = async (
    id: string,
    fileName: string,
    data: object,
    force = false
  ): Promise<Partial<FileImportState>> => {
    try {
      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, force }),
      });

      const result = await response.json();

      if (result.duplicate) {
        return {
          status: "duplicate",
          duplicate: { ...result.existingImport, fileName },
          completedAt: new Date().toISOString(),
        };
      }

      if (result.warning) {
        return {
          status: "warning",
          warningMessage: result.message,
          result: { success: true, ...result, fileName },
          completedAt: new Date().toISOString(),
        };
      }

      if (response.ok) {
        return {
          status: "success",
          result: { success: true, ...result, fileName },
          completedAt: new Date().toISOString(),
        };
      } else {
        return {
          status: "error",
          result: { success: false, message: result.error, fileName },
          completedAt: new Date().toISOString(),
        };
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to parse JSON";
      return {
        status: "error",
        result: { success: false, message, fileName },
        completedAt: new Date().toISOString(),
      };
    }
  };

  // Start a PDF extraction job (just upload, returns jobId)
  const startPdfExtraction = async (
    file: File,
    stateId: string
  ): Promise<{
    jobId?: string;
    error?: string;
    duplicate?: boolean;
    existingImport?: { id: number; fileName: string; importedAt: string };
  }> => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const result = await startExtractionJob(formData);

      // Pass through duplicate info
      if (result.duplicate && result.existingImport) {
        return {
          duplicate: true,
          existingImport: result.existingImport,
          error: result.error,
        };
      }

      if (!result.success || !result.jobId) {
        return { error: result.error || "Failed to start extraction" };
      }

      updateFileState(stateId, {
        jobId: result.jobId,
        queuePosition: result.queuePosition,
        status: result.queuePosition && result.queuePosition > 0 ? "queued" : "extracting",
      });

      return { jobId: result.jobId };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Upload failed",
      };
    }
  };

  // Poll a single job until complete
  const pollJob = async (
    jobId: string,
    stateId: string
  ): Promise<{
    success: boolean;
    data?: ExtractedData;
    meta?: FileImportState["extractionMeta"];
    error?: string;
  }> => {
    const maxPolls = 60;
    const pollInterval = 5000;

    for (let i = 0; i < maxPolls; i++) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      try {
        const result = await getJobStatus(jobId);

        if (!result.found) {
          return { success: false, error: "Job not found" };
        }

        switch (result.status) {
          case "queued":
            updateFileState(stateId, {
              status: "queued",
              queuePosition: result.queuePosition,
            });
            break;

          case "processing":
            updateFileState(stateId, {
              status: "extracting",
              queuePosition: undefined,
            });
            break;

          case "complete": {
            const extractResult = result.result;
            if (!extractResult?.success || !extractResult?.data) {
              return {
                success: false,
                error: extractResult?.error || "Extraction failed",
              };
            }
            return {
              success: true,
              data: extractResult.data,
              meta: {
                duration: extractResult.duration,
                cost: extractResult.cost,
                confidence: extractResult.data?.confidence,
                schema: extractResult.data?.detectedSchema,
                tokens: extractResult.tokens,
                pdfSizeBytes: extractResult.pdfSizeBytes,
              },
            };
          }

          case "error":
            return {
              success: false,
              error: result.error || "Extraction failed",
            };

          case "cancelled":
            return {
              success: false,
              error: "Extraction was cancelled",
            };
        }
      } catch {
        // Network error, continue polling
      }
    }

    return { success: false, error: "Extraction timed out (5 minutes)" };
  };

  const handleFiles = async (files: FileList) => {
    const supportedFiles = Array.from(files).filter(
      (f) => f.name.toLowerCase().endsWith(".pdf")
    );

    if (supportedFiles.length === 0) {
      toast.error("Please upload PDF files");
      return;
    }

    // Initialize file states (newest first for display)
    const newStates: FileImportState[] = supportedFiles.map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      fileName: f.name,
      fileType: "pdf" as const,
      status: "pending",
      startedAt: new Date().toISOString(),
    }));

    setFileStates((prev) => [...prev, ...newStates]);
    setIsLoading(true);

    // Build PDF jobs list
    const pdfJobs: { file: File; state: FileImportState }[] = [];

    for (let i = supportedFiles.length - 1; i >= 0; i--) {
      const file = supportedFiles[i];
      const state = newStates[i];
      pdfJobs.push({ file, state });
    }

    const results: { id: string; success: boolean }[] = [];

    // 1. Check file hashes and upload PDFs that haven't been processed
    const startedJobs: { stateId: string; jobId: string; fileName: string; fileHash: string }[] = [];

    for (const { file, state } of pdfJobs) {
      // Calculate file hash first
      updateFileState(state.id, { status: "pending" });
      const fileHash = await calculateFileHash(file);
      updateFileState(state.id, { fileHash });

      // Check if already imported (server-side check)
      const hashCheck = await checkFileHash(fileHash);
      if (hashCheck.exists) {
        updateFileState(state.id, {
          status: "duplicate",
          duplicate: {
            id: hashCheck.importId || 0,
            importedAt: hashCheck.importedAt || "previously",
            transactionCount: 0,
            fileName: hashCheck.fileName || file.name,
          },
          result: {
            success: false,
            message: "File already imported",
            fileName: file.name,
          },
          completedAt: new Date().toISOString(),
        });
        results.push({ id: state.id, success: false });
        continue;
      }

      const startResult = await startPdfExtraction(file, state.id);

      // Handle duplicate detected during upload
      if (startResult.duplicate && startResult.existingImport) {
        updateFileState(state.id, {
          status: "duplicate",
          duplicate: {
            id: startResult.existingImport.id,
            importedAt: startResult.existingImport.importedAt,
            transactionCount: 0,
            fileName: startResult.existingImport.fileName,
          },
          result: {
            success: false,
            message: startResult.error || "File already imported",
            fileName: file.name,
          },
          completedAt: new Date().toISOString(),
        });
        results.push({ id: state.id, success: false });
      } else if (startResult.error || !startResult.jobId) {
        updateFileState(state.id, {
          status: "error",
          result: {
            success: false,
            message: startResult.error || "Failed to queue extraction",
            fileName: file.name,
          },
          completedAt: new Date().toISOString(),
        });
        results.push({ id: state.id, success: false });
      } else {
        startedJobs.push({
          stateId: state.id,
          jobId: startResult.jobId,
          fileName: file.name,
          fileHash,
        });
      }
    }

    // 2. Poll each PDF job sequentially and import when complete
    for (const job of startedJobs) {
      const extraction = await pollJob(job.jobId, job.stateId);

      if (!extraction.success || !extraction.data) {
        updateFileState(job.stateId, {
          status: "error",
          result: {
            success: false,
            message: extraction.error || "PDF extraction failed",
            fileName: job.fileName,
          },
          completedAt: new Date().toISOString(),
        });
        results.push({ id: job.stateId, success: false });
        continue;
      }

      // PDF extracted - now import it
      updateFileState(job.stateId, {
        status: "processing",
        extractedData: extraction.data,
        extractionMeta: extraction.meta,
      });

      const importData = {
        statement: extraction.data.statement,
        transactions: extraction.data.transactions,
        fileHash: job.fileHash,
        extractionMetrics: {
          duration: extraction.meta?.duration,
          cost: extraction.meta?.cost,
          tokens: extraction.meta?.tokens,
          pdfSizeBytes: extraction.meta?.pdfSizeBytes,
        },
      };

      const importResult = await doImport(job.stateId, job.fileName, importData);
      updateFileState(job.stateId, {
        ...importResult,
        fileType: "pdf",
        extractedData: extraction.data,
        extractionMeta: extraction.meta,
      });

      results.push({
        id: job.stateId,
        success: importResult.status === "success",
      });
    }

    setIsLoading(false);

    // Build detailed summary
    const successfulStates = results
      .filter((r) => r.success)
      .map((r) => fileStates.find((s) => s.id === r.id))
      .filter(Boolean);

    const duplicateStates = results
      .filter((r) => !r.success)
      .map((r) => fileStates.find((s) => s.id === r.id))
      .filter((s) => s?.status === "duplicate");

    const warningStates = results
      .map((r) => fileStates.find((s) => s.id === r.id))
      .filter((s) => s?.status === "warning");

    const errorStates = results
      .filter((r) => !r.success)
      .map((r) => fileStates.find((s) => s.id === r.id))
      .filter((s) => s?.status === "error");

    // Show success toast with transaction count
    if (successfulStates.length > 0) {
      const totalTxns = successfulStates.reduce(
        (sum, s) => sum + (s?.result?.transactionCount || 0),
        0
      );
      toast.success(`Imported ${successfulStates.length} file(s)`, {
        description: `${totalTxns} transactions added to staging`,
      });
    }

    // Show warnings
    if (warningStates.length > 0) {
      const warningDetails = warningStates
        .map((s) => `${s?.fileName}: ${s?.warningMessage || "No transactions"}`)
        .join("\n");
      toast.warning(`${warningStates.length} file(s) completed with warnings`, {
        description: warningDetails,
        duration: 8000,
      });
    }

    // Show duplicates
    if (duplicateStates.length > 0) {
      const names = duplicateStates.map((s) => s?.fileName).join(", ");
      toast.warning(`${duplicateStates.length} file(s) already imported`, {
        description: names,
        duration: 8000,
      });
    }

    // Show errors with details
    if (errorStates.length > 0) {
      const errorDetails = errorStates
        .map((s) => `${s?.fileName}: ${s?.result?.message || "Unknown error"}`)
        .join("\n");
      toast.error(`${errorStates.length} file(s) failed`, {
        description: errorDetails,
        duration: Infinity,
      });
    }
  };

  const handleReimport = async (id: string) => {
    const fileState = fileStates.find((f) => f.id === id);
    if (!fileState?.extractedData) return;

    updateFileState(id, { status: "processing" });

    const importData: {
      statement: typeof fileState.extractedData.statement;
      transactions: typeof fileState.extractedData.transactions;
      fileHash?: string;
    } = {
      statement: fileState.extractedData.statement,
      transactions: fileState.extractedData.transactions,
      fileHash: fileState.fileHash,
    };

    const result = await doImport(id, fileState.fileName, importData, true);
    updateFileState(id, result);

    if (result.status === "success") {
      toast.success("Re-imported successfully", {
        description: `${result.result?.transactionCount} transactions from ${fileState.fileName}`,
      });
    } else {
      toast.error("Re-import failed", {
        description: result.result?.message || "Unknown error",
        duration: Infinity,
      });
    }
  };

  const handleRemove = async (id: string) => {
    const fileState = fileStates.find((s) => s.id === id);
    if (!fileState) return;

    // Check if still in progress (processing, extracting, queued, pending)
    const isInProgress = ["pending", "processing", "extracting", "queued"].includes(
      fileState.status
    );

    if (isInProgress) {
      // Cancel the job if it has a jobId
      if (fileState.jobId) {
        await cancelJob(fileState.jobId);
      }
      // Mark as cancelled (keep in list)
      updateFileState(id, {
        status: "cancelled",
        completedAt: new Date().toISOString(),
      });
      toast.info(`${fileState.fileName} cancelled`);
    } else {
      // Already finished - remove from list
      setFileStates((prev) => {
        const filtered = prev.filter((s) => s.id !== id);
        saveStatesToStorage(filtered);
        return filtered;
      });
    }
  };

  const clearAll = () => {
    setFileStates([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCost = (cost?: number) => {
    if (!cost) return "";
    return `$${cost.toFixed(4)}`;
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return "";
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getElapsedTime = (startedAt?: string) => {
    if (!startedAt) return "";
    const elapsed = Math.floor(
      (now - new Date(startedAt).getTime()) / 1000
    );
    if (elapsed < 60) return `${elapsed}s`;
    return `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;
  };

  // Count active processes
  const processingCount = fileStates.filter((s) =>
    ["pending", "processing", "extracting"].includes(s.status)
  ).length;
  const queuedCount = fileStates.filter((s) => s.status === "queued").length;
  const activeCount = processingCount + queuedCount;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Import Statements
          </h1>
          <p className="text-muted-foreground">
            Upload PDF bank statements to extract and import transactions.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
              disabled={isLoading}
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
              ) : (
                <Upload className="h-10 w-10 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground">
                {isLoading
                  ? `Processing ${processingCount} file(s)${queuedCount > 0 ? `, ${queuedCount} queued` : ""}...`
                  : "Drop PDF bank statements here or click to browse"}
              </span>
              <p className="text-xs text-muted-foreground/70">
                AI will extract transactions automatically
              </p>
            </label>
          </div>

          {/* File Import Results */}
          {fileStates.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {fileStates.length} file(s)
                  {activeCount > 0 && (
                    <span className="ml-2 text-blue-600">
                      ({processingCount > 0 && `${processingCount} processing`}
                      {processingCount > 0 && queuedCount > 0 && ", "}
                      {queuedCount > 0 && `${queuedCount} in queue`})
                    </span>
                  )}
                </span>
                <button
                  onClick={clearAll}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear all
                </button>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {fileStates
                  .slice()
                  .reverse()
                  .map((fileState) => (
                    <div
                      key={fileState.id}
                      className={`p-3 rounded-lg flex items-start gap-3 ${
                        fileState.status === "success"
                          ? "bg-green-500/10 text-green-700 dark:text-green-400"
                          : fileState.status === "warning"
                          ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                          : fileState.status === "error"
                          ? "bg-red-500/10 text-red-700 dark:text-red-400"
                          : fileState.status === "duplicate"
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          : fileState.status === "cancelled"
                          ? "bg-slate-500/10 text-slate-500 dark:text-slate-400"
                          : fileState.status === "extracting" ||
                        fileState.status === "queued"
                          ? "bg-purple-500/10 text-purple-700 dark:text-purple-400"
                          : fileState.status === "processing"
                          ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                          : "bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      {fileState.status === "success" ? (
                        <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                      ) : fileState.status === "warning" ? (
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      ) : fileState.status === "error" ? (
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      ) : fileState.status === "duplicate" ? (
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      ) : fileState.status === "cancelled" ? (
                        <X className="h-4 w-4 mt-0.5 shrink-0" />
                      ) : fileState.status === "extracting" ||
                        fileState.status === "processing" ||
                        fileState.status === "queued" ? (
                        <Loader2 className="h-4 w-4 mt-0.5 shrink-0 animate-spin" />
                      ) : (
                        <FileType className="h-4 w-4 mt-0.5 shrink-0" />
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {fileState.fileName}
                          </p>
                          {fileState.fileType === "pdf" && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-600 dark:text-purple-400">
                              PDF
                            </span>
                          )}
                        </div>
                        {fileState.status === "success" && fileState.result && (
                          <div className="space-y-0.5">
                            <p className="text-xs opacity-90">
                              {fileState.result.transactionCount} transactions
                              (Import #{fileState.result.importId})
                            </p>
                            {fileState.extractionMeta && (
                              <p className="text-[10px] opacity-70">
                                AI: {fileState.extractionMeta.schema} (
                                {fileState.extractionMeta.confidence}) |{" "}
                                {formatDuration(
                                  fileState.extractionMeta.duration
                                )}{" "}
                                | {formatCost(fileState.extractionMeta.cost)}
                              </p>
                            )}
                          </div>
                        )}
                        {fileState.status === "warning" && (
                          <div className="space-y-0.5">
                            <p className="text-xs opacity-90">
                              {fileState.warningMessage || "Completed with warning"}
                            </p>
                            {fileState.extractionMeta && (
                              <p className="text-[10px] opacity-70">
                                AI: {fileState.extractionMeta.schema} (
                                {fileState.extractionMeta.confidence}) |{" "}
                                {formatDuration(fileState.extractionMeta.duration)}{" "}
                                | {formatCost(fileState.extractionMeta.cost)}
                              </p>
                            )}
                          </div>
                        )}
                        {fileState.status === "error" && fileState.result && (
                          <p className="text-xs opacity-90">
                            {fileState.result.message}
                          </p>
                        )}
                        {fileState.status === "duplicate" &&
                          fileState.duplicate && (
                            <>
                              <p className="text-xs opacity-90">
                                Already imported on{" "}
                                {formatDate(fileState.duplicate.importedAt)}
                              </p>
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => handleReimport(fileState.id)}
                                  disabled={isLoading}
                                  className="flex items-center gap-1 px-2 py-1 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50"
                                >
                                  <RefreshCw className="h-3 w-3" />
                                  Re-import
                                </button>
                                <button
                                  onClick={() => handleRemove(fileState.id)}
                                  disabled={isLoading}
                                  className="px-2 py-1 text-xs hover:bg-amber-500/20 rounded"
                                >
                                  Skip
                                </button>
                              </div>
                            </>
                          )}
                        {fileState.status === "queued" && (
                          <p className="text-xs opacity-90">
                            Queued for extraction
                            {fileState.queuePosition
                              ? ` (position ${fileState.queuePosition})`
                              : ""}
                            ...{" "}
                            <span className="opacity-70">
                              ({getElapsedTime(fileState.startedAt)})
                            </span>
                          </p>
                        )}
                        {fileState.status === "extracting" && (
                          <p className="text-xs opacity-90">
                            Extracting data with AI...{" "}
                            <span className="opacity-70">
                              ({getElapsedTime(fileState.startedAt)})
                            </span>
                          </p>
                        )}
                        {fileState.status === "processing" && (
                          <p className="text-xs opacity-90">
                            Importing extracted data...{" "}
                            <span className="opacity-70">
                              ({getElapsedTime(fileState.startedAt)})
                            </span>
                          </p>
                        )}
                        {fileState.status === "pending" && (
                          <p className="text-xs opacity-90">Waiting...</p>
                        )}
                        {fileState.status === "cancelled" && (
                          <p className="text-xs opacity-90">Cancelled</p>
                        )}
                        {fileState.completedAt && (
                          <p className="text-[10px] opacity-50 mt-1">
                            {formatDate(fileState.completedAt)}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => handleRemove(fileState.id)}
                        className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded shrink-0"
                        title="Remove"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
