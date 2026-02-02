"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { resolveTransaction } from "@/lib/staging-resolver";
import { createLogger } from "@/lib/logger";

const log = createLogger("Staging");

export interface ResolveResult {
  total: number;
  datesResolved: number;
  merchantsResolved: number;
  incomesResolved: number;
  categoriesResolved: number;
  fullyResolved: number;
}

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
    // Parent category when categoryId is a subcategory
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

/**
 * Re-resolve all pending and unknown staging transactions
 * Useful after adding new merchant/income source patterns
 */
export async function resolveUnresolved(): Promise<ResolveResult> {
  log.debug("RESOLVE", "Starting resolution of unresolved transactions...");

  // Get transactions that need resolution (pending or unknown)
  const transactions = await db.stagingTransaction.findMany({
    where: {
      status: { in: ["pending", "unknown"] },
    },
  });

  log.debug("RESOLVE", `Found ${transactions.length} transactions to resolve`);

  let datesResolved = 0;
  let merchantsResolved = 0;
  let incomesResolved = 0;
  let categoriesResolved = 0;
  let fullyResolved = 0;

  for (const txn of transactions) {
    const resolution = await resolveTransaction(
      txn.rawDate,
      txn.rawDescription,
      txn.rawAmount
    );

    const hasPatternMatch = resolution.merchantId || resolution.incomeId;
    const status = hasPatternMatch ? "matched" : "unknown";

    await db.stagingTransaction.update({
      where: { id: txn.id },
      data: {
        resolvedDate: resolution.resolvedDate,
        merchantId: resolution.merchantId,
        incomeId: resolution.incomeId,
        categoryId: resolution.categoryId,
        matchConfidence: resolution.matchConfidence,
        status,
      },
    });

    const dateOk = resolution.resolvedDate !== null;
    const merchantOk = resolution.merchantId !== null;
    const incomeOk = resolution.incomeId !== null;
    const categoryOk = resolution.categoryId !== null;

    if (dateOk) datesResolved++;
    if (merchantOk) merchantsResolved++;
    if (incomeOk) incomesResolved++;
    if (categoryOk) categoriesResolved++;
    if (dateOk && (merchantOk || incomeOk)) fullyResolved++;
  }

  log.info("RESOLVE", `Resolution complete`, {
    data: {
      total: transactions.length,
      datesResolved,
      merchantsResolved,
      incomesResolved,
      categoriesResolved,
      fullyResolved,
    },
  });

  revalidatePath("/staging");

  return {
    total: transactions.length,
    datesResolved,
    merchantsResolved,
    incomesResolved,
    categoriesResolved,
    fullyResolved,
  };
}

/**
 * Approve an AI suggestion for a staging transaction
 * Creates new merchant/income source if suggested, adds patterns, and marks as matched
 */
