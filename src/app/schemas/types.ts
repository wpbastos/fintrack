/**
 * Type definitions for Document Schema management
 */

export interface DocumentSchema {
  id: number;
  code: string;
  name: string;
  documentType: string;
  institutionName: string | null;
  version: string;
  sampleData: string;
  extractionNotes: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type DocumentType =
  | "credit_card_statement"
  | "bank_statement"
  | "payslip"
  | "receipt"
  | "invoice";

export const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: "credit_card_statement", label: "Credit Card Statement" },
  { value: "bank_statement", label: "Bank Statement" },
  { value: "payslip", label: "Payslip" },
  { value: "receipt", label: "Receipt" },
  { value: "invoice", label: "Invoice" },
];

export interface SchemaFormData {
  code: string;
  name: string;
  documentType: string;
  institutionName?: string;
  version?: string;
  sampleData: string;
  extractionNotes?: string;
  notes?: string;
}
