import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";

async function getStats() {
  const [transactionCount, stagingCount, importCount] = await Promise.all([
    db.transaction.count(),
    db.stagingTransaction.count(),
    db.importLog.count(),
  ]);

  const totalAmount = await db.transaction.aggregate({
    _sum: { amount: true },
  });

  return {
    transactionCount,
    stagingCount,
    importCount,
    totalBalance: totalAmount._sum.amount ?? 0,
  };
}

export default async function DashboardPage() {
  const stats = await getStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to FinTrack. Track your finances and build wealth.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Sum of all transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.transactionCount}</div>
            <p className="text-xs text-muted-foreground">
              Total imported transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staging</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.stagingCount}</div>
            <p className="text-xs text-muted-foreground">
              Pending review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Imports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.importCount}</div>
            <p className="text-xs text-muted-foreground">
              Statement files imported
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
