import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { chunks, documents } from "@/db/schema";
import { createEmbedding, openAiJson } from "@/lib/openai";

export const runtime = "nodejs";

const requestSchema = z.object({
  courseId: z.string().uuid(),
  question: z.string().min(5),
});

const citationSchema = z.object({
  chunkId: z.string(),
  pageNumber: z.number(),
  quote: z.string(),
});

const responseSchema = z.object({
  answer: z.string().min(1),
  citations: z.array(citationSchema).min(1),
});

export async function POST(request: Request) {
  try {
    const payload = requestSchema.parse(await request.json());
    const embedding = await createEmbedding(payload.question);
    if (!embedding.length) {
      return NextResponse.json({ error: "Embedding failed." }, { status: 500 });
    }
    const embeddingVector = `[${embedding.join(",")}]`;

    const topChunks = await db
      .select({
        id: chunks.id,
        documentId: chunks.documentId,
        pageNumber: chunks.pageNumber,
        content: chunks.content,
      })
      .from(chunks)
      .innerJoin(documents, eq(chunks.documentId, documents.id))
      .where(and(eq(documents.courseId, payload.courseId), isNotNull(chunks.embedding)))
      .orderBy(sql`embedding <=> ${embeddingVector}::vector`)
      .limit(16);

    if (!topChunks.length) {
      return NextResponse.json({ error: "No chunks found for this course." }, { status: 404 });
    }

    const allowedIds = new Set(topChunks.map((chunk) => chunk.id));
    const context = topChunks
      .map((chunk) => `Chunk ${chunk.id} (page ${chunk.pageNumber}): ${chunk.content}`)
      .join("\n");

    const prompt = [
      `Question: ${payload.question}`,
      "Answer using only the chunks provided.",
      "Return JSON with shape:",
      JSON.stringify({
        answer: "string",
        citations: [{ chunkId: "uuid", pageNumber: 1, quote: "short supporting quote" }],
      }),
      "Use only chunkIds from the provided chunks.",
      "Chunks:",
      context,
    ].join("\n");

    const response = await openAiJson(prompt, "Answer with citations grounded in provided chunks.");
    const parsed = responseSchema.parse(response);
    const cleanedCitations = parsed.citations.filter((citation) => allowedIds.has(citation.chunkId));
    const citationIds = cleanedCitations.map((c) => c.chunkId);

    if (!citationIds.length) {
      return NextResponse.json({ error: "Model did not return valid citations." }, { status: 422 });
    }

    const citationChunks = await db
      .select({ id: chunks.id, pageNumber: chunks.pageNumber })
      .from(chunks)
      .where(inArray(chunks.id, citationIds));
    const pageMap = new Map(citationChunks.map((chunk) => [chunk.id, chunk.pageNumber]));

    return NextResponse.json({
      answer: parsed.answer,
      citations: cleanedCitations.map((citation) => ({
        chunkId: citation.chunkId,
        pageNumber: pageMap.get(citation.chunkId) ?? citation.pageNumber,
        quote: citation.quote,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ask failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
