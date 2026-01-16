import { FileUp, Sparkles } from "lucide-react";
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
          <h1 className="text-3xl font-semibold">Upload your study material</h1>
          <p className="text-muted-foreground">
            Add a PDF and we will turn it into a clean outline, flashcards, and quizzes you can review every day.
          </p>
        </div>
        <FileUp className="hidden h-10 w-10 text-primary sm:block" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Upload your PDF</CardTitle>
            <CardDescription>Choose a course, add a title, and we will handle the rest.</CardDescription>
          </CardHeader>
          <CardContent>
            <UploadForm />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-white/70">
            <CardHeader>
              <CardTitle>What happens next</CardTitle>
              <CardDescription>StudyBuddy prepares your material for learning.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-3 rounded-lg border border-white/70 bg-white/70 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">We read and organize your PDF</p>
                  <p>Key ideas are grouped into lessons and concepts you can follow.</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="font-medium text-foreground">We create practice materials</p>
                <p>Flashcards and quizzes are generated with clear source links.</p>
              </div>
            </CardContent>
          </Card>
          <IngestionSteps />
        </div>
      </div>
    </div>
  );
}
