"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const SESSION_MINUTES = 10;

export function StudyToday({ dueCount }: { dueCount: number }) {
  const [seconds, setSeconds] = useState(SESSION_MINUTES * 60);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => (prev > 0 ? prev - 1 : prev));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  const timeLabel = `${minutes}:${remaining.toString().padStart(2, "0")}`;

  return (
    <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_24px_60px_-50px_rgba(15,23,42,0.4)]">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Study today</p>
      <h3 className="mt-2 text-2xl font-semibold text-foreground">Ready for a quick session?</h3>
      <p className="mt-1 text-sm text-muted-foreground">{dueCount} cards are waiting.</p>
      <div className="mt-4 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-sm font-semibold text-primary">
          {timeLabel}
        </div>
        <Button asChild className="px-6">
          <Link href="/daily" className="flex items-center gap-2">
            <PlayCircle className="h-4 w-4" />
            Start
          </Link>
        </Button>
      </div>
    </div>
  );
}
