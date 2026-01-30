"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

// Account actions
export async function createAccount(data: {
  accountName: string;
  accountNumber?: string;
  institutionId?: number;
  accountType: string;
  accountNickname?: string;
  currency?: string;
  creditLimit?: number;
  interestRate?: number;
  billingCycleDay?: number;
  isJoint?: boolean;
  primaryHolderId?: number;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // If institution is provided and not active, enable it
    if (data.institutionId) {
      await db.institution.update({
        where: { id: data.institutionId },
        data: { isActive: true },
      });
    }

    await db.account.create({
      data: {
        accountName: data.accountName,
        accountNumber: data.accountNumber || null,
        institutionId: data.institutionId || null,
        accountType: data.accountType,
        accountNickname: data.accountNickname || null,
        currency: data.currency || "CAD",
        creditLimit: data.creditLimit || null,
        interestRate: data.interestRate || null,
        billingCycleDay: data.billingCycleDay || null,
        isJoint: data.isJoint || false,
        primaryHolderId: data.primaryHolderId || null,
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
    accountName?: string;
    accountNumber?: string | null;
    institutionId?: number | null;
    accountType?: string;
    accountNickname?: string | null;
    currency?: string;
    creditLimit?: number | null;
    interestRate?: number | null;
    billingCycleDay?: number | null;
    isJoint?: boolean;
    primaryHolderId?: number | null;
    notes?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // If institution is provided and not active, enable it
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

  // When enabling an account, also enable its institution and cardholder
  if (isActive) {
    if (account.institutionId) {
      await db.institution.update({
        where: { id: account.institutionId },
        data: { isActive: true },
      });
    }
    if (account.primaryHolderId) {
      await db.cardholder.update({
        where: { id: account.primaryHolderId },
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
  // Get all inactive accounts with their institution and cardholder IDs
  const accounts = await db.account.findMany({
    where: { isActive: false },
    select: { id: true, institutionId: true, primaryHolderId: true },
  });

  // Enable all accounts
  await db.account.updateMany({
    where: { isActive: false },
    data: { isActive: true },
  });

  // Enable linked institutions
  const institutionIds = [...new Set(accounts.map((a) => a.institutionId).filter(Boolean))] as number[];
  if (institutionIds.length > 0) {
    await db.institution.updateMany({
      where: { id: { in: institutionIds } },
      data: { isActive: true },
    });
  }

  // Enable linked cardholders
  const cardholderIds = [...new Set(accounts.map((a) => a.primaryHolderId).filter(Boolean))] as number[];
  if (cardholderIds.length > 0) {
    await db.cardholder.updateMany({
      where: { id: { in: cardholderIds } },
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

// Cardholder actions
export async function createCardholder(data: {
  name: string;
  email?: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string; cardholder?: { id: number; name: string } }> {
  try {
    const cardholder = await db.cardholder.create({
      data: {
        name: data.name,
        email: data.email || null,
        notes: data.notes || null,
      },
    });

    revalidatePath("/accounts");
    return { success: true, cardholder: { id: cardholder.id, name: cardholder.name } };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { success: false, error: "Cardholder with this name already exists" };
    }
    return { success: false, error: "Failed to create cardholder" };
  }
}

export async function updateCardholder(
  cardholderId: number,
  data: {
    name?: string;
    email?: string | null;
    notes?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.cardholder.update({
      where: { id: cardholderId },
      data,
    });

    revalidatePath("/accounts");
    return { success: true };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { success: false, error: "Cardholder with this name already exists" };
    }
    return { success: false, error: "Failed to update cardholder" };
  }
}

export async function toggleCardholderStatus(
  cardholderId: number,
  isActive: boolean
): Promise<{ success: boolean }> {
  await db.cardholder.update({
    where: { id: cardholderId },
    data: { isActive },
  });

  revalidatePath("/accounts");
  return { success: true };
}

export async function deleteCardholder(
  cardholderId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if cardholder has accounts or transactions
    const accountCount = await db.account.count({
      where: { primaryHolderId: cardholderId },
    });

    if (accountCount > 0) {
      return {
        success: false,
        error: `Cannot delete: ${accountCount} account(s) linked to this cardholder`,
      };
    }

    const transactionCount = await db.transaction.count({
      where: { cardholderId },
    });

    if (transactionCount > 0) {
      return {
        success: false,
        error: `Cannot delete: ${transactionCount} transaction(s) linked to this cardholder`,
      };
    }

    await db.cardholder.delete({
      where: { id: cardholderId },
    });

    revalidatePath("/accounts");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete cardholder" };
  }
}

export async function enableAllCardholders(): Promise<{ success: boolean }> {
  await db.cardholder.updateMany({
    where: { isActive: false },
    data: { isActive: true },
  });

  revalidatePath("/accounts");
  return { success: true };
}

export async function disableAllCardholders(): Promise<{ success: boolean }> {
  await db.cardholder.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });

  revalidatePath("/accounts");
  return { success: true };
}

// Institution actions
export async function searchInstitutions(
  query: string
): Promise<{ id: number; institutionName: string; institutionType: string; isActive: boolean }[]> {
  if (query.length < 1) return [];

  const institutions = await db.institution.findMany({
    where: {
      OR: [
        { institutionName: { contains: query } },
        { notes: { contains: query } },
      ],
    },
    orderBy: { institutionName: "asc" },
    take: 10,
    select: {
      id: true,
      institutionName: true,
      institutionType: true,
      isActive: true,
    },
  });

  return institutions;
}

export async function createInstitution(data: {
  institutionName: string;
  institutionType: string;
  website?: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await db.institution.create({
      data: {
        institutionName: data.institutionName,
        institutionType: data.institutionType,
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
    institutionName?: string;
    institutionType?: string;
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

  // When disabling an institution, also disable all linked accounts
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
    // Check if institution has accounts
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
  institutionType: string
): Promise<{ success: boolean }> {
  await db.institution.updateMany({
    where: { institutionType },
    data: { isActive: true },
  });

  revalidatePath("/accounts");
  return { success: true };
}

export async function disableAllInstitutionsByType(
  institutionType: string
): Promise<{ success: boolean }> {
  // Get all institution IDs of this type
  const institutions = await db.institution.findMany({
    where: { institutionType },
    select: { id: true },
  });
  const institutionIds = institutions.map((i) => i.id);

  // Disable all institutions of this type
  await db.institution.updateMany({
    where: { institutionType },
    data: { isActive: false },
  });

  // Also disable all accounts linked to these institutions
  if (institutionIds.length > 0) {
    await db.account.updateMany({
      where: { institutionId: { in: institutionIds } },
      data: { isActive: false },
    });
  }

  revalidatePath("/accounts");
  return { success: true };
}
