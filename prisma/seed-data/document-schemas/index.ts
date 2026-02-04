/**
 * Document Schemas - Templates for LLM extraction
 * Each schema defines how to extract data from a specific document type
 */

import { triangleMastercardSchema } from "./triangle-mastercard";
import { rbcStatementSchema } from "./rbc-statement";
import type { DocumentSchema } from "../types";

export const documentSchemas: DocumentSchema[] = [
  triangleMastercardSchema,
  rbcStatementSchema,
];

// Re-export individual schemas for direct access
export { triangleMastercardSchema, rbcStatementSchema };
