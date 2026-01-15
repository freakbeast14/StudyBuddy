import fs from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { chunks, documents } from "@/db/schema";
import { env } from "@/env";
import { chunkPagesWithOverlap, type PageChunk } from "@/jobs/chunking";
import { JOBS, type ProcessDocumentPayload } from "./types";

interface ChunkInsert {
  documentId: string;
  chunkIndex: number;
  pageNumber: number;
  content: string;
  embedding: number[] | null;
  tokenCount: number;
}

export async function processDocumentJob(payload: ProcessDocumentPayload) {
  const { documentId } = payload;
  const filePath = payload.path && path.isAbsolute(payload.path)
    ? payload.path
    : path.join(env.DATA_DIR, "uploads", `${documentId}.pdf`);

  await db
    .update(documents)
    .set({ status: "processing", errorMessage: null, updatedAt: new Date() })
    .where(eq(documents.id, documentId));

  try {
    await fs.access(filePath);

    const pages = await extractTextWithPages(filePath);
    const chunkDrafts = chunkPagesWithOverlap(pages, 520, 80);
    const chunked: ChunkInsert[] = chunkDrafts.map((chunk, idx) => ({
      documentId,
      chunkIndex: idx,
      pageNumber: chunk.pageNumber,
      content: chunk.content,
      embedding: null,
      tokenCount: chunk.tokenCount,
    }));
    const embedded = await embedChunks(chunked);

    if (embedded.length) {
      await db.insert(chunks).values(embedded);
    }

    await db
      .update(documents)
      .set({
        status: "ready",
        pageCount: pages.length,
        chunkCount: embedded.length,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    return { job: JOBS.PROCESS_DOCUMENT, chunkCount: embedded.length, pageCount: pages.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown ingestion error";
    await db
      .update(documents)
      .set({ status: "failed", errorMessage: message, updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    throw error;
  }
}

async function extractTextWithPages(filePath: string): Promise<PageChunk[]> {
  const data = await fs.readFile(filePath);
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.js");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(data),
    disableWorker: true,
  });
  const pdf = await loadingTask.promise;
  const pages: PageChunk[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) continue;
    pages.push({ pageNumber, text });
  }

  return pages;
}

async function embedChunks(chunkInserts: ChunkInsert[]): Promise<ChunkInsert[]> {
  if (!chunkInserts.length) return [];

  const batchSize = 64;
  const output: ChunkInsert[] = [];

  for (let i = 0; i < chunkInserts.length; i += batchSize) {
    const batch = chunkInserts.slice(i, i + batchSize);
    const embeddings = await fetchEmbeddings(batch.map((chunk) => chunk.content));
    output.push(
      ...batch.map((chunk, index) => ({
        ...chunk,
        embedding: embeddings[index] ?? null,
      }))
    );
  }

  return output;
}

async function fetchEmbeddings(inputs: string[]): Promise<number[][]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.OPENAI_EMBED_MODEL,
      input: inputs,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI embeddings failed: ${response.status} ${message}`);
  }

  const data = (await response.json()) as { data: Array<{ embedding: number[] }> };
  return data.data.map((item) => item.embedding);
}
