/**
 * Shared type definitions for seed data
 */

export type GroupType = "Income" | "Expense" | "Transfer" | "Investment";
export type NecessityLevel = "Essential" | "Important" | "Discretionary" | "Wasteful";

export interface CategoryGroup {
  groupName: string;
  groupType: GroupType;
  color: string;
  sortOrder: number;
  notes: string;
}

export interface Category {
  categoryName: string;
  groupName: string;
  necessityLevel: NecessityLevel;
  monthlyBudget: number | null;
  sortOrder: number;
  notes: string | null;
}

export interface MerchantPattern {
  pattern: string;
  priority: number;
  notes: string | null;
}

export interface Merchant {
  merchantName: string;
  merchantType: string;
  categoryName: string;
  website: string | null;
  hasAlternative: boolean;
  alternativeName: string | null;
  alternativeSavings: number | null;
  notes: string | null;
  patterns: MerchantPattern[];
}

export interface IncomeSourcePattern {
  pattern: string;
  priority: number;
  notes: string | null;
}

export interface IncomeSource {
  incomeName: string;
  incomeType: string;
  categoryName: string;
  payFrequency: string | null;
  notes: string | null;
  patterns: IncomeSourcePattern[];
}

export interface Institution {
  institutionName: string;
  institutionType: string;
  website: string | null;
  notes: string | null;
}

export interface DocumentSchema {
  code: string;
  name: string;
  documentType: string;
  institutionName: string;
  version: string;
  sampleData: string;
  extractionNotes: string;
  notes: string;
}
