/**
 * Chunked, resumable delivery of edge model + vector-index assets.
 *
 * Downloading the ONNX model and the full vector index to a mobile browser
 * introduces a noticeable "Time to First Query" delay, and re-downloading them
 * on every page refresh compounds it. This module:
 *
 *  1. Splits a payload into fixed-size chunks and persists them through the
 *     Cache Storage API (so they survive refreshes and are served offline).
 *  2. Supports *resume*: only missing chunks are fetched, so a partial/broken
 *     cache is repaired incrementally rather than re-downloaded wholesale.
 *  3. Falls back to an in-memory store when `caches` is unavailable (e.g. SSR
 *     or unit tests), keeping the same chunked contract.
 *
 * Pair this with `quantization.ts` (int8 embeddings) to shrink the index itself.
 */

import { quantizeBatch, QuantizedVector } from "./quantization";

export const DEFAULT_CHUNK_SIZE = 256 * 1024; // 256 KiB

export interface ModelManifest {
  name: string;
  totalChunks: number;
  totalBytes: number;
  chunkSize: number;
  etag: string;
  /** Optional quantized semantic index accompanying the model. */
  quantizedIndex?: QuantizedVector[];
}

// --------------------------------------------------------------------------- //
// Pluggable backing store
// --------------------------------------------------------------------------- //
interface ChunkStore {
  put(key: string, value: ArrayBuffer): Promise<void>;
  get(key: string): Promise<ArrayBuffer | null>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

/** Cache Storage API backing store (browser / worker). */
class CacheStorageStore implements ChunkStore {
  constructor(private readonly cacheName: string) {}

  private async _cache() {
    if (typeof caches === "undefined") {
      throw new Error("Cache Storage API unavailable");
    }
    return caches.open(this.cacheName);
  }

  async put(key: string, value: ArrayBuffer): Promise<void> {
    const cache = await this._cache();
    await cache.put(
      key,
      new Response(value, {
        headers: { "Content-Type": "application/octet-stream" },
      })
    );
  }

  async get(key: string): Promise<ArrayBuffer | null> {
    const cache = await this._cache();
    const res = await cache.match(key);
    return res ? res.arrayBuffer() : null;
  }

  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }

  async delete(key: string): Promise<void> {
    const cache = await this._cache();
    await cache.delete(key);
  }

  async keys(): Promise<string[]> {
    const cache = await this._cache();
    return (await cache.keys()).map((req) => req.url);
  }
}

/** In-memory fallback store (Node / SSR / tests). */
class MemoryStore implements ChunkStore {
  private map = new Map<string, ArrayBuffer>();

  async put(key: string, value: ArrayBuffer): Promise<void> {
    this.map.set(key, value);
  }
  async get(key: string): Promise<ArrayBuffer | null> {
    return this.map.get(key) ?? null;
  }
  async has(key: string): Promise<boolean> {
    return this.map.has(key);
  }
  async delete(key: string): Promise<void> {
    this.map.delete(key);
  }
  async keys(): Promise<string[]> {
    return [...this.map.keys()];
  }
}

function makeStore(cacheName: string): ChunkStore {
  try {
    if (typeof caches !== "undefined") return new CacheStorageStore(cacheName);
  } catch {
    /* fall through */
  }
  return new MemoryStore();
}

// --------------------------------------------------------------------------- //
// Chunked model caching
// --------------------------------------------------------------------------- //
function chunkKey(name: string, index: number): string {
  return `gridify:model:${name}:chunk:${index}`;
}
function manifestKey(name: string): string {
  return `gridify:model:${name}:manifest`;
}

