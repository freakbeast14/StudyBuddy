import { eq } from "drizzle-orm";
import { BookOpen } from "lucide-react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { LessonDashboard } from "@/components/lesson/lesson-dashboard";
import { Button } from "@/components/ui/button";
import { db } from "@/db/client";
import { concepts } from "@/db/schema";

export default async function LessonPage({ params }: { params: { id: string } }) {
  const lessonTitle = decodeURIComponent(params.id);
  const conceptRows = await db
    .select({
      id: concepts.id,
      courseId: concepts.courseId,
      moduleTitle: concepts.moduleTitle,
      title: concepts.title,
      summary: concepts.summary,
      pageRange: concepts.pageRange,
    })
    .from(concepts)
    .where(eq(concepts.lessonTitle, lessonTitle));

  if (!conceptRows.length) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: "Courses", href: "/course" }, { label: lessonTitle }]} />
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Lesson</p>
          <h1 className="text-3xl font-semibold">{lessonTitle}</h1>
          <p className="text-muted-foreground">Generate your outline to unlock this lesson.</p>
        </div>
        <Button asChild>
          <Link href="/course" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Courses
          </Link>
        </Button>
      </div>
    );
  }

  const courseId = conceptRows[0]?.courseId ?? "";
  const moduleTitle = conceptRows[0]?.moduleTitle ?? null;

  return (
    <>
      <Breadcrumbs items={[{ label: "Courses", href: "/course" }, { label: lessonTitle }]} />
      <LessonDashboard
        courseId={courseId}
        moduleTitle={moduleTitle}
        lessonTitle={lessonTitle}
        concepts={conceptRows.map((concept) => ({
          id: concept.id,
          title: concept.title,
          summary: concept.summary,
          pageRange: concept.pageRange,
          moduleTitle: concept.moduleTitle,
        }))}
      />
    </>
  );
}
