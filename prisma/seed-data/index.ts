/**
 * Seed Data Index
 * Re-exports all seed data from individual modules
 */

// Types
export * from "./types";

// Data arrays
export { categoryGroups } from "./category-groups";
export { categories } from "./categories";
export { merchants } from "./merchants";
export { institutions } from "./institutions";
export { employers } from "./employers";
export { documentSchemas } from "./document-schemas";

// Individual document schemas (for direct access)
export {
  triangleMastercardSchema,
  rbcStatementSchema,
} from "./document-schemas";
