import Link from "next/link";
import { ArrowRight, BookOpen, Brain, FileText, Timer } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const steps = [
  {
    title: "Upload & ingest",
    description: "Store the PDF locally, parse text with page numbers, enqueue PROCESS_DOCUMENT in pg-boss.",
    href: "/upload",
    icon: FileText,
  },
  {
    title: "Outline & concepts",
    description: "Generate modules -> lessons -> concepts and keep citations tied to chunk + page ids.",
    href: "/course",
    icon: BookOpen,
  },
  {
    title: "Flashcards & quizzes",
    description: "Use RAG over pgvector chunks to draft cards and short quizzes per concept.",
    href: "/course",
    icon: Brain,
  },
  {
    title: "10-min daily session",
    description: "SM-2 scheduling drives due cards plus a new concept and a mini quiz.",
    href: "/daily",
    icon: Timer,
  },
];

export default function Home() {
  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4">
        <Badge variant="secondary" className="w-fit">
          Local-first - Postgres + OpenAI
        </Badge>
        <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
          StudyBuddy AI scaffolding is ready. Start by uploading a PDF to kick off ingestion.
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          This workspace is wired for App Router + Tailwind + shadcn/ui, Drizzle ORM with pgvector, pg-boss jobs, and
          local filesystem storage at <code className="rounded bg-muted px-2 py-1 font-mono text-sm">./data/uploads</code>.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild>
            <Link href="/upload" className="flex items-center gap-2">
              Start with an upload <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/daily">Run the 10-min session</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {steps.map((step) => (
          <Card key={step.title} className="h-full">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <step.icon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>{step.title}</CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" asChild className="px-0 text-sm">
                <Link href={step.href} className="inline-flex items-center gap-2 text-primary">
                  Open screen <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline status</CardTitle>
          <CardDescription>{`Ingestion -> chunking -> embeddings -> outline/cards/quizzes.`}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm font-medium">Ingestion readiness</p>
            <Progress value={80} className="mt-2" />
            <p className="mt-2 text-xs text-muted-foreground">pg-boss worker & Drizzle schemas are scaffolded.</p>
          </div>
          <div>
            <p className="text-sm font-medium">RAG wiring</p>
            <Progress value={65} className="mt-2" />
            <p className="mt-2 text-xs text-muted-foreground">Vector column + index defined; add OpenAI calls next.</p>
          </div>
          <div>
            <p className="text-sm font-medium">SM-2 logic</p>
            <Progress value={40} className="mt-2" />
            <p className="mt-2 text-xs text-muted-foreground">Core state modeled; tests ready for scheduling rules.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
