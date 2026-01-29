import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportLogTable } from "@/components/import-log-table";

async function getImportLogs() {
  return db.importLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export default async function ImportLogPage() {
  const logs = await getImportLogs();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import Log</h1>
        <p className="text-muted-foreground">
          History of all imported statement files.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Import History</CardTitle>
          <CardDescription>
            {logs.length} imports recorded
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No imports yet. Go to Import to upload your first statement.
            </div>
          ) : (
            <ImportLogTable logs={logs} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
