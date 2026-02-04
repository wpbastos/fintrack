import { db } from "@/lib/db";
import { SchemaTabs } from "./schema-tabs";

export const dynamic = "force-dynamic";

async function getSchemas() {
  return db.documentSchema.findMany({
    orderBy: { name: "asc" },
  });
}

export default async function SchemasPage() {
  const schemas = await getSchemas();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Document Schemas</h1>
        <p className="text-muted-foreground">
          Manage extraction schemas for PDF statements and documents
        </p>
      </div>
      <SchemaTabs schemas={schemas} />
    </div>
  );
}
