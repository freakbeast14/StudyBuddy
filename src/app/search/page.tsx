"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SourceDrawer } from "@/components/source/source-drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toaster";

interface CourseRow {
  id: string;
  title: string;
}

interface SearchResult {
  chunkId: string;
  documentId: string;
  pageNumber: number;
  snippet: string;
  score: number;
}

interface AskCitation {
  chunkId: string;
  pageNumber: number;
  quote: string;
}

export default function SearchPage() {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [courseId, setCourseId] = useState("");
  const [query, setQuery] = useState("");
  const [question, setQuestion] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [answer, setAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<AskCitation[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingAsk, setLoadingAsk] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [sourceChunkIds, setSourceChunkIds] = useState<string[]>([]);
  const [sourceInitialPage, setSourceInitialPage] = useState<number | undefined>(undefined);
  const { toast } = useToast();

  const loadCourses = useCallback(async () => {
    const response = await fetch("/api/courses", { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as CourseRow[];
    setCourses(data);
    setCourseId((prev) => prev || data[0]?.id || "");
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const handleSearch = async () => {
    if (!courseId || query.trim().length < 3) {
      setErrorMessage("Select a course and enter a longer query.");
      return;
    }
    setLoadingSearch(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, query: query.trim() }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Search failed");
      }
      const data = (await response.json()) as SearchResult[];
      setResults(data);
      toast({ title: "Search complete", description: `${data.length} results found.`, variant: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Search failed";
      setErrorMessage(message);
      toast({ title: "Search failed", description: message, variant: "error" });
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleAsk = async () => {
    if (!courseId || question.trim().length < 5) {
      setErrorMessage("Select a course and enter a longer question.");
      return;
    }
    setLoadingAsk(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, question: question.trim() }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Ask failed");
      }
      const data = (await response.json()) as { answer: string; citations: AskCitation[] };
      setAnswer(data.answer);
      setCitations(data.citations);
      toast({ title: "Answer ready", description: "Citations included.", variant: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ask failed";
      setErrorMessage(message);
      toast({ title: "Ask failed", description: message, variant: "error" });
    } finally {
      setLoadingAsk(false);
    }
  };

  const openSource = (chunkIds: string[], pageNumber?: number) => {
    if (!chunkIds.length) return;
    setSourceChunkIds(chunkIds);
    setSourceInitialPage(pageNumber);
    setSourceOpen(true);
  };

  const askChunkIds = useMemo(() => citations.map((citation) => citation.chunkId), [citations]);

  return (
    <>
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Semantic search</p>
          <h1 className="text-3xl font-semibold">Search your course</h1>
          <p className="text-muted-foreground">Retrieve grounded chunks and optionally ask a question with citations.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Search</CardTitle>
            <CardDescription>Find the most relevant chunks by semantic similarity.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {courses.length === 0 ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>No courses yet. Upload a PDF to begin searching.</p>
                <Button asChild>
                  <a href="/upload">Upload a PDF</a>
                </Button>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-[220px_1fr_auto]">
                <select
                  value={courseId}
                  onChange={(event) => setCourseId(event.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="" disabled>
                    {courses.length ? "Select course" : "No courses yet"}
                  </option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search for a concept or keyword"
                />
                <Button onClick={handleSearch} disabled={loadingSearch}>
                  {loadingSearch ? "Searching..." : "Search"}
                </Button>
              </div>
            )}
            {errorMessage ? (
              <div className="flex flex-wrap items-center gap-2 text-sm text-rose-500">
                <span>{errorMessage}</span>
                <Button variant="ghost" size="sm" onClick={handleSearch}>
                  Retry
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-3">
          {loadingSearch ? (
            <div className="grid gap-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : results.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No results yet</CardTitle>
                <CardDescription>Try a broader query or upload more documents.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline">
                  <a href="/upload">Upload another PDF</a>
                </Button>
              </CardContent>
            </Card>
          ) : (
            results.map((result) => (
              <Card key={result.chunkId}>
                <CardHeader>
                  <CardTitle className="text-lg">Page {result.pageNumber}</CardTitle>
                  <CardDescription>Score {result.score.toFixed(3)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>{result.snippet}...</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openSource([result.chunkId], result.pageNumber)}
                  >
                    View source
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ask my course</CardTitle>
            <CardDescription>Ask a question and receive a cited answer.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask a question about the course"
              />
              <Button onClick={handleAsk} disabled={loadingAsk}>
                {loadingAsk ? "Asking..." : "Ask"}
              </Button>
            </div>
            {answer ? (
              <Card className="border border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-base">Answer</CardTitle>
                  <CardDescription>Grounded in cited chunks.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p className="text-foreground">{answer}</p>
                  <div className="flex flex-wrap gap-2">
                    {citations.map((citation) => (
                      <Badge key={citation.chunkId} variant="outline">
                        Page {citation.pageNumber}
                      </Badge>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {citations.map((citation) => (
                      <div key={citation.chunkId} className="rounded-md border border-dashed p-3 text-xs">
                        <p className="font-medium">Chunk {citation.chunkId}</p>
                        <p className="text-muted-foreground">{citation.quote}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openSource(askChunkIds, citation.pageNumber)}
                        >
                          View source
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground">No answer yet. Ask a question to see citations.</p>
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
