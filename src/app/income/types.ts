export interface Pattern {
  id: number;
  pattern: string;
  priority: number;
  notes: string | null;
}

export interface IncomeSource {
  id: number;
  sourceName: string;
  personId: number | null;
  person: { id: number; name: string } | null;
  defaultCategoryId: number | null;
  defaultCategory: { id: number; categoryName: string } | null;
  depositAccountId: number | null;
  depositAccount: { id: number; accountName: string } | null;
  payFrequency: string | null;
  position: string | null;
  industry: string | null;
  location: string | null;
  website: string | null;
  startDate: Date | null;
  endDate: Date | null;
  currentGross: number | null;
  currentNet: number | null;
  isActive: boolean;
  notes: string | null;
  patterns: Pattern[];
}

export interface IncomeChange {
  id: number;
  effectiveDate: Date;
  previousGross: number | null;
  previousNet: number | null;
  newGross: number;
  newNet: number;
  changeReason: string;
  notes: string | null;
}

export interface PersonOption {
  id: number;
  name: string;
}

export interface CategoryOption {
  id: number;
  categoryName: string;
  groupName: string;
}

export interface AccountOption {
  id: number;
  accountName: string;
  institutionName: string | null;
}

export const PAY_FREQUENCIES = [
  "Weekly",
  "Bi-weekly",
  "Semi-monthly",
  "Monthly",
  "Irregular",
] as const;
