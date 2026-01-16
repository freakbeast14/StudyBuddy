import Link from "next/link";
import { ArrowRight, BookOpen, Brain, FileText, PlayCircle, Sparkles, UploadCloud } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StudyTimeline } from "@/components/home/study-timeline";

const steps = [
  {
    title: "Upload your material",
    description: "Drop a PDF and let StudyBuddy read it into clean, searchable notes.",
    href: "/upload",
    icon: FileText,
    cta: "Upload a PDF",
  },
  {
    title: "Auto-outline lessons",
    description: "See modules, lessons, and key concepts organized for you.",
    href: "/course",
    icon: BookOpen,
    cta: "Open your outline",
  },
  {
    title: "Create smart practice",
    description: "Generate flashcards and quick quizzes grounded in your PDF.",
    href: "/course",
    icon: Brain,
    cta: "Build practice",
  },
  {
    title: "Daily 10-minute flow",
    description: "Short sessions keep you on track with spaced repetition.",
    href: "/daily",
    icon: PlayCircle,
    cta: "Start a session",
  },
];

export default function Home() {
  return (
    <div className="space-y-10">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-white/60 bg-white/70 p-8 shadow-[0_30px_80px_-60px_rgba(15,23,42,0.5)] backdrop-blur sm:p-10">
          <div className="flex flex-col gap-5">
            <Badge variant="secondary" className="w-fit">
              Made for focused study
            </Badge>
            <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
              Turn your PDFs into a clear study plan and daily practice.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Upload class notes or textbooks, then review lessons, flashcards, and quizzes built from the exact pages you
              uploaded.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild>
                <Link href="/upload" className="flex items-center gap-2">
                  <UploadCloud className="h-4 w-4" />
                  Upload
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/daily" className="flex items-center gap-2">
                  <PlayCircle className="h-4 w-4" />
                  Study
                </Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1">
                <Sparkles className="h-4 w-4 text-primary" />
                Built from your material
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1">
                <Brain className="h-4 w-4 text-primary" />
                Spaced repetition included
              </div>
            </div>
          </div>
        </div>
        <StudyTimeline />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {steps.map((step) => (
          <Card key={step.title} className="h-full">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
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
                  {step.cta} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Study momentum</CardTitle>
          <CardDescription>Track your progress from upload to daily review.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm font-medium">Materials ready</p>
            <Progress value={75} className="mt-2" />
            <p className="mt-2 text-xs text-muted-foreground">Upload a PDF to start building lessons.</p>
          </div>
          <div>
            <p className="text-sm font-medium">Lessons & cards</p>
            <Progress value={55} className="mt-2" />
            <p className="mt-2 text-xs text-muted-foreground">Generate an outline to unlock flashcards.</p>
          </div>
          <div>
            <p className="text-sm font-medium">Daily practice</p>
            <Progress value={35} className="mt-2" />
            <p className="mt-2 text-xs text-muted-foreground">Review a few cards each day to stay consistent.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
