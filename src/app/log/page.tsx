import { db } from "@/lib/db";
import { ImportTable } from "@/components/import-log-table";

async function getImports() {
  return db.import.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      fileName: true,
      sourceType: true,
      accountId: true,
      periodStart: true,
      periodEnd: true,
      openingBalance: true,
      closingBalance: true,
      transactionCount: true,
      addedCount: true,
      matchedCount: true,
      unknownCount: true,
      content: true,
      status: true,
      processedAt: true,
      aiStatus: true,
      aiStartedAt: true,
      createdAt: true,
      account: {
        include: {
          institution: true,
        },
      },
    },
  });
}

export default async function ImportPage() {
  const logs = await getImports();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import Log</h1>
        <p className="text-muted-foreground">
          History of all imported statement files.
        </p>
      </div>

      <ImportTable logs={logs} />
    </div>
  );
}
