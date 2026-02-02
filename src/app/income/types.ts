export interface Pattern {
  id: number;
  pattern: string;
  priority: number;
  notes: string | null;
}

export interface Income {
  id: number;
  name: string;
  personId: number | null;
  person: { id: number; name: string } | null;
  categoryId: number | null;
  category: { id: number; name: string; color: string | null; group: { color: string | null } | null } | null;
  depositAccountId: number | null;
  depositAccount: { id: number; name: string } | null;
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

export interface Payslip {
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
  name: string;
  color: string | null;
  groupName: string;
  groupColor: string | null;
}

export interface AccountOption {
  id: number;
  name: string;
  institutionName: string | null;
}

export const PAY_FREQUENCIES = [
  "Weekly",
  "Bi-weekly",
  "Semi-monthly",
  "Monthly",
  "Irregular",
] as const;
