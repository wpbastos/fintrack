import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Clock,
  ArrowRight,
} from "lucide-react";
import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/format";
import { SpendingTrendsChart, BudgetProgress } from "./dashboard-charts";

async function getDashboardData() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysInMonth = monthEnd.getDate();
  const daysRemaining = daysInMonth - now.getDate();

  // 6 months ago for trend chart
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    netBalanceResult,
    monthIncomeResult,
    monthSpentResult,
    totalBudgetResult,
    stagingPendingCount,
    trendTransactions,
    budgetCategories,
    recentTransactions,
  ] = await Promise.all([
    // Net balance: sum of all account balances from latest import closing balance per account
    db.$queryRawUnsafe<{ total: number | null }[]>(
      `SELECT SUM(closing_balance) as total
       FROM import
       WHERE closing_balance IS NOT NULL
         AND id IN (
           SELECT MAX(id) FROM import WHERE account_id IS NOT NULL GROUP BY account_id
         )`
    ),

    // Month income: sum of positive transactions this month
    db.transaction.aggregate({
      _sum: { amount: true },
      where: {
        date: { gte: monthStart },
        amount: { gt: 0 },
      },
    }),

    // Month spent: sum of negative transactions this month (as positive)
    db.transaction.aggregate({
      _sum: { amount: true },
      where: {
        date: { gte: monthStart },
        amount: { lt: 0 },
      },
    }),

    // Total monthly budget for expense categories
    db.category.aggregate({
      _sum: { monthlyBudget: true },
      where: {
        isActive: true,
        monthlyBudget: { not: null },
        group: { type: "Expense" },
        parentId: null,
        children: { none: {} },
      },
    }),

    // Staging pending count
    db.stagingTransaction.count({
      where: { status: { not: "imported" } },
    }),

    // 6-month trend data
    db.transaction.findMany({
      where: { date: { gte: sixMonthsAgo } },
      select: { date: true, amount: true },
    }),

    // Budget categories with their groups
    db.category.findMany({
      where: {
        isActive: true,
        monthlyBudget: { not: null },
        group: { type: "Expense" },
      },
      select: {
        id: true,
        name: true,
        monthlyBudget: true,
        parentId: true,
        group: { select: { name: true, color: true } },
        children: {
          where: { isActive: true, monthlyBudget: { not: null } },
          select: { id: true, name: true, monthlyBudget: true },
        },
      },
    }),

    // Recent 10 transactions
    db.transaction.findMany({
      orderBy: { date: "desc" },
      take: 10,
      include: {
        merchant: { select: { name: true } },
        income: { select: { name: true } },
        category: {
          select: {
            name: true,
            color: true,
            group: { select: { color: true } },
          },
        },
      },
    }),
  ]);

  // Aggregate child category budgets to parent level
  const parentBudgetResult = await db.$queryRawUnsafe<{ total: number | null }[]>(
    `SELECT SUM(c.monthly_budget) as total
     FROM category c
     INNER JOIN category_group cg ON c.group_id = cg.id
     WHERE c.is_active = 1
       AND c.monthly_budget IS NOT NULL
       AND cg.type = 'Expense'
       AND c.parent_id IS NOT NULL`
  );

  const leafBudgetTotal = totalBudgetResult._sum.monthlyBudget ?? 0;
  const childBudgetTotal = parentBudgetResult[0]?.total ?? 0;
  const effectiveTotalBudget = leafBudgetTotal + childBudgetTotal;

  // Compute spending per budget category this month
  const budgetCategoryIds: number[] = [];
  for (const cat of budgetCategories) {
    if (cat.children.length > 0) {
      for (const child of cat.children) {
        budgetCategoryIds.push(child.id);
      }
    } else {
      budgetCategoryIds.push(cat.id);
    }
  }

  const spentByCategory: Record<number, number> = {};
  if (budgetCategoryIds.length > 0) {
    const spentResults = await db.transaction.groupBy({
      by: ["categoryId"],
      _sum: { amount: true },
      where: {
        date: { gte: monthStart },
        amount: { lt: 0 },
        categoryId: { in: budgetCategoryIds },
      },
    });
    for (const row of spentResults) {
      if (row.categoryId != null) {
        spentByCategory[row.categoryId] = Math.abs(row._sum.amount ?? 0);
      }
    }
  }

  // Build budget progress items
  const budgetItems: Array<{
    categoryName: string;
    groupName: string;
    groupColor: string;
    spent: number;
    budget: number;
  }> = [];

  for (const cat of budgetCategories) {
    const groupName = cat.group?.name ?? "Uncategorized";
    const groupColor = cat.group?.color ?? "#6366f1";

    if (cat.children.length > 0) {
      for (const child of cat.children) {
        budgetItems.push({
          categoryName: child.name,
          groupName,
          groupColor,
          spent: spentByCategory[child.id] ?? 0,
          budget: child.monthlyBudget ?? 0,
        });
      }
    } else if (cat.parentId === null) {
      budgetItems.push({
        categoryName: cat.name,
        groupName,
        groupColor,
        spent: spentByCategory[cat.id] ?? 0,
        budget: cat.monthlyBudget ?? 0,
      });
    }
  }

  // Build 6-month trend chart data
  const trendMap = new Map<string, { income: number; expenses: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    trendMap.set(key, { income: 0, expenses: 0 });
  }
  for (const txn of trendTransactions) {
    const d = new Date(txn.date);
    const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    const bucket = trendMap.get(key);
    if (bucket) {
      if (txn.amount > 0) {
        bucket.income += txn.amount;
      } else {
        bucket.expenses += Math.abs(txn.amount);
      }
    }
  }
  const trendData = Array.from(trendMap.entries()).map(([month, data]) => ({
    month,
    income: Math.round(data.income * 100) / 100,
    expenses: Math.round(data.expenses * 100) / 100,
  }));

  const netBalance = netBalanceResult[0]?.total ?? 0;
  const monthIncome = monthIncomeResult._sum.amount ?? 0;
  const monthSpent = Math.abs(monthSpentResult._sum.amount ?? 0);
  const budgetLeft = effectiveTotalBudget - monthSpent;

  return {
    netBalance,
    monthIncome,
    monthSpent,
    budgetLeft,
    totalBudget: effectiveTotalBudget,
    stagingPendingCount,
    trendData,
    budgetItems,
    daysRemaining,
    daysInMonth,
    recentTransactions,
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Your financial command center.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.netBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Month Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(data.monthIncome)}
            </div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Month Spent</CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">
              {formatCurrency(data.monthSpent)}
            </div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Left</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                data.budgetLeft >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {formatCurrency(data.budgetLeft)}
            </div>
            <p className="text-xs text-muted-foreground">
              of {formatCurrency(data.totalBudget)} budget
            </p>
          </CardContent>
        </Card>

        <Link href="/staging">
          <Card className="h-full cursor-pointer transition-colors hover:border-amber-300 dark:hover:border-amber-600">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Staging</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {data.stagingPendingCount}
              </div>
              <p className="text-xs text-muted-foreground">
                Pending review
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Spending Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Spending Trends
            </CardTitle>
            <CardDescription>Income vs expenses over 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <SpendingTrendsChart data={data.trendData} />
          </CardContent>
        </Card>

        {/* Budget Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Budget Progress
            </CardTitle>
            <CardDescription>
              Monthly budget utilization by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BudgetProgress
              items={data.budgetItems}
              daysRemaining={data.daysRemaining}
              daysInMonth={data.daysInMonth}
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            Recent Transactions
          </CardTitle>
          <CardDescription>Last 10 imported transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No transactions yet. Import a statement to get started.
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-28">Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-36">Category</TableHead>
                      <TableHead className="w-28 text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentTransactions.map((txn) => {
                      const categoryColor =
                        txn.category?.color ??
                        txn.category?.group?.color ??
                        "#6366f1";
                      const resolvedName =
                        txn.merchant?.name ?? txn.income?.name;

                      return (
                        <TableRow key={txn.id}>
                          <TableCell className="font-mono text-sm">
                            {formatDate(txn.date)}
                          </TableCell>
                          <TableCell title={txn.description}>
                            {resolvedName ? (
                              <span className="font-medium truncate block">
                                {resolvedName}
                              </span>
                            ) : (
                              <span className="text-muted-foreground truncate block">
                                {txn.description}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {txn.category ? (
                              <span
                                className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
                                style={{
                                  backgroundColor: `${categoryColor}20`,
                                  color: categoryColor,
                                }}
                              >
                                {txn.category.name}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell
                            className={`text-right font-mono ${
                              txn.amount < 0
                                ? "text-rose-500 dark:text-rose-400"
                                : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {formatCurrency(txn.amount)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end pt-3">
                <Link
                  href="/transactions"
                  className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
                >
                  View all transactions
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
