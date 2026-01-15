import Link from "next/link";
import { and, eq, sql } from "drizzle-orm";
import { FileStack, PlayCircle, Sparkles } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OutlineTree } from "@/components/course/outline-tree";
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
    ? { label: "Outline", href: null }
    : !hasCards && firstLesson
      ? { label: "Cards", href: `/lesson/${encodeURIComponent(firstLesson)}` }
      : !hasReviews
        ? { label: "Study", href: "/daily" }
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
          <p className="text-muted-foreground">Your outline and practice materials come directly from your PDFs.</p>
        </div>
        {isValidUuid ? (
          <div className="flex flex-wrap items-center gap-2">
            <GenerateOutlineButton courseId={courseId} />
            <CourseExportButton courseId={courseId} />
            <ShareLinkButton courseId={courseId} />
          </div>
        ) : (
          <Badge variant="outline">Missing course</Badge>
        )}
      </div>

      {!isValidUuid ? (
        <Card>
          <CardHeader>
            <CardTitle>Course not found</CardTitle>
            <CardDescription>This link does not match a course in your workspace.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Pick a course from the sidebar or upload a new PDF to create one.
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-dashed bg-white/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Setup checklist</CardTitle>
            <CardDescription>Quick steps to unlock the study flow.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            <ChecklistItem label="PDF uploaded" done={readyDocs > 0} />
            <ChecklistItem label="Outline ready" done={hasOutline} />
            <ChecklistItem label="Cards ready" done={hasCards} />
            <ChecklistItem label="First session" done={hasReviews} />
          </CardContent>
          <CardContent className="pt-2">
            {primaryCta ? (
              primaryCta.href ? (
                <Button asChild>
                  <Link href={primaryCta.href} className="flex items-center gap-2">
                    {primaryCta.label === "Cards" ? <FileStack className="h-4 w-4" /> : null}
                    {primaryCta.label === "Study" ? <PlayCircle className="h-4 w-4" /> : null}
                    {primaryCta.label === "Outline" ? <Sparkles className="h-4 w-4" /> : null}
                    {primaryCta.label}
                  </Link>
                </Button>
              ) : (
                <GenerateOutlineButton courseId={courseId} />
              )
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
            <CardDescription>Upload a PDF, then generate your outline to see modules and lessons.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Click Generate Outline to build your study map.</p>
            <GenerateOutlineButton courseId={courseId} />
          </CardContent>
        </Card>
      ) : (
        <OutlineTree outline={outline} />
      )}
    </div>
  );
}

function ChecklistItem({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-white/70 bg-white/80 px-3 py-2 text-xs">
      <span className={done ? "text-foreground" : "text-muted-foreground"}>{label}</span>
      <Badge variant={done ? "secondary" : "outline"}>{done ? "Done" : "Todo"}</Badge>
    </div>
  );
}
