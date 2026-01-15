"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cardHoverTap, staggerContainer, staggerItem } from "@/components/motion";
import { cn } from "@/lib/utils";

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

export function OutlineTree({ outline }: { outline: OutlineModule[] }) {
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpenModules((prev) => {
      const next = { ...prev };
      for (const module of outline) {
        if (next[module.moduleTitle] === undefined) next[module.moduleTitle] = true;
      }
      return next;
    });
  }, [outline]);

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4">
      {outline.map((module) => (
        <motion.div key={module.moduleTitle} variants={staggerItem}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>{module.moduleTitle}</CardTitle>
                <CardDescription>Lessons and key concepts from your materials.</CardDescription>
              </div>
              <button
                type="button"
                onClick={() =>
                  setOpenModules((prev) => ({ ...prev, [module.moduleTitle]: !prev[module.moduleTitle] }))
                }
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/80 text-muted-foreground transition hover:text-foreground"
                aria-label={`Toggle ${module.moduleTitle}`}
                aria-expanded={openModules[module.moduleTitle]}
              >
                <ChevronDown
                  className={cn(
                    "h-5 w-5 transition-transform duration-200",
                    openModules[module.moduleTitle] ? "rotate-180" : "rotate-0"
                  )}
                />
              </button>
            </CardHeader>
            <motion.div
              initial={false}
              animate={{
                height: openModules[module.moduleTitle] ? "auto" : 0,
                opacity: openModules[module.moduleTitle] ? 1 : 0,
              }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <CardContent className="space-y-3">
                {module.lessons.map((lesson) => (
                  <motion.div key={lesson.lessonTitle} variants={staggerItem}>
                    <div className="rounded-lg border border-white/70 bg-white/80 px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Link
                          href={`/lesson/${encodeURIComponent(lesson.lessonTitle)}`}
                          className="font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {lesson.lessonTitle}
                        </Link>
                        <Badge variant="outline">{lesson.concepts.length} concepts</Badge>
                      </div>
                      <Separator className="my-3" />
                      <div className="grid gap-2 sm:grid-cols-2">
                        {lesson.concepts.map((concept) => (
                          <motion.div key={concept.id} variants={staggerItem} {...cardHoverTap}>
                            <div className="rounded-md bg-muted/50 p-3 text-sm">
                              <p className="font-semibold text-foreground">{concept.title}</p>
                              {concept.summary ? (
                                <p className="mt-1 text-xs text-muted-foreground">{concept.summary}</p>
                              ) : null}
                              {concept.pageRange ? (
                                <p className="mt-2 text-xs text-muted-foreground">Pages {concept.pageRange}</p>
                              ) : null}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </motion.div>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}
