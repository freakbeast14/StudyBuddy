import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/db/client";
import { courseShares, courses } from "@/db/schema";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: { courseId: string } }) {
  const [course] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(eq(courses.id, params.courseId))
    .limit(1);

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const token = nanoid(32);
  await db.insert(courseShares).values({ courseId: params.courseId, token });

  const origin = new URL(request.url).origin;
  return NextResponse.json({ token, url: `${origin}/share/${token}` });
}
