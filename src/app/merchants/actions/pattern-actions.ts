"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export async function addPattern(
  merchantId: number,
  pattern: string,
  priority?: number,
  notes?: string
): Promise<{ success: boolean; error?: string; pattern?: { id: number } }> {
  try {
    const created = await db.merchantPattern.create({
      data: {
        merchantId,
        pattern: pattern.toUpperCase().trim(),
        priority: priority ?? 10,
        notes: notes || null,
      },
    });

    revalidatePath("/merchants");
    return { success: true, pattern: { id: created.id } };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { success: false, error: "This pattern already exists" };
    }
    return { success: false, error: "Failed to add pattern" };
  }
}

export async function updatePattern(
  patternId: number,
  data: {
    pattern?: string;
    priority?: number;
    notes?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.merchantPattern.update({
      where: { id: patternId },
      data: {
        pattern: data.pattern?.toUpperCase().trim(),
        priority: data.priority,
        notes: data.notes,
      },
    });

    revalidatePath("/merchants");
    return { success: true };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { success: false, error: "This pattern already exists" };
    }
    return { success: false, error: "Failed to update pattern" };
  }
}

export async function deletePattern(
  patternId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.merchantPattern.delete({
      where: { id: patternId },
    });

    revalidatePath("/merchants");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete pattern" };
  }
}

export async function getPatterns(
  merchantId: number
): Promise<{ id: number; pattern: string; priority: number; notes: string | null }[]> {
  const patterns = await db.merchantPattern.findMany({
    where: { merchantId },
    orderBy: { priority: "desc" },
  });

  return patterns.map((p) => ({
    id: p.id,
    pattern: p.pattern,
    priority: p.priority,
    notes: p.notes,
  }));
}
