/**
 * Income Source Resolution Utility
 * Resolves income source IDs from transaction descriptions using pattern matching
 * Mirrors merchant-resolver.ts for income transactions
 */

import { db } from './db';

/**
 * Resolve income source ID from a transaction description
 * Uses pattern matching with priority and length-based ordering
 *
 * Pattern matching rules:
 * - Match with: WHERE description LIKE '%' || Pattern || '%'
 * - Order by: Priority DESC, LENGTH(Pattern) DESC
 * - Higher priority patterns win
 * - Longer patterns win when priority is equal (more specific match)
 *
 * @param description - Raw transaction description from bank statement
 * @returns IncomeSourceID if matched, null otherwise
 */
export async function resolveIncomeSourceId(description: string): Promise<number | null> {
  if (!description) return null;

  // Get all income source patterns with their income sources
  const patterns = await db.incomeSourcePattern.findMany({
    include: {
      incomeSource: true,
    },
    where: {
      incomeSource: {
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
      return patternEntry.incomeSourceId;
    }
  }

  return null;
}

/**
 * Resolve income source with full details
 *
 * @param description - Raw transaction description
 * @returns Income source object with pattern info, or null
 */
export async function resolveIncomeSource(description: string): Promise<{
  incomeSourceId: number;
  sourceName: string;
  pattern: string;
  priority: number;
  defaultCategoryId: number | null;
} | null> {
  if (!description) return null;

  const patterns = await db.incomeSourcePattern.findMany({
    include: {
      incomeSource: true,
    },
    where: {
      incomeSource: {
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
        incomeSourceId: patternEntry.incomeSourceId,
        sourceName: patternEntry.incomeSource.sourceName,
        pattern: patternEntry.pattern,
        priority: patternEntry.priority,
        defaultCategoryId: patternEntry.incomeSource.defaultCategoryId,
      };
    }
  }

  return null;
}

/**
 * Extract core income source identifier from description
 * Useful for suggesting patterns for new income sources
 *
 * Examples:
 * - "TECHCORP PAYROLL 123456" → "TECHCORP PAYROLL"
 * - "CRA DIRECT DEP TAX REFUND" → "CRA DIRECT DEP"
 * - "TD INVESTMENT DIVIDEND" → "TD INVESTMENT DIVIDEND"
 * - "EI BENEFIT PAYMENT" → "EI BENEFIT"
 * - "E-TRANSFER FROM JOHN" → "E-TRANSFER FROM"
 *
 * @param description - Raw transaction description
 * @returns Suggested pattern string
 */
export function extractIncomeSourcePattern(description: string): string {
  if (!description) return '';

  const normalized = description.trim().toUpperCase();

  // Pattern 1: E-TRANSFER - keep the "FROM" part if present
  if (normalized.includes('E-TRANSFER') || normalized.includes('ETRANSFER')) {
    const parts = normalized.split(' ');
    const transferIdx = parts.findIndex(p => p.includes('TRANSFER'));
    if (transferIdx >= 0 && parts[transferIdx + 1] === 'FROM') {
      return `${parts[transferIdx]} FROM`;
    }
    return parts[transferIdx] || 'E-TRANSFER';
  }

  // Pattern 2: PAYROLL with company prefix
  if (normalized.includes('PAYROLL')) {
    const parts = normalized.split('PAYROLL');
    const prefix = parts[0].trim();
    if (prefix.length >= 3) {
      return `${prefix} PAYROLL`.trim();
    }
    return 'PAYROLL';
  }

  // Pattern 3: Government payments (CRA, EI, CPP, OAS, etc.)
  const govPrefixes = ['CRA', 'EI ', 'CPP', 'OAS', 'WSIB', 'GIS'];
  for (const prefix of govPrefixes) {
    if (normalized.startsWith(prefix)) {
      const parts = normalized.split(' ');
      if (parts.length >= 2) {
        return `${parts[0]} ${parts[1]}`;
      }
      return prefix.trim();
    }
  }

  // Pattern 4: DIRECT DEP or DIRECT DEPOSIT
  if (normalized.includes('DIRECT DEP')) {
    const parts = normalized.split('DIRECT DEP');
    const prefix = parts[0].trim();
    if (prefix.length >= 3) {
      return `${prefix} DIRECT DEP`.trim();
    }
    return 'DIRECT DEP';
  }

  // Pattern 5: DIVIDEND payments
  if (normalized.includes('DIVIDEND')) {
    const parts = normalized.split('DIVIDEND');
    const prefix = parts[0].trim();
    if (prefix.length >= 2) {
      return `${prefix} DIVIDEND`.trim();
    }
    return 'DIVIDEND';
  }

  // Pattern 6: INTEREST payments
  if (normalized.includes('INTEREST')) {
    const parts = normalized.split('INTEREST');
    const prefix = parts[0].trim();
    if (prefix.length >= 2) {
      return `${prefix} INTEREST`.trim();
    }
    return 'INTEREST';
  }

  // Pattern 7: Standard income names - take first two significant parts
  const parts = normalized.split(/[\s\-#*]+/);
  if (parts.length >= 2) {
    const firstTwo = `${parts[0]} ${parts[1]}`;
    if (firstTwo.length >= 5) {
      return firstTwo;
    }
  }
  if (parts.length > 0 && parts[0].length >= 3) {
    return parts[0];
  }

  // Fallback: return first 25 chars
  return normalized.substring(0, 25).trim();
}

/**
 * Create or get income source with automatic pattern extraction
 *
 * @param sourceName - Display name for the income source
 * @param sampleDescription - Sample transaction description for pattern extraction
 * @param options - Optional income source properties
 * @returns Created or existing income source with pattern
 */
export async function createIncomeSourceWithPattern(
  sourceName: string,
  sampleDescription: string,
  options?: {
    defaultCategoryId?: number;
    personId?: number;
    depositAccountId?: number;
    payFrequency?: string;
    priority?: number;
  }
): Promise<{ incomeSourceId: number; pattern: string }> {
  // Check if income source exists
  let incomeSource = await db.incomeSource.findUnique({
    where: { sourceName },
  });

  // Create income source if doesn't exist
  if (!incomeSource) {
    incomeSource = await db.incomeSource.create({
      data: {
        sourceName,
        defaultCategoryId: options?.defaultCategoryId,
        personId: options?.personId,
        depositAccountId: options?.depositAccountId,
        payFrequency: options?.payFrequency,
        isActive: true,
      },
    });
  }

  // Extract pattern from sample description
  const pattern = extractIncomeSourcePattern(sampleDescription);

  // Create pattern if doesn't exist
  const existingPattern = await db.incomeSourcePattern.findUnique({
    where: { pattern },
  });

  if (!existingPattern) {
    await db.incomeSourcePattern.create({
      data: {
        incomeSourceId: incomeSource.id,
        pattern,
        priority: options?.priority || 10,
      },
    });
  }

  return {
    incomeSourceId: incomeSource.id,
    pattern,
  };
}
