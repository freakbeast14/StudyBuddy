import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { courses } from "@/db/schema";

export const runtime = "nodejs";

const createCourseSchema = z.object({
  title: z.string().min(1, "Course title is required"),
  description: z.string().optional(),
});

export async function GET() {
  const rows = await db
    .select({
      id: courses.id,
      title: courses.title,
      description: courses.description,
      createdAt: courses.createdAt,
    })
    .from(courses)
    .orderBy(desc(courses.createdAt));

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = createCourseSchema.parse(body);
    const [created] = await db
      .insert(courses)
      .values({
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
      })
      .returning({
        id: courses.id,
        title: courses.title,
        description: courses.description,
      });

    return NextResponse.json(created);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create course";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
