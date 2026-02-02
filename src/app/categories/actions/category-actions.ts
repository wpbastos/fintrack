"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export async function updateCategoryBudget(
  categoryId: number,
  monthlyBudget: number | null
): Promise<{ success: boolean }> {
  await db.category.update({
    where: { id: categoryId },
    data: { monthlyBudget },
  });

  revalidatePath("/categories");
  return { success: true };
}

export async function toggleCategoryStatus(
  categoryId: number,
  isActive: boolean
): Promise<{ success: boolean }> {
  const category = await db.category.findUnique({
    where: { id: categoryId },
    include: {
      parent: {
        include: {
          children: true,
        },
      },
      children: true,
    },
  });

  if (!category) {
    return { success: false };
  }

  await db.category.update({
    where: { id: categoryId },
    data: { isActive },
  });

  if (isActive) {
    if (category.parentId) {
      await db.category.update({
        where: { id: category.parentId },
        data: { isActive: true },
      });
    }
  } else {
    if (category.parent) {
      const siblings = category.parent.children;
      const allSiblingsInactive = siblings.every(
        (sibling) => sibling.id === categoryId || !sibling.isActive
      );

      if (allSiblingsInactive) {
        await db.category.update({
          where: { id: category.parentId! },
          data: { isActive: false },
        });
      }
    }

    if (category.children.length > 0) {
      await db.category.updateMany({
        where: { parentId: categoryId },
        data: { isActive: false },
      });
    }
  }

  revalidatePath("/categories");
  return { success: true };
}

export async function createCategory(data: {
  name: string;
  groupId: number;
  necessityLevel: string;
  monthlyBudget?: number;
  color?: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const maxSortOrder = await db.category.aggregate({
      where: { groupId: data.groupId, parentId: null },
      _max: { sortOrder: true },
    });

    await db.category.create({
      data: {
        name: data.name,
        groupId: data.groupId,
        necessityLevel: data.necessityLevel,
        monthlyBudget: data.monthlyBudget ?? null,
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
      return { success: false, error: "Category name already exists" };
    }
    return { success: false, error: "Failed to create category" };
  }
}

export async function addChildCategory(
  parentId: number,
  name: string,
  notes?: string,
  confirmClearBudget?: boolean
): Promise<{ success: boolean; error?: string; needsConfirmation?: boolean; parentBudget?: number }> {
  try {
    const parent = await db.category.findUnique({
      where: { id: parentId },
      include: { children: true },
    });

    if (!parent) {
      return { success: false, error: "Parent category not found" };
    }

    const hasNoBudgetConflict = parent.monthlyBudget === null || parent.children.length > 0;

    if (!hasNoBudgetConflict && !confirmClearBudget) {
      return {
        success: false,
        needsConfirmation: true,
        parentBudget: parent.monthlyBudget ?? undefined
      };
    }

    const maxSortOrder = parent.children.reduce(
      (max, child) => Math.max(max, child.sortOrder ?? 0),
      0
    );

    await db.category.create({
      data: {
        name,
        groupId: parent.groupId,
        parentId: parentId,
        necessityLevel: parent.necessityLevel,
        sortOrder: maxSortOrder + 1,
        isActive: true,
        notes: notes || null,
      },
    });

    if (confirmClearBudget && parent.monthlyBudget !== null) {
      await db.category.update({
        where: { id: parentId },
        data: { monthlyBudget: null },
      });
    }

    revalidatePath("/categories");
    return { success: true };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { success: false, error: "Category name already exists" };
    }
    return { success: false, error: "Failed to create category" };
  }
}

export async function updateChildCategory(
  categoryId: number,
  name: string,
  necessityLevel: string,
  notes?: string,
  color?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.category.update({
      where: { id: categoryId },
      data: {
        name,
        necessityLevel,
        notes: notes || null,
        color: color || null,
      },
    });

    revalidatePath("/categories");
    return { success: true };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { success: false, error: "Category name already exists" };
    }
    return { success: false, error: "Failed to update category" };
  }
}

export async function deleteChildCategory(
  categoryId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.category.delete({
      where: { id: categoryId },
    });

    revalidatePath("/categories");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete category" };
  }
}

export async function updateParentCategory(
  categoryId: number,
  name: string,
  necessityLevel: string,
  notes?: string,
  color?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.category.update({
      where: { id: categoryId },
      data: {
        name,
        necessityLevel,
        notes: notes || null,
        color: color || null,
      },
    });

    revalidatePath("/categories");
    return { success: true };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { success: false, error: "Category name already exists" };
    }
    return { success: false, error: "Failed to update category" };
  }
}

export async function deleteParentCategory(
  categoryId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.category.deleteMany({
      where: { parentId: categoryId },
    });

    await db.category.delete({
      where: { id: categoryId },
    });

    revalidatePath("/categories");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete category" };
  }
}

export async function disableAllInGroup(
  groupId: number
): Promise<{ success: boolean; count: number }> {
  const result = await db.category.updateMany({
    where: { groupId, isActive: true },
    data: { isActive: false },
  });

  revalidatePath("/categories");
  return { success: true, count: result.count };
}

export async function enableAllInGroup(
  groupId: number
): Promise<{ success: boolean; count: number }> {
  const result = await db.category.updateMany({
    where: { groupId, isActive: false },
    data: { isActive: true },
  });

  revalidatePath("/categories");
  return { success: true, count: result.count };
}
