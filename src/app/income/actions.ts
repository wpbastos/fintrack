"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export async function createIncomeSource(data: {
  sourceName: string;
  personId?: number;
  defaultCategoryId?: number;
  depositAccountId?: number;
  payFrequency?: string;
  position?: string;
  industry?: string;
  location?: string;
  website?: string;
  startDate?: Date;
  currentGross?: number;
  currentNet?: number;
  notes?: string;
}): Promise<{ success: boolean; error?: string; incomeSource?: { id: number } }> {
  try {
    const incomeSource = await db.incomeSource.create({
      data: {
        sourceName: data.sourceName,
        personId: data.personId || null,
        defaultCategoryId: data.defaultCategoryId || null,
        depositAccountId: data.depositAccountId || null,
        payFrequency: data.payFrequency || null,
        position: data.position || null,
        industry: data.industry || null,
        location: data.location || null,
        website: data.website || null,
        startDate: data.startDate || null,
        currentGross: data.currentGross || null,
        currentNet: data.currentNet || null,
        isActive: true,
        notes: data.notes || null,
      },
    });

    // If amounts provided, create initial income record
    if (data.currentGross && data.currentNet) {
      await db.incomeChange.create({
        data: {
          incomeSourceId: incomeSource.id,
          effectiveDate: data.startDate || new Date(),
          newGross: data.currentGross,
          newNet: data.currentNet,
          changeReason: "Initial",
        },
      });
    }

    revalidatePath("/income");
    return { success: true, incomeSource: { id: incomeSource.id } };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { success: false, error: "Income source with this name already exists" };
    }
    return { success: false, error: "Failed to create income source" };
  }
}

export async function updateIncomeSource(
  incomeSourceId: number,
  data: {
    sourceName?: string;
    personId?: number | null;
    defaultCategoryId?: number | null;
    depositAccountId?: number | null;
    payFrequency?: string | null;
    position?: string | null;
    industry?: string | null;
    location?: string | null;
    website?: string | null;
    startDate?: Date | null;
    endDate?: Date | null;
    currentGross?: number | null;
    currentNet?: number | null;
    notes?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.incomeSource.update({
      where: { id: incomeSourceId },
      data,
    });

    revalidatePath("/income");
    return { success: true };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { success: false, error: "Income source with this name already exists" };
    }
    return { success: false, error: "Failed to update income source" };
  }
}

export async function toggleIncomeSourceStatus(
  incomeSourceId: number,
  isActive: boolean
): Promise<{ success: boolean }> {
  await db.incomeSource.update({
    where: { id: incomeSourceId },
    data: { isActive },
  });

  revalidatePath("/income");
  return { success: true };
}

export async function deleteIncomeSource(
  incomeSourceId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if income source has transactions
    const transactionCount = await db.transaction.count({
      where: { incomeSourceId },
    });

    if (transactionCount > 0) {
      return {
        success: false,
        error: `Cannot delete: ${transactionCount} transaction(s) linked to this income source`,
      };
    }

    // Delete patterns and income history first (cascade should handle this)
    await db.incomeSourcePattern.deleteMany({
      where: { incomeSourceId },
    });
    await db.incomeChange.deleteMany({
      where: { incomeSourceId },
    });

    await db.incomeSource.delete({
      where: { id: incomeSourceId },
    });

    revalidatePath("/income");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete income source" };
  }
}

export async function enableAllIncomeSources(): Promise<{ success: boolean }> {
  await db.incomeSource.updateMany({
    where: { isActive: false },
    data: { isActive: true },
  });

  revalidatePath("/income");
  return { success: true };
}

export async function disableAllIncomeSources(): Promise<{ success: boolean }> {
  await db.incomeSource.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });

  revalidatePath("/income");
  return { success: true };
}

// Pattern actions
export async function addIncomeSourcePattern(
  incomeSourceId: number,
  pattern: string,
  priority?: number,
  notes?: string
): Promise<{ success: boolean; error?: string; pattern?: { id: number } }> {
  try {
    const created = await db.incomeSourcePattern.create({
      data: {
        incomeSourceId,
        pattern: pattern.toUpperCase().trim(),
        priority: priority ?? 10,
        notes: notes || null,
      },
    });

    revalidatePath("/income");
    return { success: true, pattern: { id: created.id } };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { success: false, error: "This pattern already exists" };
    }
    return { success: false, error: "Failed to add pattern" };
  }
}

