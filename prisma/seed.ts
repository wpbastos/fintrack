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
// CATEGORY GROUPS (High-level groupings)
// ============================================================================
const categoryGroups: Array<{
  groupName: string;
  groupType: "Income" | "Expense" | "Transfer" | "Investment";
  sortOrder: number;
  notes: string;
}> = [
  // Income Groups
  { groupName: "Employment Income", groupType: "Income", sortOrder: 1, notes: "Salary, wages, bonuses" },
  { groupName: "Government Benefits", groupType: "Income", sortOrder: 2, notes: "CCB, GST, tax refunds" },
  { groupName: "Investment Income", groupType: "Income", sortOrder: 3, notes: "Dividends, interest, capital gains" },
  { groupName: "Other Income", groupType: "Income", sortOrder: 4, notes: "Gifts, reimbursements, refunds" },
  // Expense Groups
  { groupName: "Housing", groupType: "Expense", sortOrder: 10, notes: "Rent, mortgage, property costs" },
  { groupName: "Utilities", groupType: "Expense", sortOrder: 11, notes: "Hydro, gas, water, internet" },
  { groupName: "Food & Dining", groupType: "Expense", sortOrder: 12, notes: "Groceries, restaurants, delivery" },
  { groupName: "Transportation", groupType: "Expense", sortOrder: 13, notes: "Car, gas, transit, parking" },
  { groupName: "Healthcare", groupType: "Expense", sortOrder: 14, notes: "Medical, dental, pharmacy" },
  { groupName: "Insurance", groupType: "Expense", sortOrder: 15, notes: "Home, auto, life insurance" },
  { groupName: "Personal Care", groupType: "Expense", sortOrder: 16, notes: "Haircuts, toiletries, gym" },
  { groupName: "Shopping", groupType: "Expense", sortOrder: 17, notes: "Clothing, electronics, household" },
  { groupName: "Entertainment", groupType: "Expense", sortOrder: 18, notes: "Streaming, hobbies, events" },
  { groupName: "Education", groupType: "Expense", sortOrder: 19, notes: "Tuition, books, courses" },
  { groupName: "Kids & Family", groupType: "Expense", sortOrder: 20, notes: "Childcare, activities, school" },
  { groupName: "Pets", groupType: "Expense", sortOrder: 21, notes: "Vet, food, supplies" },
  { groupName: "Financial", groupType: "Expense", sortOrder: 22, notes: "Bank fees, interest charges" },
  { groupName: "Gifts & Donations", groupType: "Expense", sortOrder: 23, notes: "Presents, charity" },
  { groupName: "Miscellaneous", groupType: "Expense", sortOrder: 24, notes: "Other expenses" },
  // Transfer & Investment
  { groupName: "Transfers", groupType: "Transfer", sortOrder: 30, notes: "Between accounts" },
  { groupName: "Investments", groupType: "Investment", sortOrder: 31, notes: "RRSP, TFSA, RESP contributions" },
];

