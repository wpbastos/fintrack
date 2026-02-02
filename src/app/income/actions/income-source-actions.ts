"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export async function createIncome(data: {
  name: string;
  type?: string;
  positionId?: number;
  personId?: number;
  categoryId?: number;
  depositAccountId?: number;
  payFrequency?: string;
  startDate?: Date;
  currentGross?: number;
  currentNet?: number;
  notes?: string;
}): Promise<{ success: boolean; error?: string; income?: { id: number } }> {
  try {
    const income = await db.income.create({
      data: {
        name: data.name,
        type: data.type || "Employment",
        positionId: data.positionId || null,
        personId: data.personId || null,
        categoryId: data.categoryId || null,
        depositAccountId: data.depositAccountId || null,
        payFrequency: data.payFrequency || null,
        startDate: data.startDate || null,
        initialGross: data.currentGross || null,
        initialNet: data.currentNet || null,
        currentGross: data.currentGross || null,
        currentNet: data.currentNet || null,
        isActive: true,
        notes: data.notes || null,
      },
    });

    if (data.currentGross && data.currentNet) {
      await db.payslip.create({
        data: {
          incomeId: income.id,
          effectiveDate: data.startDate || new Date(),
          newGross: data.currentGross,
          newNet: data.currentNet,
          changeReason: "Initial",
        },
      });
    }

    revalidatePath("/income");
    return { success: true, income: { id: income.id } };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { success: false, error: "Income source with this name already exists" };
    }
    return { success: false, error: "Failed to create income source" };
  }
}

export async function updateIncome(
  incomeId: number,
  data: {
    name?: string;
    type?: string | null;
    positionId?: number | null;
    personId?: number | null;
    categoryId?: number | null;
    depositAccountId?: number | null;
    payFrequency?: string | null;
    startDate?: Date | null;
    endDate?: Date | null;
    currentGross?: number | null;
    currentNet?: number | null;
    notes?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Build update data, only including fields that are provided
    const updateData: Parameters<typeof db.income.update>[0]["data"] = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type ?? undefined;
    if (data.positionId !== undefined) updateData.positionId = data.positionId;
    if (data.personId !== undefined) updateData.personId = data.personId;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.depositAccountId !== undefined) updateData.depositAccountId = data.depositAccountId;
    if (data.payFrequency !== undefined) updateData.payFrequency = data.payFrequency;
    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.endDate !== undefined) updateData.endDate = data.endDate;
    if (data.currentGross !== undefined) updateData.currentGross = data.currentGross;
    if (data.currentNet !== undefined) updateData.currentNet = data.currentNet;
    if (data.notes !== undefined) updateData.notes = data.notes;

    await db.income.update({
      where: { id: incomeId },
      data: updateData,
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

export async function toggleIncomeStatus(
  incomeId: number,
  isActive: boolean
): Promise<{ success: boolean }> {
  await db.income.update({
    where: { id: incomeId },
    data: { isActive },
  });

  revalidatePath("/income");
  return { success: true };
}

export async function deleteIncome(
  incomeId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const transactionCount = await db.transaction.count({
      where: { incomeId },
    });

    if (transactionCount > 0) {
      return {
        success: false,
        error: `Cannot delete: ${transactionCount} transaction(s) linked to this income source`,
      };
    }

    await db.incomePattern.deleteMany({
      where: { incomeId },
    });
    await db.payslip.deleteMany({
      where: { incomeId },
    });

    await db.income.delete({
      where: { id: incomeId },
    });

    revalidatePath("/income");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete income source" };
  }
}

export async function enableAllIncomes(): Promise<{ success: boolean }> {
  await db.income.updateMany({
    where: { isActive: false },
    data: { isActive: true },
  });

  revalidatePath("/income");
  return { success: true };
}

export async function disableAllIncomes(): Promise<{ success: boolean }> {
  await db.income.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });

  revalidatePath("/income");
  return { success: true };
}
