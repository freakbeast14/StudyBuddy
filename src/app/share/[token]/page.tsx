import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { cards, concepts, courseShares, courses } from "@/db/schema";
import { ShareViewer } from "@/components/share/share-viewer";

export default async function SharePage({ params }: { params: { token: string } }) {
  const [share] = await db
    .select({
      courseId: courseShares.courseId,
    })
    .from(courseShares)
    .where(and(eq(courseShares.token, params.token), isNull(courseShares.revokedAt)))
    .limit(1);

  if (!share) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Share link not found</h1>
        <p className="text-muted-foreground">This share link is invalid or no longer active.</p>
      </div>
    );
  }

  const [course] = await db
    .select({ title: courses.title })
    .from(courses)
    .where(eq(courses.id, share.courseId))
    .limit(1);

  const conceptRows = await db
    .select({
      id: concepts.id,
      moduleTitle: concepts.moduleTitle,
      lessonTitle: concepts.lessonTitle,
      title: concepts.title,
      summary: concepts.summary,
      pageRange: concepts.pageRange,
    })
    .from(concepts)
    .where(eq(concepts.courseId, share.courseId));

  const cardRows = await db
    .select({
      id: cards.id,
      prompt: cards.prompt,
      answer: cards.answer,
      citations: cards.citations,
      conceptId: cards.conceptId,
    })
    .from(cards)
    .innerJoin(concepts, eq(cards.conceptId, concepts.id))
    .where(eq(concepts.courseId, share.courseId))
    .limit(6);

  return (
    <ShareViewer
      courseTitle={course?.title ?? "Shared course"}
      concepts={conceptRows}
      cards={cardRows}
    />
  );
}
