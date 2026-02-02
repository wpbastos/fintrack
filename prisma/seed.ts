/**
 * Prisma Seed File
 * Seeds Merchants and MerchantPatterns tables
 *
 * Run with: npx prisma db seed
 */

import { PrismaClient } from "../src/generated/prisma";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

// ============================================================================
// COLOR UTILITIES - Generate category color variants from group color
// ============================================================================

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 50 };

  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Generate a color variant from a base color
 * @param baseColor - Hex color of the group
 * @param index - Category index within the group (0-based)
 * @param total - Total categories in the group
 * @returns Hex color variant
 */
function generateColorVariant(baseColor: string, index: number, total: number): string {
  const { h, s, l } = hexToHsl(baseColor);

  // Spread lightness across a range centered on the base
  // Categories get slightly different lightness values
  const lightnessRange = Math.min(35, total * 8); // Max 35% range
  const step = total > 1 ? lightnessRange / (total - 1) : 0;
  const startLightness = Math.max(25, l - lightnessRange / 2);
  const newLightness = Math.min(75, startLightness + step * index);

  // Slight hue shift for variety (max ±10 degrees)
  const hueShift = total > 1 ? ((index - (total - 1) / 2) / total) * 10 : 0;
  const newHue = (h + hueShift + 360) % 360;

  return hslToHex(newHue, s, newLightness);
}

