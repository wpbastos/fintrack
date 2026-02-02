"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export async function createAccount(data: {
  name: string;
  number?: string;
  institutionId?: number;
  type: string;
  nickname?: string;
  currency?: string;
  creditLimit?: number;
  interestRate?: number;
  billingCycleDay?: number;
  isJoint?: boolean;
  ownerId?: number;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (data.institutionId) {
      await db.institution.update({
        where: { id: data.institutionId },
        data: { isActive: true },
      });
    }

    await db.account.create({
      data: {
        name: data.name,
        number: data.number || null,
        institutionId: data.institutionId || null,
        type: data.type,
        nickname: data.nickname || null,
        currency: data.currency || "CAD",
        creditLimit: data.creditLimit || null,
        interestRate: data.interestRate || null,
        billingCycleDay: data.billingCycleDay || null,
        isJoint: data.isJoint || false,
        ownerId: data.ownerId || null,
        notes: data.notes || null,
      },
    });

    revalidatePath("/accounts");
    return { success: true };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { success: false, error: "Account with this name already exists for this institution" };
    }
    return { success: false, error: "Failed to create account" };
  }
}

export async function updateAccount(
  accountId: number,
  data: {
    name?: string;
    number?: string | null;
    institutionId?: number | null;
    type?: string;
    nickname?: string | null;
    currency?: string;
    creditLimit?: number | null;
    interestRate?: number | null;
    billingCycleDay?: number | null;
    isJoint?: boolean;
    ownerId?: number | null;
    notes?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    if (data.institutionId) {
      await db.institution.update({
        where: { id: data.institutionId },
        data: { isActive: true },
      });
    }

    await db.account.update({
      where: { id: accountId },
      data,
    });

    revalidatePath("/accounts");
    return { success: true };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { success: false, error: "Account with this name already exists for this institution" };
    }
    return { success: false, error: "Failed to update account" };
  }
}

export async function toggleAccountStatus(
  accountId: number,
  isActive: boolean
): Promise<{ success: boolean }> {
  const account = await db.account.update({
    where: { id: accountId },
    data: { isActive },
  });

  if (isActive) {
    if (account.institutionId) {
      await db.institution.update({
        where: { id: account.institutionId },
        data: { isActive: true },
      });
    }
    if (account.ownerId) {
      await db.person.update({
        where: { id: account.ownerId },
        data: { isActive: true },
      });
    }
  }

  revalidatePath("/accounts");
  return { success: true };
}

export async function deleteAccount(
  accountId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.account.delete({
      where: { id: accountId },
    });

    revalidatePath("/accounts");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete account" };
  }
}

export async function enableAllAccounts(): Promise<{ success: boolean }> {
  const accounts = await db.account.findMany({
    where: { isActive: false },
    select: { id: true, institutionId: true, ownerId: true },
  });

  await db.account.updateMany({
    where: { isActive: false },
    data: { isActive: true },
  });

  const institutionIds = [...new Set(accounts.map((a) => a.institutionId).filter(Boolean))] as number[];
  if (institutionIds.length > 0) {
    await db.institution.updateMany({
      where: { id: { in: institutionIds } },
      data: { isActive: true },
    });
  }

  const personIds = [...new Set(accounts.map((a) => a.ownerId).filter(Boolean))] as number[];
  if (personIds.length > 0) {
    await db.person.updateMany({
      where: { id: { in: personIds } },
      data: { isActive: true },
    });
  }

  revalidatePath("/accounts");
  return { success: true };
}

export async function disableAllAccounts(): Promise<{ success: boolean }> {
  await db.account.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });

  revalidatePath("/accounts");
  return { success: true };
}
