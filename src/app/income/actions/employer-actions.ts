"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export async function createEmployer(data: {
  name: string;
  industry?: string;
  location?: string;
  website?: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string; employer?: { id: number } }> {
  try {
    const employer = await db.employer.create({
      data: {
        name: data.name,
        industry: data.industry || null,
        location: data.location || null,
        website: data.website || null,
        notes: data.notes || null,
      },
    });

    revalidatePath("/income");
    return { success: true, employer: { id: employer.id } };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { success: false, error: "Employer with this name already exists" };
    }
    return { success: false, error: "Failed to create employer" };
  }
}

export async function updateEmployer(
  employerId: number,
  data: {
    name?: string;
    industry?: string | null;
    location?: string | null;
    website?: string | null;
    notes?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: Parameters<typeof db.employer.update>[0]["data"] = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.industry !== undefined) updateData.industry = data.industry;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.notes !== undefined) updateData.notes = data.notes;

    await db.employer.update({
      where: { id: employerId },
      data: updateData,
    });

    revalidatePath("/income");
    return { success: true };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { success: false, error: "Employer with this name already exists" };
    }
    return { success: false, error: "Failed to update employer" };
  }
}

export async function toggleEmployerStatus(
  employerId: number,
  isActive: boolean
): Promise<{ success: boolean }> {
  await db.employer.update({
    where: { id: employerId },
    data: { isActive },
  });

  revalidatePath("/income");
  return { success: true };
}

export async function deleteEmployer(
  employerId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if any positions are linked
    const positionCount = await db.position.count({
      where: { employerId },
    });

    if (positionCount > 0) {
      return {
        success: false,
        error: `Cannot delete: ${positionCount} position(s) linked to this employer`,
      };
    }

    await db.employer.delete({
      where: { id: employerId },
    });

    revalidatePath("/income");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete employer" };
  }
}

export async function getEmployers(): Promise<{ id: number; name: string }[]> {
  // Return all employers (active and inactive) for selection in position dialog
  const employers = await db.employer.findMany({
    orderBy: { name: "asc" },
  });

  return employers.map((e) => ({
    id: e.id,
    name: e.name,
  }));
}
