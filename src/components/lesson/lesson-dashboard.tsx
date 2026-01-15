"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { SourceDrawer } from "@/components/source/source-drawer";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toaster";

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
  const [sourceOpen, setSourceOpen] = useState(false);
  const [sourceChunkIds, setSourceChunkIds] = useState<string[]>([]);
  const [sourceInitialPage, setSourceInitialPage] = useState<number | undefined>(undefined);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
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

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Lesson</p>
            <h1 className="text-3xl font-semibold">{lessonTitle}</h1>
            <p className="text-muted-foreground">Flashcards and quizzes grounded to cited chunks.</p>
          </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleGenerateCards} disabled={isGeneratingCards}>
            {isGeneratingCards ? "Generating cards..." : "Generate Flashcards"}
          </Button>
          <Button variant="outline" onClick={handleGenerateQuiz} disabled={isGeneratingQuiz}>
            {isGeneratingQuiz ? "Generating quiz..." : "Generate Quiz"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              toast({ title: "Export started", description: "Downloading lesson CSV.", variant: "info" });
              window.location.href = `/api/lessons/export?courseId=${encodeURIComponent(courseId)}&lessonTitle=${encodeURIComponent(
                lessonTitle
              )}${moduleTitle ? `&moduleTitle=${encodeURIComponent(moduleTitle)}` : ""}`;
            }}
          >
            Export flashcards
          </Button>
        </div>
      </div>

      {errorMessage ? <p className="text-sm text-rose-500">{errorMessage}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Concepts</CardTitle>
          <CardDescription>{concepts.length} concepts found for this lesson.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {concepts.map((concept) => (
            <div key={concept.id} className="rounded-lg border bg-background p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{concept.title}</p>
                <Button variant="ghost" size="sm" onClick={() => handleHelp(concept)}>
                  Help me understand
                </Button>
              </div>
              {concept.summary ? <p className="mt-2 text-muted-foreground">{concept.summary}</p> : null}
              {concept.pageRange ? <p className="mt-2 text-xs text-muted-foreground">Pages {concept.pageRange}</p> : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Flashcards</CardTitle>
          <CardDescription>{cards.length} cards generated for this lesson.</CardDescription>
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
            cards.map((card) => {
              const pageNumbers = card.citations?.pageNumbers ?? [];
              return (
                <div key={card.id} className="rounded-lg border p-3">
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
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewSource(card)}
                        disabled={
                          !(
                            (Array.isArray(card.citations?.chunkIds) && card.citations?.chunkIds?.length) ||
                            (Array.isArray(card.conceptCitationIds) && card.conceptCitationIds.length)
                          )
                        }
                      >
                        View source
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(card)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(card.id)}>
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
                      <Link href={`/course/${courseId}?page=${pageNumbers[0]}`} className="text-primary">
                        Open PDF
                      </Link>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lesson quiz</CardTitle>
          <CardDescription>3-5 questions grounded in lesson citations.</CardDescription>
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
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                Score: {totalScore} / {quiz.questions.length}
              </div>
              {quiz.questions.map((question, index) => {
                const selection = quizSelections[index];
                const normalizedAnswer = resolveAnswer(question);
                const isCorrect = selection === normalizedAnswer;
                return (
                  <div key={`${question.question}-${index}`} className="rounded-lg border p-3">
                    <p className="font-medium">{question.question}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                      {question.options.map((option) => {
                        const isSelected = selection === option;
                        const showCorrect = selection && option === normalizedAnswer;
                        const showIncorrect = selection && isSelected && option !== normalizedAnswer;
                        return (
                          <Button
                            key={option}
                            type="button"
                            variant={showCorrect ? "default" : showIncorrect ? "destructive" : "outline"}
                            size="sm"
                            onClick={() =>
                              setQuizSelections((prev) => ({
                                ...prev,
                                [index]: option,
                              }))
                            }
                          >
                            {option}
                          </Button>
                        );
                      })}
                    </div>
                    {selection ? (
                      <p className="mt-3 text-xs text-muted-foreground">
                        {isCorrect ? "Correct" : "Incorrect"} - Answer: {normalizedAnswer}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
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
      <Sheet open={helpOpen} onOpenChange={setHelpOpen}>
        <SheetContent className="max-w-4xl">
          <SheetHeader>
            <SheetTitle>Help me understand</SheetTitle>
            <SheetDescription>
              {helpConcept?.title ?? "Concept"} - scaffolded explanation and practice.
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
                    <CardDescription>Bullets, example, and misconception.</CardDescription>
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
                        <div key={card.id} className="rounded-lg border p-3 text-sm">
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
                    <CardDescription>Review scaffold cards and record ratings.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {helpCards.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No scaffold cards to practice.</p>
                    ) : (
                      <>
                        <div className="text-sm text-muted-foreground">
                          Card {practiceIndex + 1} of {helpCards.length}
                        </div>
                        <div className="rounded-lg border p-3">
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


