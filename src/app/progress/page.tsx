import { addDays, format, startOfDay, subDays } from "date-fns";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressChart } from "@/components/progress/progress-chart";
import { WeeklyHeatmap } from "@/components/progress/weekly-heatmap";
import { db } from "@/db/client";
import { reviews, srsState } from "@/db/schema";
import { getOrCreateDefaultUserId } from "@/lib/users";
import Link from "next/link";
import { PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Progress - StudyBuddy AI",
};

export const revalidate = 30;

export default function ProgressPage() {
  const userIdPromise = getOrCreateDefaultUserId();

  return <ProgressPageContent userIdPromise={userIdPromise} />;
}

async function ProgressPageContent({ userIdPromise }: { userIdPromise: Promise<string> }) {
  const userId = await userIdPromise;
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const dayAfter = addDays(today, 2);
  const weekEnd = addDays(today, 7);
  const weekStart = subDays(today, 6);

  const [dueToday, dueTomorrow, learnedCount, reviewRows, masteryRows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(srsState)
      .where(and(eq(srsState.userId, userId), gte(srsState.dueAt, today), lt(srsState.dueAt, tomorrow))),
    db
      .select({ count: sql<number>`count(*)` })
      .from(srsState)
      .where(and(eq(srsState.userId, userId), gte(srsState.dueAt, tomorrow), lt(srsState.dueAt, dayAfter))),
    db
      .select({ count: sql<number>`count(*)` })
      .from(srsState)
      .where(and(eq(srsState.userId, userId), gte(srsState.repetitions, 1))),
    db.execute<{ day: Date; count: number }>(sql`
      select date_trunc('day', created_at) as day, count(*)::int as count
      from reviews
      where user_id = ${userId} and created_at >= ${weekStart}
      group by day
      order by day
    `),
    db.execute<{ title: string; avgReps: number }>(sql`
      select concepts.title as title, avg(srs_state.repetitions)::float as "avgReps"
      from srs_state
      inner join cards on cards.id = srs_state.card_id
      inner join concepts on concepts.id = cards.concept_id
      where srs_state.user_id = ${userId}
      group by concepts.title
      order by avg(srs_state.repetitions) desc
      limit 6
    `),
  ]);

  const dueRows = await db.execute<{
    day: Date;
    count: number;
  }>(sql`
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
    return {
      name: format(day, "EEE"),
      due: dueMap.get(key) ?? 0,
    };
  });

  const reviewMap = new Map<string, number>();
  for (const row of reviewRows.rows) {
    const key = format(row.day, "yyyy-MM-dd");
    reviewMap.set(key, row.count);
  }

  const heatmapData = Array.from({ length: 7 }).map((_, index) => {
    const day = addDays(weekStart, index);
    const key = format(day, "yyyy-MM-dd");
    return {
      label: format(day, "EEE"),
      count: reviewMap.get(key) ?? 0,
    };
  });

  const hasProgress =
    Number(dueToday[0]?.count ?? 0) > 0 ||
    Number(dueTomorrow[0]?.count ?? 0) > 0 ||
    Number(learnedCount[0]?.count ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Progress</p>
        <h1 className="text-3xl font-semibold">Your learning momentum</h1>
        <p className="text-muted-foreground">See what is due today and how your reviews are building up.</p>
      </div>

      {hasProgress ? (
        <ProgressChart data={chartData} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No progress yet</CardTitle>
            <CardDescription>Complete your first session to see trends here.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/daily" className="flex items-center gap-2">
                <PlayCircle className="h-4 w-4" />
                Study
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Due today</CardTitle>
            <CardDescription>Cards ready for review today.</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{dueToday[0]?.count ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Due tomorrow</CardTitle>
            <CardDescription>Cards coming up tomorrow.</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{dueTomorrow[0]?.count ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Learned cards</CardTitle>
            <CardDescription>Cards you have reviewed at least once.</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{learnedCount[0]?.count ?? 0}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Weekly heatmap</CardTitle>
            <CardDescription>Your review activity for the last 7 days.</CardDescription>
          </CardHeader>
          <CardContent>
            <WeeklyHeatmap data={heatmapData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Mastery ladder</CardTitle>
            <CardDescription>Top concepts by repetition.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {masteryRows.rows.length ? (
              masteryRows.rows.map((row) => (
                <div key={row.title} className="rounded-lg border border-white/70 bg-white/80 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{row.title}</span>
                    <span className="text-xs text-muted-foreground">Avg {row.avgReps.toFixed(1)}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted/70">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${Math.min((row.avgReps / 6) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Complete a few reviews to see mastery levels.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
