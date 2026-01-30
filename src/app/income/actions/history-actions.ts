"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

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
