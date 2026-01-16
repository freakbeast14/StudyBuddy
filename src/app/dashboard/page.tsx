import Link from "next/link";
import { addDays, format, startOfDay, startOfWeek } from "date-fns";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { BookOpen, CalendarCheck2, FileText, Search, UploadCloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressChart } from "@/components/progress/progress-chart";
import { db } from "@/db/client";
import { cards, courses, documents, reviews, srsState } from "@/db/schema";
import { getOrCreateDefaultUserId } from "@/lib/users";
import { StudyToday } from "@/components/dashboard/study-today";
import { DueDonut } from "@/components/dashboard/due-donut";
import { RecentLessons } from "@/components/dashboard/recent-lessons";

export const metadata = {
  title: "Dashboard - StudyBuddy AI",
};

export const revalidate = 30;

const statusLabels: Record<string, { label: string; className: string }> = {
  pending: { label: "Queued", className: "border-amber-500/30 bg-amber-500/10 text-amber-700" },
  processing: { label: "Processing", className: "border-sky-500/30 bg-sky-500/10 text-sky-700" },
  ready: { label: "Ready", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" },
  failed: { label: "Needs attention", className: "border-rose-500/30 bg-rose-500/10 text-rose-700" },
};

export default async function DashboardPage() {
  const userId = await getOrCreateDefaultUserId();
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const weekEnd = addDays(today, 7);
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });

  const [courseCount, cardCount, dueToday, dueTomorrow, reviewedThisWeek, recentDocs, recentLessons] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(courses),
    db.select({ count: sql<number>`count(*)` }).from(cards),
    db
      .select({ count: sql<number>`count(*)` })
      .from(srsState)
      .where(and(eq(srsState.userId, userId), gte(srsState.dueAt, today), lt(srsState.dueAt, tomorrow))),
    db
      .select({ count: sql<number>`count(*)` })
      .from(srsState)
      .where(and(eq(srsState.userId, userId), gte(srsState.dueAt, tomorrow), lt(srsState.dueAt, addDays(today, 2)))),
    db
      .select({ count: sql<number>`count(*)` })
      .from(reviews)
      .where(and(eq(reviews.userId, userId), gte(reviews.createdAt, weekStart))),
    db
      .select({
        id: documents.id,
        title: documents.title,
        status: documents.status,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .orderBy(desc(documents.createdAt))
      .limit(5),
    db.execute<{ lessonTitle: string; moduleTitle: string | null; conceptCount: number }>(sql`
      select lesson_title as "lessonTitle",
             module_title as "moduleTitle",
             count(*)::int as "conceptCount"
      from concepts
      group by lesson_title, module_title
      order by max(created_at) desc
      limit 8
    `),
  ]);

  const dueRows = await db.execute<{ day: Date; count: number }>(sql`
    select date_trunc('day', due_at) as day, count(*)::int as count
    from srs_state
    where user_id = ${userId} and due_at >= ${today} and due_at < ${weekEnd}
    group by day
    order by day
  `);

  const dueMap = new Map<string, number>();
  for (const row of dueRows.rows) {
    const key = format(row.day, "yyyy-MM-dd");
    dueMap.set(key, row.count);
  }

  const chartData = Array.from({ length: 7 }).map((_, index) => {
    const day = addDays(today, index);
    const key = format(day, "yyyy-MM-dd");
    return { name: format(day, "EEE"), due: dueMap.get(key) ?? 0 };
  });

  const donutData = [
    { name: "Due today", value: Number(dueToday[0]?.count ?? 0), color: "#f97316" },
    { name: "Due tomorrow", value: Number(dueTomorrow[0]?.count ?? 0), color: "#38bdf8" },
    { name: "Upcoming", value: Math.max(0, 12 - Number(dueToday[0]?.count ?? 0) - Number(dueTomorrow[0]?.count ?? 0)), color: "#22c55e" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Dashboard</p>
          <h1 className="text-3xl font-semibold">Welcome back</h1>
          <p className="text-muted-foreground">Your study plan, progress, and next steps.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/upload" className="flex items-center gap-2">
              <UploadCloud className="h-4 w-4" />
              Upload
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <StudyToday dueCount={Number(dueToday[0]?.count ?? 0)} />
        <Card>
          <CardHeader>
            <CardTitle>Focus rings</CardTitle>
            <CardDescription>Due now, tomorrow, and upcoming.</CardDescription>
          </CardHeader>
          <CardContent>
            <DueDonut data={donutData} />
            <div className="mt-2 grid grid-cols-3 text-xs text-muted-foreground">
              {donutData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Due today</CardTitle>
            <CardDescription>Cards waiting now.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {dueToday[0]?.count ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Due tomorrow</CardTitle>
            <CardDescription>Plan ahead.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {dueTomorrow[0]?.count ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reviewed</CardTitle>
            <CardDescription>This week.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {reviewedThisWeek[0]?.count ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total cards</CardTitle>
            <CardDescription>Ready to practice.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {cardCount[0]?.count ?? 0}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <ProgressChart data={chartData} />
        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>Jump back into study mode.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/course" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Courses
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/search" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/progress" className="flex items-center gap-2">
                <CalendarCheck2 className="h-4 w-4" />
                Progress
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent uploads</CardTitle>
            <CardDescription>Latest study materials added.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentDocs.length === 0 ? (
              <div className="rounded-lg border border-white/70 bg-white/80 p-4 text-sm text-muted-foreground">
                No uploads yet. Add a PDF to get started.
              </div>
            ) : (
              recentDocs.map((doc) => {
                const status = statusLabels[doc.status ?? "pending"] ?? statusLabels.pending;
                return (
                  <div key={doc.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/70 bg-white/80 p-3 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={status.className}>
                      {status.label}
                    </Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent lessons</CardTitle>
            <CardDescription>Jump back into a lesson.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <RecentLessons lessons={recentLessons.rows.splice(0, 3)} />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Course overview</CardTitle>
          <CardDescription>All your courses in one place.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between rounded-lg border border-white/70 bg-white/80 p-4">
          <div>
            <p className="text-sm text-muted-foreground">Total courses</p>
            <p className="text-3xl font-semibold">{courseCount[0]?.count ?? 0}</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/course" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              View
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
