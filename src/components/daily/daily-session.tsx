"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { SourceDrawer } from "@/components/source/source-drawer";

const ratings = ["Again", "Hard", "Good", "Easy"] as const;
const MAX_CARDS = 10;
const SESSION_MS = 10 * 60 * 1000;

type Rating = (typeof ratings)[number];

interface DailyCard {
  cardId: string;
  prompt: string;
  answer: string;
  citations: { chunkIds?: string[]; pageNumbers?: number[] } | null;
  conceptTitle: string;
  lessonTitle: string | null;
  moduleTitle: string | null;
}

interface QueueResponse {
  cards: DailyCard[];
  dueCount: number;
  dueTomorrowCount: number;
}

export function DailySession() {
  const [queue, setQueue] = useState<DailyCard[]>([]);
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [lastRating, setLastRating] = useState<Rating | null>(null);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [remainingMs, setRemainingMs] = useState(SESSION_MS);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [dueTomorrowCount, setDueTomorrowCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [sourceChunkIds, setSourceChunkIds] = useState<string[]>([]);
  const [sourceInitialPage, setSourceInitialPage] = useState<number | undefined>(undefined);

  const loadQueue = useCallback(async () => {
    setLoadingQueue(true);
    const response = await fetch("/api/daily/queue", { cache: "no-store" });
    if (response.ok) {
      const data = (await response.json()) as QueueResponse;
      setQueue(data.cards);
      setDueTomorrowCount(data.dueTomorrowCount);
      setIndex(0);
      setReviewedCount(0);
      setShowAnswer(false);
      setStartedAt(new Date());
      setRemainingMs(SESSION_MS);
      setIsComplete(false);
    }
    setLoadingQueue(false);
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (!startedAt) return;
    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt.getTime();
      const remaining = Math.max(SESSION_MS - elapsed, 0);
      setRemainingMs(remaining);
      if (elapsed >= SESSION_MS) {
        setIsComplete(true);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  const maxReviews = Math.min(MAX_CARDS, queue.length);
  const progressValue = maxReviews > 0 ? (reviewedCount / maxReviews) * 100 : 0;

  useEffect(() => {
    if (reviewedCount >= maxReviews && maxReviews > 0) {
      setIsComplete(true);
    }
  }, [reviewedCount, maxReviews]);

  const card = queue[index];
  const pageNumbers = useMemo(() => card?.citations?.pageNumbers ?? [], [card]);
  const chunkIds = useMemo(() => card?.citations?.chunkIds ?? [], [card]);

  const handleRate = useCallback(
    async (rating: Rating) => {
      if (!card) return;
      setLastRating(rating);
      await fetch("/api/daily/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.cardId, rating }),
      });
      setReviewedCount((prev) => prev + 1);
      setIndex((prev) => Math.min(prev + 1, queue.length - 1));
      setShowAnswer(false);
    },
    [card, queue.length]
  );

  const handleSkip = useCallback(() => {
    setIndex((prev) => Math.min(prev + 1, queue.length - 1));
    setShowAnswer(false);
  }, [queue.length]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (event.code === "Space") {
        event.preventDefault();
        setShowAnswer((prev) => !prev);
      }
      if (event.key === "1") handleRate("Again");
      if (event.key === "2") handleRate("Hard");
      if (event.key === "3") handleRate("Good");
      if (event.key === "4") handleRate("Easy");
      if (event.key === "ArrowRight") handleSkip();
      if (event.key === "ArrowLeft") {
        setIndex((prev) => Math.max(prev - 1, 0));
        setShowAnswer(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleRate, handleSkip]);

  const openSource = () => {
    if (!chunkIds.length) return;
    setSourceChunkIds(chunkIds);
    setSourceInitialPage(pageNumbers[0]);
    setSourceOpen(true);
  };

  const remainingMinutes = Math.floor(remainingMs / 60000);
  const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);
  const timeLabel = `${remainingMinutes}:${remainingSeconds.toString().padStart(2, "0")}`;

  if (loadingQueue) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading session</CardTitle>
          <CardDescription>Preparing your next due cards.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-48" />
        </CardContent>
      </Card>
    );
  }

  if (!queue.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No cards due</CardTitle>
          <CardDescription>Generate flashcards first or wait for the next review window.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={loadQueue} variant="outline">
            Refresh queue
          </Button>
          <Button asChild className="ml-2">
            <a href="/course">Go to courses</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isComplete) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Session complete</CardTitle>
          <CardDescription>Great job staying consistent.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Cards reviewed: {reviewedCount}</p>
          <p>Next due count: {dueTomorrowCount}</p>
          <Button onClick={loadQueue} variant="outline" className="mt-2">
            Start another session
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Daily session</p>
          <p className="text-sm text-muted-foreground">Review due cards with SM-2 ratings.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {reviewedCount} / {maxReviews}
          </Badge>
          <Badge variant="secondary">{timeLabel}</Badge>
        </div>
      </div>

      <Progress value={progressValue} />

      {card ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={card.cardId}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.18 }}
          >
            <Card className="mx-auto w-full max-w-2xl">
              <CardHeader>
                <CardTitle>{card.prompt}</CardTitle>
                <CardDescription>
                  {card.conceptTitle} - {card.lessonTitle ?? "Lesson"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative h-48 [perspective:1200px]">
                  <motion.div
                    className="absolute inset-0 rounded-lg border bg-background p-4 shadow-sm [transform-style:preserve-3d]"
                    animate={{ rotateY: showAnswer ? 180 : 0 }}
                    transition={{ duration: 0.35 }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground [backface-visibility:hidden]">
                      <Button variant="outline" onClick={() => setShowAnswer(true)} aria-label="Reveal answer">
                        Reveal answer <Eye className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                    <div className="absolute inset-0 rounded-lg bg-muted p-4 text-sm text-foreground [backface-visibility:hidden] [transform:rotateY(180deg)]">
                      {card.answer}
                    </div>
                  </motion.div>
                </div>
                {pageNumbers.length ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {pageNumbers.map((page) => (
                      <Badge key={page} variant="outline">
                        Page {page}
                      </Badge>
                    ))}
                    <Button variant="ghost" size="sm" onClick={openSource} aria-label="View source">
                      View source
                    </Button>
                  </div>
                ) : (
                  <Button variant="ghost" size="sm" onClick={openSource} aria-label="View source">
                    View source
                  </Button>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {ratings.map((rating) => (
                    <Button
                      key={rating}
                      variant="outline"
                      size="sm"
                      onClick={() => handleRate(rating)}
                      disabled={!showAnswer}
                      aria-label={`Rate ${rating}`}
                    >
                      {rating}
                    </Button>
                  ))}
                  <Button variant="ghost" size="sm" className="ml-auto" onClick={handleSkip} aria-label="Skip card">
                    Skip <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIndex((prev) => Math.max(prev - 1, 0))}
                    aria-label="Previous card"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                </div>
                {lastRating && <p className="text-xs text-muted-foreground">Last rating: {lastRating}</p>}
                <p className="text-xs text-muted-foreground">
                  Shortcuts: Space = flip, 1-4 = rating, left/right = navigate.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      ) : null}
      <SourceDrawer
        open={sourceOpen}
        onOpenChange={setSourceOpen}
        chunkIds={sourceChunkIds}
        initialPage={sourceInitialPage}
      />
    </div>
  );
}