export async function approveSuggestion(transactionId: number): Promise<{ success: boolean; error?: string }> {
  log.debug("APPROVE", `Approving suggestion for transaction ${transactionId}`);

  try {
    const txn = await db.stagingTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!txn || txn.status !== "suggested" || !txn.notes) {
      log.warn("APPROVE", `Transaction ${transactionId} not found or not in suggested status`);
      return { success: false, error: "Transaction not found or not in suggested status" };
    }

    const suggestion: ClaudeSuggestion = JSON.parse(txn.notes);
    log.debug("APPROVE", `Suggestion: ${suggestion.type} -> ${suggestion.existingName || suggestion.newEntity?.name || "unknown"}`);

    let merchantId: number | null = null;
    let incomeId: number | null = null;
    let categoryId: number | null = null;

    if (suggestion.type === "merchant") {
      if (suggestion.existingId) {
        // Use existing merchant
        merchantId = suggestion.existingId;

        // Add new pattern if suggested (check if it exists first)
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
            log.debug("APPROVE", `Created new pattern: ${suggestion.suggestedPattern}`);
          }
        }

        // Get category from merchant
        const merchant = await db.merchant.findUnique({
          where: { id: suggestion.existingId },
          select: { categoryId: true },
        });
        categoryId = merchant?.categoryId ?? null;
      } else if (suggestion.newEntity) {
        // Check if merchant already exists (might have been created by another suggestion)
        let merchant = await db.merchant.findUnique({
          where: { name: suggestion.newEntity.name },
        });

        if (merchant) {
          log.debug("APPROVE", `Merchant already exists: ${suggestion.newEntity.name}`);
          merchantId = merchant.id;
          categoryId = merchant.categoryId;

          // Update with enriched data if available and not already set
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
          // Create new merchant with pattern and enriched data from web search
          merchant = await db.merchant.create({
            data: {
              name: suggestion.newEntity.name,
              categoryId: suggestion.newEntity.categoryId,
              website: suggestion.newEntity.website,
              type: suggestion.newEntity.industry,
              isActive: true,
            },
          });
          log.info("APPROVE", `Created new merchant: ${suggestion.newEntity.name}${suggestion.newEntity.website ? ` (${suggestion.newEntity.website})` : ""}`);
          merchantId = merchant.id;
          categoryId = suggestion.newEntity.categoryId ?? null;
        }

        // Add pattern if it doesn't exist
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
          log.debug("APPROVE", `Created pattern: ${suggestion.newEntity.pattern}`);
        }
      }
    } else {
      // income type
      if (suggestion.existingId) {
        // Use existing income source
        incomeId = suggestion.existingId;

        // Add new pattern if suggested (check if it exists first)
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
            log.debug("APPROVE", `Created new pattern: ${suggestion.suggestedPattern}`);
          }
        }

        // Get category from income source
        const incomeSource = await db.income.findUnique({
          where: { id: suggestion.existingId },
          select: { categoryId: true },
        });
        categoryId = incomeSource?.categoryId ?? null;
      } else if (suggestion.newEntity) {
        // Check if income source already exists (might have been created by another suggestion)
        let incomeSource = await db.income.findUnique({
          where: { name: suggestion.newEntity.name },
        });

        if (incomeSource) {
          log.debug("APPROVE", `Income source already exists: ${suggestion.newEntity.name}`);
          incomeId = incomeSource.id;
          categoryId = incomeSource.categoryId;
        } else {
          // Check if category belongs to "Employment Income" group (only create employer for employment)
          let isEmploymentIncome = false;
          if (suggestion.newEntity.categoryId) {
            const category = await db.category.findUnique({
              where: { id: suggestion.newEntity.categoryId },
              include: { group: true },
            });
            isEmploymentIncome = category?.group?.name === "Employment Income";
          }

          // Handle employer and position ONLY for Employment Income categories
          let positionId: number | null = null;

          if (isEmploymentIncome && suggestion.newEntity.employerName) {
            // Find or create employer
            let employer = await db.employer.findUnique({
              where: { name: suggestion.newEntity.employerName },
            });

            if (!employer) {
              // Create employer with enriched data from web search
              employer = await db.employer.create({
                data: {
                  name: suggestion.newEntity.employerName,
                  website: suggestion.newEntity.employerWebsite,
                  industry: suggestion.newEntity.employerIndustry,
                  isActive: true,
                },
              });
              log.info("APPROVE", `Created employer: ${suggestion.newEntity.employerName}${suggestion.newEntity.employerWebsite ? ` (${suggestion.newEntity.employerWebsite})` : ""}`);
            } else {
              log.debug("APPROVE", `Using existing employer: ${suggestion.newEntity.employerName}`);
              // Update with enriched data if available and not already set
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

            // Find or create default position for this employer
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
              // Enable the employer when first position is created
              await db.employer.update({
                where: { id: employer.id },
                data: { isActive: true },
              });
              log.info("APPROVE", `Created position for employer: ${employer.name} (employer enabled)`);
            }
            positionId = position.id;
          } else if (suggestion.newEntity.employerName && !isEmploymentIncome) {
            log.debug("APPROVE", `Skipping employer creation - category is not Employment Income`);
          }

          // Create new income source with position link (only for employment income)
          incomeSource = await db.income.create({
            data: {
              name: suggestion.newEntity.name,
              categoryId: suggestion.newEntity.categoryId,
              positionId: positionId,
              isActive: true,
            },
          });
          log.info("APPROVE", `Created income source: ${suggestion.newEntity.name}${positionId ? " (linked to employer)" : ""}`);
          incomeId = incomeSource.id;
          categoryId = suggestion.newEntity.categoryId ?? null;
        }

        // Add pattern if it doesn't exist
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
          log.debug("APPROVE", `Created pattern: ${suggestion.newEntity.pattern}`);
        }
      }
    }

    // Update the transaction
    await db.stagingTransaction.update({
      where: { id: transactionId },
      data: {
        merchantId,
        incomeId,
        categoryId,
        status: "matched",
        matchConfidence: suggestion.confidence === "high" ? 90 : suggestion.confidence === "medium" ? 70 : 50,
        notes: null, // Clear the suggestion
      },
    });

    log.info("APPROVE", `Approved transaction ${transactionId}: ${suggestion.type} -> ${suggestion.existingName || suggestion.newEntity?.name}`);

    revalidatePath("/staging");
    return { success: true };
  } catch (error) {
    log.error("APPROVE", `Failed to approve transaction ${transactionId}: ${error instanceof Error ? error.message : "Unknown"}`);
    return { success: false, error: error instanceof Error ? error.message : "Failed to approve suggestion" };
  }
}

