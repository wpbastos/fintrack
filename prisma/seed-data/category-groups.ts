/**
 * Category Groups - High-level groupings for budget categories
 */

import type { CategoryGroup } from "./types";

export const categoryGroups: CategoryGroup[] = [
  // Income Groups - Green shades
  { groupName: "Employment Income", groupType: "Income", color: "#10b981", sortOrder: 1, notes: "Salary, wages, bonuses" },
  { groupName: "Government Benefits", groupType: "Income", color: "#14b8a6", sortOrder: 2, notes: "CCB, GST, tax refunds" },
  { groupName: "Investment Income", groupType: "Income", color: "#06b6d4", sortOrder: 3, notes: "Dividends, interest, capital gains" },
  { groupName: "Other Income", groupType: "Income", color: "#84cc16", sortOrder: 4, notes: "Gifts, reimbursements, refunds" },
  // Expense Groups - Various colors
  { groupName: "Housing", groupType: "Expense", color: "#64748b", sortOrder: 10, notes: "Rent, mortgage, property costs" },
  { groupName: "Utilities", groupType: "Expense", color: "#eab308", sortOrder: 11, notes: "Hydro, gas, water, internet" },
  { groupName: "Food & Dining", groupType: "Expense", color: "#f97316", sortOrder: 12, notes: "Groceries, restaurants, delivery" },
  { groupName: "Transportation", groupType: "Expense", color: "#3b82f6", sortOrder: 13, notes: "Car, gas, transit, parking" },
  { groupName: "Healthcare", groupType: "Expense", color: "#ef4444", sortOrder: 14, notes: "Medical, dental, pharmacy" },
  { groupName: "Insurance", groupType: "Expense", color: "#6366f1", sortOrder: 15, notes: "Home, auto, life insurance" },
  { groupName: "Personal Care", groupType: "Expense", color: "#ec4899", sortOrder: 16, notes: "Haircuts, toiletries, gym" },
  { groupName: "Shopping", groupType: "Expense", color: "#a855f7", sortOrder: 17, notes: "Clothing, electronics, household" },
  { groupName: "Entertainment", groupType: "Expense", color: "#d946ef", sortOrder: 18, notes: "Streaming, hobbies, events" },
  { groupName: "Education", groupType: "Expense", color: "#0ea5e9", sortOrder: 19, notes: "Tuition, books, courses" },
  { groupName: "Kids & Family", groupType: "Expense", color: "#f43f5e", sortOrder: 20, notes: "Childcare, activities, school" },
  { groupName: "Pets", groupType: "Expense", color: "#d97706", sortOrder: 21, notes: "Vet, food, supplies" },
  { groupName: "Financial", groupType: "Expense", color: "#78716c", sortOrder: 22, notes: "Bank fees, interest charges" },
  { groupName: "Gifts & Donations", groupType: "Expense", color: "#f472b6", sortOrder: 23, notes: "Presents, charity" },
  { groupName: "Miscellaneous", groupType: "Expense", color: "#71717a", sortOrder: 24, notes: "Other expenses" },
  // Transfer & Investment - Blue/Purple shades
  { groupName: "Transfers", groupType: "Transfer", color: "#0ea5e9", sortOrder: 30, notes: "Between accounts" },
  { groupName: "Investments", groupType: "Investment", color: "#8b5cf6", sortOrder: 31, notes: "RRSP, TFSA, RESP contributions" },
];
