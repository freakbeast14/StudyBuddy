import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { documents } from "@/db/schema";

export const runtime = "nodejs";

export async function GET() {
  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      status: documents.status,
      createdAt: documents.createdAt,
      errorMessage: documents.errorMessage,
    })
    .from(documents)
    .orderBy(desc(documents.createdAt));

  return NextResponse.json(rows);
}
