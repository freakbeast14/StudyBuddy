import { AlertTriangle, UploadCloud } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { UploadForm } from "@/components/upload/upload-form";
import { IngestionSteps } from "@/components/upload/ingestion-steps";

export const metadata = {
  title: "Upload - StudyBuddy AI",
};

export default function UploadPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Upload a PDF</h1>
          <p className="text-muted-foreground">
            Files are stored locally under <code className="rounded bg-muted px-2 py-1">./data/uploads</code> and a
            PROCESS_DOCUMENT pg-boss job runs chunking, embeddings, and outline generation.
          </p>
        </div>
        <UploadCloud className="hidden h-10 w-10 text-primary sm:block" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Upload + enqueue</CardTitle>
            <CardDescription>
              Persist the PDF, capture metadata, and enqueue a job. Wire this form to an API route that writes to disk
              and publishes to pg-boss.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UploadForm />
          </CardContent>
        </Card>

        <Card className="bg-muted/40">
          <CardHeader>
            <CardTitle>Storage + job queue</CardTitle>
            <CardDescription>Local filesystem storage with a Postgres-backed queue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">Where files live</p>
              <p>./data/uploads/{"{documentId}"}.pdf</p>
            </div>
            <Separator />
            <div>
              <p className="font-medium text-foreground">Jobs</p>
              <p>pg-boss topic: PROCESS_DOCUMENT ? extracts pages ? chunks ? embeds ? outline/cards/quizzes.</p>
            </div>
            <Separator />
            <div className="flex items-start gap-2 rounded-lg border border-dashed p-3 text-xs">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
              <div>
                Ensure Postgres has
                <code className="mx-1 rounded bg-background px-1 py-0.5">CREATE EXTENSION IF NOT EXISTS vector;</code>
                and{" "}
                <code className="rounded bg-background px-1 py-0.5">
                  CREATE EXTENSION IF NOT EXISTS &quot;uuid-ossp&quot;;
                </code>
                applied.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <IngestionSteps />
    </div>
  );
}
