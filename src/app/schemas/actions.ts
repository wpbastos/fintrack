"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type { SchemaFormData } from "./types";

export async function createSchema(
  data: SchemaFormData
): Promise<{ success: boolean; error?: string; schema?: { id: number } }> {
  try {
    const schema = await db.documentSchema.create({
      data: {
        code: data.code,
        name: data.name,
        documentType: data.documentType,
        institutionName: data.institutionName || null,
        version: data.version || "1.0",
        sampleData: data.sampleData,
        extractionNotes: data.extractionNotes || null,
        notes: data.notes || null,
        isActive: true,
      },
    });
    revalidatePath("/schemas");
    return { success: true, schema: { id: schema.id } };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { success: false, error: "Schema with this code already exists" };
    }
    return { success: false, error: "Failed to create schema" };
  }
}

export async function updateSchema(
  schemaId: number,
  data: Partial<SchemaFormData>
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.documentSchema.update({
      where: { id: schemaId },
      data: {
        ...(data.code !== undefined && { code: data.code }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.documentType !== undefined && { documentType: data.documentType }),
        ...(data.institutionName !== undefined && { institutionName: data.institutionName || null }),
        ...(data.version !== undefined && { version: data.version }),
        ...(data.sampleData !== undefined && { sampleData: data.sampleData }),
        ...(data.extractionNotes !== undefined && { extractionNotes: data.extractionNotes || null }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
      },
    });
    revalidatePath("/schemas");
    return { success: true };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { success: false, error: "Schema with this code already exists" };
    }
    return { success: false, error: "Failed to update schema" };
  }
}

export async function toggleSchemaStatus(
  schemaId: number,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.documentSchema.update({
      where: { id: schemaId },
      data: { isActive },
    });
    revalidatePath("/schemas");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update schema status" };
  }
}

export async function deleteSchema(
  schemaId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.documentSchema.delete({
      where: { id: schemaId },
    });
    revalidatePath("/schemas");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete schema" };
  }
}

export async function duplicateSchema(
  schemaId: number
): Promise<{ success: boolean; error?: string; schema?: { id: number } }> {
  try {
    const original = await db.documentSchema.findUnique({
      where: { id: schemaId },
    });

    if (!original) {
      return { success: false, error: "Schema not found" };
    }

    // Generate a unique code
    let newCode = `${original.code}-copy`;
    let counter = 1;
    while (await db.documentSchema.findUnique({ where: { code: newCode } })) {
      newCode = `${original.code}-copy-${counter}`;
      counter++;
    }

    const schema = await db.documentSchema.create({
      data: {
        code: newCode,
        name: `${original.name} (Copy)`,
        documentType: original.documentType,
        institutionName: original.institutionName,
        version: original.version,
        sampleData: original.sampleData,
        extractionNotes: original.extractionNotes,
        notes: original.notes,
        isActive: false, // Start as inactive
      },
    });

    revalidatePath("/schemas");
    return { success: true, schema: { id: schema.id } };
  } catch {
    return { success: false, error: "Failed to duplicate schema" };
  }
}