function simpleEtag(data: ArrayBuffer): string {
  let h = 2166136261;
  const bytes = new Uint8Array(data);
  const step = Math.max(1, Math.floor(bytes.length / 1024));
  for (let i = 0; i < bytes.length; i += step) {
    h ^= bytes[i];
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

/** Persist a model payload as resumable chunks. Returns the written manifest. */
export async function cacheModel(
  name: string,
  data: ArrayBuffer,
  opts: { cacheName?: string; chunkSize?: number } = {}
): Promise<ModelManifest> {
  const chunkSize = opts.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const store = makeStore(opts.cacheName ?? "gridify-models");
  const totalChunks = Math.max(1, Math.ceil(data.byteLength / chunkSize));

  const chunks: ArrayBuffer[] = [];
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    chunks.push(data.slice(start, start + chunkSize));
  }

  const manifest: ModelManifest = {
    name,
    totalChunks,
    totalBytes: data.byteLength,
    chunkSize,
    etag: simpleEtag(data),
  };

  for (let i = 0; i < totalChunks; i++) {
    await store.put(chunkKey(name, i), chunks[i]);
  }
  await store.put(manifestKey(name), encodeJSON(manifest));
  return manifest;
}

/** Cache a quantized semantic index alongside the model (no re-embed on reload). */
export async function cacheQuantizedIndex(
  name: string,
  index: number[][],
  opts: { cacheName?: string } = {}
): Promise<ModelManifest> {
  const store = makeStore(opts.cacheName ?? "gridify-models");
  const quantized = quantizeBatch(index);
  const manifest: ModelManifest = {
    name,
    totalChunks: 1,
    totalBytes: index.length,
    chunkSize: 1,
    etag: String(index.length),
    quantizedIndex: quantized,
  };
  await store.put(manifestKey(name), encodeJSON(manifest));
  return manifest;
}

/**
 * Load a chunked model, resuming only the chunks that are missing from cache.
 * Calls `onProgress` with the count of chunks fetched so far. Returns the
 * reassembled payload, or `null` if no manifest is cached.
 */
export async function loadModel(
  name: string,
  opts: {
    cacheName?: string;
    onProgress?: (fetched: number, total: number) => void;
    fetchChunk?: (
      name: string,
      index: number,
      manifest: ModelManifest
    ) => Promise<ArrayBuffer | null>;
  } = {}
): Promise<{ data: ArrayBuffer; manifest: ModelManifest } | null> {
  const store = makeStore(opts.cacheName ?? "gridify-models");
  const manifestBuf = await store.get(manifestKey(name));
  if (!manifestBuf) return null;
  const manifest = decodeJSON<ModelManifest>(manifestBuf);

  const out = new Uint8Array(manifest.totalBytes);
  let fetched = 0;
  for (let i = 0; i < manifest.totalChunks; i++) {
    let chunk = await store.get(chunkKey(name, i));
    if (!chunk) {
      // Hook for a remote fetch; callers may override `fetchChunk`.
      chunk = (await opts.fetchChunk?.(name, i, manifest)) ?? null;
      if (!chunk) throw new Error(`Missing chunk ${i} for model ${name}`);
      await store.put(chunkKey(name, i), chunk);
    }
    out.set(new Uint8Array(chunk), i * manifest.chunkSize);
    fetched++;
    opts.onProgress?.(fetched, manifest.totalChunks);
  }
  return { data: out.buffer, manifest };
}

/** Read a previously cached quantized index, if present. */
export async function loadQuantizedIndex(
  name: string,
  opts: { cacheName?: string } = {}
): Promise<QuantizedVector[] | null> {
  const store = makeStore(opts.cacheName ?? "gridify-models");
  const manifestBuf = await store.get(manifestKey(name));
  if (!manifestBuf) return null;
  const manifest = decodeJSON<ModelManifest>(manifestBuf);
  return manifest.quantizedIndex ?? null;
}

/** Clear one model's chunks + manifest from the cache. */
export async function invalidateModel(
  name: string,
  opts: { cacheName?: string } = {}
): Promise<void> {
  const store = makeStore(opts.cacheName ?? "gridify-models");
  const manifestBuf = await store.get(manifestKey(name));
  if (manifestBuf) {
    const manifest = decodeJSON<ModelManifest>(manifestBuf);
    for (let i = 0; i < manifest.totalChunks; i++) {
      await store.delete(chunkKey(name, i));
    }
  }
  await store.delete(manifestKey(name));
}

function encodeJSON(value: unknown): ArrayBuffer {
  const text = JSON.stringify(value);
  const buf = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) buf[i] = text.charCodeAt(i);
  return buf.buffer;
}

function decodeJSON<T>(buf: ArrayBuffer): T {
  const bytes = new Uint8Array(buf);
  let text = "";
  for (let i = 0; i < bytes.length; i++) text += String.fromCharCode(bytes[i]);
  return JSON.parse(text) as T;
}
