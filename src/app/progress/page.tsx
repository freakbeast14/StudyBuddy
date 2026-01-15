import { addDays, format, startOfDay } from "date-fns";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressChart } from "@/components/progress/progress-chart";
import { db } from "@/db/client";
import { srsState } from "@/db/schema";
import { getOrCreateDefaultUserId } from "@/lib/users";
import Link from "next/link";
import { PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Progress - StudyBuddy AI",
};

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

  const [dueToday, dueTomorrow, learnedCount] = await Promise.all([
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
    </div>
  );
}
