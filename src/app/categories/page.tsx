import { db } from "@/lib/db";
import { CategoriesTabs } from "./categories-tabs";

export const dynamic = "force-dynamic";

async function getCategoriesWithGroups() {
  // Get current month boundaries
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const groups = await db.categoryGroup.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      categories: {
        where: { parentId: null }, // Only top-level categories
        orderBy: { sortOrder: "asc" },
        include: {
          children: {
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  // Check if we have any transactions at all
  const totalTransactions = await db.transaction.count();
  const hasTransactions = totalTransactions > 0;

  // If we have transactions, get transaction counts per category
  const categoryStats: Record<number, { monthCount: number; totalCount: number }> = {};
  const budgetStats: Record<number, { spentThisMonth: number }> = {};

  if (hasTransactions) {
    // Get transaction counts for all categories
    const allCategories = groups.flatMap((g) =>
      g.categories.flatMap((c) => [c.id, ...(c.children?.map((ch) => ch.id) ?? [])])
    );

    // Get monthly counts
    const monthlyTxns = await db.transaction.groupBy({
      by: ["categoryId"],
      where: {
        categoryId: { in: allCategories },
        date: { gte: monthStart, lte: monthEnd },
      },
      _count: { id: true },
      _sum: { amount: true },
    });

    // Get total counts
    const totalTxns = await db.transaction.groupBy({
      by: ["categoryId"],
      where: {
        categoryId: { in: allCategories },
      },
      _count: { id: true },
    });

    // Build stats maps
    for (const t of totalTxns) {
      if (t.categoryId) {
        categoryStats[t.categoryId] = {
          monthCount: 0,
          totalCount: t._count.id,
        };
      }
    }

    for (const t of monthlyTxns) {
      if (t.categoryId) {
        if (!categoryStats[t.categoryId]) {
          categoryStats[t.categoryId] = { monthCount: 0, totalCount: 0 };
        }
        categoryStats[t.categoryId].monthCount = t._count.id;
        // For expenses, sum is negative, so we negate to show positive spent
        budgetStats[t.categoryId] = {
          spentThisMonth: Math.abs(t._sum.amount ?? 0),
        };
      }
    }
  }

  return { groups, categoryStats, budgetStats };
}

export default async function CategoriesPage() {
  const { groups, categoryStats, budgetStats } = await getCategoriesWithGroups();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
        <p className="text-muted-foreground">
          Manage transaction categories and budgets.
        </p>
      </div>

      <CategoriesTabs
        groups={groups}
        categoryStats={categoryStats}
        budgetStats={budgetStats}
      />
    </div>
  );
}
