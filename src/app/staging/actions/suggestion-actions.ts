"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { resolveTransaction } from "@/lib/staging-resolver";
import { createLogger } from "@/lib/logger";

const log = createLogger("Staging");

interface ClaudeSuggestion {
  transactionId: number;
  type: "merchant" | "income";
  existingId?: number;
  existingName?: string;
  suggestedPattern?: string;
  newEntity?: {
    name: string;
    categoryId?: number;
    categoryName?: string;
    parentCategoryId?: number;
    parentCategoryName?: string;
    pattern: string;
    website?: string;
    industry?: string;
    employerName?: string;
    employerWebsite?: string;
    employerIndustry?: string;
  };
  confidence: "high" | "medium" | "low";
  reasoning?: string;
}

/**
 * Shared approval logic — processes a suggestion by creating/linking merchants/incomes and patterns.
 * Returns the resolved merchantId, incomeId, and categoryId.
 */
async function processApproval(suggestion: ClaudeSuggestion): Promise<{
  merchantId: number | null;
  incomeId: number | null;
  categoryId: number | null;
}> {
  let merchantId: number | null = null;
  let incomeId: number | null = null;
  let categoryId: number | null = null;

  if (suggestion.type === "merchant") {
    if (suggestion.existingId) {
      merchantId = suggestion.existingId;
      if (suggestion.suggestedPattern) {
        const existingPattern = await db.merchantPattern.findUnique({
          where: { pattern: suggestion.suggestedPattern },
        });
        if (!existingPattern) {
          await db.merchantPattern.create({
            data: {
              merchantId: suggestion.existingId,
              pattern: suggestion.suggestedPattern,
              priority: 0,
            },
          });
          log.info("PATTERN", `"${suggestion.suggestedPattern}" -> ${suggestion.existingName}`);
        }
      }
      const merchant = await db.merchant.findUnique({
        where: { id: suggestion.existingId },
        select: { categoryId: true },
      });
      categoryId = merchant?.categoryId ?? null;
    } else if (suggestion.newEntity) {
      let merchant = await db.merchant.findUnique({
        where: { name: suggestion.newEntity.name },
      });
      if (merchant) {
        merchantId = merchant.id;
        categoryId = merchant.categoryId;
        if (suggestion.newEntity.website || suggestion.newEntity.industry) {
          await db.merchant.update({
            where: { id: merchant.id },
            data: {
              website: merchant.website || suggestion.newEntity.website || null,
              type: merchant.type || suggestion.newEntity.industry || null,
            },
          });
        }
      } else {
        merchant = await db.merchant.create({
          data: {
            name: suggestion.newEntity.name,
            categoryId: suggestion.newEntity.categoryId,
            website: suggestion.newEntity.website,
            type: suggestion.newEntity.industry,
            isActive: true,
          },
        });
        log.info("CREATE", `Merchant: ${suggestion.newEntity.name}`);
        merchantId = merchant.id;
        categoryId = suggestion.newEntity.categoryId ?? null;
      }
      const existingPattern = await db.merchantPattern.findUnique({
        where: { pattern: suggestion.newEntity.pattern },
      });
      if (!existingPattern) {
        await db.merchantPattern.create({
          data: {
            merchantId: merchantId,
            pattern: suggestion.newEntity.pattern,
            priority: 0,
          },
        });
        log.info("PATTERN", `"${suggestion.newEntity.pattern}" -> ${suggestion.newEntity.name}`);
      }
    }
  } else {
    // income type
    if (suggestion.existingId) {
      incomeId = suggestion.existingId;
      if (suggestion.suggestedPattern) {
        const existingPattern = await db.incomePattern.findUnique({
          where: { pattern: suggestion.suggestedPattern },
        });
        if (!existingPattern) {
          await db.incomePattern.create({
            data: {
              incomeId: suggestion.existingId,
              pattern: suggestion.suggestedPattern,
              priority: 0,
            },
          });
          log.info("PATTERN", `"${suggestion.suggestedPattern}" -> ${suggestion.existingName}`);
        }
      }
      const incomeSource = await db.income.findUnique({
        where: { id: suggestion.existingId },
        select: { categoryId: true },
      });
      categoryId = incomeSource?.categoryId ?? null;
    } else if (suggestion.newEntity) {
      let incomeSource = await db.income.findUnique({
        where: { name: suggestion.newEntity.name },
      });
      if (incomeSource) {
        incomeId = incomeSource.id;
        categoryId = incomeSource.categoryId;
      } else {
        let isEmploymentIncome = false;
        if (suggestion.newEntity.categoryId) {
          const category = await db.category.findUnique({
            where: { id: suggestion.newEntity.categoryId },
            include: { group: true },
          });
          isEmploymentIncome = category?.group?.name === "Earned Income";
        }

        let positionId: number | null = null;

        if (isEmploymentIncome && suggestion.newEntity.employerName) {
          let employer = await db.employer.findUnique({
            where: { name: suggestion.newEntity.employerName },
          });
          if (!employer) {
            employer = await db.employer.create({
              data: {
                name: suggestion.newEntity.employerName,
                website: suggestion.newEntity.employerWebsite,
                industry: suggestion.newEntity.employerIndustry,
                isActive: true,
              },
            });
            log.info("CREATE", `Employer: ${suggestion.newEntity.employerName}`);
          } else {
            if (suggestion.newEntity.employerWebsite || suggestion.newEntity.employerIndustry) {
              await db.employer.update({
                where: { id: employer.id },
                data: {
                  website: employer.website || suggestion.newEntity.employerWebsite || null,
                  industry: employer.industry || suggestion.newEntity.employerIndustry || null,
                },
              });
            }
          }
          let position = await db.position.findFirst({
            where: { employerId: employer.id, title: "Employee" },
          });
          if (!position) {
            position = await db.position.create({
              data: {
                title: "Employee",
                employerId: employer.id,
                isActive: true,
              },
            });
            await db.employer.update({
              where: { id: employer.id },
              data: { isActive: true },
            });
          }
          positionId = position.id;
        }

        incomeSource = await db.income.create({
          data: {
            name: suggestion.newEntity.name,
            categoryId: suggestion.newEntity.categoryId,
            positionId: positionId,
            isActive: true,
          },
        });
        log.info("CREATE", `Income: ${suggestion.newEntity.name}`);
        incomeId = incomeSource.id;
        categoryId = suggestion.newEntity.categoryId ?? null;
      }
      const existingPattern = await db.incomePattern.findUnique({
        where: { pattern: suggestion.newEntity.pattern },
      });
      if (!existingPattern) {
        await db.incomePattern.create({
          data: {
            incomeId: incomeId,
            pattern: suggestion.newEntity.pattern,
            priority: 0,
          },
        });
        log.info("PATTERN", `"${suggestion.newEntity.pattern}" -> ${suggestion.newEntity.name}`);
      }
    }
  }

  return { merchantId, incomeId, categoryId };
}

