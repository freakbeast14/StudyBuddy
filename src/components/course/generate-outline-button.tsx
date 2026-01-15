"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";

interface GenerateOutlineButtonProps {
  courseId: string;
}

export function GenerateOutlineButton({ courseId }: GenerateOutlineButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleClick = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/courses/${courseId}/generate-outline`, { method: "POST" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Outline generation failed");
      }
      toast({ title: "Outline generated", description: "Concepts are ready for review.", variant: "success" });
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Outline generation failed";
      setErrorMessage(message);
      toast({ title: "Outline failed", description: message, variant: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button onClick={handleClick} disabled={isLoading}>
        {isLoading ? "Generating..." : "Generate Outline"}
      </Button>
      {errorMessage ? <p className="text-xs text-rose-500">{errorMessage}</p> : null}
    </div>
  );
}
