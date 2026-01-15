"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";

interface ShareLinkButtonProps {
  courseId: string;
}

export function ShareLinkButton({ courseId }: ShareLinkButtonProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/courses/${courseId}/share`, { method: "POST" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to generate share link");
      }
      const data = (await response.json()) as { url: string };
      setShareUrl(data.url);
      await navigator.clipboard.writeText(data.url);
      toast({ title: "Share link copied", description: "Paste it anywhere to share.", variant: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate share link";
      setErrorMessage(message);
      toast({ title: "Share failed", description: message, variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button variant="outline" onClick={handleGenerate} disabled={loading}>
        <Share2 className="mr-2 h-4 w-4" />
        {loading ? "Creating..." : "Share"}
      </Button>
      {shareUrl ? <p className="text-xs text-muted-foreground">Copied: {shareUrl}</p> : null}
      {errorMessage ? <p className="text-xs text-rose-500">{errorMessage}</p> : null}
    </div>
  );
}