function confidenceToScore(confidence: "high" | "medium" | "low"): number {
  return confidence === "high" ? 90 : confidence === "medium" ? 70 : 50;
}

/**
 * Internal: Approve an AI suggestion without re-resolving other transactions
 * Used by approveAllSuggestions for batch processing
 */
export async function approveSuggestionInternal(transactionId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const txn = await db.stagingTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!txn || txn.status !== "suggested" || !txn.notes) {
      return { success: false, error: "Transaction not found or not in suggested status" };
    }

    const suggestion: ClaudeSuggestion = JSON.parse(txn.notes);
    const { merchantId, incomeId, categoryId } = await processApproval(suggestion);

    await db.stagingTransaction.update({
      where: { id: transactionId },
      data: {
        merchantId,
        incomeId,
        categoryId,
        status: "matched",
        matchConfidence: confidenceToScore(suggestion.confidence),
        notes: null,
      },
    });

    return { success: true };
  } catch (error) {
    log.error("APPROVE", error instanceof Error ? error.message : "Unknown");
    return { success: false, error: error instanceof Error ? error.message : "Failed to approve suggestion" };
  }
}

/**
 * Approve an AI suggestion for a staging transaction
 * Creates new merchant/income source if suggested, adds patterns, and marks as matched
 * Also re-resolves all other unresolved transactions across all batches
 */