export async function updateIncomeSourcePattern(
  patternId: number,
  data: {
    pattern?: string;
    priority?: number;
    notes?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.incomeSourcePattern.update({
      where: { id: patternId },
      data: {
        pattern: data.pattern?.toUpperCase().trim(),
        priority: data.priority,
        notes: data.notes,
      },
    });

    revalidatePath("/income");
    return { success: true };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { success: false, error: "This pattern already exists" };
    }
    return { success: false, error: "Failed to update pattern" };
  }
}

export async function deleteIncomeSourcePattern(
  patternId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.incomeSourcePattern.delete({
      where: { id: patternId },
    });

    revalidatePath("/income");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete pattern" };
  }
}

export async function getIncomeSourcePatterns(
  incomeSourceId: number
): Promise<{ id: number; pattern: string; priority: number; notes: string | null }[]> {
  const patterns = await db.incomeSourcePattern.findMany({
    where: { incomeSourceId },
    orderBy: { priority: "desc" },
  });

  return patterns.map((p) => ({
    id: p.id,
    pattern: p.pattern,
    priority: p.priority,
    notes: p.notes,
  }));
}

// Income history actions
export async function addIncomeChange(
  incomeSourceId: number,
  data: {
    effectiveDate: Date;
    newGross: number;
    newNet: number;
    changeReason: string;
    notes?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current amounts to record as previous
    const incomeSource = await db.incomeSource.findUnique({
      where: { id: incomeSourceId },
      select: { currentGross: true, currentNet: true },
    });

    await db.incomeChange.create({
      data: {
        incomeSourceId,
        effectiveDate: data.effectiveDate,
        previousGross: incomeSource?.currentGross,
        previousNet: incomeSource?.currentNet,
        newGross: data.newGross,
        newNet: data.newNet,
        changeReason: data.changeReason,
        notes: data.notes || null,
      },
    });

    // Update income source's current amounts
    await db.incomeSource.update({
      where: { id: incomeSourceId },
      data: {
        currentGross: data.newGross,
        currentNet: data.newNet,
      },
    });

    revalidatePath("/income");
    return { success: true };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { success: false, error: "An income change already exists for this date" };
    }
    return { success: false, error: "Failed to add income change" };
  }
}

export async function deleteIncomeChange(
  incomeChangeId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the income change to find income source
    const incomeChange = await db.incomeChange.findUnique({
      where: { id: incomeChangeId },
      select: { incomeSourceId: true },
    });

    if (!incomeChange) {
      return { success: false, error: "Income change not found" };
    }

    await db.incomeChange.delete({
      where: { id: incomeChangeId },
    });

    // Recalculate current amounts from most recent change
    const latestChange = await db.incomeChange.findFirst({
      where: { incomeSourceId: incomeChange.incomeSourceId },
      orderBy: { effectiveDate: "desc" },
    });

    await db.incomeSource.update({
      where: { id: incomeChange.incomeSourceId },
      data: {
        currentGross: latestChange?.newGross || null,
        currentNet: latestChange?.newNet || null,
      },
    });

    revalidatePath("/income");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete income change" };
  }
}

export async function getIncomeHistory(
  incomeSourceId: number
): Promise<{
  id: number;
  effectiveDate: Date;
  previousGross: number | null;
  previousNet: number | null;
  newGross: number;
  newNet: number;
  changeReason: string;
  notes: string | null;
}[]> {
  const history = await db.incomeChange.findMany({
    where: { incomeSourceId },
    orderBy: { effectiveDate: "desc" },
  });

  return history.map((h) => ({
    id: h.id,
    effectiveDate: h.effectiveDate,
    previousGross: h.previousGross,
    previousNet: h.previousNet,
    newGross: h.newGross,
    newNet: h.newNet,
    changeReason: h.changeReason,
    notes: h.notes,
  }));
}

// Lookup data
export async function getPersons(): Promise<{ id: number; name: string }[]> {
  const persons = await db.person.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return persons.map((p) => ({
    id: p.id,
    name: p.name,
  }));
}

export async function getIncomeCategories(): Promise<{ id: number; categoryName: string; groupName: string }[]> {
  const categories = await db.category.findMany({
    where: {
      isActive: true,
      group: { groupType: "Income" },
    },
    orderBy: { categoryName: "asc" },
    include: { group: true },
  });

  return categories.map((c) => ({
    id: c.id,
    categoryName: c.categoryName,
    groupName: c.group?.groupName || "Uncategorized",
  }));
}

export async function getAccounts(): Promise<{ id: number; accountName: string; institutionName: string | null }[]> {
  const accounts = await db.account.findMany({
    where: { isActive: true },
    orderBy: { accountName: "asc" },
    include: { institution: true },
  });

  return accounts.map((a) => ({
    id: a.id,
    accountName: a.accountName,
    institutionName: a.institution?.institutionName || null,
  }));
}
