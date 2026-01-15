import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { cards } from "@/db/schema";

export const runtime = "nodejs";

const updateSchema = z.object({
  prompt: z.string().min(1),
  answer: z.string().min(1),
});

export async function PATCH(request: Request, { params }: { params: { cardId: string } }) {
  try {
    const payload = updateSchema.parse(await request.json());
    const [updated] = await db
      .update(cards)
      .set({ prompt: payload.prompt.trim(), answer: payload.answer.trim() })
      .where(eq(cards.id, params.cardId))
      .returning({ id: cards.id });

    if (!updated) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    return NextResponse.json({ id: updated.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update card";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { cardId: string } }) {
  const deleted = await db.delete(cards).where(eq(cards.id, params.cardId)).returning({ id: cards.id });
  if (!deleted.length) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }
  return NextResponse.json({ id: deleted[0].id });
}
