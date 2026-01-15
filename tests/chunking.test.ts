import { describe, expect, it } from "vitest";
import { chunkPagesWithOverlap } from "@/jobs/chunking";

describe("chunkPagesWithOverlap", () => {
  it("creates overlapping chunks per page", () => {
    const pages = [
      {
        pageNumber: 1,
        text: "one two three four five six seven eight nine",
      },
    ];

    const chunks = chunkPagesWithOverlap(pages, 4, 1);

    expect(chunks.map((chunk) => chunk.content)).toEqual([
      "one two three four",
      "four five six seven",
      "seven eight nine",
    ]);
    expect(chunks.map((chunk) => chunk.pageNumber)).toEqual([1, 1, 1]);
  });
});
