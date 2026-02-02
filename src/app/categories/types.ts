export interface Category {
  id: number;
  name: string;
  color: string | null;
  necessityLevel: string;
  monthlyBudget: number | null;
  notes: string | null;
  isActive: boolean;
  sortOrder: number | null;
  parentId: number | null;
  groupId: number;
}

export interface CategoryWithChildren extends Category {
  children: Category[];
}

export interface CategoryGroup {
  id: number;
  name: string;
  type: string;
  color: string | null;
  notes: string | null;
  isActive: boolean;
  sortOrder: number | null;
  categories: CategoryWithChildren[];
}

export interface BudgetPeriod {
  id: number;
  periodStart: Date;
  periodEnd: Date;
  budgetedAmount: number;
  actualSpent: number;
  status: string;
  notes: string | null;
}

export const NECESSITY_LEVELS = [
  "Essential",
  "Important",
  "Discretionary",
  "Luxury",
] as const;

export const GROUP_TYPES = [
  "Income",
  "Fixed",
  "Variable",
  "Discretionary",
  "Savings",
  "Debt",
] as const;
