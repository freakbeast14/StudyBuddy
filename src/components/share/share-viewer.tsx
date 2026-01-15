"use client";

import { useMemo, useState } from "react";
import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SourceDrawer } from "@/components/source/source-drawer";

interface ConceptRow {
  id: string;
  moduleTitle: string | null;
  lessonTitle: string | null;
  title: string;
  summary: string | null;
  pageRange: string | null;
}

interface CardRow {
  id: string;
  prompt: string;
  answer: string;
  citations: { chunkIds?: string[]; pageNumbers?: number[] } | null;
  conceptId: string;
}

interface ShareViewerProps {
  courseTitle: string;
  concepts: ConceptRow[];
  cards: CardRow[];
}

export function ShareViewer({ courseTitle, concepts, cards }: ShareViewerProps) {
  const [sourceOpen, setSourceOpen] = useState(false);
  const [sourceChunkIds, setSourceChunkIds] = useState<string[]>([]);
  const [sourceInitialPage, setSourceInitialPage] = useState<number | undefined>(undefined);

  const outline = useMemo(() => {
    const map = new Map<string, Map<string, ConceptRow[]>>();
    for (const concept of concepts) {
      const moduleTitle = concept.moduleTitle ?? "Module";
      const lessonTitle = concept.lessonTitle ?? "Lesson";
      if (!map.has(moduleTitle)) map.set(moduleTitle, new Map());
      const lessonMap = map.get(moduleTitle);
      if (!lessonMap?.has(lessonTitle)) lessonMap?.set(lessonTitle, []);
      lessonMap?.get(lessonTitle)?.push(concept);
    }
    return Array.from(map.entries()).map(([moduleTitle, lessonMap]) => ({
      moduleTitle,
      lessons: Array.from(lessonMap.entries()).map(([lessonTitle, items]) => ({
        lessonTitle,
        concepts: items,
      })),
    }));
  }, [concepts]);

  const openSource = (chunkIds: string[], pageNumber?: number) => {
    if (!chunkIds.length) return;
    setSourceChunkIds(chunkIds);
    setSourceInitialPage(pageNumber);
    setSourceOpen(true);
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Shared course</p>
          <h1 className="text-3xl font-semibold">{courseTitle}</h1>
          <p className="text-muted-foreground">A read-only preview of the outline and flashcards.</p>
        </div>

        <div className="space-y-4">
          {outline.map((module) => (
            <Card key={module.moduleTitle}>
              <CardHeader>
                <CardTitle>{module.moduleTitle}</CardTitle>
                <CardDescription>Lessons and key concepts.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {module.lessons.map((lesson) => (
                  <div key={lesson.lessonTitle} className="rounded-lg border border-white/70 bg-white/80 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{lesson.lessonTitle}</p>
                      <Badge variant="outline">{lesson.concepts.length} concepts</Badge>
                    </div>
                    <Separator className="my-3" />
                    <div className="grid gap-2 sm:grid-cols-2">
                      {lesson.concepts.map((concept) => (
                        <div key={concept.id} className="rounded-md bg-muted/50 p-3 text-sm">
                          <p className="font-semibold text-foreground">{concept.title}</p>
                          {concept.summary ? (
                            <p className="mt-1 text-xs text-muted-foreground">{concept.summary}</p>
                          ) : null}
                          {concept.pageRange ? (
                            <p className="mt-2 text-xs text-muted-foreground">Pages {concept.pageRange}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sample cards</CardTitle>
            <CardDescription>Preview a few flashcards from this course.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {cards.length === 0 ? (
              <p className="text-sm text-muted-foreground">No cards available.</p>
            ) : (
              cards.map((card) => {
                const chunkIds = card.citations?.chunkIds ?? [];
                const pageNumbers = card.citations?.pageNumbers ?? [];
                return (
                  <div key={card.id} className="rounded-lg border border-white/70 bg-white/80 p-3 text-sm">
                    <p className="font-medium">{card.prompt}</p>
                    <p className="mt-2 text-muted-foreground">{card.answer}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {pageNumbers.map((page) => (
                        <Badge key={`${card.id}-${page}`} variant="outline">
                          Page {page}
                        </Badge>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openSource(chunkIds, pageNumbers[0])}
                        disabled={!chunkIds.length}
                      >
                        <BookOpen className="mr-2 h-4 w-4" />
                        Source
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
      <SourceDrawer
        open={sourceOpen}
        onOpenChange={setSourceOpen}
        chunkIds={sourceChunkIds}
        initialPage={sourceInitialPage}
      />
    </>
  );
}
