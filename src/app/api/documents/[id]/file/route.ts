import fs from "node:fs/promises";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { documents } from "@/db/schema";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const [doc] = await db
    .select({ storagePath: documents.storagePath })
    .from(documents)
    .where(eq(documents.id, params.id))
    .limit(1);

  if (!doc?.storagePath) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  try {
    const data = await fs.readFile(doc.storagePath);
    return new NextResponse(data, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "File not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
