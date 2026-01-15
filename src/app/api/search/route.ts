import { and, eq, isNotNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { chunks, documents } from "@/db/schema";
import { createEmbedding } from "@/lib/openai";

export const runtime = "nodejs";

const requestSchema = z.object({
  courseId: z.string().uuid(),
  query: z.string().min(3),
});

export async function POST(request: Request) {
  try {
    const payload = requestSchema.parse(await request.json());
    const embedding = await createEmbedding(payload.query);
    if (!embedding.length) {
      return NextResponse.json({ error: "Embedding failed." }, { status: 500 });
    }
    const embeddingVector = `[${embedding.join(",")}]`;

    const rows = await db
      .select({
        chunkId: chunks.id,
        documentId: chunks.documentId,
        pageNumber: chunks.pageNumber,
        content: chunks.content,
        score: sql<number>`1 - (embedding <=> ${embeddingVector}::vector)`,
      })
      .from(chunks)
      .innerJoin(documents, eq(chunks.documentId, documents.id))
      .where(and(eq(documents.courseId, payload.courseId), isNotNull(chunks.embedding)))
      .orderBy(sql`embedding <=> ${embeddingVector}::vector`)
      .limit(12);

    return NextResponse.json(
      rows.map((row) => ({
        chunkId: row.chunkId,
        documentId: row.documentId,
        pageNumber: row.pageNumber,
        snippet: row.content.slice(0, 240),
        score: row.score,
      }))
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
