"use client";

import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { BookOpen, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cardHoverTap, spring } from "@/components/motion";

const DRAG_THRESHOLD = 120;

export type DeckRating = "Again" | "Hard" | "Good" | "Easy";

interface DeckCard {
  id: string;
  prompt: string;
  answer: string;
  conceptTitle: string;
  lessonTitle?: string | null;
  citations?: { chunkIds?: string[]; pageNumbers?: number[] } | null;
}

interface FlashcardDeckProps {
  card: DeckCard | null;
  nextCards: DeckCard[];
  showAnswer: boolean;
  onToggleAnswer: () => void;
  onRate: (rating: DeckRating) => void;
  onViewSource: () => void;
}

export function FlashcardDeck({
  card,
  nextCards,
  showAnswer,
  onToggleAnswer,
  onRate,
  onViewSource,
}: FlashcardDeckProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-10, 0, 10]);
  const rightOpacity = useTransform(x, [40, 160], [0, 1]);
  const leftOpacity = useTransform(x, [-160, -40], [1, 0]);

  if (!card) return null;

  return (
    <div className="relative mx-auto w-full max-w-2xl">

      <AnimatePresence mode="wait">
        <motion.div
          key={card.id}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          style={{ x, rotate }}
          onDragEnd={(_, info) => {
            if (info.offset.x > DRAG_THRESHOLD) onRate("Easy");
            if (info.offset.x < -DRAG_THRESHOLD) onRate("Again");
          }}
          transition={spring}
          className="relative rounded-2xl border border-white/70 bg-white/85 shadow-[0_30px_60px_-50px_rgba(15,23,42,0.6)]"
          {...cardHoverTap}
        >
          <motion.div
            className="absolute left-4 top-4 rounded-full border border-rose-200/70 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700"
            style={{ opacity: leftOpacity }}
          >
            Again
          </motion.div>
          <motion.div
            className="absolute right-4 top-4 rounded-full border border-emerald-200/70 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
            style={{ opacity: rightOpacity }}
          >
            Easy
          </motion.div>
          <div className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Flashcard</p>
                <p className="mt-2 text-lg font-semibold">{card.prompt}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {card.conceptTitle} - {card.lessonTitle ?? "Lesson"}
                </p>
              </div>
            </div>

            <div className="mt-6 h-48 [perspective:1200px]">
              <motion.div
                className="relative h-full rounded-2xl border border-white/70 bg-muted/30 p-4 [transform-style:preserve-3d]"
                animate={{ rotateY: showAnswer ? 180 : 0 }}
                transition={{ duration: 0.35 }}
              >
                <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground [backface-visibility:hidden]">
                  <Button variant="outline" onClick={onToggleAnswer} aria-label="Reveal answer">
                    Reveal answer <Eye className="ml-2 h-4 w-4" />
                  </Button>
                </div>
                <div className="absolute inset-0 rounded-2xl p-4 text-sm text-foreground [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  {card.answer}
                </div>
              </motion.div>
            </div>
            <div className="mt-4 flex flex-column justify-between lg:flex-row">
              <div>
                <div className="flex flex-wrap gap-2">
                  {(card.citations?.pageNumbers ?? []).map((page) => (
                    <Badge key={page} variant="outline">
                      Page {page}
                    </Badge>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Drag left/right to rate or use buttons below.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={onViewSource} aria-label="View source" className="text-muted-foreground">
                <BookOpen className="mr-2 h-4 w-4" />
                Source
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
