import { and, asc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { cards, concepts, srsState } from "@/db/schema";
import { getOrCreateDefaultUserId } from "@/lib/users";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getOrCreateDefaultUserId();
  const now = new Date();

  const dueCards = await db
    .select({
      cardId: cards.id,
      prompt: cards.prompt,
      answer: cards.answer,
      citations: cards.citations,
      conceptTitle: concepts.title,
      lessonTitle: concepts.lessonTitle,
      moduleTitle: concepts.moduleTitle,
      easeFactor: srsState.easeFactor,
      intervalDays: srsState.intervalDays,
      repetitions: srsState.repetitions,
      dueAt: srsState.dueAt,
      lastReviewedAt: srsState.lastReviewedAt,
    })
    .from(cards)
    .innerJoin(concepts, eq(cards.conceptId, concepts.id))
    .leftJoin(srsState, and(eq(srsState.cardId, cards.id), eq(srsState.userId, userId)))
    .where(or(isNull(srsState.cardId), lte(srsState.dueAt, now)))
    .orderBy(sql`COALESCE(${srsState.dueAt}, ${now})`, asc(cards.createdAt))
    .limit(20);

  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dueTomorrow = await db
    .select({ count: sql<number>`count(*)` })
    .from(srsState)
    .where(and(eq(srsState.userId, userId), gte(srsState.dueAt, now), lte(srsState.dueAt, tomorrow)));

  const dueCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(srsState)
    .where(and(eq(srsState.userId, userId), lte(srsState.dueAt, now)));

  return NextResponse.json({
    cards: dueCards.map((card) => ({
      cardId: card.cardId,
      prompt: card.prompt,
      answer: card.answer,
      citations: card.citations,
      conceptTitle: card.conceptTitle,
      lessonTitle: card.lessonTitle,
      moduleTitle: card.moduleTitle,
      srsState: {
        easeFactor: card.easeFactor ?? 2500,
        intervalDays: card.intervalDays ?? 0,
        repetitions: card.repetitions ?? 0,
        dueAt: card.dueAt ?? now,
        lastReviewedAt: card.lastReviewedAt ?? null,
      },
    })),
    dueCount: dueCount[0]?.count ?? 0,
    dueTomorrowCount: dueTomorrow[0]?.count ?? 0,
  });
}
