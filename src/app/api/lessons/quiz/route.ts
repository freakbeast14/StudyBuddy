import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { chunks, concepts, quizzes } from "@/db/schema";
import { openAiJson } from "@/lib/openai";

export const runtime = "nodejs";

const requestSchema = z.object({
  courseId: z.string().uuid(),
  moduleTitle: z.string().optional(),
  lessonTitle: z.string().min(1),
});

const questionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  answer: z.string().min(1),
  citationChunkIds: z.array(z.string()).min(1),
});

const quizSchema = z.object({
  questions: z.array(questionSchema).min(3).max(5),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const params = requestSchema.parse({
    courseId: searchParams.get("courseId"),
    lessonTitle: searchParams.get("lessonTitle"),
    moduleTitle: searchParams.get("moduleTitle") || undefined,
  });

  const conditions = [eq(quizzes.courseId, params.courseId), eq(quizzes.lessonTitle, params.lessonTitle)];
  if (params.moduleTitle) {
    conditions.push(eq(quizzes.moduleTitle, params.moduleTitle));
  }

  const rows = await db
    .select({
      id: quizzes.id,
      questions: quizzes.questions,
      createdAt: quizzes.createdAt,
    })
    .from(quizzes)
    .where(and(...conditions))
    .orderBy(quizzes.createdAt);

  return NextResponse.json(rows.at(-1) ?? null);
}

export async function POST(request: Request) {
  try {
    const payload = requestSchema.parse(await request.json());
    const conceptConditions = [eq(concepts.courseId, payload.courseId), eq(concepts.lessonTitle, payload.lessonTitle)];
    if (payload.moduleTitle) {
      conceptConditions.push(eq(concepts.moduleTitle, payload.moduleTitle));
    }

    const conceptRows = await db
      .select({ citationIds: concepts.citationIds })
      .from(concepts)
      .where(and(...conceptConditions));

    if (!conceptRows.length) {
      return NextResponse.json({ error: "No concepts found for this lesson." }, { status: 404 });
    }

    const citationIds = Array.from(
      new Set(
        conceptRows.flatMap((concept) =>
          Array.isArray(concept.citationIds)
            ? (concept.citationIds.filter((id) => typeof id === "string") as string[])
            : []
        )
      )
    );

    if (!citationIds.length) {
      return NextResponse.json({ error: "Lesson concepts have no citations." }, { status: 400 });
    }

    const chunkRows = await db
      .select({ id: chunks.id, content: chunks.content, pageNumber: chunks.pageNumber })
      .from(chunks)
      .where(inArray(chunks.id, citationIds))
      .limit(18);

    if (!chunkRows.length) {
      return NextResponse.json({ error: "No chunks found for citations." }, { status: 400 });
    }

    const allowedIds = new Set(chunkRows.map((chunk) => chunk.id));
    const chunkText = chunkRows
      .map((chunk) => `Chunk ${chunk.id} (page ${chunk.pageNumber}): ${chunk.content}`)
      .join("\n");

    const prompt = [
      `Lesson: ${payload.lessonTitle}`,
      payload.moduleTitle ? `Module: ${payload.moduleTitle}` : "",
      "Create a 3-5 question quiz grounded in the chunks.",
      "Return JSON with shape:",
      JSON.stringify({
        questions: [
          {
            question: "string",
            options: ["A", "B", "C"],
            answer: "A",
            citationChunkIds: ["chunk-id"],
          },
        ],
      }),
      "Use only the chunk ids provided for citations.",
      "Chunks:",
      chunkText,
    ]
      .filter(Boolean)
      .join("\n");

    const response = await openAiJson(prompt, "Generate concise quiz questions grounded in the provided chunks.");
    const quiz = quizSchema.parse(response);
    const cleanedQuestions = quiz.questions
      .map((question) => ({
        ...question,
        citationChunkIds: question.citationChunkIds.filter((id) => allowedIds.has(id)),
      }))
      .filter((question) => question.citationChunkIds.length > 0);

    const quizConditions = [eq(quizzes.courseId, payload.courseId), eq(quizzes.lessonTitle, payload.lessonTitle)];
    if (payload.moduleTitle) {
      quizConditions.push(eq(quizzes.moduleTitle, payload.moduleTitle));
    }
    await db.delete(quizzes).where(and(...quizConditions));
    const [created] = await db
      .insert(quizzes)
      .values({
        courseId: payload.courseId,
        moduleTitle: payload.moduleTitle ?? null,
        lessonTitle: payload.lessonTitle,
        questions: {
          questions: cleanedQuestions,
        },
      })
      .returning({ id: quizzes.id });

    return NextResponse.json({ quizId: created?.id ?? null, questions: cleanedQuestions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Quiz generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
