"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { JOBS } from "@/jobs/types";

interface UploadFormState {
  courseId: string;
  title: string;
  file: File | null;
}

interface CourseRow {
  id: string;
  title: string;
}

interface DocumentRow {
  id: string;
  title: string;
  status: "pending" | "processing" | "ready" | "failed";
  createdAt: string;
  errorMessage?: string | null;
}

type UploadStatus = "idle" | "uploading" | "queued" | "error";

const statusStyles: Record<DocumentRow["status"], { label: string; className: string }> = {
  pending: { label: "Pending", className: "border-amber-500/30 text-amber-600" },
  processing: { label: "Processing", className: "border-sky-500/30 text-sky-600" },
  ready: { label: "Ready", className: "border-emerald-500/30 text-emerald-600" },
  failed: { label: "Failed", className: "border-rose-500/30 text-rose-600" },
};

export function UploadForm() {
  const [state, setState] = useState<UploadFormState>({
    courseId: "",
    title: "New PDF",
    file: null,
  });
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [courseError, setCourseError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);

  const progress = useMemo(() => {
    switch (uploadStatus) {
      case "uploading":
        return 40;
      case "queued":
        return 70;
      default:
        return 0;
    }
  }, [uploadStatus]);

  const fetchCourses = useCallback(async () => {
    const response = await fetch("/api/courses", { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as CourseRow[];
    setCourses(data);
    setState((prev) => {
      if (prev.courseId || !data.length) return prev;
      return { ...prev, courseId: data[0].id };
    });
  }, []);

  const fetchDocuments = useCallback(async () => {
    const response = await fetch("/api/documents", { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as DocumentRow[];
    setDocuments(data);
    if (!activeDocumentId) return;
    const activeDoc = data.find((doc) => doc.id === activeDocumentId);
    if (!activeDoc) return;
    if (activeDoc.status === "ready") {
      setUploadStatus("idle");
      setActiveDocumentId(null);
    } else if (activeDoc.status === "failed") {
      setUploadStatus("error");
      setActiveDocumentId(null);
      if (activeDoc.errorMessage) {
        setErrorMessage(activeDoc.errorMessage);
      }
    }
  }, [activeDocumentId]);

  useEffect(() => {
    fetchDocuments();
    fetchCourses();
  }, [fetchDocuments, fetchCourses]);

  useEffect(() => {
    const hasActive = documents.some((doc) => doc.status === "processing" || doc.status === "pending");
    if (!hasActive) return;
    const interval = setInterval(fetchDocuments, 3000);
    return () => clearInterval(interval);
  }, [documents, fetchDocuments]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!state.file) {
      setErrorMessage("Choose a PDF before uploading.");
      return;
    }
    if (!state.courseId) {
      setErrorMessage("Select a course before uploading.");
      return;
    }

    setUploadStatus("uploading");
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", state.file);
      formData.append("title", state.title);
      formData.append("courseId", state.courseId);

      const response = await fetch("/api/upload", { method: "POST", body: formData });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Upload failed");
      }

      const payload = (await response.json()) as { documentId: string };
      setUploadStatus("queued");
      setActiveDocumentId(payload.documentId);
      await fetchDocuments();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      setUploadStatus("error");
      setErrorMessage(message);
    }
  };

  const handleCreateCourse = async () => {
    if (!newCourseTitle.trim()) {
      setCourseError("Enter a course title.");
      return;
    }
    setIsCreatingCourse(true);
    setCourseError(null);
    try {
      const response = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newCourseTitle.trim() }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to create course");
      }
      const created = (await response.json()) as CourseRow;
      setCourses((prev) => [created, ...prev]);
      setState((prev) => ({ ...prev, courseId: created.id }));
      setNewCourseTitle("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create course";
      setCourseError(message);
    } finally {
      setIsCreatingCourse(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-3">
          <Label htmlFor="course">Course</Label>
          <select
            id="course"
            value={state.courseId}
            onChange={(e) => setState((prev) => ({ ...prev, courseId: e.target.value }))}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            required
          >
            <option value="" disabled>
              {courses.length ? "Select a course" : "No courses yet"}
            </option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id="new-course"
              value={newCourseTitle}
              onChange={(e) => setNewCourseTitle(e.target.value)}
              placeholder="New course title"
            />
            <Button type="button" variant="outline" onClick={handleCreateCourse} disabled={isCreatingCourse}>
              {isCreatingCourse ? "Creating..." : "Create course"}
            </Button>
          </div>
          {courseError ? <p className="text-xs text-rose-500">{courseError}</p> : null}
        </div>
        <div className="grid gap-3">
          <Label htmlFor="title">Document title</Label>
          <Input
            id="title"
            value={state.title}
            onChange={(e) => setState((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="My PDF"
          />
        </div>
        <div className="grid gap-3">
          <Label htmlFor="file">Upload PDF</Label>
          <div className="flex items-center gap-3 rounded-lg border border-dashed p-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <Input
              id="file"
              type="file"
              accept="application/pdf"
              onChange={(e) => setState((prev) => ({ ...prev, file: e.target.files?.[0] ?? null }))}
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Files are saved to{" "}
            <code className="rounded bg-muted px-1 py-0.5">./data/uploads/{"{documentId}"}.pdf</code> then a{" "}
            <code className="rounded bg-muted px-1 py-0.5">{JOBS.PROCESS_DOCUMENT}</code> job is enqueued.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-lg border p-3 text-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            {uploadStatus === "queued" ? (
              <Send className="h-5 w-5" />
            ) : uploadStatus === "uploading" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <FileText className="h-5 w-5" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-medium">
              Status: {uploadStatus === "idle" ? "not started" : uploadStatus === "queued" ? "queued" : uploadStatus}
            </p>
            <Progress value={progress} className="mt-2" />
          </div>
          <div className="text-right text-xs text-muted-foreground">{state.file?.name ?? "Select a PDF"}</div>
        </div>

        {errorMessage ? <p className="text-sm text-rose-500">{errorMessage}</p> : null}

        <Button type="submit" className="w-full" disabled={uploadStatus === "uploading"}>
          {uploadStatus === "idle" && "Upload & enqueue"}
          {uploadStatus === "uploading" && "Uploading..."}
          {uploadStatus === "queued" && "Queued..."}
          {uploadStatus === "error" && "Try again"}
        </Button>
      </form>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Recent uploads</p>
          <p className="text-xs text-muted-foreground">{documents.length} total</p>
        </div>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No uploads yet. Drop a PDF to start ingestion.</p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => {
              const status = statusStyles[doc.status];
              return (
                <div key={doc.id} className="flex items-start justify-between gap-4 rounded-lg border p-3 text-sm">
                  <div>
                    <p className="font-medium">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(doc.createdAt).toLocaleString()}
                    </p>
                    {doc.status === "failed" && doc.errorMessage ? (
                      <p className="mt-1 text-xs text-rose-500">{doc.errorMessage}</p>
                    ) : null}
                  </div>
                  <Badge variant="outline" className={status.className}>
                    {status.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
