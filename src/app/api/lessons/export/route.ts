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
      prompt: cards.prompt,
      answer: cards.answer,
      citations: cards.citations,
      isScaffold: cards.isScaffold,
      moduleTitle: concepts.moduleTitle,
      lessonTitle: concepts.lessonTitle,
      conceptTitle: concepts.title,
    })
    .from(cards)
    .innerJoin(concepts, eq(cards.conceptId, concepts.id))
    .where(and(...conditions));

  const csv = toCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=studybuddy-lesson-export.csv",
    },
  });
}

function toCsv(
  rows: Array<{
    prompt: string;
    answer: string;
    citations: unknown;
    isScaffold: number;
    moduleTitle: string | null;
    lessonTitle: string | null;
    conceptTitle: string;
  }>
) {
  const headers = ["Front", "Back", "Tags"];
  const lines = [headers.join(",")];

  for (const row of rows) {
    const tags = [
      row.moduleTitle ? sanitizeTag(row.moduleTitle) : null,
      row.lessonTitle ? sanitizeTag(row.lessonTitle) : null,
      sanitizeTag(row.conceptTitle),
      row.isScaffold ? "scaffold" : null,
    ]
      .filter(Boolean)
      .join(" ");
    const source = formatSource(row.citations);
    const back = source ? `${row.answer}\n${source}` : row.answer;
    lines.push([csvEscape(row.prompt), csvEscape(back), csvEscape(tags)].join(","));
  }

  return lines.join("\n");
}

function formatSource(citations: unknown) {
  if (!citations || typeof citations !== "object") return "";
  const chunkIds = Array.isArray((citations as { chunkIds?: unknown }).chunkIds)
    ? ((citations as { chunkIds: unknown[] }).chunkIds.filter((id) => typeof id === "string") as string[])
    : [];
  const pages = Array.isArray((citations as { pageNumbers?: unknown }).pageNumbers)
    ? ((citations as { pageNumbers: unknown[] }).pageNumbers.filter((num) => typeof num === "number") as number[])
    : [];
  if (!chunkIds.length && !pages.length) return "";
  const pageText = pages.length ? `p.${pages.join(",")}` : "";
  const chunkText = chunkIds.length ? `(${chunkIds.join(" ")})` : "";
  return `Source: ${[pageText, chunkText].filter(Boolean).join(" ")}`.trim();
}

function csvEscape(value: string) {
  const needsQuotes = /[",\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function sanitizeTag(value: string) {
  return value.replace(/\s+/g, "_").replace(/[^A-Za-z0-9_:-]/g, "");
}
