import { db } from "@/lib/db";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/format";

const PAGE_SIZE = 50;

async function getTransactions(page: number) {
  const [transactions, total] = await Promise.all([
    db.transaction.findMany({
      orderBy: { date: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
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
      },
    }),
    db.transaction.count(),
  ]);
  return { transactions, total };
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page || "1", 10));
  const { transactions, total } = await getTransactions(currentPage);
  const totalPages = Math.ceil(total / PAGE_SIZE);

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
            {total} transactions
            {totalPages > 1 && ` · Page ${currentPage} of ${totalPages}`}
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
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-64">Account</TableHead>
                    <TableHead className="w-32">Category</TableHead>
                    <TableHead className="w-28 text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn) => {
                    const categoryColor = txn.category?.color || txn.category?.group?.color || "#6366f1";
                    const resolvedName = txn.merchant?.name || txn.income?.name;
                    return (
                      <TableRow key={txn.id}>
                        <TableCell className="font-mono text-sm">
                          <span className="font-medium">{formatDate(txn.date)}</span>
                        </TableCell>
                        <TableCell className="max-w-[300px]" title={txn.description}>
                          {resolvedName ? (
                            <span className="font-medium truncate block">{resolvedName}</span>
                          ) : (
                            <span className="text-muted-foreground truncate block">{txn.description}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {txn.account ? (
                            <div className="flex flex-col">
                              <span className="font-medium text-sm truncate">{txn.account.name}</span>
                              {txn.account.institution && (
                                <span className="text-xs text-muted-foreground truncate">{txn.account.institution.name}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
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
                            <span className="text-muted-foreground text-xs">—</span>
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
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  asChild
                  disabled={currentPage <= 1}
                >
                  <Link href={currentPage <= 1 ? "#" : "/transactions?page=1"}>
                    <ChevronsLeft className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  asChild
                  disabled={currentPage <= 1}
                >
                  <Link href={currentPage <= 1 ? "#" : `/transactions?page=${currentPage - 1}`}>
                    <ChevronLeft className="h-4 w-4" />
                  </Link>
                </Button>
                <span className="px-3 text-sm font-medium">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  asChild
                  disabled={currentPage >= totalPages}
                >
                  <Link href={currentPage >= totalPages ? "#" : `/transactions?page=${currentPage + 1}`}>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  asChild
                  disabled={currentPage >= totalPages}
                >
                  <Link href={currentPage >= totalPages ? "#" : `/transactions?page=${totalPages}`}>
                    <ChevronsRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
