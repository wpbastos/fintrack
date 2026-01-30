import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Budget reset cron endpoint
// Closes expired budget periods and opens new ones
// Can be triggered by:
// - node-cron (internal)
// - External cron service
// - Manual call for testing

export async function POST(request: Request) {
  try {
    // Optional: Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const results = {
      closedPeriods: 0,
      openedPeriods: 0,
      errors: [] as string[],
    };

    // 1. Close expired open periods
    const expiredPeriods = await db.budgetPeriod.findMany({
      where: {
        status: "open",
        periodEnd: { lte: now },
      },
      include: {
        category: true,
      },
    });

    for (const period of expiredPeriods) {
      try {
        // Calculate actual spent from transactions in this period
        const spent = await db.transaction.aggregate({
          where: {
            categoryId: period.categoryId,
            date: {
              gte: period.periodStart,
              lte: period.periodEnd,
            },
          },
          _sum: { amount: true },
        });

        await db.budgetPeriod.update({
          where: { id: period.id },
          data: {
            status: "closed",
            actualSpent: Math.abs(spent._sum.amount ?? 0),
            closedAt: now,
          },
        });

        results.closedPeriods++;
      } catch (error) {
        results.errors.push(`Failed to close period ${period.id}: ${error}`);
      }
    }

    // 2. Create new periods for active categories with budgets
    const activeCategories = await db.category.findMany({
      where: {
        isActive: true,
        monthlyBudget: { not: null },
        // Only top-level categories or categories without children
        OR: [
          { parentCategoryId: null, childCategories: { none: {} } },
          { parentCategoryId: { not: null } },
        ],
      },
      include: {
        group: true,
      },
    });

    for (const category of activeCategories) {
      try {
        // Check if there's already an open period for this category
        const existingOpen = await db.budgetPeriod.findFirst({
          where: {
            categoryId: category.id,
            status: "open",
          },
        });

        if (existingOpen) continue;

        // Calculate period dates
        const { periodStart, periodEnd } = calculatePeriodDates(now);

        // Check if period already exists (closed)
        const existingPeriod = await db.budgetPeriod.findFirst({
          where: {
            categoryId: category.id,
            periodStart,
          },
        });

        if (existingPeriod) continue;

        // Create new period
        await db.budgetPeriod.create({
          data: {
            categoryId: category.id,
            periodStart,
            periodEnd,
            budgetedAmount: category.monthlyBudget!,
            status: "open",
          },
        });

        results.openedPeriods++;
      } catch (error) {
        results.errors.push(`Failed to create period for category ${category.id}: ${error}`);
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      ...results,
    });
  } catch (error) {
    console.error("Budget reset error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}

// GET endpoint for manual testing / status check
export async function GET() {
  const now = new Date();

  const openPeriods = await db.budgetPeriod.count({
    where: { status: "open" },
  });

  const closedPeriods = await db.budgetPeriod.count({
    where: { status: "closed" },
  });

  const categoriesWithBudget = await db.category.count({
    where: {
      isActive: true,
      monthlyBudget: { not: null },
    },
  });

  return NextResponse.json({
    status: "ok",
    timestamp: now.toISOString(),
    stats: {
      openPeriods,
      closedPeriods,
      categoriesWithBudget,
    },
  });
}

// Helper to calculate period start/end dates
// Uses 1st of month by default
// TODO: Support account-specific billing cycle days
function calculatePeriodDates(referenceDate: Date, billingCycleDay?: number) {
  const day = billingCycleDay ?? 1;

  let periodStart: Date;
  let periodEnd: Date;

  const currentDay = referenceDate.getDate();
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  if (currentDay >= day) {
    // Current period started this month
    periodStart = new Date(year, month, day, 0, 0, 0, 0);
    periodEnd = new Date(year, month + 1, day - 1, 23, 59, 59, 999);
  } else {
    // Current period started last month
    periodStart = new Date(year, month - 1, day, 0, 0, 0, 0);
    periodEnd = new Date(year, month, day - 1, 23, 59, 59, 999);
  }

  return { periodStart, periodEnd };
}
