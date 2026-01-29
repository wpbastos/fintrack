/**
 * Merchant Resolution Utility
 * Resolves merchant IDs from transaction descriptions using pattern matching
 */

import { db } from './db';

/**
 * Resolve merchant ID from a transaction description
 * Uses pattern matching with priority and length-based ordering
 *
 * Pattern matching rules:
 * - Match with: WHERE description LIKE '%' || Pattern || '%'
 * - Order by: Priority DESC, LENGTH(Pattern) DESC
 * - Higher priority patterns win
 * - Longer patterns win when priority is equal (more specific match)
 *
 * @param description - Raw transaction description from bank statement
 * @returns MerchantID if matched, null otherwise
 */
export async function resolveMerchantId(description: string): Promise<number | null> {
  if (!description) return null;

  // Get all merchant patterns with their merchants
  const patterns = await db.merchantPattern.findMany({
    include: {
      merchant: true,
    },
    where: {
      merchant: {
        isActive: true,
      },
    },
  });

  // Sort by priority (desc) and pattern length (desc)
  const sortedPatterns = patterns.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return b.pattern.length - a.pattern.length;
  });

  // Find first matching pattern (case-insensitive)
  const normalizedDescription = description.toUpperCase();

  for (const patternEntry of sortedPatterns) {
    const normalizedPattern = patternEntry.pattern.toUpperCase();
    if (normalizedDescription.includes(normalizedPattern)) {
      return patternEntry.merchantId;
    }
  }

  return null;
}

/**
 * Resolve merchant with full details
 *
 * @param description - Raw transaction description
 * @returns Merchant object with pattern info, or null
 */
export async function resolveMerchant(description: string): Promise<{
  merchantId: number;
  merchantName: string;
  pattern: string;
  priority: number;
  defaultCategoryId: number | null;
} | null> {
  if (!description) return null;

  const patterns = await db.merchantPattern.findMany({
    include: {
      merchant: true,
    },
    where: {
      merchant: {
        isActive: true,
      },
    },
  });

  const sortedPatterns = patterns.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return b.pattern.length - a.pattern.length;
  });

  const normalizedDescription = description.toUpperCase();

  for (const patternEntry of sortedPatterns) {
    const normalizedPattern = patternEntry.pattern.toUpperCase();
    if (normalizedDescription.includes(normalizedPattern)) {
      return {
        merchantId: patternEntry.merchantId,
        merchantName: patternEntry.merchant.merchantName,
        pattern: patternEntry.pattern,
        priority: patternEntry.priority,
        defaultCategoryId: patternEntry.merchant.defaultCategoryId,
      };
    }
  }

  return null;
}

/**
 * Extract core merchant identifier from description
 * Useful for suggesting patterns for new merchants
 *
 * Examples:
 * - "AMZN*1234ABC SEATTLE" → "AMZN"
 * - "UBER* TRIP HELP.UBER" → "UBER* TRIP"
 * - "UBER* EATS HELP.UBER" → "UBER* EATS"
 * - "SQ *COFFEE SHOP" → "SQ *COFFEE SHOP"
 * - "PAYPAL *COMPANYNAME" → "PAYPAL *COMPANYNAME"
 *
 * @param description - Raw transaction description
 * @returns Suggested pattern string
 */
export function extractMerchantPattern(description: string): string {
  if (!description) return '';

  const normalized = description.trim().toUpperCase();

  // Pattern 1: AMZN* followed by code
  if (normalized.startsWith('AMZN*')) {
    return 'AMZN';
  }

  // Pattern 2: UBER* with service type
  if (normalized.startsWith('UBER*')) {
    const parts = normalized.split(' ');
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[1]}`;
    }
    return 'UBER*';
  }

  // Pattern 3: SQ * (Square) - keep full name
  if (normalized.startsWith('SQ *')) {
    const cleanPart = normalized.split('HTTP')[0].split('.COM')[0].trim();
    return cleanPart;
  }

  // Pattern 4: PAYPAL * - keep company name
  if (normalized.startsWith('PAYPAL *')) {
    const parts = normalized.split(' ');
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[1]}`;
    }
  }

  // Pattern 5: Standard merchant names - take first significant part
  const parts = normalized.split(/[\s\-#*]+/);
  if (parts.length > 0) {
    const firstPart = parts[0];
    if (firstPart.length >= 3) {
      return firstPart;
    }
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[1]}`;
    }
  }

  // Fallback: return first 20 chars
  return normalized.substring(0, 20).trim();
}

/**
 * Create or get merchant with automatic pattern extraction
 *
 * @param merchantName - Display name for the merchant
 * @param sampleDescription - Sample transaction description for pattern extraction
 * @param options - Optional merchant properties
 * @returns Created or existing merchant with pattern
 */
export async function createMerchantWithPattern(
  merchantName: string,
  sampleDescription: string,
  options?: {
    defaultCategoryId?: number;
    merchantType?: string;
    priority?: number;
  }
): Promise<{ merchantId: number; pattern: string }> {
  // Check if merchant exists
  let merchant = await db.merchant.findUnique({
    where: { merchantName },
  });

  // Create merchant if doesn't exist
  if (!merchant) {
    merchant = await db.merchant.create({
      data: {
        merchantName,
        defaultCategoryId: options?.defaultCategoryId,
        merchantType: options?.merchantType,
        isActive: true,
      },
    });
  }

  // Extract pattern from sample description
  const pattern = extractMerchantPattern(sampleDescription);

  // Create pattern if doesn't exist
  const existingPattern = await db.merchantPattern.findUnique({
    where: { pattern },
  });

  if (!existingPattern) {
    await db.merchantPattern.create({
      data: {
        merchantId: merchant.id,
        pattern,
        priority: options?.priority || 0,
      },
    });
  }

  return {
    merchantId: merchant.id,
    pattern,
  };
}
