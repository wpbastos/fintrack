/**
 * Category Groups - High-level groupings for budget categories
 */

import type { CategoryGroup } from "./types";

export const categoryGroups: CategoryGroup[] = [
  // Income Groups - Green shades
  { groupName: "Earned Income", groupType: "Income", color: "#10b981", sortOrder: 1, notes: "Salary, wages, bonuses" },
  { groupName: "Other Income", groupType: "Income", color: "#84cc16", sortOrder: 2, notes: "Benefits, interest, refunds, reimbursements" },
  // Expense Groups - Various colors
  { groupName: "Housing", groupType: "Expense", color: "#64748b", sortOrder: 10, notes: "Mortgage, property tax, maintenance" },
  { groupName: "Utilities", groupType: "Expense", color: "#eab308", sortOrder: 11, notes: "Hydro, gas, water, internet, phone" },
  { groupName: "Groceries & Dining", groupType: "Expense", color: "#f97316", sortOrder: 12, notes: "Groceries, eating out, alcohol" },
  { groupName: "Transportation", groupType: "Expense", color: "#3b82f6", sortOrder: 13, notes: "Fuel, car payment, insurance, maintenance" },
  { groupName: "Health & Personal Care", groupType: "Expense", color: "#ef4444", sortOrder: 14, notes: "Medical, dental, pharmacy, fitness, grooming" },
  { groupName: "Insurance", groupType: "Expense", color: "#6366f1", sortOrder: 15, notes: "Home, life, health insurance premiums" },
  { groupName: "Kids & Education", groupType: "Expense", color: "#f43f5e", sortOrder: 16, notes: "Activities, school, tuition" },
  { groupName: "Shopping & Entertainment", groupType: "Expense", color: "#a855f7", sortOrder: 17, notes: "Clothing, electronics, household, pets, hobbies" },
  { groupName: "Subscriptions", groupType: "Expense", color: "#d946ef", sortOrder: 18, notes: "Digital services, streaming, software" },
  { groupName: "Financial", groupType: "Expense", color: "#78716c", sortOrder: 19, notes: "Bank fees, interest charges" },
  { groupName: "Gifts & Donations", groupType: "Expense", color: "#f472b6", sortOrder: 20, notes: "Gifts, charity" },
  // Transfer & Investment - Blue/Purple shades
  { groupName: "Transfers", groupType: "Transfer", color: "#0ea5e9", sortOrder: 30, notes: "Internal and e-Transfers" },
  { groupName: "Credit Card Payments", groupType: "Transfer", color: "#06b6d4", sortOrder: 31, notes: "Credit card bill payments" },
  { groupName: "Investments", groupType: "Investment", color: "#8b5cf6", sortOrder: 32, notes: "RRSP, TFSA, RESP, mutual funds" },
];
