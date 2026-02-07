"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

// Get salary increase threshold from env (default 5%)
const SALARY_INCREASE_THRESHOLD = parseFloat(process.env.SALARY_INCREASE_THRESHOLD || "5");

export interface AddPayslipResult {
  success: boolean;
  error?: string;
  suggestNewPosition?: boolean;
  increasePercent?: number;
}

export async function addPayslip(
  incomeId: number,
  data: {
    effectiveDate: Date;
    newGross: number;
    newNet: number;
    changeReason: string;
    notes?: string;
  }
): Promise<AddPayslipResult> {
  try {
    // Get income with category info to check if it's employment income
    const income = await db.income.findUnique({
      where: { id: incomeId },
      select: {
        currentGross: true,
        currentNet: true,
        positionId: true,
        category: {
          select: {
            name: true,
            group: { select: { name: true } },
          },
        },
      },
    });

    // Check if this is a Salary category in Earned Income group
    const isSalary =
      income?.category?.group?.name === "Earned Income" &&
      income?.category?.name === "Salary";

    // Calculate increase percentage
    let increasePercent = 0;
    let suggestNewPosition = false;

    if (income?.currentGross && income.currentGross > 0) {
      increasePercent = ((data.newGross - income.currentGross) / income.currentGross) * 100;

      // Only suggest new position for Salary income with significant increase
      if (isSalary && income.positionId && increasePercent > SALARY_INCREASE_THRESHOLD) {
        suggestNewPosition = true;
      }
    }

    await db.payslip.create({
      data: {
        incomeId,
        effectiveDate: data.effectiveDate,
        previousGross: income?.currentGross,
        previousNet: income?.currentNet,
        newGross: data.newGross,
        newNet: data.newNet,
        changeReason: data.changeReason,
        notes: data.notes || null,
      },
    });

    await db.income.update({
      where: { id: incomeId },
      data: {
        currentGross: data.newGross,
        currentNet: data.newNet,
      },
    });

    revalidatePath("/income");
    return {
      success: true,
      suggestNewPosition,
      increasePercent: Math.round(increasePercent * 10) / 10,
    };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { success: false, error: "An payslip already exists for this date" };
    }
    return { success: false, error: "Failed to add payslip" };
  }
}

export async function deletePayslip(
  payslipId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const payslip = await db.payslip.findUnique({
      where: { id: payslipId },
      select: { incomeId: true },
    });

    if (!payslip) {
      return { success: false, error: "Income change not found" };
    }

    await db.payslip.delete({
      where: { id: payslipId },
    });

    const latestChange = await db.payslip.findFirst({
      where: { incomeId: payslip.incomeId },
      orderBy: { effectiveDate: "desc" },
    });

    await db.income.update({
      where: { id: payslip.incomeId },
      data: {
        currentGross: latestChange?.newGross || null,
        currentNet: latestChange?.newNet || null,
      },
    });

    revalidatePath("/income");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete payslip" };
  }
}

export async function getIncomeHistory(
  incomeId: number
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
  const history = await db.payslip.findMany({
    where: { incomeId },
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
