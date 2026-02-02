import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const importId = searchParams.get("importId");

  if (!importId) {
    return NextResponse.json({ error: "importId is required" }, { status: 400 });
  }

  const importRecord = await db.import.findUnique({
    where: { id: parseInt(importId) },
    select: {
      aiStatus: true,
      aiStartedAt: true,
      aiResult: true,
    },
  });

  if (!importRecord) {
    return NextResponse.json({ error: "Import not found" }, { status: 404 });
  }

  return NextResponse.json(importRecord);
}
