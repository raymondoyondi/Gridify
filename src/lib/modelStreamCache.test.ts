import { describe, it, expect } from "vitest";
import {
  cacheModel,
  loadModel,
  cacheQuantizedIndex,
  loadQuantizedIndex,
  invalidateModel,
  DEFAULT_CHUNK_SIZE,
} from "./modelStreamCache";
import { dequantizeBatch } from "./quantization";

describe("chunked, resumable model cache", () => {
  it("round-trips a model through chunked cache (in-memory fallback)", async () => {
    const data = new Uint8Array(700 * 1024).map((_, i) => i % 251);
    const manifest = await cacheModel("onnx-model", data.buffer.slice(0), {
      cacheName: "test-cache",
    });
    expect(manifest.totalChunks).toBeGreaterThan(1);

    const loaded = await loadModel("onnx-model", { cacheName: "test-cache" });
    expect(loaded).not.toBeNull();
    expect(loaded!.data.byteLength).toBe(data.length);
    const got = new Uint8Array(loaded!.data);
    expect(Array.from(got.slice(0, 8))).toEqual(Array.from(data.slice(0, 8)));
  });

  it("reports progress as chunks are fetched", async () => {
    const data = new Uint8Array(DEFAULT_CHUNK_SIZE * 2 + 10);
    await cacheModel("prog", data.buffer.slice(0), { cacheName: "test-cache" });
    const seen: number[] = [];
    await loadModel("prog", {
      cacheName: "test-cache",
      onProgress: (fetched) => seen.push(fetched),
    });
    expect(seen[seen.length - 1]).toBe(3);
  });

  it("persists and restores a quantized index", async () => {
    const index = [
      [1, 2, 3],
      [4, 5, 6],
    ];
    await cacheQuantizedIndex("semantic-index", index, {
      cacheName: "test-cache",
    });
    const restored = await loadQuantizedIndex("semantic-index", {
      cacheName: "test-cache",
    });
    expect(restored).not.toBeNull();
    const deq = dequantizeBatch(restored!);
    expect(deq).toHaveLength(2);
    expect(deq[0][0]).toBeCloseTo(1, 1);
  });

  it("returns null when no manifest is cached", async () => {
    const loaded = await loadModel("never-cached", { cacheName: "test-cache" });
    expect(loaded).toBeNull();
  });

  it("invalidates a model completely", async () => {
    const data = new Uint8Array(1024);
    await cacheModel("to-del", data.buffer.slice(0), {
      cacheName: "test-cache",
    });
    await invalidateModel("to-del", { cacheName: "test-cache" });
    expect(await loadModel("to-del", { cacheName: "test-cache" })).toBeNull();
  });
});
