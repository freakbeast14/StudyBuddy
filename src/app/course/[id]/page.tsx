import Link from "next/link";
import { and, eq, sql } from "drizzle-orm";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { GenerateOutlineButton } from "@/components/course/generate-outline-button";
import { ShareLinkButton } from "@/components/course/share-link-button";
import { CourseExportButton } from "@/components/course/export-button";
import { Button } from "@/components/ui/button";
import { db } from "@/db/client";
import { cards, concepts, courses, documents, reviews } from "@/db/schema";
import { getOrCreateDefaultUserId } from "@/lib/users";

interface OutlineLesson {
  lessonTitle: string;
  concepts: Array<{
    id: string;
    title: string;
    summary: string | null;
    pageRange: string | null;
  }>;
}

interface OutlineModule {
  moduleTitle: string;
  lessons: OutlineLesson[];
}

export default async function CoursePage({ params }: { params: { id: string } }) {
  const courseId = params.id;
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const isValidUuid = uuidPattern.test(courseId);
  const userId = isValidUuid ? await getOrCreateDefaultUserId() : null;
  const courseRow = isValidUuid
    ? await db
        .select({ title: courses.title })
        .from(courses)
        .where(eq(courses.id, courseId))
        .limit(1)
    : [];
  const courseTitle = courseRow[0]?.title ?? courseId;
  const conceptRows = isValidUuid
    ? await db
        .select({
          id: concepts.id,
          moduleTitle: concepts.moduleTitle,
          lessonTitle: concepts.lessonTitle,
          title: concepts.title,
          summary: concepts.summary,
          pageRange: concepts.pageRange,
        })
        .from(concepts)
        .where(eq(concepts.courseId, courseId))
    : [];
  const [documentCount, cardCount, reviewCount] = isValidUuid
    ? await Promise.all([
        db
          .select({ count: sql<number>`count(*)` })
          .from(documents)
          .where(and(eq(documents.courseId, courseId), eq(documents.status, "ready"))),
        db
          .select({ count: sql<number>`count(*)` })
          .from(cards)
          .innerJoin(concepts, eq(cards.conceptId, concepts.id))
          .where(eq(concepts.courseId, courseId)),
        userId
          ? db.select({ count: sql<number>`count(*)` }).from(reviews).where(eq(reviews.userId, userId))
          : Promise.resolve([{ count: 0 }]),
      ])
    : [[{ count: 0 }], [{ count: 0 }], [{ count: 0 }]];

  const readyDocs = Number(documentCount[0]?.count ?? 0);
  const hasOutline = conceptRows.length > 0;
  const hasCards = Number(cardCount[0]?.count ?? 0) > 0;
  const hasReviews = Number(reviewCount[0]?.count ?? 0) > 0;
  const firstLesson = conceptRows[0]?.lessonTitle;
  const primaryCta = !hasOutline
    ? { label: "Generate outline", href: null }
    : !hasCards && firstLesson
      ? { label: "Generate flashcards", href: `/lesson/${encodeURIComponent(firstLesson)}` }
      : !hasReviews
        ? { label: "Start today's session", href: "/daily" }
        : null;

  const outlineMap = new Map<string, Map<string, OutlineLesson>>();
  for (const concept of conceptRows) {
    const moduleTitle = concept.moduleTitle ?? "Module";
    const lessonTitle = concept.lessonTitle ?? "Lesson";
    if (!outlineMap.has(moduleTitle)) {
      outlineMap.set(moduleTitle, new Map());
    }
    const lessonMap = outlineMap.get(moduleTitle);
    if (!lessonMap?.has(lessonTitle)) {
      lessonMap?.set(lessonTitle, { lessonTitle, concepts: [] });
    }
    lessonMap?.get(lessonTitle)?.concepts.push({
      id: concept.id,
      title: concept.title,
      summary: concept.summary,
      pageRange: concept.pageRange,
    });
  }

  const outline: OutlineModule[] = Array.from(outlineMap.entries()).map(([moduleTitle, lessons]) => ({
    moduleTitle,
    lessons: Array.from(lessons.values()),
  }));

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Courses", href: "/course" }, { label: courseTitle }]} />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Course</p>
          <h1 className="text-3xl font-semibold">{courseTitle}</h1>
          <p className="text-muted-foreground">
            Outline is generated from pgvector-backed retrieval over your uploaded PDF chunks.
          </p>
        </div>
        {isValidUuid ? (
          <div className="flex flex-wrap items-center gap-2">
            <GenerateOutlineButton courseId={courseId} />
            <CourseExportButton courseId={courseId} />
            <ShareLinkButton courseId={courseId} />
          </div>
        ) : (
          <Badge variant="outline">Invalid course id</Badge>
        )}
      </div>

      {!isValidUuid ? (
        <Card>
          <CardHeader>
            <CardTitle>Invalid course id</CardTitle>
            <CardDescription>Use a valid UUID in the URL to load and generate outlines.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Example: /course/123e4567-e89b-12d3-a456-426614174000
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-dashed bg-muted/30">
          <CardHeader>
            <CardTitle>Setup checklist</CardTitle>
            <CardDescription>Complete these steps to unlock the full study flow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ChecklistItem label="PDF uploaded" done={readyDocs > 0} />
            <ChecklistItem label="Outline generated" done={hasOutline} />
            <ChecklistItem label="Cards generated" done={hasCards} />
            <ChecklistItem label="First session completed" done={hasReviews} />
            {primaryCta ? (
              <div className="pt-2">
                {primaryCta.href ? (
                  <Button asChild>
                    <Link href={primaryCta.href}>{primaryCta.label}</Link>
                  </Button>
                ) : (
                  <GenerateOutlineButton courseId={courseId} />
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">You're all set for today.</p>
            )}
          </CardContent>
        </Card>
      )}

      {!isValidUuid ? null : outline.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No outline yet</CardTitle>
            <CardDescription>Upload a PDF, then generate an outline to see modules, lessons, and concepts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Click Generate Outline to build concepts with citations.</p>
            <GenerateOutlineButton courseId={courseId} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {outline.map((module) => (
            <Card key={module.moduleTitle}>
              <CardHeader>
                <CardTitle>{module.moduleTitle}</CardTitle>
                <CardDescription>Lessons and concepts grounded to chunk/page citations.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {module.lessons.map((lesson) => (
                  <div key={lesson.lessonTitle} className="rounded-lg border bg-background px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link href={`/lesson/${encodeURIComponent(lesson.lessonTitle)}`} className="font-medium">
                        {lesson.lessonTitle}
                      </Link>
                      <Badge variant="outline">{lesson.concepts.length} concepts</Badge>
                    </div>
                    <Separator className="my-3" />
                    <div className="grid gap-2 sm:grid-cols-2">
                      {lesson.concepts.map((concept) => (
                        <div key={concept.id} className="rounded-md bg-muted/60 p-3 text-sm">
                          <p className="font-semibold text-foreground">{concept.title}</p>
                          {concept.summary ? (
                            <p className="mt-1 text-xs text-muted-foreground">{concept.summary}</p>
                          ) : null}
                          {concept.pageRange ? (
                            <p className="mt-2 text-xs text-muted-foreground">Pages {concept.pageRange}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ChecklistItem({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
      <span className={done ? "text-foreground" : "text-muted-foreground"}>{label}</span>
      <Badge variant={done ? "secondary" : "outline"}>{done ? "Done" : "Pending"}</Badge>
    </div>
  );
}
