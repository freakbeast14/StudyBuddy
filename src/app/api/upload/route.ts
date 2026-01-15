import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import Boss from "pg-boss";
import { db } from "@/db/client";
import { documents } from "@/db/schema";
import { env } from "@/env";
import { JOBS } from "@/jobs/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const title = formData.get("title");
    const courseId = formData.get("courseId");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "PDF file is required" }, { status: 400 });
    }

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return NextResponse.json({ error: "Only PDF uploads are supported" }, { status: 400 });
    }

    const documentId = randomUUID();
    const uploadsDir = path.join(env.DATA_DIR, "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });
    const storagePath = path.join(uploadsDir, `${documentId}.pdf`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(storagePath, buffer);

    const resolvedTitle =
      typeof title === "string" && title.trim().length > 0 ? title.trim() : file.name.replace(/\.pdf$/i, "");
    const courseIdValue = typeof courseId === "string" ? courseId.trim() : "";
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const resolvedCourseId = uuidPattern.test(courseIdValue) ? courseIdValue : undefined;

    await db.insert(documents).values({
      id: documentId,
      courseId: resolvedCourseId,
      title: resolvedTitle,
      originalFilename: file.name,
      storagePath,
      status: "processing",
    });

    const boss = new Boss({ connectionString: env.DATABASE_URL });
    await boss.start();
    await boss.send(JOBS.PROCESS_DOCUMENT, { documentId });
    await boss.stop();

    return NextResponse.json({ documentId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
