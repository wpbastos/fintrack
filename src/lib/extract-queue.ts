/**
 * Queue and job tracking for PDF extraction
 * - Limits concurrent Claude CLI calls
 * - Stores job results for polling
 */

import { pdfExtractLogger as log } from "@/lib/logger";

export interface ExtractJob {
  id: string;
  fileName: string;
  status: "queued" | "processing" | "complete" | "error" | "cancelled";
  queuePosition?: number;
  result?: unknown;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

type QueueTask = {
  jobId: string;
  execute: () => Promise<unknown>;
};

class ExtractQueue {
  private queue: QueueTask[] = [];
  private running = 0;
  private concurrency: number;
  private jobs: Map<string, ExtractJob> = new Map();

  constructor() {
    // Read concurrency from env, default to 1
    this.concurrency = parseInt(process.env.EXTRACT_CONCURRENCY || "1", 10);
    if (isNaN(this.concurrency) || this.concurrency < 1) {
      this.concurrency = 1;
    }
  }

  get stats() {
    return {
      queued: this.queue.length,
      running: this.running,
      concurrency: this.concurrency,
    };
  }

  getJob(jobId: string): ExtractJob | undefined {
    return this.jobs.get(jobId);
  }

  createJob(jobId: string, fileName: string): ExtractJob {
    const job: ExtractJob = {
      id: jobId,
      fileName,
      status: "queued",
      queuePosition: this.queue.length + 1,
    };
    this.jobs.set(jobId, job);

    // Clean up old jobs (keep last 100)
    if (this.jobs.size > 100) {
      const entries = Array.from(this.jobs.entries());
      const toDelete = entries.slice(0, entries.length - 100);
      toDelete.forEach(([id]) => this.jobs.delete(id));
    }

    return job;
  }

  async add(jobId: string, task: () => Promise<unknown>): Promise<void> {
    this.queue.push({ jobId, execute: task });
    this.updateQueuePositions();
    const job = this.jobs.get(jobId);
    const pos = job?.queuePosition ?? 0;
    if (pos > 1) {
      log.info("QUEUE", `${job?.fileName}: queued #${pos} (${this.queue.length} waiting)`);
    }
    this.process();
  }

  /**
   * Cancel a job - removes from queue if queued, marks as cancelled
   * Returns true if job was found and cancelled/marked
   */
  cancel(jobId: string): { success: boolean; wasQueued: boolean; wasProcessing: boolean } {
    const job = this.jobs.get(jobId);
    if (!job) {
      return { success: false, wasQueued: false, wasProcessing: false };
    }

    const wasQueued = job.status === "queued";
    const wasProcessing = job.status === "processing";

    // Remove from queue if still queued
    if (wasQueued) {
      const index = this.queue.findIndex((t) => t.jobId === jobId);
      if (index !== -1) {
        this.queue.splice(index, 1);
        this.updateQueuePositions();
        log.info("QUEUE", `${job.fileName}: removed from queue`);
      }
    }

    // Mark as cancelled (even if processing - it will complete but be ignored)
    job.status = "cancelled";
    job.completedAt = new Date().toISOString();

    if (wasProcessing) {
      log.info("QUEUE", `${job.fileName}: marked as cancelled (was processing)`);
    }

    return { success: true, wasQueued, wasProcessing };
  }

  private updateQueuePositions() {
    this.queue.forEach((task, index) => {
      const job = this.jobs.get(task.jobId);
      if (job && job.status === "queued") {
        job.queuePosition = index + 1;
      }
    });
  }

  private async process() {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift();
    if (!task) return;

    this.running++;
    this.updateQueuePositions();

    const job = this.jobs.get(task.jobId);
    if (job) {
      job.status = "processing";
      job.queuePosition = undefined;
      job.startedAt = new Date().toISOString();
    }

    try {
      const result = await task.execute();
      // Only update status if job wasn't cancelled while processing
      if (job && job.status !== "cancelled") {
        job.status = "complete";
        job.result = result;
        job.completedAt = new Date().toISOString();
      }
    } catch (error) {
      // Only update status if job wasn't cancelled while processing
      if (job && job.status !== "cancelled") {
        job.status = "error";
        job.error = error instanceof Error ? error.message : String(error);
        job.completedAt = new Date().toISOString();
      }
    } finally {
      this.running--;
      // Process next task
      this.process();
    }
  }
}

// Singleton instance
export const extractQueue = new ExtractQueue();
