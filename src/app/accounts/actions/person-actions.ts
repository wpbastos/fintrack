"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export async function createPerson(data: {
  name: string;
  email?: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string; person?: { id: number; name: string } }> {
  try {
    const person = await db.person.create({
      data: {
        name: data.name,
        email: data.email || null,
        notes: data.notes || null,
      },
    });

    revalidatePath("/accounts");
    return { success: true, person: { id: person.id, name: person.name } };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { success: false, error: "Person with this name already exists" };
    }
    return { success: false, error: "Failed to create person" };
  }
}

export async function updatePerson(
  personId: number,
  data: {
    name?: string;
    email?: string | null;
    notes?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.person.update({
      where: { id: personId },
      data,
    });

    revalidatePath("/accounts");
    return { success: true };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { success: false, error: "Person with this name already exists" };
    }
    return { success: false, error: "Failed to update person" };
  }
}

export async function togglePersonStatus(
  personId: number,
  isActive: boolean
): Promise<{ success: boolean }> {
  await db.person.update({
    where: { id: personId },
    data: { isActive },
  });

  revalidatePath("/accounts");
  return { success: true };
}

export async function deletePerson(
  personId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const accountCount = await db.account.count({
      where: { ownerId: personId },
    });

    if (accountCount > 0) {
      return {
        success: false,
        error: `Cannot delete: ${accountCount} account(s) linked to this person`,
      };
    }

    const transactionCount = await db.transaction.count({
      where: { personId },
    });

    if (transactionCount > 0) {
      return {
        success: false,
        error: `Cannot delete: ${transactionCount} transaction(s) linked to this person`,
      };
    }

    await db.person.delete({
      where: { id: personId },
    });

    revalidatePath("/accounts");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete person" };
  }
}

export async function enableAllPersons(): Promise<{ success: boolean }> {
  await db.person.updateMany({
    where: { isActive: false },
    data: { isActive: true },
  });

  revalidatePath("/accounts");
  return { success: true };
}

export async function disableAllPersons(): Promise<{ success: boolean }> {
  await db.person.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });

  revalidatePath("/accounts");
  return { success: true };
}
