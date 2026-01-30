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
    const transactionCount = await db.transaction.count({
      where: { incomeSourceId },
    });

    if (transactionCount > 0) {
      return {
        success: false,
        error: `Cannot delete: ${transactionCount} transaction(s) linked to this income source`,
      };
    }

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
