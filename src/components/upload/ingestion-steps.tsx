import { CheckCircle2, LucideIcon, Sparkles, Workflow } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const steps: { title: string; description: string; icon: LucideIcon }[] = [
  {
    title: "We read your pages",
    description: "Each page is processed so we can link every answer back to its source.",
    icon: Workflow,
  },
  {
    title: "We organize the ideas",
    description: "Lessons and concepts appear in a clear outline, ready to explore.",
    icon: Sparkles,
  },
  {
    title: "We prepare practice",
    description: "Flashcards and quizzes are generated so you can start reviewing fast.",
    icon: CheckCircle2,
  },
];

export function IngestionSteps() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {steps.map((step) => (
        <Card key={step.title}>
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <step.icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">{step.title}</CardTitle>
              <CardDescription>{step.description}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Sources stay visible, so every card and quiz points back to the PDF.
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
