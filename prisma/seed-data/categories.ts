/**
 * Categories - Budget categories with NecessityLevel
 * sortOrder is relative within each group (1, 2, 3...)
 * Colors are generated dynamically from group color during seeding
 */

import type { Category } from "./types";

export const categories: Category[] = [
  // Earned Income
  { categoryName: "Salary", groupName: "Earned Income", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 1, notes: "Regular salary and wages" },
  { categoryName: "Bonus", groupName: "Earned Income", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 2, notes: "Performance and year-end bonuses" },

  // Other Income
  { categoryName: "Government Benefits", groupName: "Other Income", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 1, notes: "CCB, GST/HST credit, tax refunds" },
  { categoryName: "Interest Income", groupName: "Other Income", necessityLevel: "Discretionary", monthlyBudget: null, sortOrder: 2, notes: "Bank interest, dividends" },
  { categoryName: "Refund", groupName: "Other Income", necessityLevel: "Discretionary", monthlyBudget: null, sortOrder: 3, notes: "Purchase refunds and returns" },
  { categoryName: "Reimbursement", groupName: "Other Income", necessityLevel: "Discretionary", monthlyBudget: null, sortOrder: 4, notes: "Health benefit claims, expense reimbursements" },
  // Reimbursement children — linked to parent in seed.ts
  { categoryName: "Manulife Claim", groupName: "Other Income", necessityLevel: "Discretionary", monthlyBudget: null, sortOrder: 5, notes: "Manulife group benefits reimbursement" },
  { categoryName: "Sun Life Claim", groupName: "Other Income", necessityLevel: "Discretionary", monthlyBudget: null, sortOrder: 6, notes: "Sun Life group benefits reimbursement" },
  { categoryName: "Canada Life Claim", groupName: "Other Income", necessityLevel: "Discretionary", monthlyBudget: null, sortOrder: 7, notes: "Canada Life group benefits reimbursement" },
  { categoryName: "Desjardins Claim", groupName: "Other Income", necessityLevel: "Discretionary", monthlyBudget: null, sortOrder: 8, notes: "Desjardins group benefits reimbursement" },
  { categoryName: "iA Financial Claim", groupName: "Other Income", necessityLevel: "Discretionary", monthlyBudget: null, sortOrder: 9, notes: "Industrial Alliance group benefits reimbursement" },
  { categoryName: "Blue Cross Claim", groupName: "Other Income", necessityLevel: "Discretionary", monthlyBudget: null, sortOrder: 10, notes: "Blue Cross group benefits reimbursement" },
  { categoryName: "Green Shield Claim", groupName: "Other Income", necessityLevel: "Discretionary", monthlyBudget: null, sortOrder: 11, notes: "Green Shield Canada group benefits reimbursement" },
  { categoryName: "Equitable Life Claim", groupName: "Other Income", necessityLevel: "Discretionary", monthlyBudget: null, sortOrder: 12, notes: "Equitable Life group benefits reimbursement" },
  { categoryName: "Co-operators Claim", groupName: "Other Income", necessityLevel: "Discretionary", monthlyBudget: null, sortOrder: 13, notes: "Co-operators group benefits reimbursement" },
  { categoryName: "Other Income", groupName: "Other Income", necessityLevel: "Discretionary", monthlyBudget: null, sortOrder: 14, notes: "Gifts received, miscellaneous income" },

  // Housing
  { categoryName: "Mortgage", groupName: "Housing", necessityLevel: "Essential", monthlyBudget: 2850, sortOrder: 1, notes: "Principal and interest payments" },
  { categoryName: "Property Tax", groupName: "Housing", necessityLevel: "Essential", monthlyBudget: 450, sortOrder: 2, notes: "Annual property taxes" },
  { categoryName: "Home Maintenance", groupName: "Housing", necessityLevel: "Important", monthlyBudget: 250, sortOrder: 3, notes: "Repairs, improvements, lawn, snow removal" },

  // Utilities
  { categoryName: "Electricity", groupName: "Utilities", necessityLevel: "Essential", monthlyBudget: 300, sortOrder: 1, notes: "London Hydro" },
  { categoryName: "Natural Gas", groupName: "Utilities", necessityLevel: "Essential", monthlyBudget: 140, sortOrder: 2, notes: "Enbridge, Reliance" },
  { categoryName: "Water", groupName: "Utilities", necessityLevel: "Essential", monthlyBudget: 85, sortOrder: 3, notes: "Water and sewer services" },
  { categoryName: "Internet", groupName: "Utilities", necessityLevel: "Essential", monthlyBudget: 100, sortOrder: 4, notes: "High-speed internet" },
  { categoryName: "Phone", groupName: "Utilities", necessityLevel: "Essential", monthlyBudget: 200, sortOrder: 5, notes: "Mobile phone plans" },

  // Groceries & Dining
  { categoryName: "Groceries", groupName: "Groceries & Dining", necessityLevel: "Essential", monthlyBudget: 1700, sortOrder: 1, notes: "Costco, No Frills, Loblaws, RCSS" },
  { categoryName: "Eating Out", groupName: "Groceries & Dining", necessityLevel: "Discretionary", monthlyBudget: 250, sortOrder: 2, notes: "Restaurants, fast food, coffee shops, delivery" },
  { categoryName: "Alcohol", groupName: "Groceries & Dining", necessityLevel: "Discretionary", monthlyBudget: 100, sortOrder: 3, notes: "Beer, wine, spirits" },

  // Transportation
  { categoryName: "Fuel", groupName: "Transportation", necessityLevel: "Essential", monthlyBudget: 300, sortOrder: 1, notes: "Petro-Canada, CDN Tire Gasbar, Costco Gas" },
  { categoryName: "Car Payment", groupName: "Transportation", necessityLevel: "Essential", monthlyBudget: 550, sortOrder: 2, notes: "Vehicle loan or lease" },
  { categoryName: "Car Insurance", groupName: "Transportation", necessityLevel: "Essential", monthlyBudget: 250, sortOrder: 3, notes: "Auto insurance premiums" },
  { categoryName: "Car Maintenance", groupName: "Transportation", necessityLevel: "Important", monthlyBudget: 150, sortOrder: 4, notes: "Oil changes, tires, repairs" },
  { categoryName: "Parking", groupName: "Transportation", necessityLevel: "Important", monthlyBudget: 50, sortOrder: 5, notes: "Parking fees" },
  { categoryName: "Transit", groupName: "Transportation", necessityLevel: "Important", monthlyBudget: null, sortOrder: 6, notes: "Public transit, ride share, tolls" },

  // Health & Personal Care
  { categoryName: "Medical", groupName: "Health & Personal Care", necessityLevel: "Essential", monthlyBudget: 100, sortOrder: 1, notes: "Doctor, optometrist, massage, orthotics" },
  { categoryName: "Dental", groupName: "Health & Personal Care", necessityLevel: "Important", monthlyBudget: 120, sortOrder: 2, notes: "Dental care and cleanings" },
  { categoryName: "Pharmacy", groupName: "Health & Personal Care", necessityLevel: "Essential", monthlyBudget: 75, sortOrder: 3, notes: "Prescriptions and medications" },
  { categoryName: "Fitness", groupName: "Health & Personal Care", necessityLevel: "Discretionary", monthlyBudget: 80, sortOrder: 4, notes: "Gym membership, sports" },
  { categoryName: "Grooming", groupName: "Health & Personal Care", necessityLevel: "Important", monthlyBudget: 200, sortOrder: 5, notes: "Haircuts, nails, spa, personal products" },

  // Insurance
  { categoryName: "Home Insurance", groupName: "Insurance", necessityLevel: "Essential", monthlyBudget: 175, sortOrder: 1, notes: "Property insurance" },
  { categoryName: "Life Insurance", groupName: "Insurance", necessityLevel: "Important", monthlyBudget: 265, sortOrder: 2, notes: "Life insurance premiums" },
  { categoryName: "Health Insurance", groupName: "Insurance", necessityLevel: "Important", monthlyBudget: 80, sortOrder: 3, notes: "Extended health coverage" },

  // Kids & Education
  { categoryName: "Kids Activities", groupName: "Kids & Education", necessityLevel: "Important", monthlyBudget: 700, sortOrder: 1, notes: "Sports, lessons, activities, toys" },
  { categoryName: "School", groupName: "Kids & Education", necessityLevel: "Important", monthlyBudget: 200, sortOrder: 2, notes: "Tuition, school fees, supplies, trips, courses" },

  // Shopping & Entertainment
  { categoryName: "Clothing", groupName: "Shopping & Entertainment", necessityLevel: "Important", monthlyBudget: 200, sortOrder: 1, notes: "Clothing and shoes for family" },
  { categoryName: "Electronics", groupName: "Shopping & Entertainment", necessityLevel: "Discretionary", monthlyBudget: 75, sortOrder: 2, notes: "Devices and accessories" },
  { categoryName: "Household", groupName: "Shopping & Entertainment", necessityLevel: "Important", monthlyBudget: 125, sortOrder: 3, notes: "Home supplies, furniture, tools" },
  { categoryName: "Pets", groupName: "Shopping & Entertainment", necessityLevel: "Important", monthlyBudget: null, sortOrder: 4, notes: "Pet food, vet, supplies, grooming" },
  { categoryName: "Entertainment", groupName: "Shopping & Entertainment", necessityLevel: "Discretionary", monthlyBudget: 200, sortOrder: 5, notes: "Movies, events, hobbies, sports" },
  { categoryName: "Vacation", groupName: "Shopping & Entertainment", necessityLevel: "Discretionary", monthlyBudget: 400, sortOrder: 6, notes: "Travel and vacation" },

  // Subscriptions
  { categoryName: "Streaming", groupName: "Subscriptions", necessityLevel: "Discretionary", monthlyBudget: 50, sortOrder: 1, notes: "YouTube, HiDive, streaming services" },
  { categoryName: "Software & Tools", groupName: "Subscriptions", necessityLevel: "Discretionary", monthlyBudget: 250, sortOrder: 2, notes: "Claude AI, GitHub, Microsoft, Google One" },

  // Financial
  { categoryName: "Bank Fees", groupName: "Financial", necessityLevel: "Wasteful", monthlyBudget: 20, sortOrder: 1, notes: "Monthly fees, NSF charges" },
  { categoryName: "Interest Charges", groupName: "Financial", necessityLevel: "Wasteful", monthlyBudget: 0, sortOrder: 2, notes: "Credit card and loan interest" },
  { categoryName: "Other Expense", groupName: "Financial", necessityLevel: "Discretionary", monthlyBudget: null, sortOrder: 3, notes: "Government fees, uncategorized expenses" },

  // Gifts & Donations
  { categoryName: "Gifts Given", groupName: "Gifts & Donations", necessityLevel: "Discretionary", monthlyBudget: 150, sortOrder: 1, notes: "Gifts for others" },
  { categoryName: "Charity", groupName: "Gifts & Donations", necessityLevel: "Discretionary", monthlyBudget: 75, sortOrder: 2, notes: "Charitable donations" },

  // Transfers
  { categoryName: "Internal Transfer", groupName: "Transfers", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 1, notes: "Between own accounts" },
  { categoryName: "e-Transfer", groupName: "Transfers", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 2, notes: "Interac e-Transfer sent/received" },

  // Credit Card Payments — one category per CC merchant
  { categoryName: "AMEX", groupName: "Credit Card Payments", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 1, notes: "American Express bill payment" },
  { categoryName: "Triangle Mastercard", groupName: "Credit Card Payments", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 2, notes: "Canadian Tire Triangle Mastercard" },
  { categoryName: "Walmart Mastercard", groupName: "Credit Card Payments", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 3, notes: "Walmart Rewards Mastercard" },
  { categoryName: "RBC Credit Card", groupName: "Credit Card Payments", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 4, notes: "RBC Visa payment" },
  { categoryName: "TD Credit Card", groupName: "Credit Card Payments", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 5, notes: "TD Visa payment" },
  { categoryName: "CIBC Credit Card", groupName: "Credit Card Payments", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 6, notes: "CIBC Visa payment" },
  { categoryName: "Scotiabank Credit Card", groupName: "Credit Card Payments", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 7, notes: "Scotiabank Visa payment" },
  { categoryName: "BMO Credit Card", groupName: "Credit Card Payments", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 8, notes: "BMO Mastercard payment" },
  { categoryName: "Capital One", groupName: "Credit Card Payments", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 9, notes: "Capital One Mastercard" },
  { categoryName: "MBNA", groupName: "Credit Card Payments", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 10, notes: "MBNA Mastercard (TD subsidiary)" },
  { categoryName: "Tangerine Credit Card", groupName: "Credit Card Payments", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 11, notes: "Tangerine Mastercard" },
  { categoryName: "Desjardins Credit Card", groupName: "Credit Card Payments", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 12, notes: "Desjardins Visa payment" },
  { categoryName: "National Bank Credit Card", groupName: "Credit Card Payments", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 13, notes: "National Bank Mastercard" },
  { categoryName: "PC Financial Mastercard", groupName: "Credit Card Payments", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 14, notes: "PC Financial Mastercard (Loblaw/CIBC)" },
  { categoryName: "Rogers Credit Card", groupName: "Credit Card Payments", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 15, notes: "Rogers Bank Mastercard" },
  { categoryName: "Brim Financial", groupName: "Credit Card Payments", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 16, notes: "Brim Mastercard" },
  { categoryName: "Home Trust Visa", groupName: "Credit Card Payments", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 17, notes: "Home Trust Visa" },
  { categoryName: "NEO Financial", groupName: "Credit Card Payments", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 18, notes: "NEO Mastercard" },
  { categoryName: "Flexiti", groupName: "Credit Card Payments", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 19, notes: "Flexiti financing card" },
  { categoryName: "Simplii Financial", groupName: "Credit Card Payments", necessityLevel: "Essential", monthlyBudget: null, sortOrder: 20, notes: "Simplii Visa (CIBC digital)" },

  // Investments
  { categoryName: "RRSP", groupName: "Investments", necessityLevel: "Important", monthlyBudget: 600, sortOrder: 1, notes: "Registered Retirement Savings Plan" },
  { categoryName: "TFSA", groupName: "Investments", necessityLevel: "Important", monthlyBudget: 400, sortOrder: 2, notes: "Tax-Free Savings Account" },
  { categoryName: "RESP", groupName: "Investments", necessityLevel: "Important", monthlyBudget: 420, sortOrder: 3, notes: "Registered Education Savings Plan" },
  { categoryName: "FHSA", groupName: "Investments", necessityLevel: "Important", monthlyBudget: null, sortOrder: 4, notes: "First Home Savings Account" },
  { categoryName: "Mutual Funds", groupName: "Investments", necessityLevel: "Discretionary", monthlyBudget: 800, sortOrder: 5, notes: "AGF, non-registered investments" },
];
