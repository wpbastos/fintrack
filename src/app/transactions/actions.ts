"use server";

import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { formatDate } from "@/lib/format";

export interface TransactionFilters {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  accountId?: string;
  categoryId?: string;
  type?: "all" | "expense" | "income";
  amountMin?: string;
  amountMax?: string;
}

const PAGE_SIZE = 50;

function buildWhereClause(filters: TransactionFilters): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = {};
  const AND: Prisma.TransactionWhereInput[] = [];

  if (filters.search) {
    const term = filters.search;
    AND.push({
      OR: [
        { description: { contains: term } },
        { originalDescription: { contains: term } },
        { merchant: { name: { contains: term } } },
        { income: { name: { contains: term } } },
      ],
    });
  }

  if (filters.dateFrom) {
    AND.push({ date: { gte: new Date(filters.dateFrom) } });
  }
  if (filters.dateTo) {
    // Include the full end date day
    const endDate = new Date(filters.dateTo);
    endDate.setHours(23, 59, 59, 999);
    AND.push({ date: { lte: endDate } });
  }

  if (filters.accountId) {
    const id = parseInt(filters.accountId, 10);
    if (!isNaN(id)) {
      AND.push({ accountId: id });
    }
  }

  if (filters.categoryId) {
    const id = parseInt(filters.categoryId, 10);
    if (!isNaN(id)) {
      AND.push({ categoryId: id });
    }
  }

  if (filters.type === "expense") {
    AND.push({ amount: { lt: 0 } });
  } else if (filters.type === "income") {
    AND.push({ amount: { gte: 0 } });
  }

  if (filters.amountMin) {
    const min = parseFloat(filters.amountMin);
    if (!isNaN(min)) {
      // Filter on absolute value: amount <= -min OR amount >= min
      AND.push({
        OR: [
          { amount: { gte: min } },
          { amount: { lte: -min } },
        ],
      });
    }
  }

  if (filters.amountMax) {
    const max = parseFloat(filters.amountMax);
    if (!isNaN(max)) {
      // Filter on absolute value: amount between -max and max
      AND.push({ amount: { gte: -max } });
      AND.push({ amount: { lte: max } });
    }
  }

  if (AND.length > 0) {
    where.AND = AND;
  }

  return where;
}

const transactionInclude = {
  merchant: true,
  income: true,
  account: {
    include: {
      institution: { select: { name: true } },
    },
  },
  category: {
    include: {
      group: { select: { color: true } },
    },
  },
} as const;

export async function getFilteredTransactions(filters: TransactionFilters, page: number) {
  const currentPage = Math.max(1, page);
  const where = buildWhereClause(filters);

  const [transactions, total] = await Promise.all([
    db.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: transactionInclude,
    }),
    db.transaction.count({ where }),
  ]);

  return { transactions, total, pageSize: PAGE_SIZE };
}

export async function getFilterOptions() {
  const [accounts, categories] = await Promise.all([
    db.account.findMany({
      where: { isActive: true },
      select: { id: true, name: true, institution: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    db.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true, group: { select: { name: true, color: true } } },
      orderBy: [{ group: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  return { accounts, categories };
}

export async function exportTransactionsCsv(filters: TransactionFilters) {
  const where = buildWhereClause(filters);

  const transactions = await db.transaction.findMany({
    where,
    orderBy: { date: "desc" },
    include: transactionInclude,
  });

  const header = "Date,Description,Merchant/Income,Category,Account,Amount,Type";
  const rows = transactions.map((txn) => {
    const resolvedName = txn.merchant?.name || txn.income?.name || "";
    const categoryName = txn.category?.name || "";
    const accountName = txn.account?.name || "";
    const type = txn.amount < 0 ? "Expense" : "Income";
    const dateStr = formatDate(txn.date, "yyyy-MM-dd");

    // Escape CSV fields that may contain commas or quotes
    const escape = (s: string) => {
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    return [
      dateStr,
      escape(txn.description),
      escape(resolvedName),
      escape(categoryName),
      escape(accountName),
      txn.amount.toFixed(2),
      type,
    ].join(",");
  });

  return [header, ...rows].join("\n");
}
