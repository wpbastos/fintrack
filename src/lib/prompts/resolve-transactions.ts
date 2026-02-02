/**
 * Prompt for AI-assisted transaction resolution
 * Used by /api/ai/resolve to classify unknown transactions
 */

export interface TransactionInput {
  id: number;
  rawDescription: string | null;
  rawAmount: number | null;
  currentStatus?: string;
  currentMerchant?: string | null;
  currentIncome?: string | null;
  currentCategory?: string | null;
}

export interface MerchantInput {
  id: number;
  name: string;
  patterns: { pattern: string }[];
  category: { id: number; name: string } | null;
}

export interface IncomeInput {
  id: number;
  name: string;
  patterns: { pattern: string }[];
  category: { id: number; name: string } | null;
  position: {
    employer: { name: string };
  } | null;
}

export interface CategoryInput {
  id: number;
  name: string;
  parentId: number | null;
  group: { name: string; type: string } | null;
  children?: { id: number; name: string }[];
}

export function buildResolveTransactionsPrompt(
  transactions: TransactionInput[],
  merchants: MerchantInput[],
  incomes: IncomeInput[],
  categories: CategoryInput[],
  includeAll = false
): string {
  const transactionList = transactions
    .map((t) => {
      const currentAssignment = t.currentMerchant || t.currentIncome
        ? ` [Current: ${t.currentMerchant || t.currentIncome}${t.currentCategory ? ` (${t.currentCategory})` : ""}]`
        : "";
      const status = t.currentStatus ? ` Status: ${t.currentStatus}` : "";
      return `- ID: ${t.id}, Description: "${t.rawDescription}", Amount: ${t.rawAmount}${status}${currentAssignment}`;
    })
    .join("\n");

  const merchantList = merchants
    .map((m) => {
      const patterns = m.patterns.map((p) => p.pattern).join(", ");
      return `- ID: ${m.id}, Name: "${m.name}", Patterns: [${patterns}], Category: ${m.category?.name ?? "None"}`;
    })
    .join("\n");

  const incomeList = incomes
    .map((i) => {
      const patterns = i.patterns.map((p) => p.pattern).join(", ");
      const employer = i.position?.employer?.name ?? "No employer";
      return `- ID: ${i.id}, Name: "${i.name}", Patterns: [${patterns}], Category: ${i.category?.name ?? "None"}, Employer: ${employer}`;
    })
    .join("\n");

  // Build category list showing parent-child relationships
  // Only show parent categories with their children listed below
  const parentCategories = categories.filter((c) => c.parentId === null);
  const categoryList = parentCategories
    .map((c) => {
      const children = c.children ?? [];
      if (children.length > 0) {
        const childList = children.map((child) => `    - ID: ${child.id}, Name: "${child.name}" (subcategory)`).join("\n");
        return `- ID: ${c.id}, Name: "${c.name}", Group: ${c.group?.name ?? "None"}, Type: ${c.group?.type ?? "Unknown"}\n  Subcategories:\n${childList}`;
      }
      return `- ID: ${c.id}, Name: "${c.name}", Group: ${c.group?.name ?? "None"}, Type: ${c.group?.type ?? "Unknown"}`;
    })
    .join("\n");

  const taskDescription = includeAll
    ? `You are a financial transaction classifier with web search capabilities. Review ALL transactions and either:
- **Confirm** transactions that are correctly classified (matched status with correct merchant/income)
- **Suggest changes** for transactions that are incorrectly classified or unclassified

## Your Task:
1. For EACH transaction, analyze whether the current assignment is correct
2. If the transaction is already correctly matched, set "confirmed": true
3. If the transaction needs a different classification or is unmatched, provide a suggestion
4. **USE WEB SEARCH** to research unknown merchants and employers when needed
5. The description is the RAW bank statement text - identify the actual merchant/company from it`
    : `You are a financial transaction classifier with web search capabilities. Analyze the unknown transactions and match them to existing merchants or income sources, or suggest new ones.

## Your Task:
1. For each unknown transaction, identify what merchant or income source it belongs to
2. **USE WEB SEARCH** to research unknown merchants and employers to find:
   - Official company/merchant name
   - Website URL
   - Business type/industry (to pick the right category)
   - For employers: company details for income sources
3. Match to existing entities or suggest new ones with enriched data`;

  const transactionsHeader = includeAll
    ? "## Transactions to Review (confirm or suggest changes):"
    : "## Unknown Transactions to Classify:";

  const responseFormat = includeAll
    ? `## Response Format:
Return ONLY valid JSON. For EACH transaction, include either:
- "confirmed": true if current assignment is correct
- Full suggestion if assignment should change or is missing

{
  "suggestions": [
    {
      "transactionId": <number>,
      "confirmed": true,
      "reasoning": "<brief explanation why current assignment is correct>"
    },
    {
      "transactionId": <number>,
      "type": "merchant" | "income",
      "existingId": <number or null if new>,
      "existingName": "<name if matching existing>",
      "existingCategoryName": "<category of existing entity>",
      "suggestedPattern": "<new pattern to add to existing entity>",
      "newEntity": {
        "name": "<proper business name>",
        "categoryId": <category id - use subcategory ID when parent has subcategories>,
        "categoryName": "<category name for display>",
        "parentCategoryId": <parent category id if categoryId is a subcategory, null otherwise>,
        "parentCategoryName": "<parent category name if categoryId is a subcategory>",
        "pattern": "<pattern to match future transactions>",
        "website": "<official website URL if found>",
        "industry": "<business type, e.g., Restaurant, Retail, Technology>",
        "employerName": "<for income: company name, e.g., Shopify Inc.>",
        "employerWebsite": "<for income: employer website>",
        "employerIndustry": "<for income: employer industry>"
      },
      "confidence": "high" | "medium" | "low",
      "reasoning": "<brief explanation including what you found via search>"
    }
  ]
}`
    : `## Response Format:
Return ONLY valid JSON:
{
  "suggestions": [
    {
      "transactionId": <number>,
      "type": "merchant" | "income",
      "existingId": <number or null if new>,
      "existingName": "<name if matching existing>",
      "existingCategoryName": "<category of existing entity>",
      "suggestedPattern": "<new pattern to add to existing entity>",
      "newEntity": {
        "name": "<proper business name>",
        "categoryId": <category id - use subcategory ID when parent has subcategories>,
        "categoryName": "<category name for display>",
        "parentCategoryId": <parent category id if categoryId is a subcategory, null otherwise>,
        "parentCategoryName": "<parent category name if categoryId is a subcategory>",
        "pattern": "<pattern to match future transactions>",
        "website": "<official website URL if found>",
        "industry": "<business type, e.g., Restaurant, Retail, Technology>",
        "employerName": "<for income: company name, e.g., Shopify Inc.>",
        "employerWebsite": "<for income: employer website>",
        "employerIndustry": "<for income: employer industry>"
      },
      "confidence": "high" | "medium" | "low",
      "reasoning": "<brief explanation including what you found via search>"
    }
  ]
}`;

  return `${taskDescription}

${transactionsHeader}
${transactionList}

## Existing Merchants (for expenses):
${merchantList || "None yet"}

## Existing Incomes (for income):
${incomeList || "None yet"}

## Available Categories:
${categoryList}

## Classification Rules:
1. Identify the entity from the description (what company/source is this?)
2. The amount sign just indicates direction of money flow:
   - Negative = purchase/payment (usually merchant)
   - Positive = refund/deposit (could be merchant refund OR income)
3. A refund from Amazon is still Amazon (merchant), not income
4. Check if description matches any existing pattern first
5. If no match, **search the web** to identify the merchant/employer
6. Extract the distinctive part as pattern (e.g., "STARBUCKS" from "STARBUCKS #12345 VANCOUVER")
7. Choose the most appropriate category based on what the business does
8. **IMPORTANT**: When a category has subcategories, you MUST pick the most appropriate subcategory instead of the parent

${responseFormat}

## Examples:
- "AMZN MKTP CA" → Search "AMZN MKTP" → Amazon Marketplace, category: Shopping, website: amazon.ca
- "AMZN MKTP CA" with positive amount → Still Amazon (refund), category: Shopping
- "NETFLIX.COM" → Netflix Inc., category: Subscriptions, website: netflix.com
- "SHOPIFY PAYROLL" → Income from Shopify Inc., search for company → tech company, website: shopify.com`;
}
