"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

/**
 * Delete an import and all its staging transactions.
 * Only works if the import status is "staged" (not finalized).
 */
export async function deleteImport(importId: number): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if import exists and is staged
    const importRecord = await db.import.findUnique({
      where: { id: importId },
      select: { status: true },
    });

    if (!importRecord) {
      return { success: false, error: "Import not found" };
    }

    if (importRecord.status === "finalized") {
      return { success: false, error: "Cannot delete finalized imports" };
    }

    // Delete all staging transactions for this import
    await db.stagingTransaction.deleteMany({
      where: { importId },
    });

    // Delete the import record
    await db.import.delete({
      where: { id: importId },
    });

    revalidatePath("/log");
    revalidatePath("/staging");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete import" };
  }
}
