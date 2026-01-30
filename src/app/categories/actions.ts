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

export async function toggleCategoryStatus(
  categoryId: number,
  isActive: boolean
): Promise<{ success: boolean }> {
  // Get the category with its parent and siblings info
  const category = await db.category.findUnique({
    where: { id: categoryId },
    include: {
      parentCategory: {
        include: {
          childCategories: true,
        },
      },
      childCategories: true,
    },
  });

  if (!category) {
    return { success: false };
  }

  // Update the category status
  await db.category.update({
    where: { id: categoryId },
    data: { isActive },
  });

  if (isActive) {
    // When activating a child, also activate the parent
    if (category.parentCategoryId) {
      await db.category.update({
        where: { id: category.parentCategoryId },
        data: { isActive: true },
      });
    }
  } else {
    // When deactivating: if this is a child, check if all siblings are now inactive
    if (category.parentCategory) {
      const siblings = category.parentCategory.childCategories;
      const allSiblingsInactive = siblings.every(
        (sibling) => sibling.id === categoryId || !sibling.isActive
      );

      if (allSiblingsInactive) {
        // Deactivate parent if all children are inactive
        await db.category.update({
          where: { id: category.parentCategoryId! },
          data: { isActive: false },
        });
      }
    }

    // When deactivating a parent, also deactivate all children
    if (category.childCategories.length > 0) {
      await db.category.updateMany({
        where: { parentCategoryId: categoryId },
        data: { isActive: false },
      });
    }
  }

  revalidatePath("/categories");
  return { success: true };
}

export async function addChildCategory(
  parentId: number,
  categoryName: string,
  notes?: string,
  confirmClearBudget?: boolean
): Promise<{ success: boolean; error?: string; needsConfirmation?: boolean; parentBudget?: number }> {
  try {
    // Get parent category to inherit group and find next sort order
    const parent = await db.category.findUnique({
      where: { id: parentId },
      include: { childCategories: true },
    });

    if (!parent) {
      return { success: false, error: "Parent category not found" };
    }

    // Check if parent has a budget and no existing children
    const hasNoBudgetConflict = parent.monthlyBudget === null || parent.childCategories.length > 0;

    if (!hasNoBudgetConflict && !confirmClearBudget) {
      return {
        success: false,
        needsConfirmation: true,
        parentBudget: parent.monthlyBudget ?? undefined
      };
    }

    // Calculate next sort order
    const maxSortOrder = parent.childCategories.reduce(
      (max, child) => Math.max(max, child.sortOrder ?? 0),
      0
    );

    // Create child category
    await db.category.create({
      data: {
        categoryName,
        groupId: parent.groupId,
        parentCategoryId: parentId,
        necessityLevel: parent.necessityLevel,
        sortOrder: maxSortOrder + 1,
        isActive: true,
        notes: notes || null,
      },
    });

    // Clear parent budget if confirmed
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
  categoryName: string,
  necessityLevel: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.category.update({
      where: { id: categoryId },
      data: {
        categoryName,
        necessityLevel,
        notes: notes || null,
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
  categoryName: string,
  necessityLevel: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.category.update({
      where: { id: categoryId },
      data: {
        categoryName,
        necessityLevel,
        notes: notes || null,
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
    // Delete children first, then parent
    await db.category.deleteMany({
      where: { parentCategoryId: categoryId },
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
