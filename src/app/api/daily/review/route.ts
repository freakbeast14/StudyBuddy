import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { reviews, srsState } from "@/db/schema";
import { updateSm2, type Sm2Rating, type SrsState } from "@/lib/sm2";
import { getOrCreateDefaultUserId } from "@/lib/users";

export const runtime = "nodejs";

const reviewSchema = z.object({
  cardId: z.string().uuid(),
  rating: z.enum(["Again", "Hard", "Good", "Easy"]),
});

export async function POST(request: Request) {
  try {
    const payload = reviewSchema.parse(await request.json());
    const userId = await getOrCreateDefaultUserId();
    const now = new Date();

    const [existing] = await db
      .select({
        easeFactor: srsState.easeFactor,
        intervalDays: srsState.intervalDays,
        repetitions: srsState.repetitions,
        dueAt: srsState.dueAt,
        lastReviewedAt: srsState.lastReviewedAt,
      })
      .from(srsState)
      .where(and(eq(srsState.userId, userId), eq(srsState.cardId, payload.cardId)));

    const baseState: SrsState = existing
      ? {
          easeFactor: existing.easeFactor,
          intervalDays: existing.intervalDays,
          repetitions: existing.repetitions,
          dueAt: existing.dueAt,
          lastReviewedAt: existing.lastReviewedAt,
        }
      : {
          easeFactor: 2500,
          intervalDays: 0,
          repetitions: 0,
          dueAt: now,
          lastReviewedAt: null,
        };

    const updated = updateSm2(baseState, payload.rating as Sm2Rating, now);

    if (existing) {
      await db
        .update(srsState)
        .set({
          easeFactor: updated.easeFactor,
          intervalDays: updated.intervalDays,
          repetitions: updated.repetitions,
          dueAt: updated.dueAt,
          lastReviewedAt: updated.lastReviewedAt,
        })
        .where(and(eq(srsState.userId, userId), eq(srsState.cardId, payload.cardId)));
    } else {
      await db.insert(srsState).values({
        userId,
        cardId: payload.cardId,
        easeFactor: updated.easeFactor,
        intervalDays: updated.intervalDays,
        repetitions: updated.repetitions,
        dueAt: updated.dueAt,
        lastReviewedAt: updated.lastReviewedAt,
      });
    }

    const actualIntervalDays = existing?.lastReviewedAt
      ? Math.max(0, Math.round((now.getTime() - existing.lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24)))
      : null;

    await db.insert(reviews).values({
      userId,
      cardId: payload.cardId,
      rating: payload.rating,
      scheduledIntervalDays: updated.intervalDays,
      actualIntervalDays,
    });

    return NextResponse.json({ srsState: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record review";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
