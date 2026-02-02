import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

async function getTransactions() {
  return db.transaction.findMany({
    orderBy: { date: "desc" },
    take: 100,
    include: {
      merchant: true,
      income: true,
      category: {
        include: {
          group: { select: { color: true } },
        },
      },
    },
  });
}

export default async function TransactionsPage() {
  const transactions = await getTransactions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
        <p className="text-muted-foreground">
          All imported and verified transactions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            {transactions.length} transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions yet. Import statements and move them from staging.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table className="table-fixed">
                <colgroup>
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "35%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "15%" }} />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Merchant/Income</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn) => {
                    const categoryColor = txn.category?.color || txn.category?.group?.color || "#6366f1";
                    return (
                      <TableRow key={txn.id}>
                        <TableCell className="font-mono text-sm">
                          {txn.date.toLocaleDateString()}
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate" title={txn.description}>
                          {txn.description}
                        </TableCell>
                        <TableCell>
                          {txn.merchant ? (
                            <span className="font-medium">{txn.merchant.name}</span>
                          ) : txn.income ? (
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">{txn.income.name}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {txn.category ? (
                            <span
                              className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium"
                              style={{
                                backgroundColor: `${categoryColor}20`,
                                color: categoryColor,
                              }}
                            >
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: categoryColor }}
                              />
                              {txn.category.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono ${
                            txn.amount < 0
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {txn.amount.toLocaleString("en-US", {
                            style: "currency",
                            currency: "USD",
                          })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