// ============================================================================
// CATEGORIES (Budget categories with NecessityLevel)
// sortOrder is relative within each group (1, 2, 3...)
// ============================================================================
const categories: Array<{
  categoryName: string;
  groupName: string;
  necessityLevel: "Essential" | "Important" | "Discretionary" | "Wasteful";
  monthlyBudget: number | null;
  sortOrder: number;
  notes: string | null;
}> = [
  // Employment Income (1-3)
  { categoryName: "Salary", groupName: "Employment Income", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 1, notes: "Regular salary income" },
  { categoryName: "Bonus", groupName: "Employment Income", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 2, notes: "Performance bonuses" },
  { categoryName: "Overtime", groupName: "Employment Income", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 3, notes: "Overtime pay" },

  // Government Benefits (1-3)
  { categoryName: "CCB", groupName: "Government Benefits", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 1, notes: "Canada Child Benefit" },
  { categoryName: "GST/HST Credit", groupName: "Government Benefits", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 2, notes: "GST/HST rebate" },
  { categoryName: "Tax Refund", groupName: "Government Benefits", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 3, notes: "Income tax refund" },

  // Investment Income (1-2)
  { categoryName: "Dividends", groupName: "Investment Income", necessityLevel: "Discretionary", monthlyBudget: null, sortOrder: 1, notes: "Dividend income" },
  { categoryName: "Interest Income", groupName: "Investment Income", necessityLevel: "Discretionary", monthlyBudget: null, sortOrder: 2, notes: "Interest earned" },

  // Other Income (1-3)
  { categoryName: "Refund", groupName: "Other Income", necessityLevel: "Discretionary", monthlyBudget: null, sortOrder: 1, notes: "Purchase refunds" },
  { categoryName: "Gift Received", groupName: "Other Income", necessityLevel: "Discretionary", monthlyBudget: null, sortOrder: 2, notes: "Monetary gifts received" },
  { categoryName: "Reimbursement", groupName: "Other Income", necessityLevel: "Discretionary", monthlyBudget: null, sortOrder: 3, notes: "Expense reimbursements" },

  // Housing (1-6)
  { categoryName: "Rent", groupName: "Housing", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 1, notes: "Monthly rent payment" },
  { categoryName: "Mortgage", groupName: "Housing", necessityLevel: "Essential", monthlyBudget: 2850, sortOrder: 2, notes: "Principal and interest payments" },
  { categoryName: "Property Tax", groupName: "Housing", necessityLevel: "Essential", monthlyBudget: 450, sortOrder: 3, notes: "Annual property taxes" },
  { categoryName: "Condo Fees", groupName: "Housing", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 4, notes: "Monthly condo/strata fees" },
  { categoryName: "Home Maintenance", groupName: "Housing", necessityLevel: "Important", monthlyBudget: 250, sortOrder: 5, notes: "Repairs, lawn care, snow removal" },
  { categoryName: "Home Improvement", groupName: "Housing", necessityLevel: "Discretionary", monthlyBudget: 200, sortOrder: 6, notes: "Renovations, upgrades" },

  // Utilities (1-6)
  { categoryName: "Electricity", groupName: "Utilities", necessityLevel: "Essential", monthlyBudget: 180, sortOrder: 1, notes: "Monthly electricity bill" },
  { categoryName: "Natural Gas", groupName: "Utilities", necessityLevel: "Essential", monthlyBudget: 140, sortOrder: 2, notes: "Natural gas for heating" },
  { categoryName: "Water", groupName: "Utilities", necessityLevel: "Essential", monthlyBudget: 85, sortOrder: 3, notes: "Water and sewer services" },
  { categoryName: "Internet", groupName: "Utilities", necessityLevel: "Essential", monthlyBudget: 100, sortOrder: 4, notes: "High-speed internet service" },
  { categoryName: "Mobile Phone", groupName: "Utilities", necessityLevel: "Essential", monthlyBudget: 200, sortOrder: 5, notes: "Mobile phone plans" },
  { categoryName: "Home Phone", groupName: "Utilities", necessityLevel: "Discretionary", monthlyBudget: null, sortOrder: 6, notes: "Landline phone" },

  // Food & Dining (1-6)
  { categoryName: "Groceries", groupName: "Food & Dining", necessityLevel: "Essential", monthlyBudget: 1700, sortOrder: 1, notes: "Grocery shopping" },
  { categoryName: "Restaurants", groupName: "Food & Dining", necessityLevel: "Discretionary", monthlyBudget: 250, sortOrder: 2, notes: "Dining out" },
  { categoryName: "Fast Food", groupName: "Food & Dining", necessityLevel: "Discretionary", monthlyBudget: 150, sortOrder: 3, notes: "Quick service restaurants" },
  { categoryName: "Coffee Shops", groupName: "Food & Dining", necessityLevel: "Wasteful", monthlyBudget: 80, sortOrder: 4, notes: "Coffee and cafe purchases" },
  { categoryName: "Food Delivery", groupName: "Food & Dining", necessityLevel: "Wasteful", monthlyBudget: 60, sortOrder: 5, notes: "Delivery service orders" },
  { categoryName: "Alcohol", groupName: "Food & Dining", necessityLevel: "Discretionary", monthlyBudget: 100, sortOrder: 6, notes: "Beer, wine, spirits" },

  // Transportation (1-8)
  { categoryName: "Gas", groupName: "Transportation", necessityLevel: "Essential", monthlyBudget: 300, sortOrder: 1, notes: "Fuel for vehicles" },
  { categoryName: "Car Payment", groupName: "Transportation", necessityLevel: "Essential", monthlyBudget: 550, sortOrder: 2, notes: "Vehicle loan or lease payment" },
  { categoryName: "Car Insurance", groupName: "Transportation", necessityLevel: "Essential", monthlyBudget: 250, sortOrder: 3, notes: "Auto insurance premiums" },
  { categoryName: "Car Maintenance", groupName: "Transportation", necessityLevel: "Important", monthlyBudget: 150, sortOrder: 4, notes: "Oil changes, tires, repairs" },
  { categoryName: "Parking", groupName: "Transportation", necessityLevel: "Important", monthlyBudget: 50, sortOrder: 5, notes: "Parking fees" },
  { categoryName: "Public Transit", groupName: "Transportation", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 6, notes: "Bus, subway, train fares" },
  { categoryName: "Ride Share", groupName: "Transportation", necessityLevel: "Discretionary", monthlyBudget: 30, sortOrder: 7, notes: "Uber, Lyft rides" },
  { categoryName: "Tolls", groupName: "Transportation", necessityLevel: "Important", monthlyBudget: null, sortOrder: 8, notes: "Highway tolls" },

  // Healthcare (1-5)
  { categoryName: "Pharmacy", groupName: "Healthcare", necessityLevel: "Essential", monthlyBudget: 75, sortOrder: 1, notes: "Prescriptions and medications" },
  { categoryName: "Doctor", groupName: "Healthcare", necessityLevel: "Essential", monthlyBudget: 25, sortOrder: 2, notes: "Medical appointments" },
  { categoryName: "Dental", groupName: "Healthcare", necessityLevel: "Important", monthlyBudget: 120, sortOrder: 3, notes: "Dental care and cleanings" },
  { categoryName: "Vision", groupName: "Healthcare", necessityLevel: "Important", monthlyBudget: 50, sortOrder: 4, notes: "Eye exams, glasses, contacts" },
  { categoryName: "Mental Health", groupName: "Healthcare", necessityLevel: "Important", monthlyBudget: 100, sortOrder: 5, notes: "Therapy, counseling" },

  // Insurance (1-3)
  { categoryName: "Home Insurance", groupName: "Insurance", necessityLevel: "Essential", monthlyBudget: 175, sortOrder: 1, notes: "Property insurance" },
  { categoryName: "Life Insurance", groupName: "Insurance", necessityLevel: "Important", monthlyBudget: 125, sortOrder: 2, notes: "Life insurance premiums" },
  { categoryName: "Health Insurance", groupName: "Insurance", necessityLevel: "Important", monthlyBudget: 80, sortOrder: 3, notes: "Extended health coverage" },

  // Personal Care (1-4)
  { categoryName: "Haircut", groupName: "Personal Care", necessityLevel: "Important", monthlyBudget: 120, sortOrder: 1, notes: "Hair styling and cuts" },
  { categoryName: "Gym", groupName: "Personal Care", necessityLevel: "Discretionary", monthlyBudget: 80, sortOrder: 2, notes: "Gym membership" },
  { categoryName: "Personal Products", groupName: "Personal Care", necessityLevel: "Important", monthlyBudget: 100, sortOrder: 3, notes: "Toiletries and cosmetics" },
  { categoryName: "Spa & Beauty", groupName: "Personal Care", necessityLevel: "Discretionary", monthlyBudget: 60, sortOrder: 4, notes: "Spa treatments, beauty services" },

  // Shopping (1-4)
  { categoryName: "Clothing", groupName: "Shopping", necessityLevel: "Important", monthlyBudget: 200, sortOrder: 1, notes: "Clothing purchases" },
  { categoryName: "Electronics", groupName: "Shopping", necessityLevel: "Discretionary", monthlyBudget: 75, sortOrder: 2, notes: "Devices and accessories" },
  { categoryName: "Household Items", groupName: "Shopping", necessityLevel: "Important", monthlyBudget: 125, sortOrder: 3, notes: "Home supplies and tools" },
  { categoryName: "Furniture", groupName: "Shopping", necessityLevel: "Discretionary", monthlyBudget: 50, sortOrder: 4, notes: "Furniture purchases" },

  // Entertainment (1-7)
  { categoryName: "Streaming Services", groupName: "Entertainment", necessityLevel: "Discretionary", monthlyBudget: 65, sortOrder: 1, notes: "Video and music streaming" },
  { categoryName: "Gaming", groupName: "Entertainment", necessityLevel: "Discretionary", monthlyBudget: 50, sortOrder: 2, notes: "Games and subscriptions" },
  { categoryName: "Movies & Events", groupName: "Entertainment", necessityLevel: "Discretionary", monthlyBudget: 120, sortOrder: 3, notes: "Movies, concerts, events" },
  { categoryName: "Books & Media", groupName: "Entertainment", necessityLevel: "Discretionary", monthlyBudget: 30, sortOrder: 4, notes: "Books and magazines" },
  { categoryName: "Hobbies", groupName: "Entertainment", necessityLevel: "Discretionary", monthlyBudget: 75, sortOrder: 5, notes: "Hobby supplies and gear" },
  { categoryName: "Sports & Recreation", groupName: "Entertainment", necessityLevel: "Discretionary", monthlyBudget: 50, sortOrder: 6, notes: "Sports and recreation" },
  { categoryName: "Vacation", groupName: "Entertainment", necessityLevel: "Discretionary", monthlyBudget: 400, sortOrder: 7, notes: "Travel and vacation savings" },

  // Education (1-3)
  { categoryName: "Tuition", groupName: "Education", necessityLevel: "Important", monthlyBudget: null, sortOrder: 1, notes: "School tuition fees" },
  { categoryName: "Books & Supplies", groupName: "Education", necessityLevel: "Important", monthlyBudget: 40, sortOrder: 2, notes: "School supplies and textbooks" },
  { categoryName: "Online Courses", groupName: "Education", necessityLevel: "Discretionary", monthlyBudget: 25, sortOrder: 3, notes: "Online learning platforms" },

  // Kids & Family (1-5)
  { categoryName: "Childcare", groupName: "Kids & Family", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 1, notes: "Daycare and childcare" },
  { categoryName: "Kids Activities", groupName: "Kids & Family", necessityLevel: "Important", monthlyBudget: 700, sortOrder: 2, notes: "Sports, lessons, activities" },
  { categoryName: "School Expenses", groupName: "Kids & Family", necessityLevel: "Important", monthlyBudget: 100, sortOrder: 3, notes: "School fees and trips" },
  { categoryName: "Kids Clothing", groupName: "Kids & Family", necessityLevel: "Important", monthlyBudget: 200, sortOrder: 4, notes: "Children's clothing" },
  { categoryName: "Toys & Games", groupName: "Kids & Family", necessityLevel: "Discretionary", monthlyBudget: 50, sortOrder: 5, notes: "Toys and games" },

  // Pets (1-4)
  { categoryName: "Pet Food", groupName: "Pets", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 1, notes: "Pet food and treats" },
  { categoryName: "Vet", groupName: "Pets", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 2, notes: "Veterinary care" },
  { categoryName: "Pet Supplies", groupName: "Pets", necessityLevel: "Important", monthlyBudget: null, sortOrder: 3, notes: "Pet supplies and accessories" },
  { categoryName: "Pet Grooming", groupName: "Pets", necessityLevel: "Discretionary", monthlyBudget: null, sortOrder: 4, notes: "Grooming services" },

  // Financial (1-3)
  { categoryName: "Bank Fees", groupName: "Financial", necessityLevel: "Wasteful", monthlyBudget: 20, sortOrder: 1, notes: "Bank account fees" },
  { categoryName: "Credit Card Interest", groupName: "Financial", necessityLevel: "Wasteful", monthlyBudget: 0, sortOrder: 2, notes: "Interest charges" },
  { categoryName: "Loan Interest", groupName: "Financial", necessityLevel: "Important", monthlyBudget: null, sortOrder: 3, notes: "Loan interest payments" },

  // Gifts & Donations (1-2)
  { categoryName: "Gifts Given", groupName: "Gifts & Donations", necessityLevel: "Discretionary", monthlyBudget: 150, sortOrder: 1, notes: "Gifts for others" },
  { categoryName: "Charity", groupName: "Gifts & Donations", necessityLevel: "Discretionary", monthlyBudget: 75, sortOrder: 2, notes: "Charitable donations" },

  // Miscellaneous (1)
  { categoryName: "Other Expense", groupName: "Miscellaneous", necessityLevel: "Discretionary", monthlyBudget: 100, sortOrder: 1, notes: "Uncategorized expenses" },

  // Transfers (1-7)
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

// Merchant data with their patterns
// Note: defaultCategoryId is null until Categories table is added
const merchantsWithPatterns: Array<{
  merchantName: string;
  merchantType: string;
  website: string | null;
  hasAlternative: boolean;
  alternativeName: string | null;
  alternativeSavings: number | null;
  notes: string | null;
  patterns: Array<{ pattern: string; priority: number; notes: string | null }>;
}> = [
  // ============================================================================
  // GROCERY STORES
  // ============================================================================
  {
    merchantName: "Costco",
    merchantType: "Grocery",
    website: "https://www.costco.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Warehouse club",
    patterns: [{ pattern: "COSTCO", priority: 10, notes: null }],
  },
  {
    merchantName: "Walmart",
    merchantType: "Grocery",
    website: "https://www.walmart.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Discount retailer",
    patterns: [
      { pattern: "WALMART", priority: 10, notes: null },
      { pattern: "WAL-MART", priority: 10, notes: null },
      { pattern: "WM SUPERCENTER", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Loblaws",
    merchantType: "Grocery",
    website: "https://www.loblaws.ca",
    hasAlternative: true,
    alternativeName: "No Frills",
    alternativeSavings: 50,
    notes: "Premium grocery",
    patterns: [{ pattern: "LOBLAWS", priority: 10, notes: null }],
  },
  {
    merchantName: "No Frills",
    merchantType: "Grocery",
    website: "https://www.nofrills.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Discount grocery",
    patterns: [
      { pattern: "NO FRILLS", priority: 10, notes: null },
      { pattern: "NOFRILLS", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Real Canadian Superstore",
    merchantType: "Grocery",
    website: "https://www.realcanadiansuperstore.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Loblaw banner",
    patterns: [
      { pattern: "SUPERSTORE", priority: 10, notes: null },
      { pattern: "RCSS", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Sobeys",
    merchantType: "Grocery",
    website: "https://www.sobeys.com",
    hasAlternative: true,
    alternativeName: "FreshCo",
    alternativeSavings: 40,
    notes: "Empire banner",
    patterns: [{ pattern: "SOBEYS", priority: 10, notes: null }],
  },
  {
    merchantName: "FreshCo",
    merchantType: "Grocery",
    website: "https://www.freshco.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Discount - Empire",
    patterns: [{ pattern: "FRESHCO", priority: 10, notes: null }],
  },
  {
    merchantName: "Metro",
    merchantType: "Grocery",
    website: "https://www.metro.ca",
    hasAlternative: true,
    alternativeName: "Food Basics",
    alternativeSavings: 40,
    notes: "Quebec/Ontario",
    patterns: [{ pattern: "METRO", priority: 5, notes: "Lower priority - common word" }],
  },
  {
    merchantName: "Food Basics",
    merchantType: "Grocery",
    website: "https://www.foodbasics.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Discount - Metro",
    patterns: [{ pattern: "FOOD BASICS", priority: 10, notes: null }],
  },
  {
    merchantName: "Safeway",
    merchantType: "Grocery",
    website: "https://www.safeway.ca",
    hasAlternative: true,
    alternativeName: "FreshCo",
    alternativeSavings: 30,
    notes: "Western Canada",
    patterns: [{ pattern: "SAFEWAY", priority: 10, notes: null }],
  },
  {
    merchantName: "Save-On-Foods",
    merchantType: "Grocery",
    website: "https://www.saveonfoods.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Western Canada",
    patterns: [
      { pattern: "SAVE ON FOODS", priority: 10, notes: null },
      { pattern: "SAVE-ON-FOODS", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "IGA",
    merchantType: "Grocery",
    website: "https://www.iga.net",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Empire - Quebec",
    patterns: [{ pattern: "IGA", priority: 5, notes: "Lower priority - short" }],
  },
  {
    merchantName: "Farm Boy",
    merchantType: "Grocery",
    website: "https://www.farmboy.ca",
    hasAlternative: true,
    alternativeName: "No Frills",
    alternativeSavings: 60,
    notes: "Premium - Empire",
    patterns: [{ pattern: "FARM BOY", priority: 10, notes: null }],
  },
  {
    merchantName: "T&T Supermarket",
    merchantType: "Grocery",
    website: "https://www.tnt-supermarket.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Asian grocery",
    patterns: [
      { pattern: "T&T", priority: 10, notes: null },
      { pattern: "T & T", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Whole Foods",
    merchantType: "Grocery",
    website: "https://www.wholefoodsmarket.com",
    hasAlternative: true,
    alternativeName: "Costco",
    alternativeSavings: 80,
    notes: "Premium organic",
    patterns: [
      { pattern: "WHOLE FOODS", priority: 10, notes: null },
      { pattern: "WHOLEFOODS", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Fortinos",
    merchantType: "Grocery",
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
    website: "https://www.foodland.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Empire - rural Ontario",
    patterns: [{ pattern: "FOODLAND", priority: 10, notes: null }],
  },
  {
    merchantName: "Bulk Barn",
    merchantType: "Grocery",
    website: "https://www.bulkbarn.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Bulk food store",
    patterns: [{ pattern: "BULK BARN", priority: 10, notes: null }],
  },

  // ============================================================================
  // PHARMACY/DRUG STORES
  // ============================================================================
  {
    merchantName: "Shoppers Drug Mart",
    merchantType: "Pharmacy",
    website: "https://www.shoppersdrugmart.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Loblaw pharmacy",
    patterns: [
      { pattern: "SHOPPERS", priority: 10, notes: null },
      { pattern: "SDM", priority: 5, notes: null },
    ],
  },
  {
    merchantName: "Rexall",
    merchantType: "Pharmacy",
    website: "https://www.rexall.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: null,
    patterns: [{ pattern: "REXALL", priority: 10, notes: null }],
  },
  {
    merchantName: "Pharmaprix",
    merchantType: "Pharmacy",
    website: "https://www.pharmaprix.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Quebec SDM",
    patterns: [{ pattern: "PHARMAPRIX", priority: 10, notes: null }],
  },
  {
    merchantName: "Jean Coutu",
    merchantType: "Pharmacy",
    website: "https://www.jeancoutu.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Quebec - Metro",
    patterns: [{ pattern: "JEAN COUTU", priority: 10, notes: null }],
  },

  // ============================================================================
  // GAS STATIONS
  // ============================================================================
  {
    merchantName: "Petro-Canada",
    merchantType: "Gas",
    website: "https://www.petro-canada.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: null,
    patterns: [
      { pattern: "PETRO-CANADA", priority: 10, notes: null },
      { pattern: "PETRO CANADA", priority: 10, notes: null },
      { pattern: "PETROCAN", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Esso",
    merchantType: "Gas",
    website: "https://www.esso.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Imperial Oil",
    patterns: [
      { pattern: "ESSO", priority: 10, notes: null },
      { pattern: "IMPERIAL OIL", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Shell",
    merchantType: "Gas",
    website: "https://www.shell.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: null,
    patterns: [{ pattern: "SHELL", priority: 10, notes: null }],
  },
  {
    merchantName: "Canadian Tire Gas",
    merchantType: "Gas",
    website: "https://www.canadiantire.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "CT money",
    patterns: [{ pattern: "CANADIAN TIRE GAS", priority: 15, notes: null }],
  },
  {
    merchantName: "Costco Gas",
    merchantType: "Gas",
    website: "https://www.costco.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Members only",
    patterns: [{ pattern: "COSTCO GAS", priority: 15, notes: null }],
  },
  {
    merchantName: "Pioneer",
    merchantType: "Gas",
    website: null,
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Parkland",
    patterns: [{ pattern: "PIONEER", priority: 5, notes: null }],
  },

  // ============================================================================
  // COFFEE & FAST FOOD
  // ============================================================================
  {
    merchantName: "Tim Hortons",
    merchantType: "Coffee",
    website: "https://www.timhortons.ca",
    hasAlternative: true,
    alternativeName: "Home coffee",
    alternativeSavings: 4,
    notes: null,
    patterns: [
      { pattern: "TIM HORTON", priority: 10, notes: null },
      { pattern: "TIMS", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Starbucks",
    merchantType: "Coffee",
    website: "https://www.starbucks.ca",
    hasAlternative: true,
    alternativeName: "Home coffee",
    alternativeSavings: 6,
    notes: null,
    patterns: [{ pattern: "STARBUCKS", priority: 10, notes: null }],
  },
  {
    merchantName: "M Square Coffee",
    merchantType: "Coffee",
    website: null,
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Local coffee shop",
    patterns: [{ pattern: "M SQUARE", priority: 10, notes: null }],
  },
  {
    merchantName: "McDonalds",
    merchantType: "Fast Food",
    website: "https://www.mcdonalds.ca",
    hasAlternative: true,
    alternativeName: "Cook at home",
    alternativeSavings: 10,
    notes: null,
    patterns: [
      { pattern: "MCDONALD", priority: 10, notes: null },
      { pattern: "MCD", priority: 5, notes: null },
    ],
  },
  {
    merchantName: "Wendys",
    merchantType: "Fast Food",
    website: "https://www.wendys.ca",
    hasAlternative: true,
    alternativeName: "Cook at home",
    alternativeSavings: 10,
    notes: null,
    patterns: [{ pattern: "WENDY", priority: 10, notes: null }],
  },
  {
    merchantName: "Burger King",
    merchantType: "Fast Food",
    website: "https://www.burgerking.ca",
    hasAlternative: true,
    alternativeName: "Cook at home",
    alternativeSavings: 10,
    notes: null,
    patterns: [
      { pattern: "BURGER KING", priority: 10, notes: null },
      { pattern: "BK ", priority: 5, notes: null },
    ],
  },
  {
    merchantName: "Subway",
    merchantType: "Fast Food",
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
    website: "https://www.aw.ca",
    hasAlternative: true,
    alternativeName: "Cook at home",
    alternativeSavings: 10,
    notes: null,
    patterns: [
      { pattern: "A&W", priority: 10, notes: null },
      { pattern: "A & W", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Pizza Pizza",
    merchantType: "Fast Food",
    website: "https://www.pizzapizza.ca",
    hasAlternative: true,
    alternativeName: "Make pizza",
    alternativeSavings: 15,
    notes: null,
    patterns: [{ pattern: "PIZZA PIZZA", priority: 10, notes: null }],
  },
  {
    merchantName: "Popeyes",
    merchantType: "Fast Food",
    website: "https://www.popeyes.ca",
    hasAlternative: true,
    alternativeName: "Cook at home",
    alternativeSavings: 12,
    notes: null,
    patterns: [{ pattern: "POPEYES", priority: 10, notes: null }],
  },
  {
    merchantName: "Chipotle",
    merchantType: "Fast Food",
    website: "https://www.chipotle.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Mexican fast casual",
    patterns: [{ pattern: "CHIPOTLE", priority: 10, notes: null }],
  },
  {
    merchantName: "Cobs Bread",
    merchantType: "Bakery",
    website: "https://www.cobsbread.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Fresh bakery",
    patterns: [{ pattern: "COBS BREAD", priority: 10, notes: null }],
  },

  // ============================================================================
  // FOOD DELIVERY
  // ============================================================================
  {
    merchantName: "Skip The Dishes",
    merchantType: "Delivery",
    website: "https://www.skipthedishes.com",
    hasAlternative: true,
    alternativeName: "Pick up",
    alternativeSavings: 10,
    notes: "Delivery fees",
    patterns: [
      { pattern: "SKIP THE DISHES", priority: 10, notes: null },
      { pattern: "SKIPTHEDISHES", priority: 10, notes: null },
      { pattern: "SKIP*", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "DoorDash",
    merchantType: "Delivery",
    website: "https://www.doordash.com",
    hasAlternative: true,
    alternativeName: "Pick up",
    alternativeSavings: 10,
    notes: "Delivery fees",
    patterns: [{ pattern: "DOORDASH", priority: 10, notes: null }],
  },
  {
    merchantName: "Uber Eats",
    merchantType: "Delivery",
    website: "https://www.ubereats.com",
    hasAlternative: true,
    alternativeName: "Pick up",
    alternativeSavings: 10,
    notes: "Delivery fees",
    patterns: [
      { pattern: "UBER* EATS", priority: 20, notes: "High priority - match before UBER* TRIP" },
      { pattern: "UBEREATS", priority: 15, notes: null },
      { pattern: "UBER EATS", priority: 15, notes: null },
    ],
  },
  {
    merchantName: "Instacart",
    merchantType: "Delivery",
    website: "https://www.instacart.ca",
    hasAlternative: true,
    alternativeName: "Shop yourself",
    alternativeSavings: 15,
    notes: "Grocery delivery",
    patterns: [{ pattern: "INSTACART", priority: 10, notes: null }],
  },

  // ============================================================================
  // GENERAL RETAIL
  // ============================================================================
  {
    merchantName: "Canadian Tire",
    merchantType: "Retail",
    website: "https://www.canadiantire.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Hardware, auto, home",
    patterns: [
      { pattern: "CANADIAN TIRE", priority: 10, notes: null },
      { pattern: "CDN TIRE", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Amazon",
    merchantType: "Online",
    website: "https://www.amazon.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Online marketplace",
    patterns: [
      { pattern: "AMZN", priority: 15, notes: "Core identifier" },
      { pattern: "AMAZON", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Dollarama",
    merchantType: "Discount",
    website: "https://www.dollarama.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Dollar store",
    patterns: [{ pattern: "DOLLARAMA", priority: 10, notes: null }],
  },
  {
    merchantName: "Giant Tiger",
    merchantType: "Discount",
    website: "https://www.gianttiger.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Discount retailer",
    patterns: [{ pattern: "GIANT TIGER", priority: 10, notes: null }],
  },
  {
    merchantName: "Home Depot",
    merchantType: "Hardware",
    website: "https://www.homedepot.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: null,
    patterns: [{ pattern: "HOME DEPOT", priority: 10, notes: null }],
  },
  {
    merchantName: "Lowes",
    merchantType: "Hardware",
    website: "https://www.lowes.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Rona",
    patterns: [
      { pattern: "LOWES", priority: 10, notes: null },
      { pattern: "RONA", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "IKEA",
    merchantType: "Furniture",
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
    website: "https://www.thesource.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Bell owned",
    patterns: [{ pattern: "THE SOURCE", priority: 10, notes: null }],
  },
  {
    merchantName: "Staples",
    merchantType: "Office",
    website: "https://www.staples.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Office supplies",
    patterns: [{ pattern: "STAPLES", priority: 10, notes: null }],
  },
  {
    merchantName: "Buck or Two",
    merchantType: "Discount",
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
    website: null,
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Dollar store",
    patterns: [{ pattern: "DOLLAR CHOICE", priority: 10, notes: null }],
  },

  // ============================================================================
  // CLOTHING
  // ============================================================================
  {
    merchantName: "Winners",
    merchantType: "Clothing",
    website: "https://www.winners.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "TJX discount",
    patterns: [{ pattern: "WINNERS", priority: 10, notes: null }],
  },
  {
    merchantName: "HomeSense",
    merchantType: "Home",
    website: "https://www.homesense.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "TJX home",
    patterns: [
      { pattern: "HOMESENSE", priority: 10, notes: null },
      { pattern: "HOME SENSE", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Marshalls",
    merchantType: "Clothing",
    website: "https://www.marshalls.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "TJX discount",
    patterns: [{ pattern: "MARSHALLS", priority: 10, notes: null }],
  },
  {
    merchantName: "Old Navy",
    merchantType: "Clothing",
    website: "https://www.oldnavy.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Gap Inc",
    patterns: [{ pattern: "OLD NAVY", priority: 10, notes: null }],
  },
  {
    merchantName: "H&M",
    merchantType: "Clothing",
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
    website: "https://www.uniqlo.com/ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: null,
    patterns: [{ pattern: "UNIQLO", priority: 10, notes: null }],
  },
  {
    merchantName: "Sport Chek",
    merchantType: "Sports",
    website: "https://www.sportchek.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "CT owned",
    patterns: [
      { pattern: "SPORT CHEK", priority: 10, notes: null },
      { pattern: "SPORTCHEK", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Marks",
    merchantType: "Clothing",
    website: "https://www.marks.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "CT owned",
    patterns: [{ pattern: "MARKS", priority: 5, notes: null }],
  },
  {
    merchantName: "Hudson's Bay",
    merchantType: "Department",
    website: "https://www.thebay.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "HBC",
    patterns: [
      { pattern: "HUDSON", priority: 10, notes: null },
      { pattern: "THE BAY", priority: 10, notes: null },
      { pattern: "HBC", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Carters",
    merchantType: "Clothing",
    website: "https://www.carters.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Kids clothing - Oshkosh",
    patterns: [
      { pattern: "CARTER'S", priority: 10, notes: null },
      { pattern: "CARTERS", priority: 10, notes: null },
      { pattern: "OSHKOSH", priority: 10, notes: null },
    ],
  },

  // ============================================================================
  // STREAMING & SUBSCRIPTIONS
  // ============================================================================
  {
    merchantName: "Netflix",
    merchantType: "Subscription",
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
    website: "https://www.disneyplus.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Disney streaming",
    patterns: [
      { pattern: "DISNEY PLUS", priority: 10, notes: null },
      { pattern: "DISNEYPLUS", priority: 10, notes: null },
      { pattern: "DISNEY+", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Amazon Prime",
    merchantType: "Subscription",
    website: "https://www.amazon.ca/prime",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Prime membership",
    patterns: [
      { pattern: "AMZN PRIME", priority: 15, notes: "Prime membership" },
      { pattern: "PRIME MEMBER", priority: 10, notes: null },
      { pattern: "AMAZON PRIME", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Apple",
    merchantType: "Subscription",
    website: "https://www.apple.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "iCloud, Music, TV+",
    patterns: [
      { pattern: "APPLE.COM", priority: 10, notes: null },
      { pattern: "ITUNES", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "YouTube Premium",
    merchantType: "Subscription",
    website: "https://www.youtube.com/premium",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Google",
    patterns: [
      { pattern: "GOOGLE* YOUTUBE", priority: 15, notes: "Google billing format" },
      { pattern: "YOUTUBE", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Crave",
    merchantType: "Subscription",
    website: "https://www.crave.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Bell Media",
    patterns: [{ pattern: "CRAVE", priority: 10, notes: null }],
  },
  {
    merchantName: "Xbox",
    merchantType: "Subscription",
    website: "https://www.xbox.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Game Pass",
    patterns: [
      { pattern: "XBOX", priority: 10, notes: null },
      { pattern: "MSFTONLINE", priority: 10, notes: "Microsoft online" },
    ],
  },
  {
    merchantName: "PlayStation",
    merchantType: "Subscription",
    website: "https://www.playstation.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "PS Plus",
    patterns: [{ pattern: "PLAYSTATION", priority: 10, notes: null }],
  },
  {
    merchantName: "Nintendo",
    merchantType: "Subscription",
    website: "https://www.nintendo.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Online",
    patterns: [{ pattern: "NINTENDO", priority: 10, notes: null }],
  },

  // ============================================================================
  // TELECOM
  // ============================================================================
  {
    merchantName: "Rogers",
    merchantType: "Telecom",
    website: "https://www.rogers.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Mobile, Internet, Cable",
    patterns: [{ pattern: "ROGERS", priority: 10, notes: null }],
  },
  {
    merchantName: "Bell",
    merchantType: "Telecom",
    website: "https://www.bell.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Mobile, Internet, TV",
    patterns: [
      { pattern: "BELL CANADA", priority: 10, notes: null },
      { pattern: "BELL MOBILITY", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Telus",
    merchantType: "Telecom",
    website: "https://www.telus.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Mobile, Internet",
    patterns: [{ pattern: "TELUS", priority: 10, notes: null }],
  },
  {
    merchantName: "Fido",
    merchantType: "Telecom",
    website: "https://www.fido.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Rogers flanker",
    patterns: [{ pattern: "FIDO", priority: 10, notes: null }],
  },
  {
    merchantName: "Koodo",
    merchantType: "Telecom",
    website: "https://www.koodomobile.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Telus flanker",
    patterns: [{ pattern: "KOODO", priority: 10, notes: null }],
  },
  {
    merchantName: "Virgin Plus",
    merchantType: "Telecom",
    website: "https://www.virginplus.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Bell flanker",
    patterns: [{ pattern: "VIRGIN", priority: 10, notes: null }],
  },
  {
    merchantName: "Freedom Mobile",
    merchantType: "Telecom",
    website: "https://www.freedommobile.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Videotron",
    patterns: [{ pattern: "FREEDOM MOBILE", priority: 10, notes: null }],
  },
  {
    merchantName: "Public Mobile",
    merchantType: "Telecom",
    website: "https://www.publicmobile.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Telus prepaid",
    patterns: [{ pattern: "PUBLIC MOBILE", priority: 10, notes: null }],
  },

  // ============================================================================
  // UTILITIES
  // ============================================================================
  {
    merchantName: "Hydro One",
    merchantType: "Utility",
    website: "https://www.hydroone.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Ontario hydro",
    patterns: [{ pattern: "HYDRO ONE", priority: 10, notes: null }],
  },
  {
    merchantName: "Toronto Hydro",
    merchantType: "Utility",
    website: "https://www.torontohydro.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Toronto",
    patterns: [{ pattern: "TORONTO HYDRO", priority: 10, notes: null }],
  },
  {
    merchantName: "Enbridge",
    merchantType: "Utility",
    website: "https://www.enbridge.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Natural gas",
    patterns: [{ pattern: "ENBRIDGE", priority: 10, notes: null }],
  },
  {
    merchantName: "BC Hydro",
    merchantType: "Utility",
    website: "https://www.bchydro.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "BC electricity",
    patterns: [{ pattern: "BC HYDRO", priority: 10, notes: null }],
  },
  {
    merchantName: "Hydro-Quebec",
    merchantType: "Utility",
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
    website: "https://www.oakvillehydro.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Oakville electricity",
    patterns: [{ pattern: "OAKVILLE HYDRO", priority: 10, notes: null }],
  },
  {
    merchantName: "Reliance Home Comfort",
    merchantType: "Utility",
    website: "https://www.reliancehomecomfort.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Water heater, HVAC rental",
    patterns: [
      { pattern: "RELIANCE", priority: 10, notes: null },
      { pattern: "RELIANCECOMFORT", priority: 10, notes: null },
    ],
  },

  // ============================================================================
  // TRANSIT
  // ============================================================================
  {
    merchantName: "TTC",
    merchantType: "Transit",
    website: "https://www.ttc.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Toronto Transit",
    patterns: [
      { pattern: "TTC", priority: 10, notes: null },
      { pattern: "TORONTO TRANSIT", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Presto",
    merchantType: "Transit",
    website: "https://www.prestocard.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Transit card",
    patterns: [{ pattern: "PRESTO", priority: 10, notes: null }],
  },
  {
    merchantName: "GO Transit",
    merchantType: "Transit",
    website: "https://www.gotransit.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Regional transit",
    patterns: [
      { pattern: "GO TRANSIT", priority: 10, notes: null },
      { pattern: "METROLINX", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "TransLink",
    merchantType: "Transit",
    website: "https://www.translink.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Vancouver",
    patterns: [{ pattern: "TRANSLINK", priority: 10, notes: null }],
  },
  {
    merchantName: "STM",
    merchantType: "Transit",
    website: "https://www.stm.info",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Montreal",
    patterns: [{ pattern: "STM", priority: 10, notes: null }],
  },
  {
    merchantName: "407 ETR",
    merchantType: "Toll",
    website: "https://www.407etr.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Highway toll",
    patterns: [
      { pattern: "407 ETR", priority: 10, notes: null },
      { pattern: "407ETR", priority: 10, notes: null },
    ],
  },

  // ============================================================================
  // RIDE SHARE
  // ============================================================================
  {
    merchantName: "Uber",
    merchantType: "Rideshare",
    website: "https://www.uber.com",
    hasAlternative: true,
    alternativeName: "Transit",
    alternativeSavings: 15,
    notes: null,
    patterns: [{ pattern: "UBER", priority: 10, notes: null }],
  },
  {
    merchantName: "Lyft",
    merchantType: "Rideshare",
    website: "https://www.lyft.com",
    hasAlternative: true,
    alternativeName: "Transit",
    alternativeSavings: 15,
    notes: null,
    patterns: [{ pattern: "LYFT", priority: 10, notes: null }],
  },

  // ============================================================================
  // ENTERTAINMENT
  // ============================================================================
  {
    merchantName: "Cineplex",
    merchantType: "Entertainment",
    website: "https://www.cineplex.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Movies",
    patterns: [{ pattern: "CINEPLEX", priority: 10, notes: null }],
  },
  {
    merchantName: "Ticketmaster",
    merchantType: "Entertainment",
    website: "https://www.ticketmaster.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Events",
    patterns: [{ pattern: "TICKETMASTER", priority: 10, notes: null }],
  },

  // ============================================================================
  // FITNESS
  // ============================================================================
  {
    merchantName: "GoodLife Fitness",
    merchantType: "Fitness",
    website: "https://www.goodlifefitness.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: null,
    patterns: [
      { pattern: "GOODLIFE", priority: 10, notes: null },
      { pattern: "GOOD LIFE", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Planet Fitness",
    merchantType: "Fitness",
    website: "https://www.planetfitness.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Budget gym",
    patterns: [
      { pattern: "PLANET FITNESS", priority: 10, notes: null },
      { pattern: "PF LONDON", priority: 15, notes: "Planet Fitness London ON" },
    ],
  },
  {
    merchantName: "YMCA",
    merchantType: "Fitness",
    website: "https://www.ymca.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Community center",
    patterns: [{ pattern: "YMCA", priority: 10, notes: null }],
  },
  {
    merchantName: "London Aquatic",
    merchantType: "Fitness",
    website: null,
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "London ON swimming",
    patterns: [{ pattern: "LONDON AQUATIC", priority: 10, notes: null }],
  },

  // ============================================================================
  // INSURANCE
  // ============================================================================
  {
    merchantName: "Intact Insurance",
    merchantType: "Insurance",
    website: "https://www.intact.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: null,
    patterns: [{ pattern: "INTACT", priority: 10, notes: null }],
  },
  {
    merchantName: "Aviva",
    merchantType: "Insurance",
    website: "https://www.aviva.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: null,
    patterns: [{ pattern: "AVIVA", priority: 10, notes: null }],
  },
  {
    merchantName: "Desjardins Insurance",
    merchantType: "Insurance",
    website: "https://www.desjardinsassurance.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: null,
    patterns: [{ pattern: "DESJARDINS INS", priority: 10, notes: null }],
  },
  {
    merchantName: "TD Insurance",
    merchantType: "Insurance",
    website: "https://www.tdinsurance.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: null,
    patterns: [{ pattern: "TD INSURANCE", priority: 10, notes: null }],
  },
  {
    merchantName: "Co-operators",
    merchantType: "Insurance",
    website: "https://www.cooperators.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Canadian insurance cooperative",
    patterns: [
      { pattern: "COOPERATORS", priority: 10, notes: null },
      { pattern: "CO-OPERATORS", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Manulife",
    merchantType: "Insurance",
    website: "https://www.manulife.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Life, health, benefits",
    patterns: [{ pattern: "MANULIFE", priority: 10, notes: null }],
  },
  {
    merchantName: "Sun Life",
    merchantType: "Insurance",
    website: "https://www.sunlife.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Life, health, benefits",
    patterns: [
      { pattern: "SUNLIFE", priority: 10, notes: null },
      { pattern: "SUN LIFE", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Canada Life",
    merchantType: "Insurance",
    website: "https://www.canadalife.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Life, health insurance",
    patterns: [{ pattern: "CANADA LIFE", priority: 10, notes: null }],
  },
  {
    merchantName: "Co-op Life",
    merchantType: "Insurance",
    website: "https://www.cooperators.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Co-operators life insurance",
    patterns: [{ pattern: "CO-OP LIFE", priority: 10, notes: null }],
  },

  // ============================================================================
  // ALCOHOL
  // ============================================================================
  {
    merchantName: "LCBO",
    merchantType: "Liquor",
    website: "https://www.lcbo.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Ontario liquor",
    patterns: [{ pattern: "LCBO", priority: 10, notes: null }],
  },
  {
    merchantName: "Beer Store",
    merchantType: "Liquor",
    website: "https://www.thebeerstore.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Ontario beer",
    patterns: [
      { pattern: "BEER STORE", priority: 10, notes: null },
      { pattern: "BREWERS RETAIL", priority: 10, notes: null },
    ],
  },
  {
    merchantName: "SAQ",
    merchantType: "Liquor",
    website: "https://www.saq.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Quebec liquor",
    patterns: [{ pattern: "SAQ", priority: 10, notes: null }],
  },
  {
    merchantName: "BC Liquor",
    merchantType: "Liquor",
    website: "https://www.bcliquorstores.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "BC liquor",
    patterns: [{ pattern: "BC LIQUOR", priority: 10, notes: null }],
  },

  // ============================================================================
  // FINANCIAL SERVICES
  // ============================================================================
  {
    merchantName: "Honda Finance",
    merchantType: "Lender",
    website: "https://www.honda.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Honda Financial Services",
    patterns: [{ pattern: "HONDA FINANCE", priority: 10, notes: null }],
  },
  {
    merchantName: "CMLS Financial",
    merchantType: "Lender",
    website: "https://www.cmls.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Canadian mortgage lender - acquired by Nesto 2024",
    patterns: [{ pattern: "CMLS", priority: 10, notes: null }],
  },
  {
    merchantName: "Lockwood Lease",
    merchantType: "Leasing",
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
    website: "https://www.agf.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "AGF Investments - mutual funds",
    patterns: [{ pattern: "AGF", priority: 10, notes: "Mutual funds" }],
  },
  {
    merchantName: "PayPal",
    merchantType: "Payment",
    website: "https://www.paypal.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Online payment processor",
    patterns: [{ pattern: "PAYPAL", priority: 10, notes: null }],
  },
  {
    merchantName: "Wise",
    merchantType: "Money Transfer",
    website: "https://www.wise.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "International money transfers",
    patterns: [{ pattern: "WISE", priority: 5, notes: "Lower priority - common word" }],
  },
  {
    merchantName: "MyDoh",
    merchantType: "Banking",
    website: "https://www.mydoh.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "RBC kids banking app",
    patterns: [{ pattern: "MYDOH", priority: 10, notes: null }],
  },

  // ============================================================================
  // CREDIT CARDS
  // ============================================================================
  {
    merchantName: "AMEX",
    merchantType: "Credit Card",
    website: "https://www.americanexpress.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "American Express",
    patterns: [{ pattern: "AMEX", priority: 10, notes: null }],
  },
  {
    merchantName: "Capital One",
    merchantType: "Credit Card",
    website: "https://www.capitalone.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Capital One Mastercard",
    patterns: [{ pattern: "CAPITAL ONE", priority: 10, notes: null }],
  },
  {
    merchantName: "NEO Financial",
    merchantType: "Credit Card",
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
    website: "https://www.flexiti.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Retail financing - Home Depot, etc",
    patterns: [{ pattern: "FLEXITI", priority: 10, notes: null }],
  },

  // ============================================================================
  // PERSONAL CARE
  // ============================================================================
  {
    merchantName: "Oxford Barber Shop",
    merchantType: "Personal Care",
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
    website: null,
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Nail salon",
    patterns: [{ pattern: "KT NATURAL", priority: 10, notes: null }],
  },

  // ============================================================================
  // KIDS/FAMILY
  // ============================================================================
  {
    merchantName: "Toys R Us",
    merchantType: "Retail",
    website: "https://www.toysrus.ca",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Toy store",
    patterns: [
      { pattern: "TOYS R US", priority: 10, notes: null },
      { pattern: 'TOYS"R"US', priority: 10, notes: null },
    ],
  },
  {
    merchantName: "Pandora",
    merchantType: "Jewelry",
    website: "https://www.pandora.net",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Jewelry",
    patterns: [{ pattern: "PANDORA", priority: 10, notes: null }],
  },
  {
    merchantName: "Bath & Body Works",
    merchantType: "Personal Care",
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

  // ============================================================================
  // AUTO
  // ============================================================================
  {
    merchantName: "Westgate Honda",
    merchantType: "Auto",
    website: null,
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Honda dealership",
    patterns: [{ pattern: "WESTGATE HONDA", priority: 10, notes: null }],
  },

  // ============================================================================
  // TRAVEL
  // ============================================================================
  {
    merchantName: "Delta Air Lines",
    merchantType: "Airline",
    website: "https://www.delta.com",
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "US airline",
    patterns: [{ pattern: "DELTA AIR", priority: 10, notes: null }],
  },

  // ============================================================================
  // GOVERNMENT
  // ============================================================================
  {
    merchantName: "Brazilian Consulate",
    merchantType: "Government",
    website: null,
    hasAlternative: false,
    alternativeName: null,
    alternativeSavings: null,
    notes: "Consulate General of Brazil",
    patterns: [{ pattern: "CONSULATE GENER", priority: 10, notes: "Brazilian consulate pattern" }],
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
      where: { institutionName: instData.institutionName },
      update: {
        institutionType: instData.institutionType,
        website: instData.website,
        notes: instData.notes,
      },
      create: {
        institutionName: instData.institutionName,
        institutionType: instData.institutionType,
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
      where: { groupName: groupData.groupName },
      update: {
        groupType: groupData.groupType,
        sortOrder: groupData.sortOrder,
        notes: groupData.notes,
      },
      create: {
        groupName: groupData.groupName,
        groupType: groupData.groupType,
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

  // Build a map of group names to IDs
  const groups = await prisma.categoryGroup.findMany();
  const groupMap = new Map(groups.map((g) => [g.groupName, g.id]));

  for (const catData of categories) {
    const groupId = groupMap.get(catData.groupName);
    await prisma.category.upsert({
      where: { categoryName: catData.categoryName },
      update: {
        groupId: groupId,
        necessityLevel: catData.necessityLevel,
        monthlyBudget: catData.monthlyBudget,
        sortOrder: catData.sortOrder,
        notes: catData.notes,
      },
      create: {
        categoryName: catData.categoryName,
        groupId: groupId,
        necessityLevel: catData.necessityLevel,
        monthlyBudget: catData.monthlyBudget,
        sortOrder: catData.sortOrder,
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
    where: { categoryName: "Credit Card Payment" },
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
        where: { categoryName: childName },
        data: { parentCategoryId: ccPaymentParent.id },
      });
    }
    console.log(`  Linked ${ccChildCategories.length} CC payment subcategories`);
  }

  // =========================================================================
  // Seed Merchants and Patterns
  // =========================================================================
  console.log("Seeding Merchants and MerchantPatterns...");

  let merchantCount = 0;
  let patternCount = 0;

  for (const merchantData of merchantsWithPatterns) {
    // Create or update merchant
    const merchant = await prisma.merchant.upsert({
      where: { merchantName: merchantData.merchantName },
      update: {
        merchantType: merchantData.merchantType,
        website: merchantData.website,
        hasAlternative: merchantData.hasAlternative,
        alternativeName: merchantData.alternativeName,
        alternativeSavings: merchantData.alternativeSavings,
        notes: merchantData.notes,
      },
      create: {
        merchantName: merchantData.merchantName,
        merchantType: merchantData.merchantType,
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
      } catch (error) {
        console.log(`  Pattern "${patternData.pattern}" already exists for different merchant`);
      }
    }
  }

  console.log(`\nSeeding complete!`);
  console.log(`  Merchants: ${merchantCount}`);
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
