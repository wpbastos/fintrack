import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildResolveTransactionsPrompt } from "@/lib/prompts/resolve-transactions";
import { aiLogger as log } from "@/lib/logger";

interface ClaudeSuggestion {
  transactionId: number;
  type: "merchant" | "income";
  confirmed?: boolean; // True if AI confirms current assignment is correct
  existingId?: number;
  existingName?: string;
  existingCategoryName?: string;
  suggestedPattern?: string;
  newEntity?: {
    name: string;
    categoryId?: number;
    categoryName?: string;
    // Parent category info when categoryId is a subcategory
    parentCategoryId?: number;
    parentCategoryName?: string;
    pattern: string;
    // Enriched merchant data from web search
    website?: string;
    industry?: string;
    // Enriched employer data for income sources
    employerName?: string;
    employerWebsite?: string;
    employerIndustry?: string;
  };
  confidence: "high" | "medium" | "low";
  reasoning?: string;
}

interface ClaudeResponse {
  suggestions: ClaudeSuggestion[];
  duration?: number;
  cost?: number;
  tokens?: {
    input: number;
    output: number;
  };
}

export async function POST(request: Request) {
  const endTotal = log.time("START", "Beginning AI resolution process");

  // Parse optional importId and includeAll from request body
  let importId: number | undefined;
  let includeAll = false;
  try {
    const body = await request.json();
    importId = body.importId;
    includeAll = body.includeAll ?? false;
  } catch {
    // No body or invalid JSON - resolve all unknown
  }

  // Set AI status to resolving
  if (importId) {
    await db.import.update({
      where: { id: importId },
      data: {
        aiStatus: "resolving",
        aiStartedAt: new Date(),
        aiResult: null,
      },
    });
  }

  try {

    // 1. Fetch transactions (optionally filtered by importId)
    // If includeAll is true, fetch ALL transactions (not just unknown)
    const statusFilter = includeAll
      ? { status: { in: ["pending", "unknown", "matched", "suggested"] } }
      : { status: "unknown" };

    log.debug("FETCH", `Fetching ${includeAll ? "all" : "unknown"} transactions${importId ? ` for batch ${importId}` : ""}...`);
    const transactions = await db.stagingTransaction.findMany({
      where: {
        ...statusFilter,
        ...(importId ? { importId } : {}),
      },
      select: {
        id: true,
        rawDescription: true,
        rawAmount: true,
        status: true,
        merchant: { select: { id: true, name: true } },
        income: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });
    log.debug("FETCH", `Found ${transactions.length} transactions`);

    if (transactions.length === 0) {
      log.info("END", "No transactions to resolve");
      return NextResponse.json({ message: "No transactions to resolve" });
    }

    // 2. Fetch existing merchants with patterns
    log.debug("FETCH", "Fetching merchants...");
    const merchants = await db.merchant.findMany({
      where: { isActive: true },
      include: {
        patterns: true,
        category: true,
      },
    });
    log.debug("FETCH", `Found ${merchants.length} merchants with ${merchants.reduce((acc, m) => acc + m.patterns.length, 0)} patterns`);

    // 3. Fetch existing income sources with patterns
    log.debug("FETCH", "Fetching income sources...");
    const incomes = await db.income.findMany({
      where: { isActive: true },
      include: {
        patterns: true,
        category: true,
        position: {
          select: {
            employer: { select: { name: true } },
          },
        },
      },
    });
    log.debug("FETCH", `Found ${incomes.length} income sources with ${incomes.reduce((acc, i) => acc + i.patterns.length, 0)} patterns`);

    // 4. Fetch categories with their children (subcategories)
    log.debug("FETCH", "Fetching categories with subcategories...");
    const categories = await db.category.findMany({
      where: { isActive: true },
      include: {
        group: true,
        children: {
          where: { isActive: true },
          select: { id: true, name: true },
        },
      },
    });
    log.debug("FETCH", `Found ${categories.length} categories`);

    // 5. Build prompt for Claude
    log.debug("PROMPT", "Building prompt...");
    // Transform transactions to include current assignment info
    const transactionsForPrompt = transactions.map((t) => ({
      id: t.id,
      rawDescription: t.rawDescription,
      rawAmount: t.rawAmount,
      currentStatus: t.status,
      currentMerchant: t.merchant?.name ?? null,
      currentIncome: t.income?.name ?? null,
      currentCategory: t.category?.name ?? null,
    }));
    const prompt = buildResolveTransactionsPrompt(transactionsForPrompt, merchants, incomes, categories, includeAll);
    log.debug("PROMPT", `Prompt built (${prompt.length} characters)`);

    // 6. Call Claude CLI
    const endClaude = log.time("CLAUDE", "Calling Claude CLI");
    const claudeResponse = await callClaudeCLI(prompt);
    endClaude(`Claude responded with ${claudeResponse.suggestions?.length ?? 0} suggestions`);

    if (!claudeResponse.suggestions || claudeResponse.suggestions.length === 0) {
      log.info("END", "Claude confirmed all transactions or could not resolve any");

      const result = {
        message: "All transactions confirmed or no suggestions",
        total: transactions.length,
        suggested: 0,
        duration: claudeResponse.duration,
        cost: claudeResponse.cost,
        tokens: claudeResponse.tokens,
      };

      // Update AI status to complete
      if (importId) {
        await db.import.update({
          where: { id: importId },
          data: {
            aiStatus: "complete",
            aiResult: JSON.stringify(result),
          },
        });
      }

      return NextResponse.json(result);
    }

    // 7. Update transactions with suggestions (only those that need changes)
    log.debug("UPDATE", "Updating transactions with suggestions...");
    let suggestedCount = 0;
    for (const suggestion of claudeResponse.suggestions) {
      // Skip if AI confirms current assignment (no change needed)
      if (suggestion.confirmed) {
        log.debug("UPDATE", `Transaction ${suggestion.transactionId}: confirmed current assignment`);
        continue;
      }

      log.debug("UPDATE", `Transaction ${suggestion.transactionId}: ${suggestion.type} -> ${suggestion.existingName || suggestion.newEntity?.name || "unknown"} (${suggestion.confidence})`);
      await db.stagingTransaction.update({
        where: { id: suggestion.transactionId },
        data: {
          status: "suggested",
          notes: JSON.stringify(suggestion),
        },
      });
      suggestedCount++;
    }

    endTotal(`Completed - ${suggestedCount}/${transactions.length} transactions need review`);

    const result = {
      total: transactions.length,
      suggested: suggestedCount,
      suggestions: claudeResponse.suggestions,
      duration: claudeResponse.duration,
      cost: claudeResponse.cost,
      tokens: claudeResponse.tokens,
    };

    // Update AI status to complete
    if (importId) {
      await db.import.update({
        where: { id: importId },
        data: {
          aiStatus: "complete",
          aiResult: JSON.stringify(result),
        },
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    log.error("ERROR", error instanceof Error ? error.message : "Unknown error");

    // Update AI status to error
    if (importId) {
      await db.import.update({
        where: { id: importId },
        data: {
          aiStatus: "error",
          aiResult: JSON.stringify({ error: error instanceof Error ? error.message : "AI resolution failed" }),
        },
      });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI resolution failed" },
      { status: 500 }
    );
  }
}

interface ClaudeCLIResponse {
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

function extractJsonFromMarkdown(text: string): string {
  // Remove markdown code blocks if present
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }
  return text.trim();
}

async function callClaudeCLI(prompt: string): Promise<ClaudeResponse> {
  const { spawn } = await import("child_process");

  try {
    log.debug("CLAUDE", `Executing claude CLI (prompt: ${prompt.length} chars)`);

    return new Promise((resolve, reject) => {
      // Enable web search for researching merchants and employers
      const child = spawn("claude", [
        "--print",
        "--output-format", "json",
        "--allowedTools", "mcp__puppeteer__puppeteer_navigate,mcp__puppeteer__puppeteer_screenshot,WebSearch,WebFetch",
        "-p", "-"
      ], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
        log.debug("CLAUDE", `stderr: ${data.toString().trim()}`);
      });

      child.on("error", (err) => {
        log.error("CLAUDE", `spawn error: ${err.message}`);
        reject(new Error(`Failed to spawn claude: ${err.message}`));
      });

      child.on("close", (code) => {
        log.debug("CLAUDE", `CLI exited with code ${code}, stdout: ${stdout.length} chars`);

        if (code !== 0) {
          log.error("CLAUDE", `CLI failed with code ${code}: ${stderr}`);
          reject(new Error(`Claude CLI exited with code ${code}`));
          return;
        }

        try {
          // Parse the CLI response wrapper
          const cliResponse: ClaudeCLIResponse = JSON.parse(stdout);

          // Log useful metadata
          log.info("CLAUDE", `Response received`, {
            data: {
              duration: `${(cliResponse.duration_ms / 1000).toFixed(1)}s`,
              cost: `$${cliResponse.total_cost_usd.toFixed(4)}`,
              tokens: {
                input: cliResponse.usage.input_tokens,
                output: cliResponse.usage.output_tokens,
                cacheRead: cliResponse.usage.cache_read_input_tokens,
                cacheCreation: cliResponse.usage.cache_creation_input_tokens,
              },
            },
          });

          if (cliResponse.is_error) {
            log.error("CLAUDE", `CLI returned error: ${cliResponse.result}`);
            reject(new Error(cliResponse.result));
            return;
          }

          // Extract JSON from markdown code blocks
          const jsonContent = extractJsonFromMarkdown(cliResponse.result);
          log.debug("CLAUDE", `Extracted JSON (${jsonContent.length} characters)`);

          // Parse the actual response and add metadata
          const parsed = JSON.parse(jsonContent);
          const response: ClaudeResponse = {
            suggestions: parsed.suggestions || [],
            duration: cliResponse.duration_ms,
            cost: cliResponse.total_cost_usd,
            tokens: {
              input: cliResponse.usage.input_tokens,
              output: cliResponse.usage.output_tokens,
            },
          };
          resolve(response);
        } catch (parseError) {
          log.error("CLAUDE", `Failed to parse response: ${parseError instanceof Error ? parseError.message : "Unknown"}`);
          log.debug("CLAUDE", `Raw stdout: ${stdout.substring(0, 500)}...`);
          reject(new Error("Failed to parse Claude response"));
        }
      });

      // Set timeout
      const timeout = setTimeout(() => {
        log.error("CLAUDE", "CLI timeout after 2 minutes");
        child.kill();
        reject(new Error("Claude CLI timeout"));
      }, 120000);

      child.on("close", () => clearTimeout(timeout));

      // Write prompt to stdin and close
      child.stdin.write(prompt);
      child.stdin.end();
      log.debug("CLAUDE", "Prompt sent to stdin, waiting for response...");
    });
  } catch (error) {
    log.error("CLAUDE", `CLI error: ${error instanceof Error ? error.message : "Unknown"}`);
    throw new Error("Failed to get response from Claude CLI");
  }
}
