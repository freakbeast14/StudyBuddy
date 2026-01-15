import Link from "next/link";
import { desc } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/db/client";
import { courses } from "@/db/schema";

export const metadata = {
  title: "Courses - StudyBuddy AI",
};

export default async function CoursesPage() {
  const courseRows = await db
    .select({
      id: courses.id,
      title: courses.title,
      description: courses.description,
      createdAt: courses.createdAt,
    })
    .from(courses)
    .orderBy(desc(courses.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Courses</p>
          <h1 className="text-3xl font-semibold">Your courses</h1>
          <p className="text-muted-foreground">Pick a course to view its outline or upload new documents.</p>
        </div>
        <Button asChild>
          <Link href="/upload">Upload a PDF</Link>
        </Button>
      </div>

      {courseRows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No courses yet</CardTitle>
            <CardDescription>Create a course in the upload screen to get started.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Go to /upload and create a course before uploading a PDF.</p>
            <Button asChild>
              <Link href="/upload">Upload a PDF</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {courseRows.map((course) => (
            <Card key={course.id} className="h-full">
              <CardHeader>
                <CardTitle>{course.title}</CardTitle>
                <CardDescription>{course.description ?? "Outline ready to generate from documents."}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                <span>{new Date(course.createdAt).toLocaleDateString()}</span>
                <Badge variant="outline">Course</Badge>
              </CardContent>
              <CardContent>
                <Button asChild variant="ghost" className="px-0">
                  <Link href={`/course/${course.id}`}>Open course</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
