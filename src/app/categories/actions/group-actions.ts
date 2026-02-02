"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export async function createCategoryGroup(data: {
  name: string;
  type: string;
  color?: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const maxSortOrder = await db.categoryGroup.aggregate({
      _max: { sortOrder: true },
    });

    await db.categoryGroup.create({
      data: {
        name: data.name,
        type: data.type,
        color: data.color ?? null,
        notes: data.notes ?? null,
        sortOrder: (maxSortOrder._max.sortOrder ?? 0) + 1,
        isActive: true,
      },
    });

    revalidatePath("/categories");
    return { success: true };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { success: false, error: "Group name already exists" };
    }
    return { success: false, error: "Failed to create group" };
  }
}

export async function updateCategoryGroup(
  groupId: number,
  data: {
    name: string;
    type: string;
    color?: string;
    notes?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.categoryGroup.update({
      where: { id: groupId },
      data: {
        name: data.name,
        type: data.type,
        color: data.color ?? null,
        notes: data.notes ?? null,
      },
    });

    revalidatePath("/categories");
    return { success: true };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { success: false, error: "Group name already exists" };
    }
    return { success: false, error: "Failed to update group" };
  }
}

export async function deleteCategoryGroup(
  groupId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.category.deleteMany({
      where: {
        groupId,
        parentId: { not: null },
      },
    });

    await db.category.deleteMany({
      where: { groupId },
    });

    await db.categoryGroup.delete({
      where: { id: groupId },
    });

    revalidatePath("/categories");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete group" };
  }
}

export async function getGroups(): Promise<{ id: number; name: string; type: string }[]> {
  return db.categoryGroup.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, type: true },
  });
}
