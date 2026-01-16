import Link from "next/link";
import { and, eq, sql } from "drizzle-orm";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OutlineTree } from "@/components/course/outline-tree";
import { GenerateOutlineButton } from "@/components/course/generate-outline-button";
import { ChecklistCard } from "@/components/course/checklist-card";
import { ShareLinkButton } from "@/components/course/share-link-button";
import { CourseExportButton } from "@/components/course/export-button";
import { ModuleRail } from "@/components/course/module-rail";
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

export const revalidate = 30;

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
  const railModules = outline.map((module) => ({
    moduleTitle: module.moduleTitle,
    lessonCount: module.lessons.length,
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
      <div className="grid gap-6 lg:grid-cols-[180px_1fr_280px]">
        <div className="hidden lg:block">
          {outline.length ? <ModuleRail outline={railModules} /> : null}
        </div>
        <div className="space-y-6">
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
          ) : outline.length === 0 ? (
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
        {isValidUuid ? (
          <div className="space-y-3 lg:sticky lg:top-24">
            <ChecklistCard
              readyDocs={readyDocs}
              hasOutline={hasOutline}
              hasCards={hasCards}
              hasReviews={hasReviews}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
