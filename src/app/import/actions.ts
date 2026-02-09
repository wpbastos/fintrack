"use server";

import { db } from "@/lib/db";
import {
  buildExtractPdfPrompt,
  type DocumentSchemaInput,
} from "@/lib/prompts/extract-pdf";
import { pdfExtractLogger as log } from "@/lib/logger";
import { extractQueue } from "@/lib/extract-queue";
import { callClaude } from "@/lib/ai-service";
import { writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID, createHash } from "crypto";

// Project-local temp directory for PDF processing
const TEMP_DIR = join(process.cwd(), ".tmp", "pdf");

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

interface ExtractionResult {
  success: boolean;
  data?: ExtractedData;
  duration?: number;
  cost?: number;
  tokens?: {
    input: number;
    output: number;
  };
  error?: string;
  pdfSizeBytes?: number;
  originalFile?: string;
  fileHash?: string;
}

export interface StartJobResult {
  success: boolean;
  jobId?: string;
  fileName?: string;
  status?: string;
  queuePosition?: number;
  error?: string;
  // Duplicate detection
  duplicate?: boolean;
  existingImport?: {
    id: number;
    fileName: string;
    importedAt: string;
  };
}

export interface JobStatusResult {
  found: boolean;
  jobId?: string;
  fileName?: string;
  status?: "queued" | "processing" | "complete" | "error" | "cancelled";
  queuePosition?: number;
  startedAt?: string;
  completedAt?: string;
  result?: ExtractionResult;
  error?: string;
}

