/**
 * Account Resolution Utility
 * Handles account lookup and auto-creation from statement data
 */

import { db } from './db';
import { createLogger } from './logger';

const log = createLogger("Account");

/**
 * Account input from statement JSON
 */
export interface AccountInput {
  accountName: string;
  accountNumber?: string;
  institutionName?: string;
  accountType: string;
  currency?: string;
}

/**
 * Result of account resolution
 */
export interface ResolvedAccount {
  accountId: number;
  accountCreated: boolean;
  institutionId: number | null;
  institutionCreated: boolean;
}

/**
 * Find an institution by name, or create it if it doesn't exist
 *
 * @param name - Institution name (e.g., "TD Bank", "RBC")
 * @param type - Institution type (Bank, Credit Union, Brokerage, Other)
 * @returns Institution ID and whether it was created
 */
export async function findOrCreateInstitution(
  name: string,
  type: string = 'Bank'
): Promise<{ institutionId: number; created: boolean }> {
  // Try to find existing institution
  const existing = await db.institution.findUnique({
    where: { name },
  });

  if (existing) {
    // Enable institution if it was disabled
    if (!existing.isActive) {
      await db.institution.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
      log.info("ENABLE", `Institution: ${name} (was disabled)`);
    }
    return { institutionId: existing.id, created: false };
  }

  // Create new institution
  const institution = await db.institution.create({
    data: {
      name,
      type,
      isActive: true,
    },
  });

  log.info("CREATE", `Institution: ${name} (${type})`);
  return { institutionId: institution.id, created: true };
}

/**
 * Find an account by account number
 *
 * @param accountNumber - Account number to search for
 * @param institutionId - Optional institution ID to narrow search
 * @returns Account ID if found, null otherwise
 */
export async function findAccountByNumber(
  accountNumber: string,
  institutionId?: number
): Promise<number | null> {
  const account = await db.account.findFirst({
    where: {
      number: accountNumber,
      ...(institutionId ? { institutionId } : {}),
      isActive: true,
    },
  });

  return account?.id ?? null;
}

/**
 * Resolve or create an account from statement input
 * Handles institution creation as well
 *
 * @param input - Account details from statement JSON
 * @returns Resolved account with creation flags
 */
export async function resolveOrCreateAccount(
  input: AccountInput
): Promise<ResolvedAccount> {
  let institutionId: number | null = null;
  let institutionCreated = false;

  // Handle institution if provided
  if (input.institutionName) {
    const institutionResult = await findOrCreateInstitution(
      input.institutionName,
      inferInstitutionType(input.institutionName)
    );
    institutionId = institutionResult.institutionId;
    institutionCreated = institutionResult.created;
  }

  // Try to find existing account by accountNumber
  if (input.accountNumber) {
    const existingAccountId = await findAccountByNumber(
      input.accountNumber,
      institutionId ?? undefined
    );

    if (existingAccountId) {
      return {
        accountId: existingAccountId,
        accountCreated: false,
        institutionId,
        institutionCreated,
      };
    }
  }

  // Try to find existing account by name + institution
  const existingByName = await db.account.findFirst({
    where: {
      name: input.accountName,
      institutionId: institutionId,
      isActive: true,
    },
  });

  if (existingByName) {
    log.debug("MATCH", `Found existing account by name: ${input.accountName}`);
    return {
      accountId: existingByName.id,
      accountCreated: false,
      institutionId,
      institutionCreated,
    };
  }

  // Create new account
  const account = await db.account.create({
    data: {
      name: input.accountName,
      number: input.accountNumber,
      institutionId,
      type: input.accountType,
      currency: input.currency ?? 'CAD',
      isActive: true,
    },
  });

  log.info("CREATE", `Account: ${input.accountName} (${input.accountType})`);

  return {
    accountId: account.id,
    accountCreated: true,
    institutionId,
    institutionCreated,
  };
}

/**
 * Infer institution type from name
 * Uses common patterns to guess the type
 */
function inferInstitutionType(name: string): string {
  const upperName = name.toUpperCase();

  // Credit unions often have specific patterns
  if (
    upperName.includes('CREDIT UNION') ||
    upperName.includes('CAISSE') ||
    upperName.includes('DESJARDINS')
  ) {
    return 'Credit Union';
  }

  // Brokerages
  if (
    upperName.includes('BROKERAGE') ||
    upperName.includes('SECURITIES') ||
    upperName.includes('QUESTRADE') ||
    upperName.includes('WEALTHSIMPLE') ||
    upperName.includes('FIDELITY') ||
    upperName.includes('VANGUARD')
  ) {
    return 'Brokerage';
  }

  // Default to Bank for major institutions
  return 'Bank';
}

/**
 * Validate account input has required fields
 */
export function validateAccountInput(input: unknown): input is AccountInput {
  if (!input || typeof input !== 'object') {
    return false;
  }

  const obj = input as Record<string, unknown>;

  return (
    typeof obj.accountName === 'string' &&
    obj.accountName.length > 0 &&
    typeof obj.accountType === 'string' &&
    obj.accountType.length > 0
  );
}
