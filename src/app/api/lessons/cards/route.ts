import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { cards, concepts } from "@/db/schema";

export const runtime = "nodejs";

const querySchema = z.object({
  courseId: z.string().uuid(),
  lessonTitle: z.string().min(1),
  moduleTitle: z.string().optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const params = querySchema.parse({
    courseId: searchParams.get("courseId"),
    lessonTitle: searchParams.get("lessonTitle"),
    moduleTitle: searchParams.get("moduleTitle") || undefined,
  });

  const conditions = [eq(concepts.courseId, params.courseId), eq(concepts.lessonTitle, params.lessonTitle)];
  if (params.moduleTitle) {
    conditions.push(eq(concepts.moduleTitle, params.moduleTitle));
  }

  const rows = await db
    .select({
      id: cards.id,
      conceptId: cards.conceptId,
      prompt: cards.prompt,
      answer: cards.answer,
      citations: cards.citations,
      conceptTitle: concepts.title,
      moduleTitle: concepts.moduleTitle,
      conceptCitationIds: concepts.citationIds,
    })
    .from(cards)
    .innerJoin(concepts, eq(cards.conceptId, concepts.id))
    .where(and(...conditions));

  return NextResponse.json(rows);
}
