import { and, asc, eq, isNotNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { chunks, concepts, documents } from "@/db/schema";
import { createEmbedding, openAiJson } from "@/lib/openai";

export const runtime = "nodejs";

const outlineSchema = z.object({
  modules: z
    .array(
      z.object({
        moduleTitle: z.string().min(1),
        lessons: z.array(z.object({ lessonTitle: z.string().min(1) })).min(1),
      })
    )
    .min(1),
});

const conceptsSchema = z.object({
  concepts: z
    .array(
      z.object({
        moduleTitle: z.string().min(1),
        lessonTitle: z.string().min(1),
        title: z.string().min(1),
        summary: z.string().min(1),
        citationChunkIds: z.array(z.string()).min(1),
      })
    )
    .min(1)
    .max(15),
});

export async function POST(_request: Request, { params }: { params: { courseId: string } }) {
  try {
    const courseId = params.courseId;
    const [document] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(and(eq(documents.courseId, courseId), eq(documents.status, "ready")))
      .limit(1);

    if (!document) {
      return NextResponse.json({ error: "No ready documents found for this course." }, { status: 404 });
    }

    const documentId = document.id;
    await db
      .delete(concepts)
      .where(and(eq(concepts.courseId, courseId), eq(concepts.documentId, documentId)));

    const chunkRows = await db
      .select({
        id: chunks.id,
        content: chunks.content,
        pageNumber: chunks.pageNumber,
        chunkIndex: chunks.chunkIndex,
      })
      .from(chunks)
      .where(eq(chunks.documentId, documentId))
      .orderBy(asc(chunks.chunkIndex));

    if (!chunkRows.length) {
      return NextResponse.json({ error: "Document has no chunks." }, { status: 400 });
    }

    const sampledChunks = chunkRows.filter((_, index) => index % 10 === 0);
    const outlineContext = (sampledChunks.length ? sampledChunks : chunkRows)
      .slice(0, 25)
      .map((chunk) => `Chunk ${chunk.id} (page ${chunk.pageNumber}): ${chunk.content.slice(0, 800)}`)
      .join("\n");

    const outlinePrompt = [
      "You are building a course outline from PDF excerpts.",
      "Return JSON with modules and lessons using this exact shape:",
      JSON.stringify({ modules: [{ moduleTitle: "string", lessons: [{ lessonTitle: "string" }] }] }),
      "Keep module and lesson titles concise.",
      "Use the excerpts below to propose 2-5 modules with 1-5 lessons each.",
      outlineContext,
    ].join("\n");

    const outlineResponse = await openAiJson(outlinePrompt, "Generate modules and lessons.");
    const outline = outlineSchema.parse(outlineResponse);

    const conceptsToInsert: Array<{
      courseId: string;
      documentId: string;
      moduleTitle: string;
      lessonTitle: string;
      title: string;
      summary: string;
      citationIds: string[];
      pageRange: string;
      createdAt: Date;
    }> = [];

    for (const module of outline.modules) {
      for (const lesson of module.lessons) {
        const lessonEmbedding = await createEmbedding(`Lesson: ${lesson.lessonTitle} - key concepts`);
        const embeddingVector = `[${lessonEmbedding.join(",")}]`;
        const topChunks = await db
          .select({
            id: chunks.id,
            content: chunks.content,
            pageNumber: chunks.pageNumber,
          })
          .from(chunks)
          .where(and(eq(chunks.documentId, documentId), isNotNull(chunks.embedding)))
          .orderBy(sql`embedding <=> ${embeddingVector}::vector`)
          .limit(16);

        if (!topChunks.length) continue;
        const allowedIds = new Set(topChunks.map((chunk) => chunk.id));
        const chunkText = topChunks
          .map((chunk) => `Chunk ${chunk.id} (page ${chunk.pageNumber}): ${chunk.content}`)
          .join("\n");

        const conceptPrompt = [
          `Module: ${module.moduleTitle}`,
          `Lesson: ${lesson.lessonTitle}`,
          "Use the chunks to derive 5-15 concepts.",
          "Return JSON with shape:",
          JSON.stringify({
            concepts: [
              {
                moduleTitle: "string",
                lessonTitle: "string",
                title: "string",
                summary: "string",
                citationChunkIds: ["chunk-id"],
              },
            ],
          }),
          "Use only the chunk ids provided. Keep citations to 1-3 chunks per concept.",
          "Chunks:",
          chunkText,
        ].join("\n");

        const conceptResponse = await openAiJson(conceptPrompt, "Generate lesson concepts.");
        const lessonConcepts = conceptsSchema.parse(conceptResponse).concepts;

        for (const concept of lessonConcepts) {
          const filteredCitations = concept.citationChunkIds.filter((id) => allowedIds.has(id));
          if (!filteredCitations.length) continue;
          const pages = filteredCitations
            .map((id) => topChunks.find((chunk) => chunk.id === id)?.pageNumber)
            .filter((value): value is number => typeof value === "number");
          if (!pages.length) continue;
          const minPage = Math.min(...pages);
          const maxPage = Math.max(...pages);
          const pageRange = minPage === maxPage ? `p${minPage}` : `p${minPage}-${maxPage}`;

          conceptsToInsert.push({
            courseId,
            documentId,
            moduleTitle: concept.moduleTitle,
            lessonTitle: concept.lessonTitle,
            title: concept.title,
            summary: concept.summary,
            citationIds: filteredCitations,
            pageRange,
            createdAt: new Date(),
          });
        }
      }
    }

    if (conceptsToInsert.length) {
      await db.insert(concepts).values(conceptsToInsert);
    }

    return NextResponse.json({
      documentId,
      conceptsInserted: conceptsToInsert.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Outline generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