/**
 * Reject an AI suggestion - returns transaction to unknown status
 */
export async function rejectSuggestion(transactionId: number): Promise<{ success: boolean; error?: string }> {
  log.debug("REJECT", `Rejecting suggestion for transaction ${transactionId}`);

  try {
    await db.stagingTransaction.update({
      where: { id: transactionId },
      data: {
        status: "unknown",
        notes: null,
      },
    });

    log.info("REJECT", `Rejected transaction ${transactionId}`);

    revalidatePath("/staging");
    return { success: true };
  } catch (error) {
    log.error("REJECT", `Failed to reject transaction ${transactionId}: ${error instanceof Error ? error.message : "Unknown"}`);
    return { success: false, error: error instanceof Error ? error.message : "Failed to reject suggestion" };
  }
}

/**
 * Approve all AI suggestions at once
 */
export async function approveAllSuggestions(): Promise<{ success: boolean; approved: number; error?: string }> {
  log.debug("APPROVE_ALL", "Approving all suggestions...");

  try {
    const suggestedTxns = await db.stagingTransaction.findMany({
      where: { status: "suggested" },
    });

    log.debug("APPROVE_ALL", `Found ${suggestedTxns.length} suggestions to approve`);

    let approved = 0;
    for (const txn of suggestedTxns) {
      const result = await approveSuggestion(txn.id);
      if (result.success) approved++;
    }

    log.info("APPROVE_ALL", `Approved ${approved}/${suggestedTxns.length} suggestions`);

    revalidatePath("/staging");
    return { success: true, approved };
  } catch (error) {
    log.error("APPROVE_ALL", `Failed: ${error instanceof Error ? error.message : "Unknown"}`);
    return { success: false, approved: 0, error: error instanceof Error ? error.message : "Failed to approve suggestions" };
  }
}

/**
 * Reject all AI suggestions at once
 */
export async function rejectAllSuggestions(): Promise<{ success: boolean; rejected: number; error?: string }> {
  log.debug("REJECT_ALL", "Rejecting all suggestions...");

  try {
    const result = await db.stagingTransaction.updateMany({
      where: { status: "suggested" },
      data: {
        status: "unknown",
        notes: null,
      },
    });

    log.info("REJECT_ALL", `Rejected ${result.count} suggestions`);

    revalidatePath("/staging");
    return { success: true, rejected: result.count };
  } catch (error) {
    log.error("REJECT_ALL", `Failed: ${error instanceof Error ? error.message : "Unknown"}`);
    return { success: false, rejected: 0, error: error instanceof Error ? error.message : "Failed to reject suggestions" };
  }
}

/**
 * Exclude a single staging transaction (mark as skipped)
 */
export async function excludeTransaction(transactionId: number): Promise<{ success: boolean; error?: string }> {
  log.debug("EXCLUDE", `Excluding transaction ${transactionId}`);

  try {
    await db.stagingTransaction.update({
      where: { id: transactionId },
      data: {
        status: "skipped",
      },
    });

    log.info("EXCLUDE", `Excluded transaction ${transactionId}`);

    revalidatePath("/staging");
    return { success: true };
  } catch (error) {
    log.error("EXCLUDE", `Failed to exclude transaction ${transactionId}: ${error instanceof Error ? error.message : "Unknown"}`);
    return { success: false, error: error instanceof Error ? error.message : "Failed to exclude transaction" };
  }
}

/**
 * Move matched staging transactions from a specific import batch to the main Transaction table
 * Skipped transactions are deleted, pending/unknown/suggested are left in staging
 */
