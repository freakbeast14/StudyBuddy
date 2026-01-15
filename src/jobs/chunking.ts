export interface PageChunk {
  pageNumber: number;
  text: string;
}

export interface ChunkDraft {
  pageNumber: number;
  content: string;
  tokenCount: number;
}

export function chunkPagesWithOverlap(pages: PageChunk[], chunkSize = 520, overlap = 80): ChunkDraft[] {
  const chunksOut: ChunkDraft[] = [];

  for (const page of pages) {
    const words = page.text.split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    const step = Math.max(chunkSize - overlap, 1);
    for (let i = 0; i < words.length; i += step) {
      const slice = words.slice(i, i + chunkSize);
      if (!slice.length) continue;
      const content = slice.join(" ");
      chunksOut.push({
        pageNumber: page.pageNumber,
        content,
        tokenCount: slice.length,
      });
    }
  }

  return chunksOut;
}
