/**
 * Hybrid RAG — in-browser semantic matching with ONNX embeddings.
 *
 * The full retrieval pipeline keeps semantic indices cached globally on a CDN and
 * the heavy vector store lives in the cloud (Chroma). But the *matching* step is
 * cheap and latency-sensitive, so we run it locally: a lightweight ONNX
 * embedding model (loaded from a CDN) turns the user query into a vector right
 * here in the browser, we cosine-match it against the cached index, and only the
 * top-k hits (or cache misses) are forwarded to the cloud Chroma instances.
 *
 * When no ONNX model is configured (or the WASM runtime is unavailable) we fall
 * back to a deterministic hashing embedder so the local matching path always
 * works — including in unit tests and offline mode.
 *
 * ONNX inference runs inside a dedicated Web Worker so matrix calculations never
 * block the main UI thread.
 */

import { cacheQuantizedIndex, loadQuantizedIndex } from "./modelStreamCache";
import { dequantizeBatch } from "./quantization";

export interface RAGChunk {
  id: string;
  text: string;
  /** Pre-computed embedding; computed lazily when the index is loaded. */
  embedding?: number[];
}

export interface RAGResult {
  chunk: RAGChunk;
  score: number;
}

const DEFAULT_DIM = 64;

/** Cosine similarity between two equal-length vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Deterministic, dependency-free embedding. A word-hashing bag-of-tokens
 * projected into `dim` buckets. Not semantically rich, but stable and good
 * enough for local pre-filtering before the cloud Chroma lookup.
 */
export function hashEmbedding(
  text: string,
  dim: number = DEFAULT_DIM,
): number[] {
  const vec = new Array<number>(dim).fill(0);
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  for (const tok of tokens) {
    let h = 2166136261;
    for (let i = 0; i < tok.length; i++) {
      h ^= tok.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const bucket = Math.abs(h) % dim;
    vec[bucket] += 1;
    if (tok.charCodeAt(0) % 2 === 0) vec[bucket] *= -1;
  }
  return vec;
}

/**
 * ONNX-backed embedder running inside a dedicated Web Worker. The model is
 * loaded lazily from a CDN URL; until then (or if loading fails) it
 * transparently uses the hashing embedder.
 */
export class ONNXEmbedder {
  private worker: Worker | null = null;
  private loading: Promise<void> | null = null;
  private readonly modelUrl?: string;
  readonly dim: number;
  private nextId = 0;
  private pending = new Map<
    number,
    {
      resolve: (v: number[][]) => void;
      reject: (e: Error) => void;
    }
  >();

  constructor(opts: { modelUrl?: string; dim?: number } = {}) {
    this.modelUrl = opts.modelUrl;
    this.dim = opts.dim ?? DEFAULT_DIM;
  }

  async ready(): Promise<boolean> {
    if (!this.modelUrl) return false;
    if (this.worker) return true;
    if (!this.loading) {
      this.loading = this._loadWorker();
    }
    try {
      await this.loading;
    } catch {
      this.loading = null;
      this.worker = null;
      return false;
    }
    return this.worker !== null;
  }

  private _loadWorker(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.worker = new Worker(new URL("./onnxWorker.ts", import.meta.url), {
          type: "module",
        });
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
        return;
      }

      this.worker.onmessage = (
        e: MessageEvent<{
          type: string;
          requestId: number;
          embeddings?: number[][];
          error?: string;
        }>,
      ) => {
        const { type, requestId, embeddings, error } = e.data;
        const pending = this.pending.get(requestId);
        if (!pending) return;
        this.pending.delete(requestId);

        if (type === "ready" || type === "result") {
          pending.resolve(embeddings ?? []);
          if (type === "ready") resolve();
        } else if (type === "error") {
          pending.reject(new Error(error ?? "ONNX worker error"));
          if (this.loading) resolve();
        }
      };

      this.worker.onerror = (err) => {
        const message = err?.message ?? "Worker failed to start";
        const pending = this.pending.get(this.nextId - 1);
        if (pending) {
          this.pending.delete(this.nextId - 1);
          pending.reject(new Error(message));
        }
        if (this.loading) {
          reject(new Error(message));
        } else {
          this.worker = null;
        }
      };

      const id = this.nextId++;
      this.pending.set(id, {
        resolve: () => resolve(),
        reject: (e) => reject(e),
      });
      this.worker.postMessage({
        type: "init",
        requestId: id,
        modelUrl: this.modelUrl,
        modelDim: this.dim,
      });
    });
  }

  /** Embed one or more texts. Uses ONNX worker when available, else hashing. */
  async embed(texts: string[]): Promise<number[][]> {
    if (!this.worker) {
      return texts.map((t) => hashEmbedding(t, this.dim));
    }

    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      this.pending.set(id, { resolve, reject });
      this.worker!.postMessage({ type: "embed", requestId: id, texts });
    });
  }
}

