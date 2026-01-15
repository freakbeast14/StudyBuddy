"use client";

import { useEffect, useMemo, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Copy, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface ChunkRow {
  id: string;
  documentId: string;
  pageNumber: number;
  content: string;
  chunkIndex: number;
}

interface SourceDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chunkIds: string[];
  initialPage?: number;
}

export function SourceDrawer({ open, onOpenChange, chunkIds, initialPage }: SourceDrawerProps) {
  const [chunks, setChunks] = useState<ChunkRow[]>([]);
  const [currentPage, setCurrentPage] = useState<number | null>(initialPage ?? null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);

  useEffect(() => {
    if (!open || chunkIds.length === 0) return;
    setLoading(true);
    fetch("/api/chunks/by-ids", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: chunkIds }),
    })
      .then((res) => res.json())
      .then((data: ChunkRow[]) => {
        setChunks(data);
        const docId = data[0]?.documentId ?? null;
        setDocumentId(docId);
        const minPage = data.reduce((min, chunk) => Math.min(min, chunk.pageNumber), data[0]?.pageNumber ?? 1);
        setCurrentPage(initialPage ?? minPage ?? 1);
      })
      .finally(() => setLoading(false));
  }, [open, chunkIds, initialPage]);

  const pageNumbers = useMemo(() => Array.from(new Set(chunks.map((chunk) => chunk.pageNumber))), [chunks]);
  const citationText = useMemo(() => {
    const pages = pageNumbers.join(", ");
    return `chunks: ${chunkIds.join(", ")} | pages: ${pages}`;
  }, [chunkIds, pageNumbers]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(citationText);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-6xl">
        <SheetHeader>
          <SheetTitle>Source citations</SheetTitle>
          <SheetDescription>Review the cited chunks and jump to the exact page in the PDF.</SheetDescription>
        </SheetHeader>
        <div className="grid h-full grid-rows-[auto_1fr] gap-4 px-6 py-4 lg:grid-cols-[1.4fr_1fr] lg:grid-rows-1">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy} disabled={!chunks.length}>
                <Copy className="mr-2 h-4 w-4" />
                Copy citation
              </Button>
              {pageNumbers.map((page) => (
                <Button key={page} variant="ghost" size="sm" onClick={() => setCurrentPage(page)}>
                  Page {page}
                </Button>
              ))}
            </div>
            <div className="flex-1 overflow-auto rounded-lg border bg-muted/30 p-3">
              {loading || !documentId ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading PDF...
                </div>
              ) : (
                <Document
                  file={`/api/documents/${documentId}/file`}
                  onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                  loading={
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading PDF...
                    </div>
                  }
                >
                  <Page pageNumber={currentPage ?? 1} width={520} renderTextLayer={false} />
                </Document>
              )}
              {numPages ? (
                <p className="mt-2 text-xs text-muted-foreground">Page {currentPage ?? 1} of {numPages}</p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col gap-3 overflow-auto">
            {chunks.map((chunk) => (
              <Card key={chunk.id} className="border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">Page {chunk.pageNumber}</Badge>
                  <Badge variant="secondary">Chunk {chunk.chunkIndex}</Badge>
                </div>
                <p className="mt-3 text-muted-foreground">{chunk.content}</p>
              </Card>
            ))}
            {!chunks.length && !loading ? (
              <p className="text-sm text-muted-foreground">No chunks found for this citation.</p>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
