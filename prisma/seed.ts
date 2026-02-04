/**
 * Prisma Seed File
 * Seeds all master data tables
 *
 * Run with: npx prisma db seed
 */

import { PrismaClient } from "../src/generated/prisma";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// Import seed data from modular files
import {
  categoryGroups,
  categories,
  merchants,
  institutions,
  documentSchemas,
} from "./seed-data";
import { employers } from "./seed-data/employers";

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
  const lightnessRange = Math.min(35, total * 8);
  const step = total > 1 ? lightnessRange / (total - 1) : 0;
  const startLightness = Math.max(25, l - lightnessRange / 2);
  const newLightness = Math.min(75, startLightness + step * index);

  // Slight hue shift for variety (max ±10 degrees)
  const hueShift = total > 1 ? ((index - (total - 1) / 2) / total) * 10 : 0;
  const newHue = (h + hueShift + 360) % 360;

  return hslToHex(newHue, s, newLightness);
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

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

  for (const merchantData of merchants) {
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

  // =========================================================================
  // Seed Employers
  // =========================================================================
  console.log("\nSeeding Employers...");

  let employerCount = 0;
  for (const emp of employers) {
    await prisma.employer.upsert({
      where: { name: emp.name },
      update: {},
      create: { ...emp, isActive: false },
    });
    employerCount++;
  }
  console.log(`  Employers: ${employerCount}`);

  // =========================================================================
  // Seed Document Schemas
  // =========================================================================
  console.log(`\nSeeding Document Schemas...`);

  let schemaCount = 0;
  for (const schema of documentSchemas) {
    await prisma.documentSchema.upsert({
      where: { code: schema.code },
      update: {
        name: schema.name,
        documentType: schema.documentType,
        institutionName: schema.institutionName,
        version: schema.version,
        sampleData: schema.sampleData,
        extractionNotes: schema.extractionNotes,
        notes: schema.notes,
      },
      create: schema,
    });
    schemaCount++;
  }
  console.log(`  Document Schemas: ${schemaCount}`);

  // =========================================================================
  // Summary
  // =========================================================================
  console.log(`\nSeeding complete!`);
  console.log(`  Merchants: ${merchantCount}`);
  console.log(`  Merchants with categories: ${linkedCount}`);
  console.log(`  Patterns: ${patternCount}`);
  console.log(`  Document Schemas: ${schemaCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
