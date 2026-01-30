import { db } from "@/lib/db";
import { CategoriesTabs } from "./categories-tabs";

export const dynamic = "force-dynamic";

async function getCategoriesWithGroups() {
  const groups = await db.categoryGroup.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      categories: {
        where: { parentCategoryId: null }, // Only top-level categories
        orderBy: { sortOrder: "asc" },
        include: {
          childCategories: {
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });
  return groups;
}

export default async function CategoriesPage() {
  const groups = await getCategoriesWithGroups();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
        <p className="text-muted-foreground">
          Manage transaction categories and budgets.
        </p>
      </div>

      <CategoriesTabs groups={groups} />
    </div>
  );
}
