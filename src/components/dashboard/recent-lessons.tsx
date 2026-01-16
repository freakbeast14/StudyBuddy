"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";

interface RecentLesson {
  lessonTitle: string;
  moduleTitle: string | null;
  conceptCount: number;
}

export function RecentLessons({ lessons }: { lessons: RecentLesson[] }) {
  if (!lessons.length) {
    return (
      <div className="rounded-2xl border border-white/60 bg-white/70 p-4 text-sm text-muted-foreground">
        No lessons yet. Upload a PDF to begin.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 overflow-x-auto pb-2">
      {lessons.map((lesson) => (
        <motion.div
          key={lesson.lessonTitle}
          whileHover={{ y: -4 }}
          className="min-w-[220px] rounded-2xl border border-white/60 bg-white/80 p-4 shadow-[0_18px_40px_-35px_rgba(15,23,42,0.4)]"
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <BookOpen className="h-4 w-4 text-primary" />
            {lesson.moduleTitle ?? "Module"}
          </div>
          <p className="mt-2 text-sm font-semibold text-foreground">{lesson.lessonTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">{lesson.conceptCount} concepts</p>
          <Link href={`/lesson/${encodeURIComponent(lesson.lessonTitle)}`} className="mt-3 inline-flex text-xs text-primary">
            Open
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
