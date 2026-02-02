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

export async function getIncomeCategories(): Promise<{ id: number; name: string; color: string | null; groupName: string; groupColor: string | null }[]> {
  const categories = await db.category.findMany({
    where: {
      isActive: true,
      group: { type: "Income" },
    },
    orderBy: { name: "asc" },
    include: { group: true },
  });

  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    groupName: c.group?.name || "Uncategorized",
    groupColor: c.group?.color || null,
  }));
}

export async function getAccounts(): Promise<{ id: number; name: string; institutionName: string | null }[]> {
  const accounts = await db.account.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: { institution: true },
  });

  return accounts.map((a) => ({
    id: a.id,
    name: a.name,
    institutionName: a.institution?.name || null,
  }));
}

export async function getPositions(): Promise<{
  id: number;
  title: string;
  department: string | null;
  employerId: number;
  employerName: string;
}[]> {
  const positions = await db.position.findMany({
    where: { isActive: true },
    orderBy: [{ employer: { name: "asc" } }, { title: "asc" }],
    include: { employer: true },
  });

  return positions.map((p) => ({
    id: p.id,
    title: p.title,
    department: p.department,
    employerId: p.employerId,
    employerName: p.employer.name,
  }));
}
