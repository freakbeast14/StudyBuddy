"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";

export function CourseExportButton({ courseId }: { courseId: string }) {
  const { toast } = useToast();

  return (
    <Button
      variant="outline"
      onClick={() => {
        toast({ title: "Export started", description: "Downloading CSV file.", variant: "info" });
        window.location.href = `/api/courses/${courseId}/export`;
      }}
    >
      Export flashcards
    </Button>
  );
}