async function callClaudeCLI(
  prompt: string,
  fileName: string,
  pdfSize: number
): Promise<ExtractionResult> {
  const startTime = Date.now();
  log.info("EXTRACT", `Starting: ${fileName} (${(pdfSize / 1024).toFixed(0)}KB)`);

  const result = await callClaude({
    prompt,
    allowedTools: "Read",
    timeoutMs: 300000,
    cwd: process.cwd(),
    logLabel: "EXTRACT",
    logger: log,
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  if (!result.success) {
    log.error("EXTRACT", `Failed (${elapsed}s): ${result.error}`);
    return { success: false, error: result.error };
  }

  const data = result.parsedJson as ExtractedData;
  const txnCount = data.transactions?.length || 0;

  log.info("EXTRACT", `Done: ${txnCount} txns, ${elapsed}s, $${result.metrics.costUsd.toFixed(4)}, ${result.metrics.inputTokens}+${result.metrics.outputTokens} tokens`);

  return {
    success: true,
    data,
    duration: result.metrics.durationMs,
    cost: result.metrics.costUsd,
    tokens: {
      input: result.metrics.inputTokens,
      output: result.metrics.outputTokens,
    },
    pdfSizeBytes: pdfSize,
    originalFile: fileName,
  };
}

/**
 * Start a PDF extraction job (Server Action)
 * Returns immediately with jobId - use getJobStatus to poll for completion
 */
export async function startExtractionJob(formData: FormData): Promise<StartJobResult> {
  let tempFilePath: string | null = null;

  try {
    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return { success: false, error: "File must be a PDF" };
    }

    // Read file and calculate hash
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileHash = createHash("sha256").update(buffer).digest("hex");

    // Check if already imported
    const existingImport = await db.import.findUnique({
      where: { fileHash: fileHash },
      select: { id: true, fileName: true, createdAt: true },
    });

    if (existingImport) {
      log.info("UPLOAD", `Duplicate: ${file.name} (already imported as #${existingImport.id})`);
      return {
        success: false,
        duplicate: true,
        existingImport: {
          id: existingImport.id,
          fileName: existingImport.fileName,
          importedAt: existingImport.createdAt.toISOString(),
        },
        error: `This file was already imported on ${existingImport.createdAt.toLocaleDateString()}`,
      };
    }

    // Save PDF to temp file
    await mkdir(TEMP_DIR, { recursive: true });
    const jobId = randomUUID();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    tempFilePath = join(TEMP_DIR, sanitizedName);
    await writeFile(tempFilePath, buffer);

    // Fetch schemas
    const schemas = await db.documentSchema.findMany({
      where: { isActive: true },
      select: {
        code: true,
        name: true,
        documentType: true,
        institutionName: true,
        sampleData: true,
        extractionNotes: true,
      },
    });

    if (schemas.length === 0) {
      return { success: false, error: "No document schemas configured" };
    }

    // Build prompt
    const schemaInputs: DocumentSchemaInput[] = schemas.map((s) => ({
      code: s.code,
      name: s.name,
      documentType: s.documentType,
      institutionName: s.institutionName,
      sampleData: s.sampleData,
      extractionNotes: s.extractionNotes,
    }));

    // Create job and add to queue
    const job = extractQueue.createJob(jobId, file.name);
    const fileName = file.name;
    const pdfSize = buffer.length;
    const pdfPath = tempFilePath;

    // Build prompt with the actual file path
    const prompt = buildExtractPdfPrompt(schemaInputs, pdfPath);

    // Add to queue (runs in background)
    extractQueue.add(jobId, async () => {
      try {
        const result = await callClaudeCLI(prompt, fileName, pdfSize);

        // Add metadata
        if (result.data && !result.data.statement.sourceFile) {
          result.data.statement.sourceFile = fileName;
        }
        result.originalFile = fileName;
        result.pdfSizeBytes = pdfSize;
        result.fileHash = fileHash;

        return result;
      } finally {
        // Clean up temp file
        try {
          await unlink(pdfPath);
        } catch {
          // Ignore cleanup errors
        }
      }
    });

    // Return immediately with job ID
    return {
      success: true,
      jobId: job.id,
      fileName: job.fileName,
      status: job.status,
      queuePosition: job.queuePosition,
    };
  } catch (error) {
    log.error("ERROR", error instanceof Error ? error.message : "Unknown error");
    // Clean up temp file on error
    if (tempFilePath) {
      try {
        await unlink(tempFilePath);
      } catch {
        // Ignore
      }
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "PDF extraction failed",
    };
  }
}

/**
 * Get job status (Server Action)
 * Poll this to check extraction progress
 */
export async function getJobStatus(jobId: string): Promise<JobStatusResult> {
  const job = extractQueue.getJob(jobId);

  if (!job) {
    return { found: false, error: "Job not found" };
  }

  return {
    found: true,
    jobId: job.id,
    fileName: job.fileName,
    status: job.status,
    queuePosition: job.queuePosition,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    result: job.status === "complete" ? (job.result as ExtractionResult) : undefined,
    error: job.status === "error" ? job.error : undefined,
  };
}

export interface CancelJobResult {
  success: boolean;
  wasQueued: boolean;
  wasProcessing: boolean;
  error?: string;
}

/**
 * Cancel an extraction job (Server Action)
 * Removes from queue if queued, marks as cancelled otherwise
 */
export async function cancelJob(jobId: string): Promise<CancelJobResult> {
  const result = extractQueue.cancel(jobId);

  if (!result.success) {
    return { success: false, wasQueued: false, wasProcessing: false, error: "Job not found" };
  }

  return result;
}

export interface FileHashCheckResult {
  exists: boolean;
  importId?: number;
  fileName?: string;
  importedAt?: string;
}

/**
 * Check if a file with this hash has already been imported (Server Action)
 */
export async function checkFileHash(hash: string): Promise<FileHashCheckResult> {
  const existing = await db.import.findUnique({
    where: { fileHash: hash },
    select: {
      id: true,
      fileName: true,
      createdAt: true,
    },
  });

  if (existing) {
    return {
      exists: true,
      importId: existing.id,
      fileName: existing.fileName,
      importedAt: existing.createdAt.toISOString(),
    };
  }

  return { exists: false };
}
