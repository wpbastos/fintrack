export interface Category {
  id: number;
  categoryName: string;
  necessityLevel: string;
  monthlyBudget: number | null;
  notes: string | null;
  isActive: boolean;
  sortOrder: number | null;
  parentCategoryId: number | null;
  groupId: number;
}

export interface CategoryWithChildren extends Category {
  childCategories: Category[];
}

export interface CategoryGroup {
  id: number;
  groupName: string;
  groupType: string;
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
