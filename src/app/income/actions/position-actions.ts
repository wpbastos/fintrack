"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export async function createPosition(data: {
  title: string;
  department?: string;
  employerId: number;
  startDate?: Date;
  endDate?: Date;
  notes?: string;
}): Promise<{ success: boolean; error?: string; position?: { id: number } }> {
  try {
    const position = await db.position.create({
      data: {
        title: data.title,
        department: data.department || null,
        employerId: data.employerId,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        notes: data.notes || null,
      },
    });

    // Enable the employer when first position is created
    await db.employer.update({
      where: { id: data.employerId },
      data: { isActive: true },
    });

    revalidatePath("/income");
    return { success: true, position: { id: position.id } };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { success: false, error: "Position with this title already exists for this employer" };
    }
    return { success: false, error: "Failed to create position" };
  }
}

export async function updatePosition(
  positionId: number,
  data: {
    title?: string;
    department?: string | null;
    employerId?: number;
    startDate?: Date | null;
    endDate?: Date | null;
    notes?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: Parameters<typeof db.position.update>[0]["data"] = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.employerId !== undefined) updateData.employerId = data.employerId;
    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.endDate !== undefined) updateData.endDate = data.endDate;
    if (data.notes !== undefined) updateData.notes = data.notes;

    await db.position.update({
      where: { id: positionId },
      data: updateData,
    });

    revalidatePath("/income");
    return { success: true };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { success: false, error: "Position with this title already exists for this employer" };
    }
    return { success: false, error: "Failed to update position" };
  }
}

export async function togglePositionStatus(
  positionId: number,
  isActive: boolean
): Promise<{ success: boolean }> {
  await db.position.update({
    where: { id: positionId },
    data: { isActive },
  });

  revalidatePath("/income");
  return { success: true };
}

export async function deletePosition(
  positionId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if any income sources are linked
    const incomeCount = await db.income.count({
      where: { positionId },
    });

    if (incomeCount > 0) {
      return {
        success: false,
        error: `Cannot delete: ${incomeCount} income source(s) linked to this position`,
      };
    }

    await db.position.delete({
      where: { id: positionId },
    });

    revalidatePath("/income");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete position" };
  }
}

export async function getPositionsByEmployer(
  employerId: number
): Promise<{
  id: number;
  title: string;
  department: string | null;
  startDate: Date | null;
  endDate: Date | null;
  isActive: boolean;
  _count: { incomes: number };
}[]> {
  const positions = await db.position.findMany({
    where: { employerId },
    orderBy: { title: "asc" },
    include: {
      _count: {
        select: { incomes: true },
      },
    },
  });

  return positions.map((p) => ({
    id: p.id,
    title: p.title,
    department: p.department,
    startDate: p.startDate,
    endDate: p.endDate,
    isActive: p.isActive,
    _count: p._count,
  }));
}
