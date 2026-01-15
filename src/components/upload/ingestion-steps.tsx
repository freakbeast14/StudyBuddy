import { CheckCircle2, LucideIcon, Sparkles, Workflow } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const steps: { title: string; description: string; icon: LucideIcon }[] = [
  {
    title: "Extract PDF text",
    description: "Parse pages with page numbers to keep citations intact before chunking.",
    icon: Workflow,
  },
  {
    title: "Chunk + embed",
    description: "Overlap-aware chunks ? OpenAI embeddings ? pgvector stored in Postgres.",
    icon: Sparkles,
  },
  {
    title: "Generate outline/cards",
    description: "RAG over chunks to draft modules, lessons, concepts, cards, and quizzes.",
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
            Outputs stay grounded with page numbers and chunk ids for every asset.
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
