"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Download, FileStack, HelpCircle, ListChecks, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { SourceDrawer } from "@/components/source/source-drawer";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toaster";
import { cardHoverTap, staggerContainer, staggerItem } from "@/components/motion";
import { FlashcardDeck, type DeckRating } from "@/components/daily/flashcard-deck";

interface ConceptRow {
  id: string;
  title: string;
  summary: string | null;
  pageRange: string | null;
  moduleTitle: string | null;
}

interface CitationPayload {
  chunkIds?: string[];
  pageNumbers?: number[];
}

interface CardRow {
  id: string;
  prompt: string;
  answer: string;
  citations: CitationPayload | null;
  conceptTitle: string;
  moduleTitle: string | null;
  conceptCitationIds?: unknown;
}

interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
  citationChunkIds: string[];
}

interface LessonDashboardProps {
  courseId: string;
  moduleTitle: string | null;
  lessonTitle: string;
  concepts: ConceptRow[];
}

interface HelpExplanation {
  bullets: string[];
  example: string;
  misconception: string;
  citations: { chunkIds: string[]; pages: number[] };
}

interface ScaffoldCard {
  id: string;
  prompt: string;
  answer: string;
  citations: { chunkIds: string[]; pages: number[] };
  isScaffold: number;
}

export function LessonDashboard({ courseId, moduleTitle, lessonTitle, concepts }: LessonDashboardProps) {
  const [cards, setCards] = useState<CardRow[]>([]);
  const [quiz, setQuiz] = useState<{ questions: QuizQuestion[] } | null>(null);
  const [isGeneratingCards, setIsGeneratingCards] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [editAnswer, setEditAnswer] = useState("");
  const [quizSelections, setQuizSelections] = useState<Record<number, string>>({});
  const [quizIndex, setQuizIndex] = useState(0);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [sourceChunkIds, setSourceChunkIds] = useState<string[]>([]);
  const [sourceInitialPage, setSourceInitialPage] = useState<number | undefined>(undefined);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [deckIndex, setDeckIndex] = useState(0);
  const [deckShowAnswer, setDeckShowAnswer] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpConcept, setHelpConcept] = useState<ConceptRow | null>(null);
  const [helpExplanation, setHelpExplanation] = useState<HelpExplanation | null>(null);
  const [helpCards, setHelpCards] = useState<ScaffoldCard[]>([]);
  const [helpCached, setHelpCached] = useState(false);
  const [helpLoading, setHelpLoading] = useState(false);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceShowAnswer, setPracticeShowAnswer] = useState(false);
  const [practiceLastRating, setPracticeLastRating] = useState<string | null>(null);
  const { toast } = useToast();

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ courseId, lessonTitle });
    if (moduleTitle) params.set("moduleTitle", moduleTitle);
    return params.toString();
  }, [courseId, lessonTitle, moduleTitle]);

  const loadCards = useCallback(async () => {
    setCardsLoading(true);
    const response = await fetch(`/api/lessons/cards?${queryString}`, { cache: "no-store" });
    if (response.ok) {
      const data = (await response.json()) as CardRow[];
      setCards(data);
    }
    setCardsLoading(false);
  }, [queryString]);

  const loadQuiz = useCallback(async () => {
    setQuizLoading(true);
    const response = await fetch(`/api/lessons/quiz?${queryString}`, { cache: "no-store" });
    if (response.ok) {
      const data = (await response.json()) as { questions?: unknown } | null;
      if (!data) {
        setQuiz(null);
        setQuizLoading(false);
        return;
      }
      if (Array.isArray(data.questions)) {
        setQuiz({ questions: data.questions as QuizQuestion[] });
        setQuizLoading(false);
        return;
      }
      if (
        data.questions &&
        typeof data.questions === "object" &&
        Array.isArray((data.questions as { questions?: unknown }).questions)
      ) {
        setQuiz({ questions: (data.questions as { questions: QuizQuestion[] }).questions });
        setQuizLoading(false);
        return;
      }
      setQuiz(null);
    }
    setQuizLoading(false);
  }, [queryString]);

  useEffect(() => {
    loadCards();
    loadQuiz();
  }, [loadCards, loadQuiz]);

  useEffect(() => {
    setDeckIndex(0);
    setDeckShowAnswer(false);
  }, [cards]);

  useEffect(() => {
    setQuizIndex(0);
    setQuizSelections({});
  }, [quiz]);

  const handleGenerateCards = async () => {
    setIsGeneratingCards(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/lessons/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, moduleTitle, lessonTitle }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to generate flashcards");
      }
      await loadCards();
      toast({ title: "Flashcards ready", description: "Cards generated for this lesson.", variant: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate flashcards";
      setErrorMessage(message);
      toast({ title: "Flashcards failed", description: message, variant: "error" });
    } finally {
      setIsGeneratingCards(false);
    }
  };

  const handleGenerateQuiz = async () => {
    setIsGeneratingQuiz(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/lessons/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, moduleTitle, lessonTitle }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to generate quiz");
      }
      const payload = (await response.json()) as { questions: QuizQuestion[] };
      setQuiz({ questions: payload.questions });
      setQuizSelections({});
      toast({ title: "Quiz ready", description: "A quiz is ready to review.", variant: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate quiz";
      setErrorMessage(message);
      toast({ title: "Quiz failed", description: message, variant: "error" });
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const totalScore = Array.isArray(quiz?.questions)
    ? quiz?.questions.reduce((score, question, index) => {
        const selection = quizSelections[index];
        const normalizedAnswer = resolveAnswer(question);
        if (selection && selection === normalizedAnswer) return score + 1;
        return score;
      }, 0)
    : 0;

  const handleEdit = (card: CardRow) => {
    setEditingCardId(card.id);
    setEditPrompt(card.prompt);
    setEditAnswer(card.answer);
  };

  const handleSave = async (cardId: string) => {
    setErrorMessage(null);
    const response = await fetch(`/api/cards/${cardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: editPrompt, answer: editAnswer }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setErrorMessage(payload?.error ?? "Failed to update card");
      return;
    }
    setCards((prev) =>
      prev.map((card) => (card.id === cardId ? { ...card, prompt: editPrompt, answer: editAnswer } : card))
    );
    setEditingCardId(null);
  };

  const handleDelete = async (cardId: string) => {
    setErrorMessage(null);
    const response = await fetch(`/api/cards/${cardId}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setErrorMessage(payload?.error ?? "Failed to delete card");
      return;
    }
    setCards((prev) => prev.filter((card) => card.id !== cardId));
  };

  const handleViewSource = (card: CardRow) => {
    const chunkIds =
      Array.isArray(card.citations?.chunkIds) && card.citations?.chunkIds?.length
        ? card.citations.chunkIds
        : Array.isArray(card.conceptCitationIds)
          ? (card.conceptCitationIds.filter((id) => typeof id === "string") as string[])
          : [];
    if (!chunkIds.length) return;
    const pageNumbers = card.citations?.pageNumbers ?? [];
    setSourceChunkIds(chunkIds);
    setSourceInitialPage(pageNumbers[0]);
    setSourceOpen(true);
  };

  const openSource = (chunkIds: string[], pageNumber?: number) => {
    if (!chunkIds.length) return;
    setSourceChunkIds(chunkIds);
    setSourceInitialPage(pageNumber);
    setSourceOpen(true);
  };

  const handleHelp = async (concept: ConceptRow, regenerate = false) => {
    setHelpConcept(concept);
    setHelpOpen(true);
    setHelpLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/concepts/${concept.id}/help`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Help request failed");
      }
      const payload = (await response.json()) as {
        explanation: HelpExplanation;
        scaffoldCards: ScaffoldCard[];
        cached: boolean;
      };
      setHelpExplanation(payload.explanation);
      setHelpCards(payload.scaffoldCards ?? []);
      setHelpCached(payload.cached);
      setPracticeIndex(0);
      setPracticeShowAnswer(false);
      setPracticeLastRating(null);
      toast({
        title: payload.cached ? "Loaded cached explanation" : "Explanation ready",
        description: payload.cached ? "Showing saved explanation from this week." : "Scaffold cards generated.",
        variant: "success",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Help request failed";
      setErrorMessage(message);
      toast({ title: "Help failed", description: message, variant: "error" });
    } finally {
      setHelpLoading(false);
    }
  };

  const handlePracticeRating = async (cardId: string, rating: string) => {
    await fetch("/api/daily/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, rating }),
    });
    setPracticeLastRating(rating);
    setPracticeIndex((prev) => Math.min(prev + 1, helpCards.length - 1));
    setPracticeShowAnswer(false);
  };

  const deckCard = cards[deckIndex];
  const deckNextCards = cards.slice(deckIndex + 1, deckIndex + 3);
  const deckProgress = cards.length ? ((deckIndex + 1) / cards.length) * 100 : 0;

  const handleDeckRate = useCallback(
    async (rating: DeckRating) => {
      if (!deckCard) return;
      await fetch("/api/daily/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: deckCard.id, rating }),
      });
      setDeckIndex((prev) => Math.min(prev + 1, cards.length - 1));
      setDeckShowAnswer(false);
    },
    [deckCard, cards.length]
  );

  const handleDeckPrev = useCallback(() => {
    setDeckIndex((prev) => Math.max(prev - 1, 0));
    setDeckShowAnswer(false);
  }, []);

  useEffect(() => {
    if (!deckCard) return;
    const handleKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (event.code === "Space") {
        event.preventDefault();
        setDeckShowAnswer((prev) => !prev);
      }
      if (event.key === "1") handleDeckRate("Again");
      if (event.key === "2") handleDeckRate("Hard");
      if (event.key === "3") handleDeckRate("Good");
      if (event.key === "4") handleDeckRate("Easy");
      if (event.key === "ArrowRight") handleDeckRate("Good");
      if (event.key === "ArrowLeft") handleDeckPrev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [deckCard, deckIndex, cards.length, handleDeckPrev, handleDeckRate]);

  const currentQuestion = quiz?.questions?.[quizIndex];
  const quizProgress = quiz?.questions?.length
    ? ((quizIndex + 1) / quiz.questions.length) * 100
    : 0;

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Lesson</p>
            <h1 className="text-3xl font-semibold">{lessonTitle}</h1>
            <p className="text-muted-foreground">Review concepts, practice cards, and test yourself.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleGenerateCards} disabled={isGeneratingCards}>
              <FileStack className="mr-2 h-4 w-4" />
              {isGeneratingCards ? "Making..." : "Cards"}
            </Button>
            <Button variant="outline" onClick={handleGenerateQuiz} disabled={isGeneratingQuiz}>
              <ListChecks className="mr-2 h-4 w-4" />
              {isGeneratingQuiz ? "Making..." : "Quiz"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                toast({ title: "Export started", description: "Downloading lesson CSV.", variant: "info" });
                window.location.href = `/api/lessons/export?courseId=${encodeURIComponent(
                  courseId
                )}&lessonTitle=${encodeURIComponent(lessonTitle)}${
                  moduleTitle ? `&moduleTitle=${encodeURIComponent(moduleTitle)}` : ""
                }`;
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

      {errorMessage ? <p className="text-sm text-rose-500">{errorMessage}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Concepts</CardTitle>
              <CardDescription>{concepts.length} concepts to focus on today.</CardDescription>
            </CardHeader>
            <CardContent>
              <motion.div
                className="grid gap-4 sm:grid-cols-2"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {concepts.map((concept) => (
                  <motion.div key={concept.id} variants={staggerItem} {...cardHoverTap}>
                    <div className="rounded-lg border border-white/70 bg-white/80 p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium">{concept.title}</p>
                        <Button variant="outline" size="sm" onClick={() => handleHelp(concept)} aria-label="Explain this">
                          <HelpCircle className="mr-2 h-4 w-4" />
                          Explain
                        </Button>
                      </div>
                      {concept.summary ? <p className="mt-2 text-muted-foreground">{concept.summary}</p> : null}
                      {concept.pageRange ? (
                        <p className="mt-2 text-xs text-muted-foreground">Pages {concept.pageRange}</p>
                      ) : null}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Card library</CardTitle>
              <CardDescription>Edit, refine, and manage cards.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {cardsLoading ? (
                <div className="grid gap-3">
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                </div>
              ) : cards.length === 0 ? (
                <p className="text-sm text-muted-foreground">No cards yet. Generate flashcards to populate this list.</p>
              ) : (
                <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4">
                  {cards.map((card) => {
                    const pageNumbers = card.citations?.pageNumbers ?? [];
                    return (
                      <motion.div key={card.id} variants={staggerItem} {...cardHoverTap}>
                        <div className="rounded-lg border border-white/70 bg-white/70 p-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <Badge variant="outline">{card.conceptTitle}</Badge>
                              {card.moduleTitle ? (
                                <Badge variant="secondary" className="ml-2">
                                  {card.moduleTitle}
                                </Badge>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewSource(card)}
                                disabled={
                                  !(
                                    (Array.isArray(card.citations?.chunkIds) && card.citations?.chunkIds?.length) ||
                                    (Array.isArray(card.conceptCitationIds) && card.conceptCitationIds.length)
                                  )
                                }
                              >
                                <BookOpen className="mr-2 h-4 w-4" />
                                Source
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(card)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDelete(card.id)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </Button>
                            </div>
                          </div>
                          <Separator className="my-3" />
                          {editingCardId === card.id ? (
                            <div className="space-y-2">
                              <Input value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} />
                              <Textarea value={editAnswer} onChange={(e) => setEditAnswer(e.target.value)} />
                              <div className="flex items-center gap-2">
                                <Button size="sm" onClick={() => handleSave(card.id)}>
                                  Save
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingCardId(null)}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="font-medium">{card.prompt}</p>
                              <p className="text-muted-foreground">{card.answer}</p>
                            </div>
                          )}
                          {pageNumbers.length ? (
                            <div className="mt-3 text-xs text-muted-foreground">
                              Pages {pageNumbers.join(", ")} -{" "}
                              <Link
                                href={`/course/${courseId}?page=${pageNumbers[0]}`}
                                className="text-primary hover:underline"
                              >
                                Open PDF
                              </Link>
                            </div>
                          ) : null}
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:sticky lg:top-24">
          <Card>
            <CardHeader>
              <CardTitle>Study deck</CardTitle>
              <CardDescription>{cards.length} cards ready to review.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {cardsLoading ? (
                <div className="grid gap-3">
                  <Skeleton className="h-24" />
                </div>
              ) : cards.length === 0 ? (
                <p className="text-sm text-muted-foreground">Generate flashcards to start reviewing.</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Deck mode</p>
                    <Badge variant="outline">
                      {deckIndex + 1} / {cards.length}
                    </Badge>
                  </div>
                  <Progress value={deckProgress} />
                  <FlashcardDeck
                    card={
                      deckCard
                        ? {
                            id: deckCard.id,
                            prompt: deckCard.prompt,
                            answer: deckCard.answer,
                            conceptTitle: deckCard.conceptTitle,
                            lessonTitle,
                            citations: deckCard.citations,
                          }
                        : null
                    }
                    nextCards={deckNextCards.map((item) => ({
                      id: item.id,
                      prompt: item.prompt,
                      answer: item.answer,
                      conceptTitle: item.conceptTitle,
                      lessonTitle,
                      citations: item.citations,
                    }))}
                    showAnswer={deckShowAnswer}
                    onToggleAnswer={() => setDeckShowAnswer((prev) => !prev)}
                    onRate={(rating) => handleDeckRate(rating)}
                    onViewSource={() => deckCard && handleViewSource(deckCard)}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    {(["Again", "Hard", "Good", "Easy"] as DeckRating[]).map((rating) => (
                      <Button
                        key={rating}
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeckRate(rating)}
                        disabled={!deckShowAnswer}
                        aria-label={`Rate ${rating}`}
                      >
                        {rating}
                      </Button>
                    ))}
                    <Button variant="ghost" size="sm" className="ml-auto" onClick={handleDeckPrev} aria-label="Previous card">
                      Back
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Lesson quiz</CardTitle>
                <CardDescription>Check your understanding with a short quiz.</CardDescription>
              </div>
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-xs font-semibold text-foreground"
                style={{
                  background: `conic-gradient(hsl(var(--primary)) ${Math.round(quizProgress * 3.6)}deg, #e5e7eb 0deg)`,
                }}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white">
                  {Math.round(quizProgress)}%
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {quizLoading ? (
                <div className="grid gap-3">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-24" />
                </div>
              ) : !quiz?.questions?.length ? (
                <p className="text-sm text-muted-foreground">No quiz yet. Generate a quiz to preview it here.</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-muted-foreground">
                      Question {quizIndex + 1} of {quiz.questions.length}
                    </div>
                    <div className="rounded-lg border border-white/70 bg-white/70 px-3 py-1 text-sm">
                      Score: {totalScore} / {quiz.questions.length}
                    </div>
                  </div>
                  <Progress value={quizProgress} />
                  <AnimatePresence mode="wait">
                    {currentQuestion ? (
                      <motion.div
                        key={`${currentQuestion.question}-${quizIndex}`}
                        className="rounded-lg border p-4"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.25 }}
                      >
                        <p className="font-medium">{currentQuestion.question}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-sm">
                          {currentQuestion.options.map((option) => {
                            const selection = quizSelections[quizIndex];
                            const normalizedAnswer = resolveAnswer(currentQuestion);
                            const isSelected = selection === option;
                            const showCorrect = selection && option === normalizedAnswer;
                            const showIncorrect = selection && isSelected && option !== normalizedAnswer;
                            return (
                              <motion.div
                                key={option}
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                animate={showCorrect ? { scale: 1.04 } : showIncorrect ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                              >
                                <Button
                                  type="button"
                                  variant={showCorrect ? "default" : showIncorrect ? "destructive" : "outline"}
                                  size="sm"
                                  onClick={() =>
                                    setQuizSelections((prev) => ({
                                      ...prev,
                                      [quizIndex]: option,
                                    }))
                                  }
                                  aria-label={`Select ${option}`}
                                >
                                  {option}
                                </Button>
                              </motion.div>
                            );
                          })}
                        </div>
                        {quizSelections[quizIndex] ? (
                          <p className="mt-3 text-xs text-muted-foreground">
                            {quizSelections[quizIndex] === resolveAnswer(currentQuestion) ? "Correct" : "Incorrect"} -
                            Answer: {resolveAnswer(currentQuestion)}
                          </p>
                        ) : null}
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setQuizIndex((prev) => Math.max(prev - 1, 0))}
                            disabled={quizIndex === 0}
                          >
                            Back
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setQuizIndex((prev) => Math.min(prev + 1, quiz.questions.length - 1))}
                            disabled={quizIndex >= quiz.questions.length - 1}
                          >
                            Next
                          </Button>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
      <SourceDrawer
        open={sourceOpen}
        onOpenChange={setSourceOpen}
        chunkIds={sourceChunkIds}
        initialPage={sourceInitialPage}
      />
      <Sheet open={helpOpen} onOpenChange={setHelpOpen}>
        <SheetContent className="max-w-4xl">
          <SheetHeader>
            <SheetTitle>Explain it to me</SheetTitle>
            <SheetDescription>
              {helpConcept?.title ?? "Concept"} - a guided explanation and quick practice.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-6 py-4 overflow-auto">
            {helpLoading ? (
              <p className="text-sm text-muted-foreground">Generating explanation...</p>
            ) : helpExplanation ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <Badge variant="outline">{helpCached ? "Cached" : "Fresh"}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => helpConcept && handleHelp(helpConcept, true)}>
                    Regenerate
                  </Button>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Explanation</CardTitle>
                    <CardDescription>Key points, an example, and a common mistake.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <ul className="list-disc space-y-1 pl-5">
                      {helpExplanation.bullets.map((bullet, index) => (
                        <li key={`${bullet}-${index}`}>{bullet}</li>
                      ))}
                    </ul>
                    <div>
                      <p className="font-medium text-foreground">Example</p>
                      <p>{helpExplanation.example}</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Misconception</p>
                      <p>{helpExplanation.misconception}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {helpExplanation.citations.pages.map((page) => (
                        <Button
                          key={page}
                          variant="outline"
                          size="sm"
                          onClick={() => openSource(helpExplanation.citations.chunkIds, page)}
                        >
                          Page {page}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Scaffold cards</CardTitle>
                    <CardDescription>{helpCards.length} guided cards to practice now.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {helpCards.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No scaffold cards yet.</p>
                    ) : (
                      helpCards.map((card) => (
                        <div key={card.id} className="rounded-lg border border-white/70 bg-white/70 p-3 text-sm">
                          <p className="font-medium">{card.prompt}</p>
                          <p className="text-muted-foreground">{card.answer}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {card.citations.pages.map((page) => (
                              <Button
                                key={`${card.id}-${page}`}
                                variant="ghost"
                                size="sm"
                                onClick={() => openSource(card.citations.chunkIds, page)}
                              >
                                Page {page}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Practice now</CardTitle>
                    <CardDescription>Review the cards and rate your confidence.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {helpCards.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No scaffold cards to practice.</p>
                    ) : (
                      <>
                        <div className="text-sm text-muted-foreground">
                          Card {practiceIndex + 1} of {helpCards.length}
                        </div>
                        <div className="rounded-lg border border-white/70 bg-white/70 p-3">
                          <p className="font-medium">{helpCards[practiceIndex]?.prompt}</p>
                          {practiceShowAnswer ? (
                            <p className="mt-2 text-muted-foreground">{helpCards[practiceIndex]?.answer}</p>
                          ) : (
                            <Button variant="outline" size="sm" className="mt-2" onClick={() => setPracticeShowAnswer(true)}>
                              Reveal answer
                            </Button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {["Again", "Hard", "Good", "Easy"].map((rating) => (
                            <Button
                              key={rating}
                              variant="outline"
                              size="sm"
                              disabled={!practiceShowAnswer}
                              onClick={() => handlePracticeRating(helpCards[practiceIndex].id, rating)}
                            >
                              {rating}
                            </Button>
                          ))}
                        </div>
                        {practiceLastRating ? (
                          <p className="text-xs text-muted-foreground">Last rating: {practiceLastRating}</p>
                        ) : null}
                      </>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No explanation yet. Click regenerate to fetch one.</p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function resolveAnswer(question: QuizQuestion) {
  const trimmed = question.answer.trim();
  const letterMatch = trimmed.match(/^[A-D]$/i);
  if (!letterMatch) return trimmed;
  const index = letterMatch[0].toUpperCase().charCodeAt(0) - "A".charCodeAt(0);
  return question.options[index] ?? trimmed;
}


