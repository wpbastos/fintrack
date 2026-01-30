"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export async function createMerchant(data: {
  merchantName: string;
  merchantType?: string;
  defaultCategoryId?: number;
  website?: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string; merchant?: { id: number } }> {
  try {
    const merchant = await db.merchant.create({
      data: {
        merchantName: data.merchantName,
        merchantType: data.merchantType || null,
        defaultCategoryId: data.defaultCategoryId || null,
        website: data.website || null,
        notes: data.notes || null,
        isActive: true,
      },
    });

    revalidatePath("/merchants");
    return { success: true, merchant: { id: merchant.id } };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { success: false, error: "Merchant with this name already exists" };
    }
    return { success: false, error: "Failed to create merchant" };
  }
}

export async function updateMerchant(
  merchantId: number,
  data: {
    merchantName?: string;
    merchantType?: string | null;
    defaultCategoryId?: number | null;
    website?: string | null;
    notes?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.merchant.update({
      where: { id: merchantId },
      data,
    });

    revalidatePath("/merchants");
    return { success: true };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { success: false, error: "Merchant with this name already exists" };
    }
    return { success: false, error: "Failed to update merchant" };
  }
}

export async function toggleMerchantStatus(
  merchantId: number,
  isActive: boolean
): Promise<{ success: boolean }> {
  await db.merchant.update({
    where: { id: merchantId },
    data: { isActive },
  });

  revalidatePath("/merchants");
  return { success: true };
}

export async function deleteMerchant(
  merchantId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const transactionCount = await db.transaction.count({
      where: { merchantId },
    });

    if (transactionCount > 0) {
      return {
        success: false,
        error: `Cannot delete: ${transactionCount} transaction(s) linked to this merchant`,
      };
    }

    await db.merchantPattern.deleteMany({
      where: { merchantId },
    });

    await db.merchant.delete({
      where: { id: merchantId },
    });

    revalidatePath("/merchants");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete merchant" };
  }
}

export async function enableAllMerchants(): Promise<{ success: boolean }> {
  await db.merchant.updateMany({
    where: { isActive: false },
    data: { isActive: true },
  });

  revalidatePath("/merchants");
  return { success: true };
}

export async function disableAllMerchants(): Promise<{ success: boolean }> {
  await db.merchant.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });

  revalidatePath("/merchants");
  return { success: true };
}

export async function getCategories(): Promise<{ id: number; categoryName: string; groupName: string }[]> {
  const categories = await db.category.findMany({
    where: { isActive: true },
    orderBy: { categoryName: "asc" },
    include: {
      group: true,
    },
  });

  return categories.map((c) => ({
    id: c.id,
    categoryName: c.categoryName,
    groupName: c.group?.groupName || "Uncategorized",
  }));
}
