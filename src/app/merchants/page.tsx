import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

async function getMerchants() {
  return db.merchant.findMany({
    orderBy: { merchantName: "asc" },
    include: {
      patterns: true,
      defaultCategory: true,
    },
  });
}

export default async function MerchantsPage() {
  const merchants = await getMerchants();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Merchants</h1>
        <p className="text-muted-foreground">
          Manage merchants and their matching patterns.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Merchants</CardTitle>
          <CardDescription>
            {merchants.length} merchants configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {merchants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No merchants configured yet.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Patterns</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {merchants.map((merchant) => (
                    <TableRow key={merchant.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{merchant.merchantName}</span>
                          {merchant.website && (
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {merchant.website}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {merchant.merchantType ? (
                          <Badge variant="outline">{merchant.merchantType}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {merchant.defaultCategory ? (
                          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                            {merchant.defaultCategory.categoryName}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[300px]">
                          {merchant.patterns.slice(0, 3).map((p) => (
                            <code
                              key={p.id}
                              className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded"
                            >
                              {p.pattern}
                            </code>
                          ))}
                          {merchant.patterns.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{merchant.patterns.length - 3} more
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={merchant.isActive ? "default" : "secondary"}>
                          {merchant.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
