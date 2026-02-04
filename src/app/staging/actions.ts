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
  // Get transactions that need resolution (pending or unknown)
  const transactions = await db.stagingTransaction.findMany({
    where: {
      status: { in: ["pending", "unknown"] },
    },
  });

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

  if (transactions.length > 0) {
    log.info("RESOLVE", `${transactions.length} txns: ${merchantsResolved} merchants, ${incomesResolved} incomes, ${transactions.length - fullyResolved} unresolved`);
  }

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
 * Internal: Approve an AI suggestion without re-resolving other transactions
 * Used by approveAllSuggestions for batch processing
 */
async function approveSuggestionInternal(transactionId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const txn = await db.stagingTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!txn || txn.status !== "suggested" || !txn.notes) {
      return { success: false, error: "Transaction not found or not in suggested status" };
    }

    const suggestion: ClaudeSuggestion = JSON.parse(txn.notes);

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
            isEmploymentIncome = category?.group?.name === "Employment Income";
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

    await db.stagingTransaction.update({
      where: { id: transactionId },
      data: {
        merchantId,
        incomeId,
        categoryId,
        status: "matched",
        matchConfidence: suggestion.confidence === "high" ? 90 : suggestion.confidence === "medium" ? 70 : 50,
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
            log.info("PATTERN", `"${suggestion.suggestedPattern}" -> ${suggestion.existingName}`);
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
          log.info("CREATE", `Merchant: ${suggestion.newEntity.name}`);
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
          log.info("PATTERN", `"${suggestion.newEntity.pattern}" -> ${suggestion.newEntity.name}`);
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
            log.info("PATTERN", `"${suggestion.suggestedPattern}" -> ${suggestion.existingName}`);
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
              log.info("CREATE", `Employer: ${suggestion.newEntity.employerName}`);
            } else {
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
            }
            positionId = position.id;
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
          log.info("CREATE", `Income: ${suggestion.newEntity.name}`);
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
          log.info("PATTERN", `"${suggestion.newEntity.pattern}" -> ${suggestion.newEntity.name}`);
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

    // Re-resolve ALL unresolved transactions across ALL batches
    // This catches transactions that now match the newly created/linked merchant/income
    const allUnresolved = await db.stagingTransaction.findMany({
      where: {
        id: { not: transactionId }, // Exclude the one we just approved
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
            notes: null, // Clear any AI suggestion
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
      // Use internal approval without re-resolve (we'll do one at the end)
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

/**
 * Exclude a single staging transaction (mark as skipped)
 */
export async function excludeTransaction(transactionId: number): Promise<{ success: boolean; error?: string }> {
  try {
    await db.stagingTransaction.update({
      where: { id: transactionId },
      data: {
        status: "skipped",
      },
    });

    revalidatePath("/staging");
    return { success: true };
  } catch (error) {
    log.error("EXCLUDE", error instanceof Error ? error.message : "Unknown");
    return { success: false, error: error instanceof Error ? error.message : "Failed to exclude transaction" };
  }
}

/**
 * Move matched staging transactions from a specific import batch to the main Transaction table
 * Skipped transactions are deleted, pending/unknown/suggested are left in staging
 */
export async function importBatchTransactions(importId: number): Promise<{ success: boolean; imported: number; skipped: number; error?: string }> {
  try {
    // Get matched transactions for this batch only
    const matchedTransactions = await db.stagingTransaction.findMany({
      where: { status: "matched", importId },
    });

    let importedCount = 0;

    // Import each matched transaction
    for (const staging of matchedTransactions) {
      if (!staging.resolvedDate) {
        continue;
      }

      // Create the transaction in the main table (including optional metadata)
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
          // Optional metadata preserved from extraction
          postingDate: staging.postingDate,
          cardNumber: staging.cardNumber,
          location: staging.location,
          foreignCurrency: staging.foreignCurrency,
          runningBalance: staging.runningBalance,
          transactionType: staging.transactionType,
          referenceNumber: staging.referenceNumber,
          terminalId: staging.terminalId,
          targetAccount: staging.targetAccount,
          sourceAccount: staging.sourceAccount,
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

    log.info("IMPORT", `Batch ${importId}: ${importedCount} imported, ${skippedResult.count} skipped`);

    revalidatePath("/staging");
    revalidatePath("/transactions");

    return { success: true, imported: importedCount, skipped: skippedResult.count };
  } catch (error) {
    log.error("IMPORT", error instanceof Error ? error.message : "Unknown");
    return { success: false, imported: 0, skipped: 0, error: error instanceof Error ? error.message : "Failed to import transactions" };
  }
}

/**
 * Delete an import batch and all its staging transactions
 */
export async function deleteImportBatch(importId: number): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete all staging transactions for this import
    const deletedTxns = await db.stagingTransaction.deleteMany({
      where: { importId },
    });

    // Delete the import record
    await db.import.delete({
      where: { id: importId },
    });

    log.info("DELETE", `Batch ${importId}: ${deletedTxns.count} transactions removed`);

    revalidatePath("/staging");
    return { success: true };
  } catch (error) {
    log.error("DELETE", error instanceof Error ? error.message : "Unknown");
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete import" };
  }
}

/**
 * Unmatch a staging transaction - returns it to unknown status and clears resolved data
 */
export async function unmatchTransaction(transactionId: number): Promise<{ success: boolean; error?: string }> {
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

    revalidatePath("/staging");
    return { success: true };
  } catch (error) {
    log.error("UNMATCH", error instanceof Error ? error.message : "Unknown");
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

    revalidatePath("/staging");
    return { success: true };
  } catch (error) {
    log.error("UPDATE", error instanceof Error ? error.message : "Unknown");
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

    revalidatePath("/staging");
    return { success: true };
  } catch (error) {
    log.error("UPDATE", error instanceof Error ? error.message : "Unknown");
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
  try {
    // Get all matched transactions
    const matchedTransactions = await db.stagingTransaction.findMany({
      where: { status: "matched" },
    });

    let importedCount = 0;

    // Import each matched transaction
    for (const staging of matchedTransactions) {
      if (!staging.resolvedDate) {
        continue;
      }

      // Create the transaction in the main table (including optional metadata)
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
          // Optional metadata preserved from extraction
          postingDate: staging.postingDate,
          cardNumber: staging.cardNumber,
          location: staging.location,
          foreignCurrency: staging.foreignCurrency,
          runningBalance: staging.runningBalance,
          transactionType: staging.transactionType,
          referenceNumber: staging.referenceNumber,
          terminalId: staging.terminalId,
          targetAccount: staging.targetAccount,
          sourceAccount: staging.sourceAccount,
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

    log.info("IMPORT", `All batches: ${importedCount} imported, ${skippedResult.count} skipped`);

    revalidatePath("/staging");
    revalidatePath("/transactions");

    return { success: true, imported: importedCount, skipped: skippedResult.count };
  } catch (error) {
    log.error("IMPORT", error instanceof Error ? error.message : "Unknown");
    return { success: false, imported: 0, skipped: 0, error: error instanceof Error ? error.message : "Failed to import transactions" };
  }
}
