import { describe, it, expect } from "vitest";
import {
  cosineSimilarity,
  hashEmbedding,
  HybridRAG,
  LOCAL_DOCUMENTS,
} from "./ragClient";

describe("ragClient vector math", () => {
  it("cosine similarity of identical vectors is 1", () => {
    const v = [1, 2, 3];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1);
  });

  it("cosine similarity of orthogonal vectors is ~0", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("returns 0 for empty vectors", () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it("hash embedding is deterministic and stable length", () => {
    const a = hashEmbedding("Temperature trends peak afternoon");
    const b = hashEmbedding("Temperature trends peak afternoon");
    expect(a).toEqual(b);
    expect(a).toHaveLength(64);
  });

  it("different texts produce different embeddings", () => {
    const a = hashEmbedding("proxy devices flow control");
    const b = hashEmbedding("node temperature latency investigation");
    expect(a).not.toEqual(b);
  });
});

describe("HybridRAG local matching", () => {
  it("builds an index from local documents and matches by topic", async () => {
    const rag = new HybridRAG();
    await rag.loadIndex(); // no CDN url → local docs
    expect(rag.size).toBe(LOCAL_DOCUMENTS.length);

    const hits = await rag.search("node temperature latency", 3);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].chunk.id).toBe("doc-node");
    expect(hits[0].score).toBeGreaterThan(0);
  });

  it("returns top-k results sorted by score", async () => {
    const rag = new HybridRAG();
    const hits = await rag.search("temperature", 2);
    expect(hits).toHaveLength(2);
    expect(hits[0].score).toBeGreaterThanOrEqual(hits[1].score);
  });
});
