import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { cards, chunks, conceptExplanations, concepts, srsState } from "@/db/schema";
import { openAiJson } from "@/lib/openai";
import { getOrCreateDefaultUserId } from "@/lib/users";

export const runtime = "nodejs";

const requestSchema = z.object({
  regenerate: z.boolean().optional(),
});

const explanationSchema = z.object({
  explanation: z.object({
    bullets: z.array(z.string().min(1)).min(2),
    example: z.string().min(1),
    misconception: z.string().min(1),
    citations: z.object({
      chunkIds: z.array(z.string()).min(1),
      pages: z.array(z.number()).min(1),
    }),
  }),
  scaffoldCards: z
    .array(
      z.object({
        prompt: z.string().min(1),
        answer: z.string().min(1),
        citations: z.object({
          chunkIds: z.array(z.string()).min(1),
          pages: z.array(z.number()).min(1),
        }),
      })
    )
    .min(2)
    .max(6),
});

export async function POST(request: Request, { params }: { params: { conceptId: string } }) {
  try {
    const payload = requestSchema.parse(await request.json().catch(() => ({})));
    const userId = await getOrCreateDefaultUserId();
    const conceptId = params.conceptId;

    const [concept] = await db
      .select({
        id: concepts.id,
        title: concepts.title,
        summary: concepts.summary,
        citationIds: concepts.citationIds,
      })
      .from(concepts)
      .where(eq(concepts.id, conceptId))
      .limit(1);

    if (!concept) {
      return NextResponse.json({ error: "Concept not found" }, { status: 404 });
    }

    const existing = await db
      .select({
        explanation: conceptExplanations.explanation,
        updatedAt: conceptExplanations.updatedAt,
      })
      .from(conceptExplanations)
      .where(and(eq(conceptExplanations.userId, userId), eq(conceptExplanations.conceptId, conceptId)))
      .limit(1);

    const existingExplanation = existing[0];
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const isFresh =
      existingExplanation?.updatedAt &&
      Date.now() - new Date(existingExplanation.updatedAt).getTime() < sevenDaysMs;

    const scaffoldCards = await db
      .select({
        id: cards.id,
        prompt: cards.prompt,
        answer: cards.answer,
        citations: cards.citations,
        isScaffold: cards.isScaffold,
      })
      .from(cards)
      .where(and(eq(cards.conceptId, conceptId), eq(cards.isScaffold, 1)));

    if (existingExplanation && isFresh && !payload.regenerate) {
      return NextResponse.json({
        explanation: existingExplanation.explanation,
        scaffoldCards: scaffoldCards.map((card) => ({
          id: card.id,
          prompt: card.prompt,
          answer: card.answer,
          citations: card.citations,
          isScaffold: card.isScaffold,
        })),
        cached: true,
      });
    }

    const citationIds = Array.isArray(concept.citationIds)
      ? (concept.citationIds.filter((id) => typeof id === "string") as string[])
      : [];
    if (!citationIds.length) {
      return NextResponse.json({ error: "Concept has no citations." }, { status: 400 });
    }

    const chunkRows = await db
      .select({ id: chunks.id, content: chunks.content, pageNumber: chunks.pageNumber })
      .from(chunks)
      .where(inArray(chunks.id, citationIds));

    if (!chunkRows.length) {
      return NextResponse.json({ error: "No chunks found for citations." }, { status: 400 });
    }

    const allowedIds = new Set(chunkRows.map((chunk) => chunk.id));
    const chunkText = chunkRows
      .map((chunk) => `Chunk ${chunk.id} (page ${chunk.pageNumber}): ${chunk.content}`)
      .join("\n");

    const prompt = [
      `Concept: ${concept.title}`,
      concept.summary ? `Summary: ${concept.summary}` : "",
      "Explain the concept in simple terms with bullets, a concrete example, and a common misconception.",
      "Return JSON with shape:",
      JSON.stringify({
        explanation: {
          bullets: ["string"],
          example: "string",
          misconception: "string",
          citations: { chunkIds: ["chunk-id"], pages: [1] },
        },
        scaffoldCards: [
          {
            prompt: "string",
            answer: "string",
            citations: { chunkIds: ["chunk-id"], pages: [1] },
          },
        ],
      }),
      "Use only the chunk ids provided for citations. Keep citations to 1-3 chunks per item.",
      "Chunks:",
      chunkText,
    ]
      .filter(Boolean)
      .join("\n");

    const response = await openAiJson(prompt, "Explain the concept with citations and scaffold flashcards.");
    const parsed = explanationSchema.parse(response);

    const filteredExplanation = {
      ...parsed.explanation,
      citations: {
        chunkIds: parsed.explanation.citations.chunkIds.filter((id) => allowedIds.has(id)),
        pages: parsed.explanation.citations.pages,
      },
    };

    const filteredCards = parsed.scaffoldCards.map((card) => ({
      ...card,
      citations: {
        chunkIds: card.citations.chunkIds.filter((id) => allowedIds.has(id)),
        pages: card.citations.pages,
        type: "scaffold",
      },
    }));

    await db
      .insert(conceptExplanations)
      .values({
        userId,
        conceptId,
        explanation: filteredExplanation,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [conceptExplanations.userId, conceptExplanations.conceptId],
        set: { explanation: filteredExplanation, updatedAt: new Date() },
      });

    await db.delete(cards).where(and(eq(cards.conceptId, conceptId), eq(cards.isScaffold, 1)));

    const inserted = await db
      .insert(cards)
      .values(
        filteredCards.map((card) => ({
          conceptId,
          prompt: card.prompt,
          answer: card.answer,
          citations: card.citations,
          isScaffold: 1,
        }))
      )
      .returning({ id: cards.id });

    if (inserted.length) {
      await db
        .insert(srsState)
        .values(
          inserted.map((card) => ({
            userId,
            cardId: card.id,
            easeFactor: 2500,
            intervalDays: 0,
            repetitions: 0,
            dueAt: new Date(),
            lastReviewedAt: null,
          }))
        )
        .onConflictDoNothing();
    }

    return NextResponse.json({
      explanation: filteredExplanation,
      scaffoldCards: inserted.map((card, index) => ({
        id: card.id,
        prompt: filteredCards[index]?.prompt,
        answer: filteredCards[index]?.answer,
        citations: filteredCards[index]?.citations,
        isScaffold: 1,
      })),
      cached: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Help request failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
