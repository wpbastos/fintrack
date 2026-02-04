/**
 * Categories - Budget categories with NecessityLevel
 * sortOrder is relative within each group (1, 2, 3...)
 * Colors are generated dynamically from group color during seeding
 */

import type { Category } from "./types";

export const categories: Category[] = [
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
