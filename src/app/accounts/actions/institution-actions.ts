"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export async function searchInstitutions(
  query: string
): Promise<{ id: number; name: string; type: string; isActive: boolean }[]> {
  if (query.length < 1) return [];

  const institutions = await db.institution.findMany({
    where: {
      OR: [
        { name: { contains: query } },
        { notes: { contains: query } },
      ],
    },
    orderBy: { name: "asc" },
    take: 10,
    select: {
      id: true,
      name: true,
      type: true,
      isActive: true,
    },
  });

  return institutions;
}

export async function createInstitution(data: {
  name: string;
  type: string;
  website?: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await db.institution.create({
      data: {
        name: data.name,
        type: data.type,
        website: data.website || null,
        notes: data.notes || null,
        isActive: true,
      },
    });

    revalidatePath("/accounts");
    return { success: true };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { success: false, error: "Institution with this name already exists" };
    }
    return { success: false, error: "Failed to create institution" };
  }
}

export async function updateInstitution(
  institutionId: number,
  data: {
    name?: string;
    type?: string;
    website?: string | null;
    notes?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.institution.update({
      where: { id: institutionId },
      data,
    });

    revalidatePath("/accounts");
    return { success: true };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { success: false, error: "Institution with this name already exists" };
    }
    return { success: false, error: "Failed to update institution" };
  }
}

export async function toggleInstitutionStatus(
  institutionId: number,
  isActive: boolean
): Promise<{ success: boolean }> {
  await db.institution.update({
    where: { id: institutionId },
    data: { isActive },
  });

  if (!isActive) {
    await db.account.updateMany({
      where: { institutionId },
      data: { isActive: false },
    });
  }

  revalidatePath("/accounts");
  return { success: true };
}

export async function deleteInstitution(
  institutionId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const accountCount = await db.account.count({
      where: { institutionId },
    });

    if (accountCount > 0) {
      return {
        success: false,
        error: `Cannot delete: ${accountCount} account(s) linked to this institution`,
      };
    }

    await db.institution.delete({
      where: { id: institutionId },
    });

    revalidatePath("/accounts");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete institution" };
  }
}

export async function enableAllInstitutionsByType(
  type: string
): Promise<{ success: boolean }> {
  await db.institution.updateMany({
    where: { type },
    data: { isActive: true },
  });

  revalidatePath("/accounts");
  return { success: true };
}

export async function disableAllInstitutionsByType(
  type: string
): Promise<{ success: boolean }> {
  const institutions = await db.institution.findMany({
    where: { type },
    select: { id: true },
  });
  const institutionIds = institutions.map((i) => i.id);

  await db.institution.updateMany({
    where: { type },
    data: { isActive: false },
  });

  if (institutionIds.length > 0) {
    await db.account.updateMany({
      where: { institutionId: { in: institutionIds } },
      data: { isActive: false },
    });
  }

  revalidatePath("/accounts");
  return { success: true };
}