/** Local knowledge base used to build an index when the CDN cache is cold. */
export const LOCAL_DOCUMENTS: RAGChunk[] = [
  {
    id: "doc-temperature",
    text: "Temperature trends show normal cyclical variance with peak loads during afternoon operations.",
  },
  {
    id: "doc-proxy",
    text: "Proxy devices maintain stable active flow control states with minor load offsets.",
  },
  {
    id: "doc-node",
    text: "Marchival Arc node shows slightly higher average node temperature latency and should be investigated.",
  },
  {
    id: "doc-uptime",
    text: "System uptime is steady at three hours ten minutes aggregate uptime with zero hard reboots.",
  },
  {
    id: "doc-load",
    text: "Home Hub averages two point three thousand loads with optimal sensor load values.",
  },
];

/**
 * The hybrid retriever. Loads (or builds) a cached semantic index and runs
 * client-side vector matching before anything is sent to the cloud Chroma.
 */
export class HybridRAG {
  private index: RAGChunk[] = [];
  private embedder: ONNXEmbedder;

  constructor(opts: { modelUrl?: string; dim?: number } = {}) {
    this.embedder = new ONNXEmbedder(opts);
  }

  /** Build an in-memory index from local documents (CDN cache is cold). */
  private async _buildFromLocal(): Promise<void> {
    const embeddings = await this.embedder.embed(
      LOCAL_DOCUMENTS.map((d) => d.text),
    );
    this.index = LOCAL_DOCUMENTS.map((d, i) => ({
      ...d,
      embedding: embeddings[i],
    }));
  }

  /**
   * Load the cached semantic index. On a warm cache we restore the *quantized*
   * index (int8) from the Cache Storage API so no ONNX re-embedding happens on
   * page refresh. On a cold cache we build/load embeddings and persist a
   * quantized copy for next time.
   */
  async loadIndex(remoteUrl?: string): Promise<void> {
    if (this.index.length > 0) return;

    const cached = await loadQuantizedIndex("semantic-index");
    if (cached) {
      const embeddings = dequantizeBatch(cached);
      this.index = LOCAL_DOCUMENTS.map((d, i) => ({
        ...d,
        embedding: embeddings[i] ?? hashEmbedding(d.text, this.embedder.dim),
      }));
      return;
    }

    if (remoteUrl) {
      try {
        const res = await fetch(remoteUrl, {
          headers: { Accept: "application/json" },
        });
        if (res.ok) {
          const payload = (await res.json()) as { chunks?: RAGChunk[] };
          if (payload.chunks?.length) {
            const needEmbed = payload.chunks.filter((c) => !c.embedding);
            if (needEmbed.length) {
              const emb = await this.embedder.embed(
                needEmbed.map((c) => c.text),
              );
              let i = 0;
              for (const c of payload.chunks) {
                if (!c.embedding) c.embedding = emb[i++];
              }
            }
            this.index = payload.chunks;
            await this._persistQuantizedIndex();
            return;
          }
        }
      } catch {
        // fall through to local build
      }
    }
    await this._buildFromLocal();
    await this._persistQuantizedIndex();
  }

  /** Quantize the current index to int8 and cache it for resumable reloads. */
  private async _persistQuantizedIndex(): Promise<void> {
    if (this.index.length === 0) return;
    const vectors = this.index.map(
      (c) => c.embedding ?? hashEmbedding(c.text, this.embedder.dim),
    );
    try {
      await cacheQuantizedIndex("semantic-index", vectors);
    } catch {
      // Cache Storage unavailable (e.g. SSR) — ignore; reload will rebuild.
    }
  }

  /** Local cosine-match. Returns the top-k chunks for the query. */
  async search(query: string, k = 3): Promise<RAGResult[]> {
    if (this.index.length === 0) await this.loadIndex();
    const [qvec] = await this.embedder.embed([query]);
    return this.index
      .map((chunk) => ({
        chunk,
        score: chunk.embedding ? cosineSimilarity(qvec, chunk.embedding) : 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  get size(): number {
    return this.index.length;
  }
}

/** Shared singleton for the app. */
export const hybridRAG = new HybridRAG();
