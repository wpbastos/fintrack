import { spawn } from "child_process";

export interface ClaudeCLIResponse {
  type: string;
  subtype: string;
  is_error: boolean;
  duration_ms: number;
  duration_api_ms: number;
  num_turns: number;
  result: string;
  session_id: string;
  total_cost_usd: number;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens: number;
    cache_creation_input_tokens: number;
  };
}

export interface ClaudeCallOptions {
  prompt: string;
  /** Comma-separated list of allowed tools (e.g. "Read", "WebSearch,WebFetch") */
  allowedTools: string;
  /** Timeout in milliseconds (default: 120000) */
  timeoutMs?: number;
  /** Working directory for the subprocess */
  cwd?: string;
  /** Label for log messages (e.g. "EXTRACT", "RESOLVE") */
  logLabel?: string;
  /** Logger with info/error methods */
  logger?: { info: (label: string, msg: string) => void; error: (label: string, msg: string) => void };
}

export interface ClaudeMetrics {
  durationMs: number;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

export type ClaudeResult =
  | { success: true; rawResult: string; parsedJson: unknown; metrics: ClaudeMetrics }
  | { success: false; error: string; metrics?: ClaudeMetrics };

/**
 * Extract JSON content from markdown code blocks.
 * If the text contains ```json ... ``` or ``` ... ```, returns the inner content.
 * Otherwise returns the trimmed text as-is.
 */
export function extractJsonFromMarkdown(text: string): string {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }
  return text.trim();
}

/**
 * Unified function to call the Claude CLI subprocess.
 * Handles spawning, timeout, JSON parsing, and metric extraction.
 */
export async function callClaude(options: ClaudeCallOptions): Promise<ClaudeResult> {
  const {
    prompt,
    allowedTools,
    timeoutMs = 120000,
    cwd: spawnCwd,
    logLabel = "CLAUDE",
    logger: log,
  } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(
      "claude",
      ["-p", "-", "--output-format", "json", "--allowedTools", allowedTools],
      {
        stdio: ["pipe", "pipe", "pipe"],
        ...(spawnCwd ? { cwd: spawnCwd } : {}),
      }
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => { stdout += data.toString(); });
    child.stderr.on("data", (data) => { stderr += data.toString(); });

    child.stdin.write(prompt);
    child.stdin.end();

    child.on("error", (err) => {
      log?.error(logLabel, `spawn error: ${err.message}`);
      reject(new Error(`Failed to spawn claude: ${err.message}`));
    });

    child.on("close", (code) => {
      if (code !== 0) {
        log?.error(logLabel, `CLI failed with code ${code}: ${stderr.substring(0, 200)}`);
        reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`));
        return;
      }

      try {
        const cliResponse: ClaudeCLIResponse = JSON.parse(stdout);

        const metrics: ClaudeMetrics = {
          durationMs: cliResponse.duration_ms,
          costUsd: cliResponse.total_cost_usd,
          inputTokens: cliResponse.usage.input_tokens,
          outputTokens: cliResponse.usage.output_tokens,
          cacheReadTokens: cliResponse.usage.cache_read_input_tokens,
          cacheCreationTokens: cliResponse.usage.cache_creation_input_tokens,
        };

        if (cliResponse.is_error) {
          log?.error(logLabel, `Error: ${cliResponse.result.substring(0, 200)}`);
          resolve({ success: false, error: cliResponse.result, metrics });
          return;
        }

        const jsonContent = extractJsonFromMarkdown(cliResponse.result);
        const parsedJson = JSON.parse(jsonContent);

        resolve({
          success: true,
          rawResult: cliResponse.result,
          parsedJson,
          metrics,
        });
      } catch (parseError) {
        log?.error(logLabel, `Parse failed: ${parseError instanceof Error ? parseError.message : "Unknown"}`);
        resolve({
          success: false,
          error: `Failed to parse response: ${parseError instanceof Error ? parseError.message : "Unknown"}`,
        });
      }
    });

    const timeout = setTimeout(() => {
      log?.error(logLabel, `Timeout after ${Math.round(timeoutMs / 1000)}s`);
      child.kill();
      reject(new Error("Claude CLI timeout"));
    }, timeoutMs);

    child.on("close", () => clearTimeout(timeout));
  });
}
