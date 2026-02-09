/**
 * Pattern Cache
 * Caches merchant and income patterns per-batch to avoid redundant DB queries.
 * Each batch operation creates its own instance — this is NOT a global singleton.
 */

import { db } from './db';
import type { Prisma } from '@/generated/prisma';

export type MerchantPatternWithMerchant = Prisma.MerchantPatternGetPayload<{
  include: { merchant: true };
}>;

export type IncomePatternWithIncome = Prisma.IncomePatternGetPayload<{
  include: { income: true };
}>;

export class PatternCache {
  private merchantPatterns: MerchantPatternWithMerchant[] | null = null;
  private incomePatterns: IncomePatternWithIncome[] | null = null;

  async getMerchantPatterns(): Promise<MerchantPatternWithMerchant[]> {
    if (this.merchantPatterns) return this.merchantPatterns;
    this.merchantPatterns = await db.merchantPattern.findMany({
      include: { merchant: true },
      where: { merchant: { isActive: true } },
    });
    return this.merchantPatterns;
  }

  async getIncomePatterns(): Promise<IncomePatternWithIncome[]> {
    if (this.incomePatterns) return this.incomePatterns;
    this.incomePatterns = await db.incomePattern.findMany({
      include: { income: true },
    });
    return this.incomePatterns;
  }

  invalidate() {
    this.merchantPatterns = null;
    this.incomePatterns = null;
  }

  invalidateMerchantPatterns() {
    this.merchantPatterns = null;
  }

  invalidateIncomePatterns() {
    this.incomePatterns = null;
  }
}
