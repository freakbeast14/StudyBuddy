import { asc, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { chunks } from "@/db/schema";

export const runtime = "nodejs";

const requestSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export async function POST(request: Request) {
  try {
    const payload = requestSchema.parse(await request.json());
    const rows = await db
      .select({
        id: chunks.id,
        documentId: chunks.documentId,
        pageNumber: chunks.pageNumber,
        content: chunks.content,
        chunkIndex: chunks.chunkIndex,
      })
      .from(chunks)
      .where(inArray(chunks.id, payload.ids))
      .orderBy(asc(chunks.pageNumber), asc(chunks.chunkIndex));

    return NextResponse.json(rows);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load chunks";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