export async function approveSuggestion(transactionId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const txn = await db.stagingTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!txn || txn.status !== "suggested" || !txn.notes) {
      return { success: false, error: "Transaction not found or not in suggested status" };
    }

    const suggestion: ClaudeSuggestion = JSON.parse(txn.notes);
    const { merchantId, incomeId, categoryId } = await processApproval(suggestion);

    await db.stagingTransaction.update({
      where: { id: transactionId },
      data: {
        merchantId,
        incomeId,
        categoryId,
        status: "matched",
        matchConfidence: confidenceToScore(suggestion.confidence),
        notes: null,
      },
    });

    // Auto-activate income if it was inactive
    if (incomeId) {
      await db.income.updateMany({
        where: { id: incomeId, isActive: false },
        data: { isActive: true },
      });
    }

    // Re-resolve ALL unresolved transactions across ALL batches
    const allUnresolved = await db.stagingTransaction.findMany({
      where: {
        id: { not: transactionId },
        status: { in: ["pending", "unknown", "suggested"] },
      },
    });

    let resolved = 0;
    for (const otherTxn of allUnresolved) {
      const resolution = await resolveTransaction(
        otherTxn.rawDate,
        otherTxn.rawDescription,
        otherTxn.rawAmount
      );

      const hasPatternMatch = resolution.merchantId || resolution.incomeId;
      if (hasPatternMatch) {
        await db.stagingTransaction.update({
          where: { id: otherTxn.id },
          data: {
            resolvedDate: resolution.resolvedDate,
            merchantId: resolution.merchantId,
            incomeId: resolution.incomeId,
            categoryId: resolution.categoryId,
            matchConfidence: resolution.matchConfidence,
            status: "matched",
            notes: null,
          },
        });
        resolved++;
      }
    }

    if (resolved > 0) {
      log.info("AUTO-RESOLVE", `${resolved} more transactions matched across all batches`);
    }

    revalidatePath("/staging");
    return { success: true };
  } catch (error) {
    log.error("APPROVE", error instanceof Error ? error.message : "Unknown");
    return { success: false, error: error instanceof Error ? error.message : "Failed to approve suggestion" };
  }
}

/**
 * Reject an AI suggestion - returns transaction to unknown status
 */
export async function rejectSuggestion(transactionId: number): Promise<{ success: boolean; error?: string }> {
  try {
    await db.stagingTransaction.update({
      where: { id: transactionId },
      data: {
        status: "unknown",
        notes: null,
      },
    });

    revalidatePath("/staging");
    return { success: true };
  } catch (error) {
    log.error("REJECT", error instanceof Error ? error.message : "Unknown");
    return { success: false, error: error instanceof Error ? error.message : "Failed to reject suggestion" };
  }
}

/**
 * Approve all AI suggestions at once
 * Optimized: processes all approvals first, then does one global re-resolve at the end
 */
export async function approveAllSuggestions(): Promise<{ success: boolean; approved: number; autoResolved: number; error?: string }> {
  try {
    const suggestedTxns = await db.stagingTransaction.findMany({
      where: { status: "suggested" },
    });

    let approved = 0;
    for (const txn of suggestedTxns) {
      const result = await approveSuggestionInternal(txn.id);
      if (result.success) approved++;
    }

    // Now do one global re-resolve for all remaining unresolved transactions
    let autoResolved = 0;
    const allUnresolved = await db.stagingTransaction.findMany({
      where: {
        status: { in: ["pending", "unknown", "suggested"] },
      },
    });

    for (const otherTxn of allUnresolved) {
      const resolution = await resolveTransaction(
        otherTxn.rawDate,
        otherTxn.rawDescription,
        otherTxn.rawAmount
      );

      const hasPatternMatch = resolution.merchantId || resolution.incomeId;
      if (hasPatternMatch) {
        await db.stagingTransaction.update({
          where: { id: otherTxn.id },
          data: {
            resolvedDate: resolution.resolvedDate,
            merchantId: resolution.merchantId,
            incomeId: resolution.incomeId,
            categoryId: resolution.categoryId,
            matchConfidence: resolution.matchConfidence,
            status: "matched",
            notes: null,
          },
        });
        autoResolved++;
      }
    }

    if (suggestedTxns.length > 0 || autoResolved > 0) {
      log.info("APPROVE", `Approved ${approved}/${suggestedTxns.length} suggestions, auto-resolved ${autoResolved} more`);
    }

    revalidatePath("/staging");
    return { success: true, approved, autoResolved };
  } catch (error) {
    log.error("APPROVE", error instanceof Error ? error.message : "Unknown");
    return { success: false, approved: 0, autoResolved: 0, error: error instanceof Error ? error.message : "Failed to approve suggestions" };
  }
}

/**
 * Reject all AI suggestions at once
 */
export async function rejectAllSuggestions(): Promise<{ success: boolean; rejected: number; error?: string }> {
  try {
    const result = await db.stagingTransaction.updateMany({
      where: { status: "suggested" },
      data: {
        status: "unknown",
        notes: null,
      },
    });

    if (result.count > 0) {
      log.info("REJECT", `Rejected ${result.count} suggestions`);
    }

    revalidatePath("/staging");
    return { success: true, rejected: result.count };
  } catch (error) {
    log.error("REJECT", error instanceof Error ? error.message : "Unknown");
    return { success: false, rejected: 0, error: error instanceof Error ? error.message : "Failed to reject suggestions" };
  }
}