export async function importBatchTransactions(importId: number): Promise<{ success: boolean; imported: number; skipped: number; error?: string }> {
  log.debug("IMPORT_BATCH", `Starting import for batch ${importId}...`);

  try {
    // Get matched transactions for this batch only
    const matchedTransactions = await db.stagingTransaction.findMany({
      where: { status: "matched", importId },
    });

    log.debug("IMPORT_BATCH", `Found ${matchedTransactions.length} matched transactions in batch ${importId}`);

    let importedCount = 0;

    // Import each matched transaction
    for (const staging of matchedTransactions) {
      if (!staging.resolvedDate) {
        log.warn("IMPORT_BATCH", `Skipping transaction ${staging.id} - no resolved date`);
        continue;
      }

      // Create the transaction in the main table
      await db.transaction.create({
        data: {
          date: staging.resolvedDate,
          description: staging.rawDescription ?? "",
          originalDescription: staging.rawDescription,
          amount: staging.rawAmount ?? 0,
          accountId: staging.accountId,
          categoryId: staging.categoryId,
          merchantId: staging.merchantId,
          incomeId: staging.incomeId,
          personId: staging.personId,
          importId: staging.importId,
        },
      });

      // Update staging transaction status to imported
      await db.stagingTransaction.update({
        where: { id: staging.id },
        data: { status: "imported" },
      });

      importedCount++;
    }

    // Delete skipped transactions for this batch
    const skippedResult = await db.stagingTransaction.deleteMany({
      where: { status: "skipped", importId },
    });

    // Delete imported transactions from staging for this batch
    await db.stagingTransaction.deleteMany({
      where: { status: "imported", importId },
    });

    // Update import record with counts
    await db.import.update({
      where: { id: importId },
      data: {
        addedCount: { increment: importedCount },
        status: "finalized",
        processedAt: new Date(),
      },
    });

    log.info("IMPORT_BATCH", `Batch ${importId} import complete`, {
      data: { imported: importedCount, skipped: skippedResult.count },
    });

    revalidatePath("/staging");
    revalidatePath("/transactions");

    return { success: true, imported: importedCount, skipped: skippedResult.count };
  } catch (error) {
    log.error("IMPORT_BATCH", `Failed to import batch ${importId}: ${error instanceof Error ? error.message : "Unknown"}`);
    return { success: false, imported: 0, skipped: 0, error: error instanceof Error ? error.message : "Failed to import transactions" };
  }
}

/**
 * Delete an import batch and all its staging transactions
 */
export async function deleteImportBatch(importId: number): Promise<{ success: boolean; error?: string }> {
  log.debug("DELETE_BATCH", `Deleting import batch ${importId}`);

  try {
    // Delete all staging transactions for this import
    const deletedTxns = await db.stagingTransaction.deleteMany({
      where: { importId },
    });

    // Delete the import record
    await db.import.delete({
      where: { id: importId },
    });

    log.info("DELETE_BATCH", `Deleted import ${importId} with ${deletedTxns.count} transactions`);

    revalidatePath("/staging");
    return { success: true };
  } catch (error) {
    log.error("DELETE_BATCH", `Failed to delete import ${importId}: ${error instanceof Error ? error.message : "Unknown"}`);
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete import" };
  }
}

/**
 * Unmatch a staging transaction - returns it to unknown status and clears resolved data
 */
export async function unmatchTransaction(transactionId: number): Promise<{ success: boolean; error?: string }> {
  log.debug("UNMATCH", `Unmatching transaction ${transactionId}`);

  try {
    await db.stagingTransaction.update({
      where: { id: transactionId },
      data: {
        status: "unknown",
        merchantId: null,
        incomeId: null,
        categoryId: null,
        matchConfidence: null,
        notes: null,
      },
    });

    log.info("UNMATCH", `Unmatched transaction ${transactionId}`);

    revalidatePath("/staging");
    return { success: true };
  } catch (error) {
    log.error("UNMATCH", `Failed to unmatch transaction ${transactionId}: ${error instanceof Error ? error.message : "Unknown"}`);
    return { success: false, error: error instanceof Error ? error.message : "Failed to unmatch transaction" };
  }
}

/**
 * Update import batch details (balance and period dates)
 */
