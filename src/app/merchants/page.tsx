import { db } from "@/lib/db";
import { MerchantsTabs } from "./merchants-tabs";

export const dynamic = "force-dynamic";

async function getMerchants() {
  return db.merchant.findMany({
    orderBy: { merchantName: "asc" },
    include: {
      patterns: true,
      defaultCategory: true,
      _count: {
        select: { transactions: true },
      },
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

      <MerchantsTabs merchants={merchants} />
    </div>
  );
}
