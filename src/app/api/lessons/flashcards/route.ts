import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { cards, chunks, concepts } from "@/db/schema";
import { openAiJson } from "@/lib/openai";

export const runtime = "nodejs";

const requestSchema = z.object({
  courseId: z.string().uuid(),
  moduleTitle: z.string().optional(),
  lessonTitle: z.string().min(1),
});

const cardSchema = z.object({
  prompt: z.string().min(1),
  answer: z.string().min(1),
  citationChunkIds: z.array(z.string()).min(1),
  pageNumbers: z.array(z.number()).optional(),
});

const cardsSchema = z.object({
  cards: z.array(cardSchema).min(1).max(10),
});

interface CitationPayload {
  chunkIds: string[];
  pageNumbers: number[];
}

export async function POST(request: Request) {
  try {
    const payload = requestSchema.parse(await request.json());
    const conditions = [eq(concepts.courseId, payload.courseId), eq(concepts.lessonTitle, payload.lessonTitle)];
    if (payload.moduleTitle) {
      conditions.push(eq(concepts.moduleTitle, payload.moduleTitle));
    }

    const conceptRows = await db
      .select({
        id: concepts.id,
        title: concepts.title,
        summary: concepts.summary,
        citationIds: concepts.citationIds,
      })
      .from(concepts)
      .where(and(...conditions));

    if (!conceptRows.length) {
      return NextResponse.json({ error: "No concepts found for this lesson." }, { status: 404 });
    }

    await db.delete(cards).where(inArray(cards.conceptId, conceptRows.map((concept) => concept.id)));

    const cardsToInsert: Array<{
      conceptId: string;
      prompt: string;
      answer: string;
      citations: CitationPayload;
      createdAt: Date;
    }> = [];

    for (const concept of conceptRows) {
      const citationIds = Array.isArray(concept.citationIds)
        ? (concept.citationIds.filter((id) => typeof id === "string") as string[])
        : [];
      if (!citationIds.length) continue;

      const chunkRows = await db
        .select({ id: chunks.id, content: chunks.content, pageNumber: chunks.pageNumber })
        .from(chunks)
        .where(inArray(chunks.id, citationIds));

      if (!chunkRows.length) continue;
      const allowedIds = new Set(chunkRows.map((chunk) => chunk.id));
      const chunkText = chunkRows
        .map((chunk) => `Chunk ${chunk.id} (page ${chunk.pageNumber}): ${chunk.content}`)
        .join("\n");

      const prompt = [
        `Concept: ${concept.title}`,
        concept.summary ? `Summary: ${concept.summary}` : "",
        "Generate 6-10 flashcards grounded in the chunks below.",
        "Return JSON with shape:",
        JSON.stringify({
          cards: [
            {
              prompt: "string",
              answer: "string",
              citationChunkIds: ["chunk-id"],
              pageNumbers: [1],
            },
          ],
        }),
        "Use only the chunk ids provided for citations.",
        "Chunks:",
        chunkText,
      ]
        .filter(Boolean)
        .join("\n");

      const response = await openAiJson(prompt, "Generate concise, grounded flashcards.");
      const lessonCards = cardsSchema.parse(response).cards;
      const cleanedCards = validateCards(lessonCards)
        .map((card) => ({
          ...card,
          citationChunkIds: card.citationChunkIds.filter((id) => allowedIds.has(id)),
        }))
        .filter((card) => card.citationChunkIds.length > 0);

      for (const card of cleanedCards) {
        const pageNumbers = card.citationChunkIds
          .map((id) => chunkRows.find((chunk) => chunk.id === id)?.pageNumber)
          .filter((value): value is number => typeof value === "number");

        cardsToInsert.push({
          conceptId: concept.id,
          prompt: card.prompt.trim(),
          answer: card.answer.trim(),
          citations: {
            chunkIds: card.citationChunkIds,
            pageNumbers: Array.from(new Set(pageNumbers)),
          },
          createdAt: new Date(),
        });
      }
    }

    if (cardsToInsert.length) {
      await db.insert(cards).values(cardsToInsert);
    }

    return NextResponse.json({ cardsInserted: cardsToInsert.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Flashcard generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function validateCards(cardsToValidate: z.infer<typeof cardSchema>[]) {
  const seen = new Set<string>();
  return cardsToValidate.filter((card) => {
    const prompt = card.prompt.trim();
    const answer = card.answer.trim();
    if (prompt.length < 8 || answer.length < 8) return false;
    const key = `${prompt.toLowerCase()}::${answer.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
