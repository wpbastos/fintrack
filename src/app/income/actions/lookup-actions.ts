"use server";

import { db } from "@/lib/db";

export async function getPersons(): Promise<{ id: number; name: string }[]> {
  const persons = await db.person.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return persons.map((p) => ({
    id: p.id,
    name: p.name,
  }));
}

export async function getIncomeCategories(): Promise<{ id: number; categoryName: string; groupName: string }[]> {
  const categories = await db.category.findMany({
    where: {
      isActive: true,
      group: { groupType: "Income" },
    },
    orderBy: { categoryName: "asc" },
    include: { group: true },
  });

  return categories.map((c) => ({
    id: c.id,
    categoryName: c.categoryName,
    groupName: c.group?.groupName || "Uncategorized",
  }));
}

export async function getAccounts(): Promise<{ id: number; accountName: string; institutionName: string | null }[]> {
  const accounts = await db.account.findMany({
    where: { isActive: true },
    orderBy: { accountName: "asc" },
    include: { institution: true },
  });

  return accounts.map((a) => ({
    id: a.id,
    accountName: a.accountName,
    institutionName: a.institution?.institutionName || null,
  }));
}
