import Link from "next/link";
import { desc } from "drizzle-orm";
import { BookOpen, UploadCloud } from "lucide-react";
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
          <p className="text-muted-foreground">Pick a course to keep learning materials organized.</p>
        </div>
        <Button asChild>
          <Link href="/upload" className="flex items-center gap-2">
            <UploadCloud className="h-4 w-4" />
            Upload
          </Link>
        </Button>
      </div>

      {courseRows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No courses yet</CardTitle>
            <CardDescription>Start by uploading your first PDF.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Create a course to keep each class or subject organized.</p>
            <Button asChild>
              <Link href="/upload" className="flex items-center gap-2">
                <UploadCloud className="h-4 w-4" />
                Upload
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {courseRows.map((course) => (
            <Card key={course.id} className="h-full">
              <CardHeader>
                <CardTitle>{course.title}</CardTitle>
                <CardDescription>{course.description ?? "Ready to turn your notes into a study plan."}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                <span>{new Date(course.createdAt).toLocaleDateString()}</span>
                <Badge variant="outline">Active</Badge>
              </CardContent>
              <CardContent>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/course/${course.id}`} className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Open
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
