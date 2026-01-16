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
    <Card>
      <CardHeader>
        <CardTitle>What happens after upload</CardTitle>
        <CardDescription>Follow the steps as your material is prepared.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.title} className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                <step.icon className="h-4 w-4" />
              </div>
              {index < steps.length - 1 ? <div className="mt-2 h-8 w-px bg-border" /> : null}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{step.title}</p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
