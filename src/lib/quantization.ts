/**
 * Scalar quantization for edge-RAG embeddings.
 *
 * ONNX Runtime Web runs semantic pre-filtering on the client, but shipping
 * full `float32` embeddings for every chunk of the vector index is expensive
 * on mobile / slow networks ("Time to First Query"). We compress each vector to
 * `int8` with a per-vector scale (and shared zero-point 0), cutting payload and
 * cache size by ~4x with negligible loss for cosine pre-filtering.
 *
 * Dequantization restores an approximation of the original float32 vector so the
 * existing cosine-similarity math in `ragClient` is unchanged.
 */

export interface QuantizedVector {
  /** int8 coefficients, each in [0, 255]. */
  codes: Int8Array;
  /** scale used to map float32 -> int8. */
  scale: number;
  /** original minimum value (zero-point is 0). */
  min: number;
}

/** Quantize a single float32 vector to int8 (scalar / uniform quantization). */
export function quantizeVector(vec: ArrayLike<number>): QuantizedVector {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < vec.length; i++) {
    const v = vec[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const range = max - min;
  const scale = range > 0 ? range / 255 : 1;
  const codes = new Int8Array(vec.length);
  for (let i = 0; i < vec.length; i++) {
    const q = Math.round((vec[i] - min) / scale);
    codes[i] = Math.max(0, Math.min(255, q)) - 128;
  }
  return { codes, scale, min };
}

/** Restore an approximate float32 vector from its int8 codes. */
export function dequantizeVector(q: QuantizedVector): Float32Array {
  const out = new Float32Array(q.codes.length);
  for (let i = 0; i < q.codes.length; i++) {
    out[i] = (q.codes[i] + 128) * q.scale + q.min;
  }
  return out;
}

/** Quantize a batch of vectors (e.g. a full semantic index). */
export function quantizeBatch(vectors: number[][]): QuantizedVector[] {
  return vectors.map(quantizeVector);
}

/** Dequantize a batch of vectors. */
export function dequantizeBatch(vectors: QuantizedVector[]): number[][] {
  return vectors.map((v) => Array.from(dequantizeVector(v)));
}

/** Cosine similarity computed directly on int8 codes (avoids dequant round-trip). */
export function quantizedCosine(
  a: QuantizedVector,
  b: QuantizedVector,
): number {
  const n = Math.min(a.codes.length, b.codes.length);
  if (n === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    const x = a.codes[i];
    const y = b.codes[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Estimate the storage reduction of int8 vs float32 for a batch.
 * Returns the byte size before and after quantization.
 */
export function storageEstimate(vectors: number[][]): {
  float32Bytes: number;
  int8Bytes: number;
  ratio: number;
} {
  const float32Bytes = vectors.length * (vectors[0]?.length ?? 0) * 4;
  const int8Bytes = vectors.length * (vectors[0]?.length ?? 0);
  const ratio = float32Bytes > 0 ? float32Bytes / int8Bytes : 1;
  return { float32Bytes, int8Bytes, ratio };
}
