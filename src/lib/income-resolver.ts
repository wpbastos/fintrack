/**
 * Income Resolution Utility
 * Resolves income IDs from transaction descriptions using pattern matching
 * Mirrors merchant-resolver.ts for income transactions
 */

import { db } from './db';
import { createLogger } from './logger';

const log = createLogger("Income");

/**
 * Resolve income ID from a transaction description
 * Uses pattern matching with priority and length-based ordering
 *
 * Pattern matching rules:
 * - Match with: WHERE description LIKE '%' || Pattern || '%'
 * - Order by: Priority DESC, LENGTH(Pattern) DESC
 * - Higher priority patterns win
 * - Longer patterns win when priority is equal (more specific match)
 *
 * @param description - Raw transaction description from bank statement
 * @returns IncomeID if matched, null otherwise
 */
export async function resolveIncomeId(description: string): Promise<number | null> {
  if (!description) return null;

  // Get all income patterns with their income sources
  const patterns = await db.incomePattern.findMany({
    include: {
      income: true,
    },
    where: {
      income: {
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
      return patternEntry.incomeId;
    }
  }

  return null;
}

/**
 * Resolve income with full details
 *
 * @param description - Raw transaction description
 * @returns Income object with pattern info, or null
 */
export async function resolveIncome(description: string): Promise<{
  incomeId: number;
  name: string;
  pattern: string;
  priority: number;
  categoryId: number | null;
} | null> {
  if (!description) return null;

  const patterns = await db.incomePattern.findMany({
    include: {
      income: true,
    },
    where: {
      income: {
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
        incomeId: patternEntry.incomeId,
        name: patternEntry.income.name,
        pattern: patternEntry.pattern,
        priority: patternEntry.priority,
        categoryId: patternEntry.income.categoryId,
      };
    }
  }

  return null;
}

/**
 * Extract core income identifier from description
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
export function extractIncomePattern(description: string): string {
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
 * Create or get income with automatic pattern extraction
 *
 * @param incomeName - Display name for the income
 * @param sampleDescription - Sample transaction description for pattern extraction
 * @param options - Optional income properties
 * @returns Created or existing income with pattern
 */
export async function createIncomeWithPattern(
  incomeName: string,
  sampleDescription: string,
  options?: {
    categoryId?: number;
    personId?: number;
    depositAccountId?: number;
    payFrequency?: string;
    priority?: number;
  }
): Promise<{ incomeId: number; pattern: string }> {
  // Check if income exists
  let income = await db.income.findUnique({
    where: { name: incomeName },
  });

  // Create income if doesn't exist
  if (!income) {
    income = await db.income.create({
      data: {
        name: incomeName,
        categoryId: options?.categoryId,
        personId: options?.personId,
        depositAccountId: options?.depositAccountId,
        payFrequency: options?.payFrequency,
        isActive: true,
      },
    });
    log.info("CREATE", `Income: ${incomeName}`);
  }

  // Extract pattern from sample description
  const pattern = extractIncomePattern(sampleDescription);

  // Create pattern if doesn't exist
  const existingPattern = await db.incomePattern.findUnique({
    where: { pattern },
  });

  if (!existingPattern) {
    await db.incomePattern.create({
      data: {
        incomeId: income.id,
        pattern,
        priority: options?.priority || 10,
      },
    });
    log.info("PATTERN", `"${pattern}" -> ${incomeName}`);
  }

  return {
    incomeId: income.id,
    pattern,
  };
}
