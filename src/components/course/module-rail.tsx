"use client";

import { useMemo } from "react";
import { BookOpen } from "lucide-react";

interface ModuleItem {
  moduleTitle: string;
  lessonCount: number;
}

export function ModuleRail({ outline }: { outline: ModuleItem[] }) {
  const items = useMemo(() => outline, [outline]);
  return (
    <div className="rounded-2xl border border-white/60 bg-white/70 p-4 text-xs">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Modules</p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <a
            key={item.moduleTitle}
            href={`#module-${slugify(item.moduleTitle)}`}
            className="flex items-center gap-2 rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-foreground hover:text-primary"
          >
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium">{item.moduleTitle}</span>
            <span className="ml-auto text-[10px] text-muted-foreground">{item.lessonCount}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