// ============================================================================
// CATEGORY GROUPS (High-level groupings)
// ============================================================================
const categoryGroups: Array<{
  groupName: string;
  groupType: "Income" | "Expense" | "Transfer" | "Investment";
  color: string;
  sortOrder: number;
  notes: string;
}> = [
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

// ============================================================================
// CATEGORIES (Budget categories with NecessityLevel)
// sortOrder is relative within each group (1, 2, 3...)
// Colors are generated dynamically from group color during seeding
// ============================================================================
const categories: Array<{
  categoryName: string;
  groupName: string;
  necessityLevel: "Essential" | "Important" | "Discretionary" | "Wasteful";
  monthlyBudget: number | null;
  sortOrder: number;
  notes: string | null;
}> = [
  // Employment Income
  { categoryName: "Salary", groupName: "Employment Income", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 1, notes: "Regular salary income" },
  { categoryName: "Bonus", groupName: "Employment Income", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 2, notes: "Performance bonuses" },
  { categoryName: "Overtime", groupName: "Employment Income", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 3, notes: "Overtime pay" },

  // Government Benefits
  { categoryName: "CCB", groupName: "Government Benefits", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 1, notes: "Canada Child Benefit" },
  { categoryName: "GST/HST Credit", groupName: "Government Benefits", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 2, notes: "GST/HST rebate" },
  { categoryName: "Tax Refund", groupName: "Government Benefits", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 3, notes: "Income tax refund" },

  // Investment Income
  { categoryName: "Dividends", groupName: "Investment Income", necessityLevel: "Discretionary", monthlyBudget: null, sortOrder: 1, notes: "Dividend income" },
  { categoryName: "Interest Income", groupName: "Investment Income", necessityLevel: "Discretionary", monthlyBudget: null, sortOrder: 2, notes: "Interest earned" },

  // Other Income
  { categoryName: "Refund", groupName: "Other Income", necessityLevel: "Discretionary", monthlyBudget: null, sortOrder: 1, notes: "Purchase refunds" },
  { categoryName: "Gift Received", groupName: "Other Income", necessityLevel: "Discretionary", monthlyBudget: null, sortOrder: 2, notes: "Monetary gifts received" },
  { categoryName: "Reimbursement", groupName: "Other Income", necessityLevel: "Discretionary", monthlyBudget: null, sortOrder: 3, notes: "Expense reimbursements" },

  // Housing
  { categoryName: "Rent", groupName: "Housing", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 1, notes: "Monthly rent payment" },
  { categoryName: "Mortgage", groupName: "Housing", necessityLevel: "Essential", monthlyBudget: 2850, sortOrder: 2, notes: "Principal and interest payments" },
  { categoryName: "Property Tax", groupName: "Housing", necessityLevel: "Essential", monthlyBudget: 450, sortOrder: 3, notes: "Annual property taxes" },
  { categoryName: "Condo Fees", groupName: "Housing", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 4, notes: "Monthly condo/strata fees" },
  { categoryName: "Home Maintenance", groupName: "Housing", necessityLevel: "Important", monthlyBudget: 250, sortOrder: 5, notes: "Repairs, lawn care, snow removal" },
  { categoryName: "Home Improvement", groupName: "Housing", necessityLevel: "Discretionary", monthlyBudget: 200, sortOrder: 6, notes: "Renovations, upgrades" },

  // Utilities
  { categoryName: "Electricity", groupName: "Utilities", necessityLevel: "Essential", monthlyBudget: 180, sortOrder: 1, notes: "Monthly electricity bill" },
  { categoryName: "Natural Gas", groupName: "Utilities", necessityLevel: "Essential", monthlyBudget: 140, sortOrder: 2, notes: "Natural gas for heating" },
  { categoryName: "Water", groupName: "Utilities", necessityLevel: "Essential", monthlyBudget: 85, sortOrder: 3, notes: "Water and sewer services" },
  { categoryName: "Internet", groupName: "Utilities", necessityLevel: "Essential", monthlyBudget: 100, sortOrder: 4, notes: "High-speed internet service" },
  { categoryName: "Mobile Phone", groupName: "Utilities", necessityLevel: "Essential", monthlyBudget: 200, sortOrder: 5, notes: "Mobile phone plans" },
  { categoryName: "Home Phone", groupName: "Utilities", necessityLevel: "Discretionary", monthlyBudget: null, sortOrder: 6, notes: "Landline phone" },

  // Food & Dining
  { categoryName: "Groceries", groupName: "Food & Dining", necessityLevel: "Essential", monthlyBudget: 1700, sortOrder: 1, notes: "Grocery shopping" },
  { categoryName: "Restaurants", groupName: "Food & Dining", necessityLevel: "Discretionary", monthlyBudget: 250, sortOrder: 2, notes: "Dining out" },
  { categoryName: "Fast Food", groupName: "Food & Dining", necessityLevel: "Discretionary", monthlyBudget: 150, sortOrder: 3, notes: "Quick service restaurants" },
  { categoryName: "Coffee Shops", groupName: "Food & Dining", necessityLevel: "Wasteful", monthlyBudget: 80, sortOrder: 4, notes: "Coffee and cafe purchases" },
  { categoryName: "Food Delivery", groupName: "Food & Dining", necessityLevel: "Wasteful", monthlyBudget: 60, sortOrder: 5, notes: "Delivery service orders" },
  { categoryName: "Alcohol", groupName: "Food & Dining", necessityLevel: "Discretionary", monthlyBudget: 100, sortOrder: 6, notes: "Beer, wine, spirits" },

  // Transportation
  { categoryName: "Gas", groupName: "Transportation", necessityLevel: "Essential", monthlyBudget: 300, sortOrder: 1, notes: "Fuel for vehicles" },
  { categoryName: "Car Payment", groupName: "Transportation", necessityLevel: "Essential", monthlyBudget: 550, sortOrder: 2, notes: "Vehicle loan or lease payment" },
  { categoryName: "Car Insurance", groupName: "Transportation", necessityLevel: "Essential", monthlyBudget: 250, sortOrder: 3, notes: "Auto insurance premiums" },
  { categoryName: "Car Maintenance", groupName: "Transportation", necessityLevel: "Important", monthlyBudget: 150, sortOrder: 4, notes: "Oil changes, tires, repairs" },
  { categoryName: "Parking", groupName: "Transportation", necessityLevel: "Important", monthlyBudget: 50, sortOrder: 5, notes: "Parking fees" },
  { categoryName: "Public Transit", groupName: "Transportation", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 6, notes: "Bus, subway, train fares" },
  { categoryName: "Ride Share", groupName: "Transportation", necessityLevel: "Discretionary", monthlyBudget: 30, sortOrder: 7, notes: "Uber, Lyft rides" },
  { categoryName: "Tolls", groupName: "Transportation", necessityLevel: "Important", monthlyBudget: null, sortOrder: 8, notes: "Highway tolls" },

  // Healthcare
  { categoryName: "Pharmacy", groupName: "Healthcare", necessityLevel: "Essential", monthlyBudget: 75, sortOrder: 1, notes: "Prescriptions and medications" },
  { categoryName: "Doctor", groupName: "Healthcare", necessityLevel: "Essential", monthlyBudget: 25, sortOrder: 2, notes: "Medical appointments" },
  { categoryName: "Dental", groupName: "Healthcare", necessityLevel: "Important", monthlyBudget: 120, sortOrder: 3, notes: "Dental care and cleanings" },
  { categoryName: "Vision", groupName: "Healthcare", necessityLevel: "Important", monthlyBudget: 50, sortOrder: 4, notes: "Eye exams, glasses, contacts" },
  { categoryName: "Mental Health", groupName: "Healthcare", necessityLevel: "Important", monthlyBudget: 100, sortOrder: 5, notes: "Therapy, counseling" },

  // Insurance
  { categoryName: "Home Insurance", groupName: "Insurance", necessityLevel: "Essential", monthlyBudget: 175, sortOrder: 1, notes: "Property insurance" },
  { categoryName: "Life Insurance", groupName: "Insurance", necessityLevel: "Important", monthlyBudget: 125, sortOrder: 2, notes: "Life insurance premiums" },
  { categoryName: "Health Insurance", groupName: "Insurance", necessityLevel: "Important", monthlyBudget: 80, sortOrder: 3, notes: "Extended health coverage" },

  // Personal Care
  { categoryName: "Haircut", groupName: "Personal Care", necessityLevel: "Important", monthlyBudget: 120, sortOrder: 1, notes: "Hair styling and cuts" },
  { categoryName: "Gym", groupName: "Personal Care", necessityLevel: "Discretionary", monthlyBudget: 80, sortOrder: 2, notes: "Gym membership" },
  { categoryName: "Personal Products", groupName: "Personal Care", necessityLevel: "Important", monthlyBudget: 100, sortOrder: 3, notes: "Toiletries and cosmetics" },
  { categoryName: "Spa & Beauty", groupName: "Personal Care", necessityLevel: "Discretionary", monthlyBudget: 60, sortOrder: 4, notes: "Spa treatments, beauty services" },

  // Shopping
  { categoryName: "Clothing", groupName: "Shopping", necessityLevel: "Important", monthlyBudget: 200, sortOrder: 1, notes: "Clothing purchases" },
  { categoryName: "Electronics", groupName: "Shopping", necessityLevel: "Discretionary", monthlyBudget: 75, sortOrder: 2, notes: "Devices and accessories" },
  { categoryName: "Household Items", groupName: "Shopping", necessityLevel: "Important", monthlyBudget: 125, sortOrder: 3, notes: "Home supplies and tools" },
  { categoryName: "Furniture", groupName: "Shopping", necessityLevel: "Discretionary", monthlyBudget: 50, sortOrder: 4, notes: "Furniture purchases" },

  // Entertainment
  { categoryName: "Streaming Services", groupName: "Entertainment", necessityLevel: "Discretionary", monthlyBudget: 65, sortOrder: 1, notes: "Video and music streaming" },
  { categoryName: "Gaming", groupName: "Entertainment", necessityLevel: "Discretionary", monthlyBudget: 50, sortOrder: 2, notes: "Games and subscriptions" },
  { categoryName: "Movies & Events", groupName: "Entertainment", necessityLevel: "Discretionary", monthlyBudget: 120, sortOrder: 3, notes: "Movies, concerts, events" },
  { categoryName: "Books & Media", groupName: "Entertainment", necessityLevel: "Discretionary", monthlyBudget: 30, sortOrder: 4, notes: "Books and magazines" },
  { categoryName: "Hobbies", groupName: "Entertainment", necessityLevel: "Discretionary", monthlyBudget: 75, sortOrder: 5, notes: "Hobby supplies and gear" },
  { categoryName: "Sports & Recreation", groupName: "Entertainment", necessityLevel: "Discretionary", monthlyBudget: 50, sortOrder: 6, notes: "Sports and recreation" },
  { categoryName: "Vacation", groupName: "Entertainment", necessityLevel: "Discretionary", monthlyBudget: 400, sortOrder: 7, notes: "Travel and vacation savings" },

  // Education
  { categoryName: "Tuition", groupName: "Education", necessityLevel: "Important", monthlyBudget: null, sortOrder: 1, notes: "School tuition fees" },
  { categoryName: "Books & Supplies", groupName: "Education", necessityLevel: "Important", monthlyBudget: 40, sortOrder: 2, notes: "School supplies and textbooks" },
  { categoryName: "Online Courses", groupName: "Education", necessityLevel: "Discretionary", monthlyBudget: 25, sortOrder: 3, notes: "Online learning platforms" },

  // Kids & Family
  { categoryName: "Childcare", groupName: "Kids & Family", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 1, notes: "Daycare and childcare" },
  { categoryName: "Kids Activities", groupName: "Kids & Family", necessityLevel: "Important", monthlyBudget: 700, sortOrder: 2, notes: "Sports, lessons, activities" },
  { categoryName: "School Expenses", groupName: "Kids & Family", necessityLevel: "Important", monthlyBudget: 100, sortOrder: 3, notes: "School fees and trips" },
  { categoryName: "Kids Clothing", groupName: "Kids & Family", necessityLevel: "Important", monthlyBudget: 200, sortOrder: 4, notes: "Children's clothing" },
  { categoryName: "Toys & Games", groupName: "Kids & Family", necessityLevel: "Discretionary", monthlyBudget: 50, sortOrder: 5, notes: "Toys and games" },

  // Pets
  { categoryName: "Pet Food", groupName: "Pets", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 1, notes: "Pet food and treats" },
  { categoryName: "Vet", groupName: "Pets", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 2, notes: "Veterinary care" },
  { categoryName: "Pet Supplies", groupName: "Pets", necessityLevel: "Important", monthlyBudget: null, sortOrder: 3, notes: "Pet supplies and accessories" },
  { categoryName: "Pet Grooming", groupName: "Pets", necessityLevel: "Discretionary", monthlyBudget: null, sortOrder: 4, notes: "Grooming services" },

  // Financial
  { categoryName: "Bank Fees", groupName: "Financial", necessityLevel: "Wasteful", monthlyBudget: 20, sortOrder: 1, notes: "Bank account fees" },
  { categoryName: "Credit Card Interest", groupName: "Financial", necessityLevel: "Wasteful", monthlyBudget: 0, sortOrder: 2, notes: "Interest charges" },
  { categoryName: "Loan Interest", groupName: "Financial", necessityLevel: "Important", monthlyBudget: null, sortOrder: 3, notes: "Loan interest payments" },

  // Gifts & Donations
  { categoryName: "Gifts Given", groupName: "Gifts & Donations", necessityLevel: "Discretionary", monthlyBudget: 150, sortOrder: 1, notes: "Gifts for others" },
  { categoryName: "Charity", groupName: "Gifts & Donations", necessityLevel: "Discretionary", monthlyBudget: 75, sortOrder: 2, notes: "Charitable donations" },

  // Miscellaneous
  { categoryName: "Other Expense", groupName: "Miscellaneous", necessityLevel: "Discretionary", monthlyBudget: 100, sortOrder: 1, notes: "Uncategorized expenses" },

  // Transfers
  { categoryName: "Transfer", groupName: "Transfers", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 1, notes: "Account transfers" },
  { categoryName: "Credit Card Payment", groupName: "Transfers", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 2, notes: "Credit card payments" },
  { categoryName: "Amex Payment", groupName: "Transfers", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 3, notes: null },
  { categoryName: "Triangle MC Payment", groupName: "Transfers", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 4, notes: null },
  { categoryName: "Walmart MC Payment", groupName: "Transfers", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 5, notes: null },
  { categoryName: "RBC Visa Payment", groupName: "Transfers", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 6, notes: null },
  { categoryName: "Other CC Payment", groupName: "Transfers", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 7, notes: null },

  // Investments
  { categoryName: "RRSP", groupName: "Investments", necessityLevel: "Important", monthlyBudget: 600, sortOrder: 1, notes: "Registered Retirement Savings Plan" },
  { categoryName: "TFSA", groupName: "Investments", necessityLevel: "Important", monthlyBudget: 400, sortOrder: 2, notes: "Tax-Free Savings Account" },
  { categoryName: "RESP", groupName: "Investments", necessityLevel: "Important", monthlyBudget: 420, sortOrder: 3, notes: "Registered Education Savings Plan" },
  { categoryName: "FHSA", groupName: "Investments", necessityLevel: "Important", monthlyBudget: null, sortOrder: 4, notes: "First Home Savings Account" },
  { categoryName: "Non-Registered", groupName: "Investments", necessityLevel: "Discretionary", monthlyBudget: 200, sortOrder: 5, notes: "Non-registered investments" },
  { categoryName: "Stocks", groupName: "Investments", necessityLevel: "Discretionary", monthlyBudget: null, sortOrder: 6, notes: "Individual stock purchases" },
];

// Merchant data with their patterns and category mappings
const merchantsWithPatterns: Array<{
  merchantName: string;
  merchantType: string;
  categoryName: string; // Links to Category for default categorization
  website: string | null;
  hasAlternative: boolean;
  alternativeName: string | null;
  alternativeSavings: number | null;
  notes: string | null;
  patterns: Array<{ pattern: string; priority: number; notes: string | null }>;
}> = [
  // ============================================================================
  // GROCERY STORES - Category: Groceries
  // ============================================================================
  {
    merchantName: "Costco",
    merchantType: "Grocery",
    categoryName: "Groceries",
    website: "https://www.costco.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Warehouse club",
    patterns: [
      { pattern: "COSTCO", priority: 10, notes: null },
      { pattern: "COSTCO WHOLESALE", priority: 15, notes: null },
    ],
  },
  {
    merchantName: "Walmart",
    merchantType: "Grocery",
    categoryName: "Groceries",
    website: "https://www.walmart.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Discount retailer",
    patterns: [
      { pattern: "WALMART", priority: 10, notes: null },
      { pattern: "WAL-MART", priority: 10, notes: null },
      { pattern: "WM SUPERCENTER", priority: 10, notes: null },
      { pattern: "WALMARTCA", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Loblaws",
    merchantType: "Grocery",
    categoryName: "Groceries",
    website: "https://www.loblaws.ca",
    hasAlternative: true,
    alternativeName: "No Frills",
    alternativeSavings: 50,
    notes: "Premium grocery - Loblaw Companies",
    patterns: [
      { pattern: "LOBLAWS", priority: 10, notes: null },
      { pattern: "LOBLAW", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "No Frills",
    merchantType: "Grocery",
    categoryName: "Groceries",
    website: "https://www.nofrills.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Discount grocery - Loblaw Companies",
    patterns: [
      { pattern: "NO FRILLS", priority: 10, notes: null },
      { pattern: "NOFRILLS", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Real Canadian Superstore",
    merchantType: "Grocery",
    categoryName: "Groceries",
    website: "https://www.realcanadiansuperstore.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Loblaw banner",
    patterns: [
      { pattern: "SUPERSTORE", priority: 10, notes: null },
      { pattern: "RCSS", priority: 10, notes: null },
      { pattern: "REAL CANADIAN", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Sobeys",
    merchantType: "Grocery",
    categoryName: "Groceries",
    website: "https://www.sobeys.com",
    hasAlternative: true,
    alternativeName: "FreshCo",
    alternativeSavings: 40,
    notes: "Empire Company banner",
    patterns: [{ pattern: "SOBEYS", priority: 10, notes: null }],
  },
  {
    merchantName: "FreshCo",
    merchantType: "Grocery",
    categoryName: "Groceries",
    website: "https://www.freshco.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Discount - Empire Company",
    patterns: [{ pattern: "FRESHCO", priority: 10, notes: null }],
  },
  {
    merchantName: "Metro",
    merchantType: "Grocery",
    categoryName: "Groceries",
    website: "https://www.metro.ca",
    hasAlternative: true,
    alternativeName: "Food Basics",
    alternativeSavings: 40,
    notes: "Quebec/Ontario",
    patterns: [
      { pattern: "METRO INC", priority: 15, notes: null },
      { pattern: "METRO RICHELIEU", priority: 15, notes: null },
      { pattern: "METRO", priority: 5, notes: "Lower priority - common word" },
    ],
  },
  {
    merchantName: "Food Basics",
    merchantType: "Grocery",
    categoryName: "Groceries",
    website: "https://www.foodbasics.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Discount - Metro Inc",
    patterns: [{ pattern: "FOOD BASICS", priority: 10, notes: null }],
  },
  {
    merchantName: "Safeway",
    merchantType: "Grocery",
    categoryName: "Groceries",
    website: "https://www.safeway.ca",
    hasAlternative: true,
    alternativeName: "FreshCo",
    alternativeSavings: 30,
    notes: "Western Canada - Sobeys banner",
    patterns: [{ pattern: "SAFEWAY", priority: 10, notes: null }],
  },
  {
    merchantName: "Save-On-Foods",
    merchantType: "Grocery",
    categoryName: "Groceries",
    website: "https://www.saveonfoods.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Western Canada - Pattison Food Group",
    patterns: [
      { pattern: "SAVE ON FOODS", priority: 10, notes: null },
      { pattern: "SAVE-ON-FOODS", priority: 10, notes: null },
      { pattern: "SAVEONFOODS", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "IGA",
    merchantType: "Grocery",
    categoryName: "Groceries",
    website: "https://www.iga.net",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Empire Company - primarily Quebec",
    patterns: [
      { pattern: "IGA EXTRA", priority: 15, notes: null },
      { pattern: "IGA", priority: 5, notes: "Lower priority - short" },
    ],
  },
  {
    merchantName: "Farm Boy",
    merchantType: "Grocery",
    categoryName: "Groceries",
    website: "https://www.farmboy.ca",
    hasAlternative: true,
    alternativeName: "No Frills",
    alternativeSavings: 60,
    notes: "Premium - Empire Company",
    patterns: [
      { pattern: "FARM BOY", priority: 10, notes: null },
      { pattern: "FARMBOY", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "T&T Supermarket",
    merchantType: "Grocery",
    categoryName: "Groceries",
    website: "https://www.tnt-supermarket.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Asian grocery - Loblaw Companies",
    patterns: [
      { pattern: "T&T SUPERMARKET", priority: 15, notes: null },
      { pattern: "T&T", priority: 10, notes: null },
      { pattern: "T & T", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Whole Foods",
    merchantType: "Grocery",
    categoryName: "Groceries",
    website: "https://www.wholefoodsmarket.com",
    hasAlternative: true,
    alternativeName: "Costco",
    alternativeSavings: 80,
    notes: "Premium organic - Amazon",
    patterns: [
      { pattern: "WHOLE FOODS", priority: 10, notes: null },
      { pattern: "WHOLEFOODS", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Fortinos",
    merchantType: "Grocery",
    categoryName: "Groceries",
    website: "https://www.fortinos.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Loblaw premium - Ontario",
    patterns: [{ pattern: "FORTINOS", priority: 10, notes: null }],
  },
  {
    merchantName: "Foodland",
    merchantType: "Grocery",
    categoryName: "Groceries",
    website: "https://www.foodland.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Empire Company - rural Ontario",
    patterns: [{ pattern: "FOODLAND", priority: 10, notes: null }],
  },
  {
    merchantName: "Bulk Barn",
    merchantType: "Grocery",
    categoryName: "Groceries",
    website: "https://www.bulkbarn.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Bulk food store",
    patterns: [
      { pattern: "BULK BARN", priority: 10, notes: null },
      { pattern: "BULKBARN", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Longos",
    merchantType: "Grocery",
    categoryName: "Groceries",
    website: "https://www.longos.com",
    hasAlternative: true,
    alternativeName: "No Frills",
    alternativeSavings: 50,
    notes: "Premium grocery - GTA",
    patterns: [
      { pattern: "LONGOS", priority: 10, notes: null },
      { pattern: "LONGO'S", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Valu-mart",
    merchantType: "Grocery",
    categoryName: "Groceries",
    website: "https://www.valumart.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Loblaw banner - small format",
    patterns: [
      { pattern: "VALU-MART", priority: 10, notes: null },
      { pattern: "VALUMART", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Your Independent Grocer",
    merchantType: "Grocery",
    categoryName: "Groceries",
    website: "https://www.yourindependentgrocer.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Loblaw banner",
    patterns: [
      { pattern: "YOUR INDEPENDENT", priority: 10, notes: null },
      { pattern: "INDEPENDENT GROCER", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Maxi",
    merchantType: "Grocery",
    categoryName: "Groceries",
    website: "https://www.maxi.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Loblaw discount - Quebec",
    patterns: [{ pattern: "MAXI", priority: 5, notes: "Lower priority - common word" }],
  },
  {
    merchantName: "Provigo",
    merchantType: "Grocery",
    categoryName: "Groceries",
    website: "https://www.provigo.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Loblaw banner - Quebec",
    patterns: [{ pattern: "PROVIGO", priority: 10, notes: null }],
  },
  {
    merchantName: "Atlantic Superstore",
    merchantType: "Grocery",
    categoryName: "Groceries",
    website: "https://www.atlanticsuperstore.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Loblaw banner - Atlantic Canada",
    patterns: [{ pattern: "ATLANTIC SUPERSTORE", priority: 10, notes: null }],
  },
  {
    merchantName: "Thrifty Foods",
    merchantType: "Grocery",
    categoryName: "Groceries",
    website: "https://www.thriftyfoods.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Sobeys banner - BC",
    patterns: [{ pattern: "THRIFTY FOODS", priority: 10, notes: null }],
  },

  // ============================================================================
  // PHARMACY/DRUG STORES - Category: Pharmacy
  // ============================================================================
  {
    merchantName: "Shoppers Drug Mart",
    merchantType: "Pharmacy",
    categoryName: "Pharmacy",
    website: "https://www.shoppersdrugmart.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Loblaw Companies",
    patterns: [
      { pattern: "SHOPPERS DRUG", priority: 15, notes: null },
      { pattern: "SHOPPERS", priority: 10, notes: null },
      { pattern: "SDM", priority: 5, notes: null },
    ],
  },
  {
    merchantName: "Rexall",
    merchantType: "Pharmacy",
    categoryName: "Pharmacy",
    website: "https://www.rexall.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "McKesson Canada",
    patterns: [{ pattern: "REXALL", priority: 10, notes: null }],
  },
  {
    merchantName: "Pharmaprix",
    merchantType: "Pharmacy",
    categoryName: "Pharmacy",
    website: "https://www.pharmaprix.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Quebec - Shoppers Drug Mart",
    patterns: [{ pattern: "PHARMAPRIX", priority: 10, notes: null }],
  },
  {
    merchantName: "Jean Coutu",
    merchantType: "Pharmacy",
    categoryName: "Pharmacy",
    website: "https://www.jeancoutu.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Quebec - Metro Inc",
    patterns: [
      { pattern: "JEAN COUTU", priority: 10, notes: null },
      { pattern: "PJC", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "London Drugs",
    merchantType: "Pharmacy",
    categoryName: "Pharmacy",
    website: "https://www.londondrugs.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Western Canada",
    patterns: [{ pattern: "LONDON DRUGS", priority: 10, notes: null }],
  },
  {
    merchantName: "Brunet",
    merchantType: "Pharmacy",
    categoryName: "Pharmacy",
    website: "https://www.brunet.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Quebec - Metro Inc",
    patterns: [{ pattern: "BRUNET", priority: 10, notes: null }],
  },

  // ============================================================================
  // GAS STATIONS - Category: Gas
  // ============================================================================
  {
    merchantName: "Petro-Canada",
    merchantType: "Gas",
    categoryName: "Gas",
    website: "https://www.petro-canada.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Suncor Energy",
    patterns: [
      { pattern: "PETRO-CANADA", priority: 10, notes: null },
      { pattern: "PETRO CANADA", priority: 10, notes: null },
      { pattern: "PETROCAN", priority: 10, notes: null },
      { pattern: "PETRO CAN", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Esso",
    merchantType: "Gas",
    categoryName: "Gas",
    website: "https://www.esso.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Imperial Oil",
    patterns: [
      { pattern: "ESSO", priority: 10, notes: null },
      { pattern: "IMPERIAL OIL", priority: 10, notes: null },
      { pattern: "EXXON", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Shell",
    merchantType: "Gas",
    categoryName: "Gas",
    website: "https://www.shell.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: null,
    patterns: [
      { pattern: "SHELL", priority: 10, notes: null },
      { pattern: "SHELL CANADA", priority: 15, notes: null },
    ],
  },
  {
    merchantName: "Canadian Tire Gas",
    merchantType: "Gas",
    categoryName: "Gas",
    website: "https://www.canadiantire.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "CT money rewards",
    patterns: [
      { pattern: "CANADIAN TIRE GAS", priority: 15, notes: null },
      { pattern: "CT GAS", priority: 15, notes: null },
    ],
  },
  {
    merchantName: "Costco Gas",
    merchantType: "Gas",
    categoryName: "Gas",
    website: "https://www.costco.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Members only - lowest prices",
    patterns: [
      { pattern: "COSTCO GAS", priority: 15, notes: null },
      { pattern: "COSTCO GASOLINE", priority: 15, notes: null },
    ],
  },
  {
    merchantName: "Pioneer",
    merchantType: "Gas",
    categoryName: "Gas",
    website: "https://www.pioneerpetroleums.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Parkland Corporation",
    patterns: [
      { pattern: "PIONEER GAS", priority: 15, notes: null },
      { pattern: "PIONEER", priority: 5, notes: "Lower priority - common word" },
    ],
  },
  {
    merchantName: "Ultramar",
    merchantType: "Gas",
    categoryName: "Gas",
    website: "https://www.ultramar.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Parkland Corporation - Eastern Canada",
    patterns: [{ pattern: "ULTRAMAR", priority: 10, notes: null }],
  },
  {
    merchantName: "Husky",
    merchantType: "Gas",
    categoryName: "Gas",
    website: "https://www.myhusky.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Cenovus Energy",
    patterns: [
      { pattern: "HUSKY", priority: 10, notes: null },
      { pattern: "HUSKY ENERGY", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Mobil",
    merchantType: "Gas",
    categoryName: "Gas",
    website: "https://www.mobil.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Imperial Oil",
    patterns: [{ pattern: "MOBIL", priority: 10, notes: null }],
  },
  {
    merchantName: "Co-op Gas",
    merchantType: "Gas",
    categoryName: "Gas",
    website: "https://www.coopconnection.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Federated Co-operatives",
    patterns: [
      { pattern: "CO-OP GAS", priority: 15, notes: null },
      { pattern: "COOP GAS", priority: 15, notes: null },
    ],
  },
  {
    merchantName: "7-Eleven Gas",
    merchantType: "Gas",
    categoryName: "Gas",
    website: "https://www.7-eleven.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Convenience + gas",
    patterns: [
      { pattern: "7-ELEVEN", priority: 10, notes: null },
      { pattern: "7 ELEVEN", priority: 10, notes: null },
      { pattern: "SEVEN ELEVEN", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Circle K",
    merchantType: "Gas",
    categoryName: "Gas",
    website: "https://www.circlek.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Alimentation Couche-Tard",
    patterns: [
      { pattern: "CIRCLE K", priority: 10, notes: null },
      { pattern: "CIRCLEK", priority: 10, notes: null },
    ],
  },

  // ============================================================================
  // COFFEE SHOPS - Category: Coffee Shops
  // ============================================================================
  {
    merchantName: "Tim Hortons",
    merchantType: "Coffee",
    categoryName: "Coffee Shops",
    website: "https://www.timhortons.ca",
    hasAlternative: true,
    alternativeName: "Home coffee",
    alternativeSavings: 4,
    notes: "Restaurant Brands International",
    patterns: [
      { pattern: "TIM HORTON", priority: 10, notes: null },
      { pattern: "TIMS", priority: 10, notes: null },
      { pattern: "TIM'S", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Starbucks",
    merchantType: "Coffee",
    categoryName: "Coffee Shops",
    website: "https://www.starbucks.ca",
    hasAlternative: true,
    alternativeName: "Home coffee",
    alternativeSavings: 6,
    notes: null,
    patterns: [
      { pattern: "STARBUCKS", priority: 10, notes: null },
      { pattern: "SBUX", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "M Square Coffee",
    merchantType: "Coffee",
    categoryName: "Coffee Shops",
    website: null,
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Local coffee shop",
    patterns: [{ pattern: "M SQUARE", priority: 10, notes: null }],
  },
  {
    merchantName: "Second Cup",
    merchantType: "Coffee",
    categoryName: "Coffee Shops",
    website: "https://www.secondcup.com",
    hasAlternative: true,
    alternativeName: "Home coffee",
    alternativeSavings: 5,
    notes: "Canadian coffee chain",
    patterns: [{ pattern: "SECOND CUP", priority: 10, notes: null }],
  },
  {
    merchantName: "Bridgehead",
    merchantType: "Coffee",
    categoryName: "Coffee Shops",
    website: "https://www.bridgehead.ca",
    hasAlternative: true,
    alternativeName: "Home coffee",
    alternativeSavings: 5,
    notes: "Ottawa-based coffee chain",
    patterns: [{ pattern: "BRIDGEHEAD", priority: 10, notes: null }],
  },

  // ============================================================================
  // FAST FOOD - Category: Fast Food
  // ============================================================================
  {
    merchantName: "McDonalds",
    merchantType: "Fast Food",
    categoryName: "Fast Food",
    website: "https://www.mcdonalds.ca",
    hasAlternative: true,
    alternativeName: "Cook at home",
    alternativeSavings: 10,
    notes: null,
    patterns: [
      { pattern: "MCDONALD", priority: 10, notes: null },
      { pattern: "MCD'S", priority: 10, notes: null },
      { pattern: "MCD", priority: 5, notes: null },
    ],
  },
  {
    merchantName: "Wendys",
    merchantType: "Fast Food",
    categoryName: "Fast Food",
    website: "https://www.wendys.ca",
    hasAlternative: true,
    alternativeName: "Cook at home",
    alternativeSavings: 10,
    notes: null,
    patterns: [
      { pattern: "WENDY'S", priority: 10, notes: null },
      { pattern: "WENDY", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Burger King",
    merchantType: "Fast Food",
    categoryName: "Fast Food",
    website: "https://www.burgerking.ca",
    hasAlternative: true,
    alternativeName: "Cook at home",
    alternativeSavings: 10,
    notes: "Restaurant Brands International",
    patterns: [
      { pattern: "BURGER KING", priority: 10, notes: null },
      { pattern: "BK ", priority: 5, notes: null },
    ],
  },
  {
    merchantName: "Subway",
    merchantType: "Fast Food",
    categoryName: "Fast Food",
    website: "https://www.subway.ca",
    hasAlternative: true,
    alternativeName: "Pack lunch",
    alternativeSavings: 8,
    notes: null,
    patterns: [{ pattern: "SUBWAY", priority: 10, notes: null }],
  },
  {
    merchantName: "A&W",
    merchantType: "Fast Food",
    categoryName: "Fast Food",
    website: "https://www.aw.ca",
    hasAlternative: true,
    alternativeName: "Cook at home",
    alternativeSavings: 10,
    notes: "A&W Canada (separate from US)",
    patterns: [
      { pattern: "A&W", priority: 10, notes: null },
      { pattern: "A & W", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Pizza Pizza",
    merchantType: "Fast Food",
    categoryName: "Fast Food",
    website: "https://www.pizzapizza.ca",
    hasAlternative: true,
    alternativeName: "Make pizza",
    alternativeSavings: 15,
    notes: "Canadian pizza chain",
    patterns: [{ pattern: "PIZZA PIZZA", priority: 10, notes: null }],
  },
  {
    merchantName: "Popeyes",
    merchantType: "Fast Food",
    categoryName: "Fast Food",
    website: "https://www.popeyes.ca",
    hasAlternative: true,
    alternativeName: "Cook at home",
    alternativeSavings: 12,
    notes: "Restaurant Brands International",
    patterns: [
      { pattern: "POPEYES", priority: 10, notes: null },
      { pattern: "POPEYE'S", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Chipotle",
    merchantType: "Fast Food",
    categoryName: "Fast Food",
    website: "https://www.chipotle.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Mexican fast casual",
    patterns: [{ pattern: "CHIPOTLE", priority: 10, notes: null }],
  },
  {
    merchantName: "KFC",
    merchantType: "Fast Food",
    categoryName: "Fast Food",
    website: "https://www.kfc.ca",
    hasAlternative: true,
    alternativeName: "Cook at home",
    alternativeSavings: 12,
    notes: "Kentucky Fried Chicken",
    patterns: [
      { pattern: "KFC", priority: 10, notes: null },
      { pattern: "KENTUCKY FRIED", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Taco Bell",
    merchantType: "Fast Food",
    categoryName: "Fast Food",
    website: "https://www.tacobell.ca",
    hasAlternative: true,
    alternativeName: "Cook at home",
    alternativeSavings: 10,
    notes: null,
    patterns: [{ pattern: "TACO BELL", priority: 10, notes: null }],
  },
  {
    merchantName: "Harvey's",
    merchantType: "Fast Food",
    categoryName: "Fast Food",
    website: "https://www.harveys.ca",
    hasAlternative: true,
    alternativeName: "Cook at home",
    alternativeSavings: 10,
    notes: "Canadian burger chain - Recipe Unlimited",
    patterns: [
      { pattern: "HARVEY'S", priority: 10, notes: null },
      { pattern: "HARVEYS", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Swiss Chalet",
    merchantType: "Fast Food",
    categoryName: "Fast Food",
    website: "https://www.swisschalet.com",
    hasAlternative: true,
    alternativeName: "Cook at home",
    alternativeSavings: 15,
    notes: "Canadian chain - Recipe Unlimited",
    patterns: [{ pattern: "SWISS CHALET", priority: 10, notes: null }],
  },
  {
    merchantName: "Mary Browns",
    merchantType: "Fast Food",
    categoryName: "Fast Food",
    website: "https://www.marybrowns.com",
    hasAlternative: true,
    alternativeName: "Cook at home",
    alternativeSavings: 12,
    notes: "Canadian fried chicken chain",
    patterns: [
      { pattern: "MARY BROWN", priority: 10, notes: null },
      { pattern: "MARYBROWN", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Dairy Queen",
    merchantType: "Fast Food",
    categoryName: "Fast Food",
    website: "https://www.dairyqueen.com/ca",
    hasAlternative: true,
    alternativeName: "Home desserts",
    alternativeSavings: 8,
    notes: null,
    patterns: [
      { pattern: "DAIRY QUEEN", priority: 10, notes: null },
      { pattern: "DQ ", priority: 5, notes: null },
    ],
  },
  {
    merchantName: "Five Guys",
    merchantType: "Fast Food",
    categoryName: "Fast Food",
    website: "https://www.fiveguys.ca",
    hasAlternative: true,
    alternativeName: "Cook at home",
    alternativeSavings: 15,
    notes: null,
    patterns: [{ pattern: "FIVE GUYS", priority: 10, notes: null }],
  },
  {
    merchantName: "Pita Pit",
    merchantType: "Fast Food",
    categoryName: "Fast Food",
    website: "https://www.pitapit.ca",
    hasAlternative: true,
    alternativeName: "Pack lunch",
    alternativeSavings: 8,
    notes: "Canadian pita chain",
    patterns: [{ pattern: "PITA PIT", priority: 10, notes: null }],
  },
  {
    merchantName: "Panera Bread",
    merchantType: "Fast Food",
    categoryName: "Fast Food",
    website: "https://www.panerabread.com",
    hasAlternative: true,
    alternativeName: "Pack lunch",
    alternativeSavings: 10,
    notes: "Fast casual bakery-cafe",
    patterns: [{ pattern: "PANERA", priority: 10, notes: null }],
  },

  // ============================================================================
  // BAKERY - Category: Groceries
  // ============================================================================
  {
    merchantName: "Cobs Bread",
    merchantType: "Bakery",
    categoryName: "Groceries",
    website: "https://www.cobsbread.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Fresh bakery chain",
    patterns: [
      { pattern: "COBS BREAD", priority: 10, notes: null },
      { pattern: "COBS", priority: 5, notes: null },
    ],
  },

  // ============================================================================
  // FOOD DELIVERY - Category: Food Delivery
  // ============================================================================
  {
    merchantName: "Skip The Dishes",
    merchantType: "Delivery",
    categoryName: "Food Delivery",
    website: "https://www.skipthedishes.com",
    hasAlternative: true,
    alternativeName: "Pick up",
    alternativeSavings: 10,
    notes: "Just Eat Takeaway.com - Canadian service",
    patterns: [
      { pattern: "SKIP THE DISHES", priority: 10, notes: null },
      { pattern: "SKIPTHEDISHES", priority: 10, notes: null },
      { pattern: "SKIP*", priority: 10, notes: null },
      { pattern: "SKIPDISHES", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "DoorDash",
    merchantType: "Delivery",
    categoryName: "Food Delivery",
    website: "https://www.doordash.com",
    hasAlternative: true,
    alternativeName: "Pick up",
    alternativeSavings: 10,
    notes: "Food delivery service",
    patterns: [
      { pattern: "DOORDASH", priority: 10, notes: null },
      { pattern: "DOOR DASH", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Uber Eats",
    merchantType: "Delivery",
    categoryName: "Food Delivery",
    website: "https://www.ubereats.com",
    hasAlternative: true,
    alternativeName: "Pick up",
    alternativeSavings: 10,
    notes: "Food delivery service",
    patterns: [
      { pattern: "UBER* EATS", priority: 20, notes: "High priority - match before UBER* TRIP" },
      { pattern: "UBEREATS", priority: 15, notes: null },
      { pattern: "UBER EATS", priority: 15, notes: null },
    ],
  },
  {
    merchantName: "Instacart",
    merchantType: "Delivery",
    categoryName: "Food Delivery",
    website: "https://www.instacart.ca",
    hasAlternative: true,
    alternativeName: "Shop yourself",
    alternativeSavings: 15,
    notes: "Grocery delivery",
    patterns: [{ pattern: "INSTACART", priority: 10, notes: null }],
  },
  {
    merchantName: "Cornershop",
    merchantType: "Delivery",
    categoryName: "Food Delivery",
    website: "https://www.cornershopapp.com",
    hasAlternative: true,
    alternativeName: "Shop yourself",
    alternativeSavings: 15,
    notes: "Uber grocery delivery",
    patterns: [{ pattern: "CORNERSHOP", priority: 10, notes: null }],
  },

  // ============================================================================
  // GENERAL RETAIL - Category: Household Items
  // ============================================================================
  {
    merchantName: "Canadian Tire",
    merchantType: "Retail",
    categoryName: "Household Items",
    website: "https://www.canadiantire.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Hardware, auto, home, sports",
    patterns: [
      { pattern: "CANADIAN TIRE", priority: 10, notes: null },
      { pattern: "CDN TIRE", priority: 10, notes: null },
      { pattern: "CTC ", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Amazon",
    merchantType: "Online",
    categoryName: "Household Items",
    website: "https://www.amazon.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Online marketplace",
    patterns: [
      { pattern: "AMZN MKTP", priority: 20, notes: "Amazon Marketplace" },
      { pattern: "AMZN", priority: 15, notes: "Core identifier" },
      { pattern: "AMAZON.CA", priority: 15, notes: null },
      { pattern: "AMAZON", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Dollarama",
    merchantType: "Discount",
    categoryName: "Household Items",
    website: "https://www.dollarama.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Dollar store chain",
    patterns: [{ pattern: "DOLLARAMA", priority: 10, notes: null }],
  },
  {
    merchantName: "Giant Tiger",
    merchantType: "Discount",
    categoryName: "Household Items",
    website: "https://www.gianttiger.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Canadian discount retailer",
    patterns: [
      { pattern: "GIANT TIGER", priority: 10, notes: null },
      { pattern: "GIANTTIGER", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Home Depot",
    merchantType: "Hardware",
    categoryName: "Home Improvement",
    website: "https://www.homedepot.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Home improvement store",
    patterns: [
      { pattern: "HOME DEPOT", priority: 10, notes: null },
      { pattern: "HOMEDEPOT", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Lowes",
    merchantType: "Hardware",
    categoryName: "Home Improvement",
    website: "https://www.lowes.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Owns Rona",
    patterns: [
      { pattern: "LOWES", priority: 10, notes: null },
      { pattern: "LOWE'S", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Rona",
    merchantType: "Hardware",
    categoryName: "Home Improvement",
    website: "https://www.rona.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Canadian home improvement - owned by Lowes",
    patterns: [{ pattern: "RONA", priority: 10, notes: null }],
  },
  {
    merchantName: "Home Hardware",
    merchantType: "Hardware",
    categoryName: "Home Improvement",
    website: "https://www.homehardware.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Canadian-owned hardware dealer-cooperative",
    patterns: [{ pattern: "HOME HARDWARE", priority: 10, notes: null }],
  },
  {
    merchantName: "IKEA",
    merchantType: "Furniture",
    categoryName: "Furniture",
    website: "https://www.ikea.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: null,
    patterns: [{ pattern: "IKEA", priority: 10, notes: null }],
  },
  {
    merchantName: "Best Buy",
    merchantType: "Electronics",
    categoryName: "Electronics",
    website: "https://www.bestbuy.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: null,
    patterns: [
      { pattern: "BEST BUY", priority: 10, notes: null },
      { pattern: "BESTBUY", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "The Source",
    merchantType: "Electronics",
    categoryName: "Electronics",
    website: "https://www.thesource.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Bell owned",
    patterns: [
      { pattern: "THE SOURCE", priority: 10, notes: null },
      { pattern: "THESOURCE", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Staples",
    merchantType: "Office",
    categoryName: "Household Items",
    website: "https://www.staples.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Office supplies",
    patterns: [
      { pattern: "STAPLES", priority: 10, notes: null },
      { pattern: "BUREAU EN GROS", priority: 10, notes: "Quebec name" },
    ],
  },
  {
    merchantName: "Buck or Two",
    merchantType: "Discount",
    categoryName: "Household Items",
    website: null,
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Dollar store",
    patterns: [{ pattern: "BUCK OR TWO", priority: 10, notes: null }],
  },
  {
    merchantName: "Dollar Choice",
    merchantType: "Discount",
    categoryName: "Household Items",
    website: null,
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Dollar store",
    patterns: [{ pattern: "DOLLAR CHOICE", priority: 10, notes: null }],
  },
  {
    merchantName: "Dollar Tree",
    merchantType: "Discount",
    categoryName: "Household Items",
    website: "https://www.dollartree.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Dollar store chain",
    patterns: [{ pattern: "DOLLAR TREE", priority: 10, notes: null }],
  },

  // ============================================================================
  // CLOTHING - Category: Clothing
  // ============================================================================
  {
    merchantName: "Winners",
    merchantType: "Clothing",
    categoryName: "Clothing",
    website: "https://www.winners.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "TJX Companies discount",
    patterns: [{ pattern: "WINNERS", priority: 10, notes: null }],
  },
  {
    merchantName: "HomeSense",
    merchantType: "Home",
    categoryName: "Household Items",
    website: "https://www.homesense.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "TJX Companies home",
    patterns: [
      { pattern: "HOMESENSE", priority: 10, notes: null },
      { pattern: "HOME SENSE", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Marshalls",
    merchantType: "Clothing",
    categoryName: "Clothing",
    website: "https://www.marshalls.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "TJX Companies discount",
    patterns: [{ pattern: "MARSHALLS", priority: 10, notes: null }],
  },
  {
    merchantName: "Old Navy",
    merchantType: "Clothing",
    categoryName: "Clothing",
    website: "https://www.oldnavy.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Gap Inc",
    patterns: [{ pattern: "OLD NAVY", priority: 10, notes: null }],
  },
  {
    merchantName: "Gap",
    merchantType: "Clothing",
    categoryName: "Clothing",
    website: "https://www.gapcanada.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Gap Inc",
    patterns: [{ pattern: "GAP", priority: 5, notes: "Lower priority - common word" }],
  },
  {
    merchantName: "H&M",
    merchantType: "Clothing",
    categoryName: "Clothing",
    website: "https://www.hm.com/ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: null,
    patterns: [
      { pattern: "H&M", priority: 10, notes: null },
      { pattern: "H & M", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Uniqlo",
    merchantType: "Clothing",
    categoryName: "Clothing",
    website: "https://www.uniqlo.com/ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: null,
    patterns: [{ pattern: "UNIQLO", priority: 10, notes: null }],
  },
  {
    merchantName: "Zara",
    merchantType: "Clothing",
    categoryName: "Clothing",
    website: "https://www.zara.com/ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Inditex",
    patterns: [{ pattern: "ZARA", priority: 10, notes: null }],
  },
  {
    merchantName: "Sport Chek",
    merchantType: "Sports",
    categoryName: "Clothing",
    website: "https://www.sportchek.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Canadian Tire owned",
    patterns: [
      { pattern: "SPORT CHEK", priority: 10, notes: null },
      { pattern: "SPORTCHEK", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Atmosphere",
    merchantType: "Sports",
    categoryName: "Clothing",
    website: "https://www.atmosphere.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Canadian Tire owned - outdoor gear",
    patterns: [{ pattern: "ATMOSPHERE", priority: 10, notes: null }],
  },
  {
    merchantName: "Marks",
    merchantType: "Clothing",
    categoryName: "Clothing",
    website: "https://www.marks.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Canadian Tire owned - work wear",
    patterns: [
      { pattern: "MARK'S", priority: 10, notes: null },
      { pattern: "MARKS WORK", priority: 15, notes: null },
      { pattern: "MARKS", priority: 5, notes: "Lower priority - common word" },
    ],
  },
  {
    merchantName: "Hudson's Bay",
    merchantType: "Department",
    categoryName: "Clothing",
    website: "https://www.thebay.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "HBC - department store",
    patterns: [
      { pattern: "HUDSON'S BAY", priority: 15, notes: null },
      { pattern: "HUDSONS BAY", priority: 15, notes: null },
      { pattern: "THE BAY", priority: 10, notes: null },
      { pattern: "HBC", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Carters",
    merchantType: "Clothing",
    categoryName: "Kids Clothing",
    website: "https://www.carters.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Kids clothing - includes Oshkosh B'Gosh",
    patterns: [
      { pattern: "CARTER'S", priority: 10, notes: null },
      { pattern: "CARTERS", priority: 10, notes: null },
      { pattern: "OSHKOSH", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Simons",
    merchantType: "Department",
    categoryName: "Clothing",
    website: "https://www.simons.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Quebec-based fashion retailer",
    patterns: [{ pattern: "SIMONS", priority: 10, notes: null }],
  },
  {
    merchantName: "Aritzia",
    merchantType: "Clothing",
    categoryName: "Clothing",
    website: "https://www.aritzia.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Canadian fashion house",
    patterns: [{ pattern: "ARITZIA", priority: 10, notes: null }],
  },
  {
    merchantName: "Lululemon",
    merchantType: "Clothing",
    categoryName: "Clothing",
    website: "https://www.lululemon.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Canadian athletic apparel",
    patterns: [{ pattern: "LULULEMON", priority: 10, notes: null }],
  },
  {
    merchantName: "Joe Fresh",
    merchantType: "Clothing",
    categoryName: "Clothing",
    website: "https://www.joefresh.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Loblaw Companies fashion brand",
    patterns: [{ pattern: "JOE FRESH", priority: 10, notes: null }],
  },

  // ============================================================================
  // STREAMING & SUBSCRIPTIONS - Category: Streaming Services
  // ============================================================================
  {
    merchantName: "Netflix",
    merchantType: "Subscription",
    categoryName: "Streaming Services",
    website: "https://www.netflix.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Video streaming",
    patterns: [
      { pattern: "NFLX", priority: 15, notes: "Core identifier" },
      { pattern: "NETFLIX", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Spotify",
    merchantType: "Subscription",
    categoryName: "Streaming Services",
    website: "https://www.spotify.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Music streaming",
    patterns: [{ pattern: "SPOTIFY", priority: 10, notes: null }],
  },
  {
    merchantName: "Disney+",
    merchantType: "Subscription",
    categoryName: "Streaming Services",
    website: "https://www.disneyplus.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Disney streaming - includes Hulu, ESPN+",
    patterns: [
      { pattern: "DISNEY PLUS", priority: 10, notes: null },
      { pattern: "DISNEYPLUS", priority: 10, notes: null },
      { pattern: "DISNEY+", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Amazon Prime",
    merchantType: "Subscription",
    categoryName: "Streaming Services",
    website: "https://www.amazon.ca/prime",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Prime membership - streaming, shipping, etc.",
    patterns: [
      { pattern: "AMZN PRIME", priority: 15, notes: "Prime membership" },
      { pattern: "PRIME MEMBER", priority: 10, notes: null },
      { pattern: "AMAZON PRIME", priority: 10, notes: null },
      { pattern: "PRIME VIDEO", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Apple",
    merchantType: "Subscription",
    categoryName: "Streaming Services",
    website: "https://www.apple.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "iCloud, Music, TV+, Arcade",
    patterns: [
      { pattern: "APPLE.COM/BILL", priority: 15, notes: null },
      { pattern: "APPLE.COM", priority: 10, notes: null },
      { pattern: "ITUNES", priority: 10, notes: null },
      { pattern: "APPLE MUSIC", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "YouTube Premium",
    merchantType: "Subscription",
    categoryName: "Streaming Services",
    website: "https://www.youtube.com/premium",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Google - includes YouTube Music",
    patterns: [
      { pattern: "GOOGLE* YOUTUBE", priority: 15, notes: "Google billing format" },
      { pattern: "YOUTUBE PREMIUM", priority: 15, notes: null },
      { pattern: "YOUTUBE", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Crave",
    merchantType: "Subscription",
    categoryName: "Streaming Services",
    website: "https://www.crave.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Bell Media - Canadian streaming",
    patterns: [{ pattern: "CRAVE", priority: 10, notes: null }],
  },
  {
    merchantName: "Paramount+",
    merchantType: "Subscription",
    categoryName: "Streaming Services",
    website: "https://www.paramountplus.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Paramount Global streaming",
    patterns: [
      { pattern: "PARAMOUNT+", priority: 10, notes: null },
      { pattern: "PARAMOUNT PLUS", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Max",
    merchantType: "Subscription",
    categoryName: "Streaming Services",
    website: "https://www.max.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Warner Bros. Discovery - formerly HBO Max",
    patterns: [
      { pattern: "HBO MAX", priority: 10, notes: null },
      { pattern: "HBO", priority: 5, notes: "Lower priority" },
    ],
  },

  // ============================================================================
  // GAMING - Category: Gaming
  // ============================================================================
  {
    merchantName: "Xbox",
    merchantType: "Subscription",
    categoryName: "Gaming",
    website: "https://www.xbox.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Game Pass, Xbox Live",
    patterns: [
      { pattern: "XBOX GAME PASS", priority: 15, notes: null },
      { pattern: "XBOX LIVE", priority: 15, notes: null },
      { pattern: "XBOX", priority: 10, notes: null },
      { pattern: "MSFTONLINE", priority: 10, notes: "Microsoft online" },
      { pattern: "MICROSOFT*XBOX", priority: 15, notes: null },
    ],
  },
  {
    merchantName: "PlayStation",
    merchantType: "Subscription",
    categoryName: "Gaming",
    website: "https://www.playstation.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "PS Plus, PS Now",
    patterns: [
      { pattern: "PLAYSTATION", priority: 10, notes: null },
      { pattern: "PSN", priority: 10, notes: null },
      { pattern: "SONY PLAYSTATION", priority: 15, notes: null },
    ],
  },
  {
    merchantName: "Nintendo",
    merchantType: "Subscription",
    categoryName: "Gaming",
    website: "https://www.nintendo.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Nintendo Switch Online",
    patterns: [
      { pattern: "NINTENDO", priority: 10, notes: null },
      { pattern: "NINTENDO OF", priority: 15, notes: null },
    ],
  },
  {
    merchantName: "Steam",
    merchantType: "Gaming",
    categoryName: "Gaming",
    website: "https://store.steampowered.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Valve - PC gaming platform",
    patterns: [
      { pattern: "STEAM", priority: 10, notes: null },
      { pattern: "STEAMGAMES", priority: 10, notes: null },
      { pattern: "STEAMPOWERED", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Epic Games",
    merchantType: "Gaming",
    categoryName: "Gaming",
    website: "https://www.epicgames.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Fortnite, Unreal Engine",
    patterns: [{ pattern: "EPIC GAMES", priority: 10, notes: null }],
  },

  // ============================================================================
  // TELECOM - Category: Mobile Phone / Internet
  // ============================================================================
  {
    merchantName: "Rogers",
    merchantType: "Telecom",
    categoryName: "Mobile Phone",
    website: "https://www.rogers.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Mobile, Internet, Cable - Big 3",
    patterns: [
      { pattern: "ROGERS WIRELESS", priority: 15, notes: null },
      { pattern: "ROGERS COMM", priority: 15, notes: null },
      { pattern: "ROGERS", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Bell",
    merchantType: "Telecom",
    categoryName: "Mobile Phone",
    website: "https://www.bell.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Mobile, Internet, TV - Big 3",
    patterns: [
      { pattern: "BELL MOBILITY", priority: 15, notes: null },
      { pattern: "BELL CANADA", priority: 10, notes: null },
      { pattern: "BELL WIRELESS", priority: 15, notes: null },
    ],
  },
  {
    merchantName: "Telus",
    merchantType: "Telecom",
    categoryName: "Mobile Phone",
    website: "https://www.telus.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Mobile, Internet - Big 3",
    patterns: [
      { pattern: "TELUS MOBILITY", priority: 15, notes: null },
      { pattern: "TELUS COMM", priority: 15, notes: null },
      { pattern: "TELUS", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Fido",
    merchantType: "Telecom",
    categoryName: "Mobile Phone",
    website: "https://www.fido.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Rogers flanker brand",
    patterns: [
      { pattern: "FIDO SOLUTION", priority: 15, notes: null },
      { pattern: "FIDO", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Koodo",
    merchantType: "Telecom",
    categoryName: "Mobile Phone",
    website: "https://www.koodomobile.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Telus flanker brand",
    patterns: [
      { pattern: "KOODO MOBILE", priority: 15, notes: null },
      { pattern: "KOODO", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Virgin Plus",
    merchantType: "Telecom",
    categoryName: "Mobile Phone",
    website: "https://www.virginplus.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Bell flanker brand",
    patterns: [
      { pattern: "VIRGIN PLUS", priority: 15, notes: null },
      { pattern: "VIRGIN MOBILE", priority: 15, notes: null },
      { pattern: "VIRGIN", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Freedom Mobile",
    merchantType: "Telecom",
    categoryName: "Mobile Phone",
    website: "https://www.freedommobile.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Videotron - formerly Wind Mobile",
    patterns: [
      { pattern: "FREEDOM MOBILE", priority: 10, notes: null },
      { pattern: "FREEDOM WIRELESS", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Public Mobile",
    merchantType: "Telecom",
    categoryName: "Mobile Phone",
    website: "https://www.publicmobile.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Telus prepaid brand",
    patterns: [{ pattern: "PUBLIC MOBILE", priority: 10, notes: null }],
  },
  {
    merchantName: "Lucky Mobile",
    merchantType: "Telecom",
    categoryName: "Mobile Phone",
    website: "https://www.luckymobile.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Bell prepaid brand",
    patterns: [{ pattern: "LUCKY MOBILE", priority: 10, notes: null }],
  },
  {
    merchantName: "Chatr",
    merchantType: "Telecom",
    categoryName: "Mobile Phone",
    website: "https://www.chatrwireless.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Rogers prepaid brand",
    patterns: [{ pattern: "CHATR", priority: 10, notes: null }],
  },
  {
    merchantName: "Shaw",
    merchantType: "Telecom",
    categoryName: "Internet",
    website: "https://www.shaw.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Now owned by Rogers - Internet, TV",
    patterns: [
      { pattern: "SHAW CABLE", priority: 15, notes: null },
      { pattern: "SHAW COMM", priority: 15, notes: null },
      { pattern: "SHAW", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Videotron",
    merchantType: "Telecom",
    categoryName: "Internet",
    website: "https://www.videotron.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Quebec telecom - Quebecor",
    patterns: [{ pattern: "VIDEOTRON", priority: 10, notes: null }],
  },
  {
    merchantName: "Cogeco",
    merchantType: "Telecom",
    categoryName: "Internet",
    website: "https://www.cogeco.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Ontario/Quebec cable",
    patterns: [{ pattern: "COGECO", priority: 10, notes: null }],
  },
  {
    merchantName: "TekSavvy",
    merchantType: "Telecom",
    categoryName: "Internet",
    website: "https://www.teksavvy.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Third-party ISP",
    patterns: [{ pattern: "TEKSAVVY", priority: 10, notes: null }],
  },
  {
    merchantName: "Start.ca",
    merchantType: "Telecom",
    categoryName: "Internet",
    website: "https://www.start.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Third-party ISP",
    patterns: [{ pattern: "START.CA", priority: 10, notes: null }],
  },

  // ============================================================================
  // UTILITIES - Category: Electricity / Natural Gas / Water
  // ============================================================================
  {
    merchantName: "Hydro One",
    merchantType: "Utility",
    categoryName: "Electricity",
    website: "https://www.hydroone.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Ontario electricity distribution",
    patterns: [{ pattern: "HYDRO ONE", priority: 10, notes: null }],
  },
  {
    merchantName: "Toronto Hydro",
    merchantType: "Utility",
    categoryName: "Electricity",
    website: "https://www.torontohydro.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Toronto electricity",
    patterns: [{ pattern: "TORONTO HYDRO", priority: 10, notes: null }],
  },
  {
    merchantName: "London Hydro",
    merchantType: "Utility",
    categoryName: "Electricity",
    website: "https://www.londonhydro.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "London ON electricity",
    patterns: [{ pattern: "LONDON HYDRO", priority: 10, notes: null }],
  },
  {
    merchantName: "Enbridge",
    merchantType: "Utility",
    categoryName: "Natural Gas",
    website: "https://www.enbridge.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Natural gas distribution",
    patterns: [
      { pattern: "ENBRIDGE GAS", priority: 15, notes: null },
      { pattern: "ENBRIDGE", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "BC Hydro",
    merchantType: "Utility",
    categoryName: "Electricity",
    website: "https://www.bchydro.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "British Columbia electricity",
    patterns: [{ pattern: "BC HYDRO", priority: 10, notes: null }],
  },
  {
    merchantName: "Hydro-Quebec",
    merchantType: "Utility",
    categoryName: "Electricity",
    website: "https://www.hydroquebec.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Quebec electricity",
    patterns: [
      { pattern: "HYDRO-QUEBEC", priority: 10, notes: null },
      { pattern: "HYDRO QUEBEC", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Oakville Hydro",
    merchantType: "Utility",
    categoryName: "Electricity",
    website: "https://www.oakvillehydro.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Oakville electricity",
    patterns: [{ pattern: "OAKVILLE HYDRO", priority: 10, notes: null }],
  },
  {
    merchantName: "Alectra Utilities",
    merchantType: "Utility",
    categoryName: "Electricity",
    website: "https://www.alectra.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "GTA electricity - Brampton, Mississauga, Hamilton",
    patterns: [{ pattern: "ALECTRA", priority: 10, notes: null }],
  },
  {
    merchantName: "FortisBC",
    merchantType: "Utility",
    categoryName: "Natural Gas",
    website: "https://www.fortisbc.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "BC natural gas",
    patterns: [{ pattern: "FORTISBC", priority: 10, notes: null }],
  },
  {
    merchantName: "ATCO",
    merchantType: "Utility",
    categoryName: "Natural Gas",
    website: "https://www.atco.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Alberta natural gas",
    patterns: [{ pattern: "ATCO", priority: 10, notes: null }],
  },
  {
    merchantName: "Reliance Home Comfort",
    merchantType: "Utility",
    categoryName: "Home Maintenance",
    website: "https://www.reliancehomecomfort.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Water heater, HVAC rental",
    patterns: [
      { pattern: "RELIANCE HOME", priority: 15, notes: null },
      { pattern: "RELIANCE", priority: 10, notes: null },
      { pattern: "RELIANCECOMFORT", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Enercare",
    merchantType: "Utility",
    categoryName: "Home Maintenance",
    website: "https://www.enercare.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Water heater, HVAC rental - Ontario",
    patterns: [{ pattern: "ENERCARE", priority: 10, notes: null }],
  },

  // ============================================================================
  // TRANSIT - Category: Public Transit
  // ============================================================================
  {
    merchantName: "TTC",
    merchantType: "Transit",
    categoryName: "Public Transit",
    website: "https://www.ttc.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Toronto Transit Commission",
    patterns: [
      { pattern: "TTC ", priority: 15, notes: null },
      { pattern: "TORONTO TRANSIT", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Presto",
    merchantType: "Transit",
    categoryName: "Public Transit",
    website: "https://www.prestocard.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "GTA transit fare card",
    patterns: [{ pattern: "PRESTO", priority: 10, notes: null }],
  },
  {
    merchantName: "GO Transit",
    merchantType: "Transit",
    categoryName: "Public Transit",
    website: "https://www.gotransit.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "GTA regional transit - Metrolinx",
    patterns: [
      { pattern: "GO TRANSIT", priority: 10, notes: null },
      { pattern: "METROLINX", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "TransLink",
    merchantType: "Transit",
    categoryName: "Public Transit",
    website: "https://www.translink.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Vancouver transit",
    patterns: [
      { pattern: "TRANSLINK", priority: 10, notes: null },
      { pattern: "COMPASS CARD", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "STM",
    merchantType: "Transit",
    categoryName: "Public Transit",
    website: "https://www.stm.info",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Montreal transit",
    patterns: [
      { pattern: "STM ", priority: 15, notes: null },
      { pattern: "SOCIETE DE TRANSPORT", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "OC Transpo",
    merchantType: "Transit",
    categoryName: "Public Transit",
    website: "https://www.octranspo.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Ottawa transit",
    patterns: [{ pattern: "OC TRANSPO", priority: 10, notes: null }],
  },
  {
    merchantName: "LTC",
    merchantType: "Transit",
    categoryName: "Public Transit",
    website: "https://www.londontransit.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "London Transit Commission",
    patterns: [
      { pattern: "LTC ", priority: 15, notes: null },
      { pattern: "LONDON TRANSIT", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Calgary Transit",
    merchantType: "Transit",
    categoryName: "Public Transit",
    website: "https://www.calgarytransit.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Calgary transit",
    patterns: [{ pattern: "CALGARY TRANSIT", priority: 10, notes: null }],
  },
  {
    merchantName: "Edmonton Transit",
    merchantType: "Transit",
    categoryName: "Public Transit",
    website: "https://www.edmonton.ca/ets",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Edmonton Transit Service",
    patterns: [
      { pattern: "EDMONTON TRANSIT", priority: 10, notes: null },
      { pattern: "ETS ", priority: 10, notes: null },
    ],
  },

  // ============================================================================
  // TOLLS - Category: Tolls
  // ============================================================================
  {
    merchantName: "407 ETR",
    merchantType: "Toll",
    categoryName: "Tolls",
    website: "https://www.407etr.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Ontario highway toll",
    patterns: [
      { pattern: "407 ETR", priority: 10, notes: null },
      { pattern: "407ETR", priority: 10, notes: null },
      { pattern: "HWY 407", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "A25 Transurban",
    merchantType: "Toll",
    categoryName: "Tolls",
    website: "https://www.a25.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Quebec toll bridge",
    patterns: [{ pattern: "A25", priority: 10, notes: null }],
  },

  // ============================================================================
  // RIDE SHARE - Category: Ride Share
  // ============================================================================
  {
    merchantName: "Uber",
    merchantType: "Rideshare",
    categoryName: "Ride Share",
    website: "https://www.uber.com",
    hasAlternative: true,
    alternativeName: "Transit",
    alternativeSavings: 15,
    notes: "Ride sharing service",
    patterns: [
      { pattern: "UBER* TRIP", priority: 15, notes: "Ride share trip" },
      { pattern: "UBER TRIP", priority: 15, notes: null },
      { pattern: "UBER BV", priority: 10, notes: null },
      { pattern: "UBER", priority: 5, notes: "Lower priority - could be Uber Eats" },
    ],
  },
  {
    merchantName: "Lyft",
    merchantType: "Rideshare",
    categoryName: "Ride Share",
    website: "https://www.lyft.com",
    hasAlternative: true,
    alternativeName: "Transit",
    alternativeSavings: 15,
    notes: "Ride sharing service",
    patterns: [
      { pattern: "LYFT", priority: 10, notes: null },
      { pattern: "LYFT*", priority: 10, notes: null },
    ],
  },

  // ============================================================================
  // ENTERTAINMENT - Category: Movies & Events
  // ============================================================================
  {
    merchantName: "Cineplex",
    merchantType: "Entertainment",
    categoryName: "Movies & Events",
    website: "https://www.cineplex.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Canadian movie theatre chain",
    patterns: [
      { pattern: "CINEPLEX", priority: 10, notes: null },
      { pattern: "GALAXY CINEMA", priority: 10, notes: null },
      { pattern: "SCOTIABANK THEATRE", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Landmark Cinemas",
    merchantType: "Entertainment",
    categoryName: "Movies & Events",
    website: "https://www.landmarkcinemas.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Second largest Canadian theatre chain",
    patterns: [{ pattern: "LANDMARK CINEMA", priority: 10, notes: null }],
  },
  {
    merchantName: "Ticketmaster",
    merchantType: "Entertainment",
    categoryName: "Movies & Events",
    website: "https://www.ticketmaster.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Event tickets - Live Nation",
    patterns: [{ pattern: "TICKETMASTER", priority: 10, notes: null }],
  },
  {
    merchantName: "StubHub",
    merchantType: "Entertainment",
    categoryName: "Movies & Events",
    website: "https://www.stubhub.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Ticket resale marketplace",
    patterns: [{ pattern: "STUBHUB", priority: 10, notes: null }],
  },
  {
    merchantName: "Live Nation",
    merchantType: "Entertainment",
    categoryName: "Movies & Events",
    website: "https://www.livenation.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Concert promoter",
    patterns: [{ pattern: "LIVE NATION", priority: 10, notes: null }],
  },

  // ============================================================================
  // FITNESS - Category: Gym
  // ============================================================================
  {
    merchantName: "GoodLife Fitness",
    merchantType: "Fitness",
    categoryName: "Gym",
    website: "https://www.goodlifefitness.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Canada's largest fitness chain",
    patterns: [
      { pattern: "GOODLIFE FITNESS", priority: 15, notes: null },
      { pattern: "GOODLIFE", priority: 10, notes: null },
      { pattern: "GOOD LIFE", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Planet Fitness",
    merchantType: "Fitness",
    categoryName: "Gym",
    website: "https://www.planetfitness.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Budget gym franchise",
    patterns: [
      { pattern: "PLANET FITNESS", priority: 10, notes: null },
      { pattern: "PF LONDON", priority: 15, notes: "Planet Fitness London ON" },
    ],
  },
  {
    merchantName: "LA Fitness",
    merchantType: "Fitness",
    categoryName: "Gym",
    website: "https://www.lafitness.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: null,
    patterns: [{ pattern: "LA FITNESS", priority: 10, notes: null }],
  },
  {
    merchantName: "Anytime Fitness",
    merchantType: "Fitness",
    categoryName: "Gym",
    website: "https://www.anytimefitness.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "24-hour gym franchise",
    patterns: [{ pattern: "ANYTIME FITNESS", priority: 10, notes: null }],
  },
  {
    merchantName: "Fit4Less",
    merchantType: "Fitness",
    categoryName: "Gym",
    website: "https://www.fit4less.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "GoodLife budget brand",
    patterns: [{ pattern: "FIT4LESS", priority: 10, notes: null }],
  },
  {
    merchantName: "YMCA",
    merchantType: "Fitness",
    categoryName: "Gym",
    website: "https://www.ymca.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Community fitness center",
    patterns: [{ pattern: "YMCA", priority: 10, notes: null }],
  },
  {
    merchantName: "London Aquatic",
    merchantType: "Fitness",
    categoryName: "Sports & Recreation",
    website: null,
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "London ON swimming",
    patterns: [{ pattern: "LONDON AQUATIC", priority: 10, notes: null }],
  },

  // ============================================================================
  // INSURANCE - Category: Home Insurance / Car Insurance / Life Insurance
  // ============================================================================
  {
    merchantName: "Intact Insurance",
    merchantType: "Insurance",
    categoryName: "Home Insurance",
    website: "https://www.intact.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Canada's largest P&C insurer",
    patterns: [
      { pattern: "INTACT INSURANCE", priority: 15, notes: null },
      { pattern: "INTACT", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Aviva",
    merchantType: "Insurance",
    categoryName: "Home Insurance",
    website: "https://www.aviva.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Home, auto, life insurance",
    patterns: [
      { pattern: "AVIVA CANADA", priority: 15, notes: null },
      { pattern: "AVIVA", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Desjardins Insurance",
    merchantType: "Insurance",
    categoryName: "Home Insurance",
    website: "https://www.desjardinsassurance.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Quebec-based insurer",
    patterns: [
      { pattern: "DESJARDINS INS", priority: 10, notes: null },
      { pattern: "DESJARDINS ASSURANCE", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "TD Insurance",
    merchantType: "Insurance",
    categoryName: "Home Insurance",
    website: "https://www.tdinsurance.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "TD Bank insurance division",
    patterns: [{ pattern: "TD INSURANCE", priority: 10, notes: null }],
  },
  {
    merchantName: "Co-operators",
    merchantType: "Insurance",
    categoryName: "Home Insurance",
    website: "https://www.cooperators.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Canadian insurance cooperative",
    patterns: [
      { pattern: "COOPERATORS", priority: 10, notes: null },
      { pattern: "CO-OPERATORS", priority: 10, notes: null },
      { pattern: "COOPERATIVE", priority: 5, notes: null },
    ],
  },
  {
    merchantName: "Economical Insurance",
    merchantType: "Insurance",
    categoryName: "Home Insurance",
    website: "https://www.economical.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Now part of Definity Financial",
    patterns: [{ pattern: "ECONOMICAL", priority: 10, notes: null }],
  },
  {
    merchantName: "Belairdirect",
    merchantType: "Insurance",
    categoryName: "Car Insurance",
    website: "https://www.belairdirect.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Intact subsidiary - online insurance",
    patterns: [
      { pattern: "BELAIRDIRECT", priority: 10, notes: null },
      { pattern: "BELAIR", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Sonnet",
    merchantType: "Insurance",
    categoryName: "Car Insurance",
    website: "https://www.sonnet.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Online insurance - Economical",
    patterns: [{ pattern: "SONNET", priority: 10, notes: null }],
  },
  {
    merchantName: "Manulife",
    merchantType: "Insurance",
    categoryName: "Life Insurance",
    website: "https://www.manulife.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Life, health, group benefits",
    patterns: [
      { pattern: "MANULIFE FINANCIAL", priority: 15, notes: null },
      { pattern: "MANULIFE", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Sun Life",
    merchantType: "Insurance",
    categoryName: "Life Insurance",
    website: "https://www.sunlife.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Life, health, group benefits",
    patterns: [
      { pattern: "SUN LIFE FINANCIAL", priority: 15, notes: null },
      { pattern: "SUNLIFE", priority: 10, notes: null },
      { pattern: "SUN LIFE", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Canada Life",
    merchantType: "Insurance",
    categoryName: "Life Insurance",
    website: "https://www.canadalife.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Life, health insurance - Great-West Lifeco",
    patterns: [
      { pattern: "CANADA LIFE", priority: 10, notes: null },
      { pattern: "GREAT-WEST LIFE", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Co-op Life",
    merchantType: "Insurance",
    categoryName: "Life Insurance",
    website: "https://www.cooperators.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Co-operators life insurance",
    patterns: [{ pattern: "CO-OP LIFE", priority: 10, notes: null }],
  },
  {
    merchantName: "Industrial Alliance",
    merchantType: "Insurance",
    categoryName: "Life Insurance",
    website: "https://www.ia.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "iA Financial Group",
    patterns: [
      { pattern: "INDUSTRIAL ALLIANCE", priority: 10, notes: null },
      { pattern: "IA FINANCIAL", priority: 10, notes: null },
    ],
  },

  // ============================================================================
  // ALCOHOL - Category: Alcohol
  // ============================================================================
  {
    merchantName: "LCBO",
    merchantType: "Liquor",
    categoryName: "Alcohol",
    website: "https://www.lcbo.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Liquor Control Board of Ontario",
    patterns: [{ pattern: "LCBO", priority: 10, notes: null }],
  },
  {
    merchantName: "Beer Store",
    merchantType: "Liquor",
    categoryName: "Alcohol",
    website: "https://www.thebeerstore.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Ontario beer retailer",
    patterns: [
      { pattern: "BEER STORE", priority: 10, notes: null },
      { pattern: "BREWERS RETAIL", priority: 10, notes: null },
      { pattern: "TBS RETAIL", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "SAQ",
    merchantType: "Liquor",
    categoryName: "Alcohol",
    website: "https://www.saq.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Société des alcools du Québec",
    patterns: [
      { pattern: "SAQ ", priority: 15, notes: null },
      { pattern: "SOCIETE ALCOOLS", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "BC Liquor",
    merchantType: "Liquor",
    categoryName: "Alcohol",
    website: "https://www.bcliquorstores.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "BC liquor stores",
    patterns: [
      { pattern: "BC LIQUOR", priority: 10, notes: null },
      { pattern: "BCLIQUOR", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Alberta Gaming Liquor",
    merchantType: "Liquor",
    categoryName: "Alcohol",
    website: "https://aglc.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Alberta liquor stores",
    patterns: [{ pattern: "AGLC", priority: 10, notes: null }],
  },

  // ============================================================================
  // FINANCIAL SERVICES - Category: Car Payment / Loan Interest / Bank Fees
  // ============================================================================
  {
    merchantName: "Honda Finance",
    merchantType: "Lender",
    categoryName: "Car Payment",
    website: "https://www.honda.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Honda Financial Services",
    patterns: [
      { pattern: "HONDA FINANCIAL", priority: 15, notes: null },
      { pattern: "HONDA FINANCE", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Toyota Financial",
    merchantType: "Lender",
    categoryName: "Car Payment",
    website: "https://www.toyota.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Toyota Financial Services",
    patterns: [{ pattern: "TOYOTA FINANCIAL", priority: 10, notes: null }],
  },
  {
    merchantName: "Ford Credit",
    merchantType: "Lender",
    categoryName: "Car Payment",
    website: "https://www.ford.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Ford Motor Credit",
    patterns: [{ pattern: "FORD CREDIT", priority: 10, notes: null }],
  },
  {
    merchantName: "CMLS Financial",
    merchantType: "Lender",
    categoryName: "Mortgage",
    website: "https://www.cmls.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Canadian mortgage lender - acquired by Nesto 2024",
    patterns: [
      { pattern: "CMLS FINANCIAL", priority: 15, notes: null },
      { pattern: "CMLS", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Lockwood Lease",
    merchantType: "Leasing",
    categoryName: "Car Payment",
    website: null,
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Vehicle leasing",
    patterns: [{ pattern: "LOCKWOOD", priority: 10, notes: null }],
  },
  {
    merchantName: "AGF",
    merchantType: "Investment",
    categoryName: "Non-Registered",
    website: "https://www.agf.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "AGF Investments - mutual funds",
    patterns: [
      { pattern: "AGF INVESTMENTS", priority: 15, notes: null },
      { pattern: "AGF", priority: 10, notes: "Mutual funds" },
    ],
  },
  {
    merchantName: "Wealthsimple",
    merchantType: "Investment",
    categoryName: "Non-Registered",
    website: "https://www.wealthsimple.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Canadian robo-advisor and trading",
    patterns: [{ pattern: "WEALTHSIMPLE", priority: 10, notes: null }],
  },
  {
    merchantName: "Questrade",
    merchantType: "Investment",
    categoryName: "Non-Registered",
    website: "https://www.questrade.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Canadian discount brokerage",
    patterns: [{ pattern: "QUESTRADE", priority: 10, notes: null }],
  },
  {
    merchantName: "PayPal",
    merchantType: "Payment",
    categoryName: "Other Expense",
    website: "https://www.paypal.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Online payment processor",
    patterns: [
      { pattern: "PAYPAL*", priority: 15, notes: null },
      { pattern: "PAYPAL", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Wise",
    merchantType: "Money Transfer",
    categoryName: "Bank Fees",
    website: "https://www.wise.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "International money transfers (formerly TransferWise)",
    patterns: [
      { pattern: "WISE PAYMENTS", priority: 15, notes: null },
      { pattern: "TRANSFERWISE", priority: 10, notes: null },
      { pattern: "WISE", priority: 5, notes: "Lower priority - common word" },
    ],
  },
  {
    merchantName: "MyDoh",
    merchantType: "Banking",
    categoryName: "Kids Activities",
    website: "https://www.mydoh.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "RBC kids banking app",
    patterns: [{ pattern: "MYDOH", priority: 10, notes: null }],
  },
  {
    merchantName: "Interac",
    merchantType: "Payment",
    categoryName: "Bank Fees",
    website: "https://www.interac.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "e-Transfer fees",
    patterns: [{ pattern: "INTERAC", priority: 10, notes: null }],
  },

  // ============================================================================
  // CREDIT CARDS - Category: Credit Card Payment
  // ============================================================================
  {
    merchantName: "AMEX",
    merchantType: "Credit Card",
    categoryName: "Amex Payment",
    website: "https://www.americanexpress.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "American Express payment",
    patterns: [
      { pattern: "AMERICAN EXPRESS", priority: 15, notes: null },
      { pattern: "AMEX", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Capital One",
    merchantType: "Credit Card",
    categoryName: "Other CC Payment",
    website: "https://www.capitalone.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Capital One Mastercard payment",
    patterns: [{ pattern: "CAPITAL ONE", priority: 10, notes: null }],
  },
  {
    merchantName: "NEO Financial",
    merchantType: "Credit Card",
    categoryName: "Other CC Payment",
    website: "https://www.neofinancial.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "NEO Mastercard - cashback",
    patterns: [{ pattern: "NEO FINANCIAL", priority: 10, notes: null }],
  },
  {
    merchantName: "Flexiti",
    merchantType: "Credit Card",
    categoryName: "Other CC Payment",
    website: "https://www.flexiti.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Retail financing - Home Depot, etc",
    patterns: [{ pattern: "FLEXITI", priority: 10, notes: null }],
  },
  {
    merchantName: "Triangle Mastercard",
    merchantType: "Credit Card",
    categoryName: "Triangle MC Payment",
    website: "https://www.triangle.canadiantire.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Canadian Tire Triangle Mastercard",
    patterns: [
      { pattern: "TRIANGLE MASTERCARD", priority: 15, notes: null },
      { pattern: "CTFS", priority: 10, notes: "Canadian Tire Financial Services" },
    ],
  },
  {
    merchantName: "Walmart Mastercard",
    merchantType: "Credit Card",
    categoryName: "Walmart MC Payment",
    website: "https://www.walmart.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Walmart Rewards Mastercard",
    patterns: [{ pattern: "WALMART REWARDS", priority: 15, notes: null }],
  },
  {
    merchantName: "RBC Credit Card",
    merchantType: "Credit Card",
    categoryName: "RBC Visa Payment",
    website: "https://www.rbcroyalbank.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "RBC Visa payment",
    patterns: [
      { pattern: "RBC VISA", priority: 15, notes: null },
      { pattern: "ROYAL BANK VISA", priority: 15, notes: null },
    ],
  },

  // ============================================================================
  // PERSONAL CARE - Category: Haircut / Spa & Beauty
  // ============================================================================
  {
    merchantName: "Oxford Barber Shop",
    merchantType: "Personal Care",
    categoryName: "Haircut",
    website: null,
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "London ON barber",
    patterns: [{ pattern: "OXFORD BARBER", priority: 10, notes: null }],
  },
  {
    merchantName: "Pedi N Nails",
    merchantType: "Personal Care",
    categoryName: "Spa & Beauty",
    website: null,
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Nail salon",
    patterns: [{ pattern: "PEDI N NAILS", priority: 10, notes: null }],
  },
  {
    merchantName: "Royal Chair Hair",
    merchantType: "Personal Care",
    categoryName: "Haircut",
    website: null,
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Hair salon",
    patterns: [{ pattern: "ROYAL CHAIR", priority: 10, notes: null }],
  },
  {
    merchantName: "Kids Kuts",
    merchantType: "Personal Care",
    categoryName: "Haircut",
    website: null,
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Kids haircut salon",
    patterns: [
      { pattern: "KID'S KUTS", priority: 10, notes: null },
      { pattern: "KIDS KUTS", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Nu Nails & Spa",
    merchantType: "Personal Care",
    categoryName: "Spa & Beauty",
    website: null,
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Nail salon",
    patterns: [{ pattern: "NU NAILS", priority: 10, notes: null }],
  },
  {
    merchantName: "Helen Nail and Spa",
    merchantType: "Personal Care",
    categoryName: "Spa & Beauty",
    website: null,
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Nail salon",
    patterns: [{ pattern: "HELEN NAIL", priority: 10, notes: null }],
  },
  {
    merchantName: "KT Natural Nails",
    merchantType: "Personal Care",
    categoryName: "Spa & Beauty",
    website: null,
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Nail salon",
    patterns: [{ pattern: "KT NATURAL", priority: 10, notes: null }],
  },
  {
    merchantName: "Great Clips",
    merchantType: "Personal Care",
    categoryName: "Haircut",
    website: "https://www.greatclips.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Hair salon chain",
    patterns: [{ pattern: "GREAT CLIPS", priority: 10, notes: null }],
  },
  {
    merchantName: "First Choice Haircutters",
    merchantType: "Personal Care",
    categoryName: "Haircut",
    website: "https://www.firstchoice.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Hair salon chain - Regis Corp",
    patterns: [{ pattern: "FIRST CHOICE", priority: 10, notes: null }],
  },
  {
    merchantName: "Sephora",
    merchantType: "Personal Care",
    categoryName: "Personal Products",
    website: "https://www.sephora.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Beauty retailer - LVMH",
    patterns: [{ pattern: "SEPHORA", priority: 10, notes: null }],
  },

  // ============================================================================
  // KIDS/FAMILY - Category: Toys & Games / Kids Clothing / Gifts Given
  // ============================================================================
  {
    merchantName: "Toys R Us",
    merchantType: "Retail",
    categoryName: "Toys & Games",
    website: "https://www.toysrus.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Toy store",
    patterns: [
      { pattern: "TOYS R US", priority: 10, notes: null },
      { pattern: 'TOYS"R"US', priority: 10, notes: null },
      { pattern: "TOYSRUS", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Indigo",
    merchantType: "Retail",
    categoryName: "Books & Media",
    website: "https://www.chapters.indigo.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Books, toys, gifts - Chapters, Coles",
    patterns: [
      { pattern: "INDIGO", priority: 10, notes: null },
      { pattern: "CHAPTERS", priority: 10, notes: null },
      { pattern: "COLES BOOK", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Pandora",
    merchantType: "Jewelry",
    categoryName: "Gifts Given",
    website: "https://www.pandora.net",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Jewelry and charms",
    patterns: [{ pattern: "PANDORA", priority: 10, notes: null }],
  },
  {
    merchantName: "Bath & Body Works",
    merchantType: "Personal Care",
    categoryName: "Personal Products",
    website: "https://www.bathandbodyworks.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Bath products, candles",
    patterns: [
      { pattern: "BATH & BODY", priority: 10, notes: null },
      { pattern: "BATH AND BODY", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Build-A-Bear",
    merchantType: "Retail",
    categoryName: "Toys & Games",
    website: "https://www.buildabear.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Custom stuffed animals",
    patterns: [{ pattern: "BUILD-A-BEAR", priority: 10, notes: null }],
  },

  // ============================================================================
  // AUTO - Category: Car Maintenance
  // ============================================================================
  {
    merchantName: "Westgate Honda",
    merchantType: "Auto",
    categoryName: "Car Maintenance",
    website: null,
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Honda dealership service",
    patterns: [{ pattern: "WESTGATE HONDA", priority: 10, notes: null }],
  },
  {
    merchantName: "Mr. Lube",
    merchantType: "Auto",
    categoryName: "Car Maintenance",
    website: "https://www.mrlube.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Oil change service",
    patterns: [{ pattern: "MR LUBE", priority: 10, notes: null }],
  },
  {
    merchantName: "Jiffy Lube",
    merchantType: "Auto",
    categoryName: "Car Maintenance",
    website: "https://www.jiffylube.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Oil change service",
    patterns: [{ pattern: "JIFFY LUBE", priority: 10, notes: null }],
  },
  {
    merchantName: "NAPA Auto Parts",
    merchantType: "Auto",
    categoryName: "Car Maintenance",
    website: "https://www.napacanada.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Auto parts",
    patterns: [{ pattern: "NAPA AUTO", priority: 10, notes: null }],
  },
  {
    merchantName: "Canadian Tire Auto",
    merchantType: "Auto",
    categoryName: "Car Maintenance",
    website: "https://www.canadiantire.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Auto service center",
    patterns: [{ pattern: "CT AUTO", priority: 10, notes: null }],
  },
  {
    merchantName: "Kal Tire",
    merchantType: "Auto",
    categoryName: "Car Maintenance",
    website: "https://www.kaltire.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Tire retailer - Western Canada",
    patterns: [{ pattern: "KAL TIRE", priority: 10, notes: null }],
  },

  // ============================================================================
  // TRAVEL - Category: Vacation
  // ============================================================================
  {
    merchantName: "Delta Air Lines",
    merchantType: "Airline",
    categoryName: "Vacation",
    website: "https://www.delta.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "US airline",
    patterns: [
      { pattern: "DELTA AIR", priority: 10, notes: null },
      { pattern: "DELTA.COM", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Air Canada",
    merchantType: "Airline",
    categoryName: "Vacation",
    website: "https://www.aircanada.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Canadian flag carrier",
    patterns: [
      { pattern: "AIR CANADA", priority: 10, notes: null },
      { pattern: "AIRCANADA", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "WestJet",
    merchantType: "Airline",
    categoryName: "Vacation",
    website: "https://www.westjet.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Canadian low-cost carrier",
    patterns: [{ pattern: "WESTJET", priority: 10, notes: null }],
  },
  {
    merchantName: "Porter Airlines",
    merchantType: "Airline",
    categoryName: "Vacation",
    website: "https://www.flyporter.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Canadian regional airline",
    patterns: [{ pattern: "PORTER AIRLINE", priority: 10, notes: null }],
  },
  {
    merchantName: "Flair Airlines",
    merchantType: "Airline",
    categoryName: "Vacation",
    website: "https://www.flyflair.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Canadian ultra low-cost carrier",
    patterns: [{ pattern: "FLAIR AIRLINE", priority: 10, notes: null }],
  },
  {
    merchantName: "Swoop",
    merchantType: "Airline",
    categoryName: "Vacation",
    website: "https://www.flyswoop.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "WestJet ultra low-cost carrier",
    patterns: [{ pattern: "SWOOP", priority: 10, notes: null }],
  },
  {
    merchantName: "Expedia",
    merchantType: "Travel",
    categoryName: "Vacation",
    website: "https://www.expedia.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Online travel agency",
    patterns: [{ pattern: "EXPEDIA", priority: 10, notes: null }],
  },
  {
    merchantName: "Booking.com",
    merchantType: "Travel",
    categoryName: "Vacation",
    website: "https://www.booking.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Hotel booking",
    patterns: [{ pattern: "BOOKING.COM", priority: 10, notes: null }],
  },
  {
    merchantName: "Airbnb",
    merchantType: "Travel",
    categoryName: "Vacation",
    website: "https://www.airbnb.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Vacation rentals",
    patterns: [{ pattern: "AIRBNB", priority: 10, notes: null }],
  },
  {
    merchantName: "VRBO",
    merchantType: "Travel",
    categoryName: "Vacation",
    website: "https://www.vrbo.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Vacation rentals - Expedia Group",
    patterns: [{ pattern: "VRBO", priority: 10, notes: null }],
  },

  // ============================================================================
  // PARKING - Category: Parking
  // ============================================================================
  {
    merchantName: "Impark",
    merchantType: "Parking",
    categoryName: "Parking",
    website: "https://www.impark.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Parking lot operator",
    patterns: [{ pattern: "IMPARK", priority: 10, notes: null }],
  },
  {
    merchantName: "Green P",
    merchantType: "Parking",
    categoryName: "Parking",
    website: "https://www.greenp.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Toronto Parking Authority",
    patterns: [
      { pattern: "GREEN P", priority: 10, notes: null },
      { pattern: "TORONTO PARKING", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Honk Mobile",
    merchantType: "Parking",
    categoryName: "Parking",
    website: "https://www.honkmobile.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Parking payment app",
    patterns: [{ pattern: "HONK MOBILE", priority: 10, notes: null }],
  },

  // ============================================================================
  // GOVERNMENT - Category: Other Expense
  // ============================================================================
  {
    merchantName: "Brazilian Consulate",
    merchantType: "Government",
    categoryName: "Other Expense",
    website: null,
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Consulate General of Brazil",
    patterns: [{ pattern: "CONSULATE GENER", priority: 10, notes: "Brazilian consulate pattern" }],
  },
  {
    merchantName: "Service Ontario",
    merchantType: "Government",
    categoryName: "Other Expense",
    website: "https://www.ontario.ca/page/serviceontario",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Ontario government services",
    patterns: [
      { pattern: "SERVICE ONTARIO", priority: 10, notes: null },
      { pattern: "SERVICEONTARIO", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Canada Revenue Agency",
    merchantType: "Government",
    categoryName: "Other Expense",
    website: "https://www.canada.ca/en/revenue-agency.html",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Federal tax agency",
    patterns: [
      { pattern: "CRA ", priority: 15, notes: null },
      { pattern: "CANADA REVENUE", priority: 10, notes: null },
    ],
  },

  // ============================================================================
  // RESTAURANTS - Category: Restaurants
  // ============================================================================
  {
    merchantName: "The Keg",
    merchantType: "Restaurant",
    categoryName: "Restaurants",
    website: "https://www.thekeg.com",
    hasAlternative: true,
    alternativeName: "Cook at home",
    alternativeSavings: 40,
    notes: "Canadian steakhouse chain",
    patterns: [{ pattern: "THE KEG", priority: 10, notes: null }],
  },
  {
    merchantName: "Earls",
    merchantType: "Restaurant",
    categoryName: "Restaurants",
    website: "https://www.earls.ca",
    hasAlternative: true,
    alternativeName: "Cook at home",
    alternativeSavings: 30,
    notes: "Canadian restaurant chain",
    patterns: [{ pattern: "EARLS", priority: 10, notes: null }],
  },
  {
    merchantName: "Moxies",
    merchantType: "Restaurant",
    categoryName: "Restaurants",
    website: "https://www.moxies.com",
    hasAlternative: true,
    alternativeName: "Cook at home",
    alternativeSavings: 30,
    notes: "Canadian restaurant chain",
    patterns: [{ pattern: "MOXIES", priority: 10, notes: null }],
  },
  {
    merchantName: "Milestones",
    merchantType: "Restaurant",
    categoryName: "Restaurants",
    website: "https://www.milestonesrestaurants.com",
    hasAlternative: true,
    alternativeName: "Cook at home",
    alternativeSavings: 30,
    notes: "Canadian restaurant chain - Recipe Unlimited",
    patterns: [{ pattern: "MILESTONES", priority: 10, notes: null }],
  },
  {
    merchantName: "Boston Pizza",
    merchantType: "Restaurant",
    categoryName: "Restaurants",
    website: "https://www.bostonpizza.com",
    hasAlternative: true,
    alternativeName: "Cook at home",
    alternativeSavings: 25,
    notes: "Canadian casual dining",
    patterns: [
      { pattern: "BOSTON PIZZA", priority: 10, notes: null },
      { pattern: "BP GRILL", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "East Side Marios",
    merchantType: "Restaurant",
    categoryName: "Restaurants",
    website: "https://www.eastsidemarios.com",
    hasAlternative: true,
    alternativeName: "Cook at home",
    alternativeSavings: 25,
    notes: "Italian casual dining - Recipe Unlimited",
    patterns: [{ pattern: "EAST SIDE MARIO", priority: 10, notes: null }],
  },
  {
    merchantName: "Kelsey's",
    merchantType: "Restaurant",
    categoryName: "Restaurants",
    website: "https://www.kelseys.ca",
    hasAlternative: true,
    alternativeName: "Cook at home",
    alternativeSavings: 25,
    notes: "Canadian casual dining - Recipe Unlimited",
    patterns: [{ pattern: "KELSEY", priority: 10, notes: null }],
  },
  {
    merchantName: "Montana's",
    merchantType: "Restaurant",
    categoryName: "Restaurants",
    website: "https://www.montanas.ca",
    hasAlternative: true,
    alternativeName: "Cook at home",
    alternativeSavings: 25,
    notes: "Canadian casual dining - Recipe Unlimited",
    patterns: [{ pattern: "MONTANA'S", priority: 10, notes: null }],
  },
  {
    merchantName: "St-Hubert",
    merchantType: "Restaurant",
    categoryName: "Restaurants",
    website: "https://www.st-hubert.com",
    hasAlternative: true,
    alternativeName: "Cook at home",
    alternativeSavings: 20,
    notes: "Quebec rotisserie chain - Recipe Unlimited",
    patterns: [{ pattern: "ST-HUBERT", priority: 10, notes: null }],
  },
];

// ============================================================================
// INSTITUTIONS (Banks, Credit Unions, Brokerages)
// ============================================================================
const institutions: Array<{
  institutionName: string;
  institutionType: "Bank" | "Credit Union" | "Brokerage" | "Other";
  website: string | null;
  notes: string | null;
}> = [
  // Big 6 Canadian Banks
  { institutionName: "Royal Bank of Canada", institutionType: "Bank", website: "https://www.rbc.com", notes: "RBC - Canada's largest bank" },
  { institutionName: "Toronto-Dominion Bank", institutionType: "Bank", website: "https://www.td.com", notes: "TD Bank" },
  { institutionName: "Bank of Montreal", institutionType: "Bank", website: "https://www.bmo.com", notes: "BMO" },
  { institutionName: "Scotiabank", institutionType: "Bank", website: "https://www.scotiabank.com", notes: "Bank of Nova Scotia" },
  { institutionName: "Canadian Imperial Bank of Commerce", institutionType: "Bank", website: "https://www.cibc.com", notes: "CIBC" },
  { institutionName: "National Bank of Canada", institutionType: "Bank", website: "https://www.nbc.ca", notes: "NBC - Quebec-based" },

  // Online Banks
  { institutionName: "Tangerine", institutionType: "Bank", website: "https://www.tangerine.ca", notes: "Scotiabank subsidiary, formerly ING Direct" },
  { institutionName: "Simplii Financial", institutionType: "Bank", website: "https://www.simplii.com", notes: "CIBC subsidiary" },
  { institutionName: "EQ Bank", institutionType: "Bank", website: "https://www.eqbank.ca", notes: "Equitable Bank digital platform" },
  { institutionName: "Manulife Bank", institutionType: "Bank", website: "https://www.manulifebank.ca", notes: "Manulife Financial subsidiary" },
  { institutionName: "Alterna Bank", institutionType: "Bank", website: "https://www.alternabank.ca", notes: "Alterna Savings digital bank" },
  { institutionName: "Motusbank", institutionType: "Bank", website: "https://www.motusbank.ca", notes: "Meridian Credit Union digital bank" },
  { institutionName: "Neo Financial", institutionType: "Bank", website: "https://www.neofinancial.com", notes: "Digital bank and rewards" },
  { institutionName: "KOHO", institutionType: "Bank", website: "https://www.koho.ca", notes: "Prepaid spending account" },
  { institutionName: "STACK", institutionType: "Bank", website: "https://www.getstack.ca", notes: "Digital prepaid Mastercard" },

  // Credit Unions
  { institutionName: "Desjardins", institutionType: "Credit Union", website: "https://www.desjardins.com", notes: "Largest credit union in North America" },
  { institutionName: "Meridian Credit Union", institutionType: "Credit Union", website: "https://www.meridiancu.ca", notes: "Ontario's largest credit union" },
  { institutionName: "Vancity", institutionType: "Credit Union", website: "https://www.vancity.com", notes: "Vancouver City Savings Credit Union" },
  { institutionName: "Coast Capital Savings", institutionType: "Credit Union", website: "https://www.coastcapitalsavings.com", notes: "BC credit union" },
  { institutionName: "Servus Credit Union", institutionType: "Credit Union", website: "https://www.servus.ca", notes: "Alberta's largest credit union" },
  { institutionName: "FirstOntario Credit Union", institutionType: "Credit Union", website: "https://www.firstontario.com", notes: "Ontario credit union" },
  { institutionName: "Conexus Credit Union", institutionType: "Credit Union", website: "https://www.conexus.ca", notes: "Saskatchewan credit union" },
  { institutionName: "Steinbach Credit Union", institutionType: "Credit Union", website: "https://www.scu.mb.ca", notes: "Manitoba credit union" },
  { institutionName: "Affinity Credit Union", institutionType: "Credit Union", website: "https://www.affinitycu.ca", notes: "Saskatchewan credit union" },

  // Brokerages & Investment Platforms
  { institutionName: "Questrade", institutionType: "Brokerage", website: "https://www.questrade.com", notes: "Canadian discount brokerage" },
  { institutionName: "Wealthsimple", institutionType: "Brokerage", website: "https://www.wealthsimple.com", notes: "Robo-advisor and trading platform" },
  { institutionName: "Qtrade", institutionType: "Brokerage", website: "https://www.qtrade.ca", notes: "Qtrade Direct Investing" },
  { institutionName: "Interactive Brokers", institutionType: "Brokerage", website: "https://www.interactivebrokers.ca", notes: "IBKR - Global trading platform" },
  { institutionName: "TD Direct Investing", institutionType: "Brokerage", website: "https://www.td.com/ca/en/investing", notes: "TD WebBroker" },
  { institutionName: "RBC Direct Investing", institutionType: "Brokerage", website: "https://www.rbcdirectinvesting.com", notes: "RBC brokerage platform" },
  { institutionName: "BMO InvestorLine", institutionType: "Brokerage", website: "https://www.bmoinvestorline.com", notes: "BMO self-directed investing" },
  { institutionName: "CIBC Investor's Edge", institutionType: "Brokerage", website: "https://www.investorsedge.cibc.com", notes: "CIBC online brokerage" },
  { institutionName: "Scotia iTRADE", institutionType: "Brokerage", website: "https://www.scotiaitrade.com", notes: "Scotiabank online brokerage" },
  { institutionName: "National Bank Direct Brokerage", institutionType: "Brokerage", website: "https://www.nbc.ca/personal/accounts/investing.html", notes: "NBDB - Commission-free trading" },
  { institutionName: "AGF Investments", institutionType: "Brokerage", website: "https://www.agf.com", notes: "Mutual funds and ETFs" },
  { institutionName: "Fidelity Investments Canada", institutionType: "Brokerage", website: "https://www.fidelity.ca", notes: "Investment management" },
  { institutionName: "CI Financial", institutionType: "Brokerage", website: "https://www.ci.com", notes: "Wealth management" },
  { institutionName: "Mackenzie Investments", institutionType: "Brokerage", website: "https://www.mackenzieinvestments.com", notes: "Mutual funds and ETFs" },
  { institutionName: "Vanguard Canada", institutionType: "Brokerage", website: "https://www.vanguard.ca", notes: "Low-cost ETFs" },
  { institutionName: "iShares by BlackRock", institutionType: "Brokerage", website: "https://www.blackrock.com/ca", notes: "ETF provider" },

  // Credit Card Issuers (not banks)
  { institutionName: "American Express Canada", institutionType: "Other", website: "https://www.americanexpress.com/ca", notes: "Amex - Credit cards and travel" },
  { institutionName: "Capital One Canada", institutionType: "Other", website: "https://www.capitalone.ca", notes: "Credit cards" },
  { institutionName: "MBNA", institutionType: "Other", website: "https://www.mbna.ca", notes: "TD Bank credit card brand" },
  { institutionName: "Rogers Bank", institutionType: "Other", website: "https://www.rogersbank.com", notes: "Rogers World Elite Mastercard" },
  { institutionName: "PC Financial", institutionType: "Other", website: "https://www.pcfinancial.ca", notes: "President's Choice Financial (CIBC)" },
  { institutionName: "Canadian Tire Bank", institutionType: "Other", website: "https://www.ctfs.com", notes: "Triangle Mastercard issuer" },
  { institutionName: "Walmart Canada Bank", institutionType: "Other", website: "https://www.walmart.ca/en/financial-services", notes: "Walmart Rewards Mastercard" },
  { institutionName: "Home Trust", institutionType: "Other", website: "https://www.hometrust.ca", notes: "Mortgages and credit cards" },
  { institutionName: "Flexiti", institutionType: "Other", website: "https://www.flexiti.com", notes: "Retail financing" },

  // Mortgage Lenders
  { institutionName: "CMLS Financial", institutionType: "Other", website: "https://www.cmls.ca", notes: "Mortgage lender (acquired by Nesto)" },
  { institutionName: "Nesto", institutionType: "Other", website: "https://www.nesto.ca", notes: "Digital mortgage platform" },
  { institutionName: "MCAP", institutionType: "Other", website: "https://www.mcap.com", notes: "Mortgage financing" },
  { institutionName: "First National", institutionType: "Other", website: "https://www.firstnational.ca", notes: "Mortgage lender" },

  // Payment Processors
  { institutionName: "PayPal Canada", institutionType: "Other", website: "https://www.paypal.com/ca", notes: "Online payments" },
  { institutionName: "Wise", institutionType: "Other", website: "https://www.wise.com", notes: "International money transfers" },
];

async function main() {
  // =========================================================================
  // Seed Institutions
  // =========================================================================
  console.log("Seeding Institutions...");
  let institutionCount = 0;

  for (const instData of institutions) {
    await prisma.institution.upsert({
      where: { name: instData.institutionName },
      update: {
        type: instData.institutionType,
        website: instData.website,
        notes: instData.notes,
      },
      create: {
        name: instData.institutionName,
        type: instData.institutionType,
        website: instData.website,
        notes: instData.notes,
        isActive: false,
      },
    });
    institutionCount++;
  }
  console.log(`  Institutions: ${institutionCount}`);

  // =========================================================================
  // Seed Category Groups
  // =========================================================================
  console.log("Seeding Category Groups...");
  let groupCount = 0;

  for (const groupData of categoryGroups) {
    await prisma.categoryGroup.upsert({
      where: { name: groupData.groupName },
      update: {
        type: groupData.groupType,
        color: groupData.color,
        sortOrder: groupData.sortOrder,
        notes: groupData.notes,
      },
      create: {
        name: groupData.groupName,
        type: groupData.groupType,
        color: groupData.color,
        sortOrder: groupData.sortOrder,
        notes: groupData.notes,
      },
    });
    groupCount++;
  }
  console.log(`  Category Groups: ${groupCount}`);

  // =========================================================================
  // Seed Categories
  // =========================================================================
  console.log("Seeding Categories...");
  let categoryCount = 0;

  // Build a map of group names to group data (including color)
  const groups = await prisma.categoryGroup.findMany();
  const groupMap = new Map(groups.map((g) => [g.name, { id: g.id, color: g.color }]));

  // Group categories by group name to calculate total per group (for color variants)
  const categoriesByGroup = new Map<string, typeof categories>();
  for (const cat of categories) {
    const existing = categoriesByGroup.get(cat.groupName) ?? [];
    existing.push(cat);
    categoriesByGroup.set(cat.groupName, existing);
  }

  for (const catData of categories) {
    const groupData = groupMap.get(catData.groupName);
    const groupId = groupData?.id;
    const groupColor = groupData?.color ?? "#6366f1";

    // Calculate color variant based on position within group
    const groupCategories = categoriesByGroup.get(catData.groupName) ?? [];
    const categoryIndex = groupCategories.findIndex((c) => c.categoryName === catData.categoryName);
    const totalInGroup = groupCategories.length;
    const categoryColor = generateColorVariant(groupColor, categoryIndex, totalInGroup);

    await prisma.category.upsert({
      where: { name: catData.categoryName },
      update: {
        groupId: groupId,
        necessityLevel: catData.necessityLevel,
        monthlyBudget: catData.monthlyBudget,
        sortOrder: catData.sortOrder,
        color: categoryColor,
        notes: catData.notes,
      },
      create: {
        name: catData.categoryName,
        groupId: groupId,
        necessityLevel: catData.necessityLevel,
        monthlyBudget: catData.monthlyBudget,
        sortOrder: catData.sortOrder,
        color: categoryColor,
        notes: catData.notes,
        isActive: true,
      },
    });
    categoryCount++;
  }
  console.log(`  Categories: ${categoryCount}`);

  // =========================================================================
  // Set up Category Parent Relationships
  // =========================================================================
  console.log("Setting up category hierarchies...");

  // Credit Card Payment children
  const ccPaymentParent = await prisma.category.findUnique({
    where: { name: "Credit Card Payment" },
  });

  if (ccPaymentParent) {
    const ccChildCategories = [
      "Amex Payment",
      "Triangle MC Payment",
      "Walmart MC Payment",
      "RBC Visa Payment",
      "Other CC Payment",
    ];

    for (const childName of ccChildCategories) {
      await prisma.category.update({
        where: { name: childName },
        data: { parentId: ccPaymentParent.id },
      });
    }
    console.log(`  Linked ${ccChildCategories.length} CC payment subcategories`);
  }

  // =========================================================================
  // Seed Merchants and Patterns
  // =========================================================================
  console.log("Seeding Merchants and MerchantPatterns...");

  // Build category map for linking merchants
  const allCategories = await prisma.category.findMany();
  const categoryMap = new Map(allCategories.map((c) => [c.name, c.id]));

  let merchantCount = 0;
  let patternCount = 0;
  let linkedCount = 0;

  for (const merchantData of merchantsWithPatterns) {
    // Look up default category ID
    const defaultCategoryId = categoryMap.get(merchantData.categoryName) || null;
    if (defaultCategoryId) {
      linkedCount++;
    } else if (merchantData.categoryName) {
      console.log(`  Warning: Category "${merchantData.categoryName}" not found for merchant "${merchantData.merchantName}"`);
    }

    // Create or update merchant
    const merchant = await prisma.merchant.upsert({
      where: { name: merchantData.merchantName },
      update: {
        type: merchantData.merchantType,
        categoryId: defaultCategoryId,
        website: merchantData.website,
        hasAlternative: merchantData.hasAlternative,
        alternativeName: merchantData.alternativeName,
        alternativeSavings: merchantData.alternativeSavings,
        notes: merchantData.notes,
      },
      create: {
        name: merchantData.merchantName,
        type: merchantData.merchantType,
        categoryId: defaultCategoryId,
        website: merchantData.website,
        hasAlternative: merchantData.hasAlternative,
        alternativeName: merchantData.alternativeName,
        alternativeSavings: merchantData.alternativeSavings,
        notes: merchantData.notes,
        isActive: true,
      },
    });
    merchantCount++;

    // Create patterns for this merchant
    for (const patternData of merchantData.patterns) {
      try {
        await prisma.merchantPattern.upsert({
          where: { pattern: patternData.pattern },
          update: {
            merchantId: merchant.id,
            priority: patternData.priority,
            notes: patternData.notes,
          },
          create: {
            merchantId: merchant.id,
            pattern: patternData.pattern,
            priority: patternData.priority,
            notes: patternData.notes,
          },
        });
        patternCount++;
      } catch {
        console.log(`  Pattern "${patternData.pattern}" already exists for different merchant`);
      }
    }
  }

  // ============================================================
  // EMPLOYERS
  // ============================================================
  console.log("\nSeeding Employers...");

  const employers = [
    // ========== Dynamics 365 Partners & Microsoft Consultants ==========
    { name: "Hitachi Solutions", industry: "IT Consulting", location: "Dallas, TX", website: "https://hitachisolutions.com", notes: "2024 Microsoft Partner of the Year, D365 specialist" },
    { name: "Avanade", industry: "IT Consulting", location: "Seattle, WA", website: "https://avanade.com", notes: "Accenture-Microsoft joint venture, D365 & Azure" },
    { name: "HSO", industry: "IT Consulting", location: "Chicago, IL", website: "https://hso.com", notes: "Global Microsoft Dynamics 365 partner" },
    { name: "Columbus", industry: "IT Consulting", location: "Chicago, IL", website: "https://columbusglobal.com", notes: "Microsoft D365 implementation partner" },
    { name: "sa.global", industry: "IT Consulting", location: "Cambridge, UK", website: "https://sa.global", notes: "AI-powered D365 consultant, 30+ years experience" },
    { name: "Sunrise Technologies", industry: "IT Consulting", location: "Winston-Salem, NC", website: "https://sunrisetechnologies.com", notes: "D365 for retail, manufacturing, distribution" },
    { name: "Folio3", industry: "IT Consulting", location: "Redwood City, CA", website: "https://folio3.com", notes: "Microsoft D365 Partner, 15+ years" },
    { name: "ArcherPoint", industry: "IT Consulting", location: "Minneapolis, MN", website: "https://archerpoint.com", notes: "Microsoft D365 & LS Retail partner" },
    { name: "Alithya", industry: "IT Consulting", location: "Montreal, QC", website: "https://alithya.com", notes: "2,200+ professionals, D365 & digital transformation" },
    { name: "Endeavour Solutions", industry: "IT Consulting", location: "Toronto, ON", website: "https://endeavoursolutions.com", notes: "Microsoft Gold Partner, top 5% worldwide" },
    { name: "Evolvous", industry: "IT Consulting", location: "Toronto, ON", website: "https://evolvous.com", notes: "Canada's leading Microsoft D365 Partner" },
    { name: "MNP Digital", industry: "IT Consulting", location: "Calgary, AB", website: "https://mnp.ca", notes: "D365, security & compliance solutions" },
    { name: "Quisitive", industry: "IT Consulting", location: "Toronto, ON", website: "https://quisitive.com", notes: "D365, Azure, AI & Copilot enablement" },
    { name: "RSM", industry: "IT Consulting", location: "Chicago, IL", website: "https://rsmus.com", notes: "Middle market D365 specialist, founded 1926" },
    { name: "Encore Business Solutions", industry: "IT Consulting", location: "Winnipeg, MB", website: "https://encorebusiness.com", notes: "35+ years D365 ERP/CRM experience" },
    { name: "PowerObjects", industry: "IT Consulting", location: "Minneapolis, MN", website: "https://powerobjects.com", notes: "Exclusive D365 focus, HCL Technologies company" },
    { name: "Velosio", industry: "IT Consulting", location: "Columbus, OH", website: "https://velosio.com", notes: "Full-stack D365 for SMBs" },
    { name: "AlphaBOLD", industry: "IT Consulting", location: "Dallas, TX", website: "https://alphabold.com", notes: "D365, Power Platform & Azure" },
    { name: "Confiz", industry: "IT Consulting", location: "Lahore, Pakistan", website: "https://confiz.com", notes: "Global D365 implementation partner" },
    { name: "Cynoteck", industry: "IT Consulting", location: "San Jose, CA", website: "https://cynoteck.com", notes: "D365 & Salesforce consultants" },
    { name: "TTMS", industry: "IT Consulting", location: "Lodz, Poland", website: "https://ttms.com", notes: "800+ IT professionals, Office 365 & D365" },
    { name: "Kainos", industry: "IT Consulting", location: "Belfast, UK", website: "https://kainos.com", notes: "Expanding Toronto office to 300+ employees" },

    // ========== Big Tech - Canada Operations ==========
    { name: "Microsoft Canada", industry: "Technology", location: "Mississauga, ON", website: "https://microsoft.com/en-ca", notes: "Global tech leader, cloud & enterprise software" },
    { name: "Google Canada", industry: "Technology", location: "Toronto, ON", website: "https://google.ca", notes: "Search, cloud, AI & advertising" },
    { name: "Amazon Canada", industry: "Technology", location: "Toronto, ON", website: "https://amazon.ca", notes: "E-commerce, AWS cloud services" },
    { name: "IBM Canada", industry: "Technology", location: "Markham, ON", website: "https://ibm.com/ca-en", notes: "Enterprise IT, AI & consulting" },
    { name: "SAP Canada", industry: "Technology", location: "Toronto, ON", website: "https://sap.com/canada", notes: "Enterprise software, 25+ years in Canada" },
    { name: "Oracle Canada", industry: "Technology", location: "Mississauga, ON", website: "https://oracle.com/ca-en", notes: "Database, cloud & enterprise applications" },
    { name: "Salesforce Canada", industry: "Technology", location: "Toronto, ON", website: "https://salesforce.com", notes: "CRM & cloud platform leader" },

    // ========== Canadian Tech Leaders ==========
    { name: "Shopify", industry: "Technology", location: "Ottawa, ON", website: "https://shopify.com", notes: "E-commerce platform, founded 2006" },
    { name: "OpenText", industry: "Technology", location: "Waterloo, ON", website: "https://opentext.com", notes: "Enterprise information management" },
    { name: "CGI", industry: "IT Consulting", location: "Montreal, QC", website: "https://cgi.com", notes: "91,000+ employees, IT & business consulting" },
    { name: "BlackBerry", industry: "Technology", location: "Waterloo, ON", website: "https://blackberry.com", notes: "Cybersecurity & IoT software" },
    { name: "Lightspeed", industry: "Technology", location: "Montreal, QC", website: "https://lightspeedhq.com", notes: "POS & e-commerce platform" },
    { name: "Kinaxis", industry: "Technology", location: "Ottawa, ON", website: "https://kinaxis.com", notes: "Supply chain management software" },
    { name: "Descartes Systems", industry: "Technology", location: "Waterloo, ON", website: "https://descartes.com", notes: "Logistics & supply chain solutions" },
    { name: "Constellation Software", industry: "Technology", location: "Toronto, ON", website: "https://csisoftware.com", notes: "Acquires & manages vertical market software" },
    { name: "Ceridian (Dayforce)", industry: "Technology", location: "Toronto, ON", website: "https://ceridian.com", notes: "HCM & workforce management" },
    { name: "Coveo", industry: "Technology", location: "Quebec City, QC", website: "https://coveo.com", notes: "AI-powered search & recommendations" },
    { name: "Nuvei", industry: "FinTech", location: "Montreal, QC", website: "https://nuvei.com", notes: "Payment technology solutions" },
    { name: "Docebo", industry: "Technology", location: "Toronto, ON", website: "https://docebo.com", notes: "AI-powered learning platform" },
    { name: "D2L", industry: "Technology", location: "Kitchener, ON", website: "https://d2l.com", notes: "Learning management system (Brightspace)" },
    { name: "Clio", industry: "Technology", location: "Burnaby, BC", website: "https://clio.com", notes: "Legal practice management software" },
    { name: "Hootsuite", industry: "Technology", location: "Vancouver, BC", website: "https://hootsuite.com", notes: "Social media management platform" },
    { name: "FreshBooks", industry: "Technology", location: "Toronto, ON", website: "https://freshbooks.com", notes: "Cloud accounting for SMBs" },
    { name: "Wealthsimple", industry: "FinTech", location: "Toronto, ON", website: "https://wealthsimple.com", notes: "Online investment platform" },
    { name: "Thinkific", industry: "Technology", location: "Vancouver, BC", website: "https://thinkific.com", notes: "Online course platform" },
    { name: "TouchBistro", industry: "Technology", location: "Toronto, ON", website: "https://touchbistro.com", notes: "Restaurant POS system" },
    { name: "Trulioo", industry: "Technology", location: "Vancouver, BC", website: "https://trulioo.com", notes: "Identity verification platform" },
    { name: "GeoComply", industry: "Technology", location: "Vancouver, BC", website: "https://geocomply.com", notes: "Fraud prevention, cybersecurity unicorn" },

    // ========== Global IT Services (Canada presence) ==========
    { name: "Accenture", industry: "IT Consulting", location: "Toronto, ON", website: "https://accenture.com", notes: "Global consulting & professional services" },
    { name: "Deloitte Digital", industry: "IT Consulting", location: "Toronto, ON", website: "https://deloittedigital.com", notes: "Digital transformation & consulting" },
    { name: "Capgemini", industry: "IT Consulting", location: "Toronto, ON", website: "https://capgemini.com", notes: "Global IT services & consulting" },
    { name: "Cognizant", industry: "IT Consulting", location: "Toronto, ON", website: "https://cognizant.com", notes: "IT services & digital solutions" },
    { name: "Infosys", industry: "IT Consulting", location: "Toronto, ON", website: "https://infosys.com", notes: "Global IT services, Calgary hub" },
    { name: "Wipro", industry: "IT Consulting", location: "Mississauga, ON", website: "https://wipro.com", notes: "IT services & consulting" },
    { name: "TCS", industry: "IT Consulting", location: "Toronto, ON", website: "https://tcs.com", notes: "Tata Consultancy Services, global IT" },
    { name: "HCL Technologies", industry: "IT Consulting", location: "Mississauga, ON", website: "https://hcltech.com", notes: "Global IT services company" },
    { name: "Tech Mahindra", industry: "IT Consulting", location: "Toronto, ON", website: "https://techmahindra.com", notes: "IT services & digital transformation" },

    // ========== Canadian Telecom (IT divisions) ==========
    { name: "TELUS", industry: "Telecom/Technology", location: "Vancouver, BC", website: "https://telus.com", notes: "Telecom, TELUS Digital & health tech" },
    { name: "Bell Canada", industry: "Telecom/Technology", location: "Montreal, QC", website: "https://bell.ca", notes: "Telecom, media & IT services" },
    { name: "Rogers Communications", industry: "Telecom/Technology", location: "Toronto, ON", website: "https://rogers.com", notes: "Telecom, media & sports" },

    // ========== Additional IT Consultants ==========
    { name: "TechRepute", industry: "IT Consulting", location: "Toronto, ON", website: "https://techrepute.com", notes: "AI, ML, Data Science & Blockchain solutions" },
    { name: "CloudVital", industry: "IT Consulting", location: "Toronto, ON", website: "https://cloudvital.ca", notes: "Canadian tech consulting & product studio, founded 2018" },
  ];

  let employerCount = 0;
  for (const emp of employers) {
    await prisma.employer.upsert({
      where: { name: emp.name },
      update: {},
      create: { ...emp, isActive: false }, // Disabled by default, enabled when position created
    });
    employerCount++;
  }
  console.log(`  Employers: ${employerCount}`);

  console.log(`\nSeeding complete!`);
  console.log(`  Merchants: ${merchantCount}`);
  console.log(`  Merchants with categories: ${linkedCount}`);
  console.log(`  Patterns: ${patternCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
