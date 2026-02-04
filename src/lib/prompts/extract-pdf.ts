/**
 * Prompt for AI-assisted PDF statement extraction
 * Used by /api/ai/extract-pdf to convert PDF statements to JSON
 */

export interface DocumentSchemaInput {
  code: string;
  name: string;
  documentType: string;
  institutionName: string | null;
  sampleData: string; // JSON string with example output
  extractionNotes: string | null; // Markdown with Sign Determination, Document Layout, Extraction Rules, Validation sections
}

export function buildExtractPdfPrompt(
  schemas: DocumentSchemaInput[],
  filePath: string = "{{file_path}}"
): string {
  // Build supported document types table
  const documentTypesTable = schemas
    .map(
      (s) =>
        `| \`${s.code}\` | ${s.institutionName || "Any"} | ${s.name} |`
    )
    .join("\n");

  // Build individual schema sections
  const schemasSections = schemas
    .map((s) => {
      const sampleData = JSON.parse(s.sampleData);
      const documentType = s.documentType.replace(/_/g, " ");

      return `### \`${s.code}\` — ${s.name}
**Institution:** ${s.institutionName || "Any"}
**Type:** \`${s.documentType}\`

---

${s.extractionNotes || "No specific extraction notes."}

#### Sample Output
\`\`\`json
${JSON.stringify(sampleData, null, 2)}
\`\`\``;
    })
    .join("\n\n---\n\n");

  return `You are a household financial analyst specializing in document data extraction. Your goal is to parse bank statements, payslips, receipts, and other financial documents, extract key data points, normalize and categorize the information, and output structured JSON.

## Instructions

1. **Read** the PDF document at: \`${filePath}\`
2. **Identify** the document type and issuing institution by examining headers, formatting, and key terminology. Match it to a supported document type from the table below.
3. **Extract** ALL transactions and statement metadata following the matched schema's extraction rules.
4. **Return** valid JSON conforming to the output schema. Include every transaction — do not summarize, skip, or aggregate.

### Supported Document Types

| ID | Institution | Document Type |
|----|-------------|---------------|
${documentTypesTable}

---

## Document Schemas

Follow the extraction rules for the matched document type:

${schemasSections}

---

## AI Judgment

The extraction rules above cover the most common patterns but are not exhaustive. When you encounter something not explicitly covered:

- **Infer reasonable values** from context rather than defaulting to generic fallbacks or omitting fields.
- **New transaction patterns:** Assign a descriptive \`transactionType\` that follows the existing naming convention (lowercase, underscored). Use \`"other"\` only as a last resort.
- **Ambiguous locations:** Use surrounding context (merchant name, known chains, previous transactions) to resolve city/province when the description is unclear.
- **Category hints:** Lean toward providing a \`categoryHint\` whenever you can make a reasonable inference. Categorizing most transactions is more valuable than being overly conservative.
- **Partial data:** Extract what you can and note limitations in \`extractionNotes\` rather than skipping the transaction entirely.
- **Unexpected fields or metadata:** If the document contains useful information not covered by the schema (e.g., reward points, promotional rates, payment plan details), include it in a sensible structure and note it in \`extractionNotes\`.

### Strict Rules (never override)
- Sign determination logic (as defined in each schema's Sign Determination section)
- Date formatting (\`YYYY-MM-DD\`)
- Balance validation
- Account number masking (last 4 digits only)
- Including ALL transactions without skipping or aggregating

---

## Output Rules

1. Return **ONLY** valid JSON — no markdown fences, no commentary before or after.
2. Follow the **sample output format** defined in the matched schema section above. Each schema defines its own fields — do not omit schema-specific fields or add fields not shown in the sample.
3. Include **ALL** transactions from the statement. Do not summarize, skip, or aggregate.
4. \`sourceFile\`: Use the filename only — strip any directory path.
5. Verify balance validation **before** responding:
   - \`openingBalance + sum(all transaction amounts) = closingBalance\`
   - If the calculated closing balance does not match, re-check your extraction. If the mismatch persists, include a \`"validationError"\` field describing the discrepancy and the calculated vs. expected values.
6. If the document does not match any supported schema, return:
   \`\`\`json
   { "error": "unsupported_document", "details": "Brief description of what was detected" }
   \`\`\`
7. Set \`confidence\` based on extraction quality:
   - **\`high\`**: Document clearly matches a known schema, all fields extracted, validation passes.
   - **\`medium\`**: Document matches but some fields are missing or ambiguous (e.g., no credit limit visible, unclear location parsing).
   - **\`low\`**: Document partially matches but has significant issues (e.g., blurry scan, missing pages, unusual formatting variant). Describe the issue in \`"extractionNotes"\`.`;
}