export async function updateImportBalance(
  importId: number,
  data: {
    openingBalance: number;
    closingBalance: number;
    periodStart?: string | null;
    periodEnd?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  log.debug("UPDATE_IMPORT", `Updating import ${importId}`);

  try {
    await db.import.update({
      where: { id: importId },
      data: {
        openingBalance: data.openingBalance,
        closingBalance: data.closingBalance,
        periodStart: data.periodStart ? new Date(data.periodStart) : null,
        periodEnd: data.periodEnd ? new Date(data.periodEnd) : null,
      },
    });

    log.info("UPDATE_IMPORT", `Updated import ${importId}`);

    revalidatePath("/staging");
    return { success: true };
  } catch (error) {
    log.error("UPDATE_IMPORT", `Failed to update import ${importId}: ${error instanceof Error ? error.message : "Unknown"}`);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update import" };
  }
}

/**
 * Update a staging transaction (all editable fields)
 */
export async function updateStagingTransaction(
  transactionId: number,
  data: {
    resolvedDate?: string | null;
    merchantId?: number | null;
    incomeId?: number | null;
    categoryId?: number | null;
  }
): Promise<{ success: boolean; error?: string }> {
  log.debug("UPDATE_TXN", `Updating staging transaction ${transactionId}`);

  try {
    // Determine status based on whether we have a merchant or income
    const hasMatch = data.merchantId || data.incomeId;
    const status = hasMatch ? "matched" : "unknown";

    await db.stagingTransaction.update({
      where: { id: transactionId },
      data: {
        resolvedDate: data.resolvedDate ? new Date(data.resolvedDate) : undefined,
        merchantId: data.merchantId,
        incomeId: data.incomeId,
        categoryId: data.categoryId,
        status,
        matchConfidence: hasMatch ? 100 : null, // Manual assignment = 100% confidence
        notes: null, // Clear any AI suggestion notes
      },
    });

    log.info("UPDATE_TXN", `Updated staging transaction ${transactionId}`);

    revalidatePath("/staging");
    return { success: true };
  } catch (error) {
    log.error("UPDATE_TXN", `Failed to update transaction ${transactionId}: ${error instanceof Error ? error.message : "Unknown"}`);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update transaction" };
  }
}

/**
 * Get lookup data for transaction editing (merchants, incomes, categories)
 */
export async function getStagingLookupData(): Promise<{
  merchants: Array<{ id: number; name: string; categoryId: number | null }>;
  incomes: Array<{ id: number; name: string; categoryId: number | null }>;
  categories: Array<{ id: number; name: string; color: string | null; groupName: string; groupColor: string | null }>;
}> {
  const [merchants, incomes, categories] = await Promise.all([
    db.merchant.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, categoryId: true },
    }),
    db.income.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, categoryId: true },
    }),
    db.category.findMany({
      orderBy: [{ groupId: "asc" }, { name: "asc" }],
      include: { group: { select: { name: true, color: true } } },
    }),
  ]);

  return {
    merchants,
    incomes,
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      groupName: c.group?.name ?? "Uncategorized",
      groupColor: c.group?.color ?? null,
    })),
  };
}

/**
 * Move all matched staging transactions to the main Transaction table
 * Skipped transactions are deleted, pending/unknown/suggested are left in staging
 */
export async function importAllTransactions(): Promise<{ success: boolean; imported: number; skipped: number; error?: string }> {
  log.debug("IMPORT_ALL", "Starting import of all matched transactions...");

  try {
    // Get all matched transactions
    const matchedTransactions = await db.stagingTransaction.findMany({
      where: { status: "matched" },
    });

    log.debug("IMPORT_ALL", `Found ${matchedTransactions.length} matched transactions to import`);

    let importedCount = 0;

    // Import each matched transaction
    for (const staging of matchedTransactions) {
      if (!staging.resolvedDate) {
        log.warn("IMPORT_ALL", `Skipping transaction ${staging.id} - no resolved date`);
        continue;
      }

      // Create the transaction in the main table
      await db.transaction.create({
        data: {
          date: staging.resolvedDate,
          description: staging.rawDescription ?? "",
          originalDescription: staging.rawDescription,
          amount: staging.rawAmount ?? 0,
          accountId: staging.accountId,
          categoryId: staging.categoryId,
          merchantId: staging.merchantId,
          incomeId: staging.incomeId,
          personId: staging.personId,
          importId: staging.importId,
        },
      });

      // Update staging transaction status to imported
      await db.stagingTransaction.update({
        where: { id: staging.id },
        data: { status: "imported" },
      });

      importedCount++;
    }

    // Delete skipped transactions
    const skippedResult = await db.stagingTransaction.deleteMany({
      where: { status: "skipped" },
    });

    // Delete imported transactions from staging
    await db.stagingTransaction.deleteMany({
      where: { status: "imported" },
    });

    // Update import records with counts
    const importIds = [...new Set(matchedTransactions.map((t) => t.importId).filter(Boolean))];
    for (const importId of importIds) {
      if (!importId) continue;
      const addedCount = matchedTransactions.filter((t) => t.importId === importId).length;
      await db.import.update({
        where: { id: importId },
        data: {
          addedCount: { increment: addedCount },
          status: "finalized",
          processedAt: new Date(),
        },
      });
    }

    log.info("IMPORT_ALL", `Import complete`, {
      data: { imported: importedCount, skipped: skippedResult.count },
    });

    revalidatePath("/staging");
    revalidatePath("/transactions");

    return { success: true, imported: importedCount, skipped: skippedResult.count };
  } catch (error) {
    log.error("IMPORT_ALL", `Failed to import transactions: ${error instanceof Error ? error.message : "Unknown"}`);
    return { success: false, imported: 0, skipped: 0, error: error instanceof Error ? error.message : "Failed to import transactions" };
  }
}
