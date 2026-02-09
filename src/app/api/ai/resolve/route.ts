import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildResolveTransactionsPrompt } from "@/lib/prompts/resolve-transactions";
import { aiLogger as log } from "@/lib/logger";
import { callClaude } from "@/lib/ai-service";

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

    if (transactions.length === 0) {
      return NextResponse.json({ message: "No transactions to resolve" });
    }

    // 2. Fetch existing merchants with patterns
    const merchants = await db.merchant.findMany({
      where: { isActive: true },
      include: {
        patterns: true,
        category: true,
      },
    });

    // 3. Fetch existing income sources with patterns
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

    // 4. Fetch categories with their children (subcategories)
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

    // 5. Build prompt for Claude
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

    // 6. Call Claude CLI
    log.info("AI", `Resolving ${transactions.length} transactions...`);
    const claudeResponse = await callClaudeCLI(prompt);

    if (!claudeResponse.suggestions || claudeResponse.suggestions.length === 0) {

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
    let suggestedCount = 0;
    for (const suggestion of claudeResponse.suggestions) {
      // Skip if AI confirms current assignment (no change needed)
      if (suggestion.confirmed) {
        continue;
      }

      await db.stagingTransaction.update({
        where: { id: suggestion.transactionId },
        data: {
          status: "suggested",
          notes: JSON.stringify(suggestion),
        },
      });
      suggestedCount++;
    }

    endTotal(`${suggestedCount}/${transactions.length} need review, $${claudeResponse.cost?.toFixed(4) ?? "?"}`);


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

async function callClaudeCLI(prompt: string): Promise<ClaudeResponse> {
  const result = await callClaude({
    prompt,
    allowedTools: "mcp__puppeteer__puppeteer_navigate,mcp__puppeteer__puppeteer_screenshot,WebSearch,WebFetch",
    timeoutMs: 120000,
    logLabel: "CLAUDE",
    logger: log,
  });

  if (!result.success) {
    throw new Error(result.error);
  }

  const parsed = result.parsedJson as { suggestions?: ClaudeSuggestion[] };
  return {
    suggestions: parsed.suggestions || [],
    duration: result.metrics.durationMs,
    cost: result.metrics.costUsd,
    tokens: {
      input: result.metrics.inputTokens,
      output: result.metrics.outputTokens,
    },
  };
}
