import * as ort from "onnxruntime-web";

let session: ort.InferenceSession | null = null;
let inputName = "";
let outputName = "";
let dim = 64;

async function init(modelUrl: string, modelDim = 64): Promise<void> {
  dim = modelDim;
  session = await ort.InferenceSession.create(modelUrl, {
    executionProviders: ["wasm"],
  });
  inputName = session.inputNames[0];
  outputName = session.outputNames[0];
}

/** Quantize a float32 embedding to int8 to shrink the worker -> main payload. */
function quantize(
  vec: ArrayLike<number>
): { codes: number[]; scale: number; min: number } {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < vec.length; i++) {
    const v = vec[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const scale = max - min > 0 ? (max - min) / 255 : 1;
  const codes: number[] = [];
  for (let i = 0; i < vec.length; i++) {
    const q = Math.round((vec[i] - min) / scale);
    codes.push(Math.max(0, Math.min(255, q)) - 128);
  }
  return { codes, scale, min };
}

function hashEmbedding(text: string, modelDim: number): number[] {
  const vec = new Array<number>(modelDim).fill(0);
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  for (const tok of tokens) {
    let h = 2166136261;
    for (let i = 0; i < tok.length; i++) {
      h ^= tok.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const bucket = Math.abs(h) % modelDim;
    vec[bucket] += 1;
    if (tok.charCodeAt(0) % 2 === 0) vec[bucket] *= -1;
  }
  return vec;
}

async function embed(
  texts: string[],
  quantize = false
): Promise<{ embeddings: number[][]; quantized?: ReturnType<typeof quantize>[] }> {
  if (!session) {
    throw new Error("ONNX worker not initialized");
  }
  const results: number[][] = [];
  const quantized: ReturnType<typeof quantize>[] = [];
  for (const text of texts) {
    const vec = hashEmbedding(text, dim);
    const tensor = {
      data: Float32Array.from(vec),
      dims: [1, vec.length],
      type: "float32" as const,
    } as any;
    const out = await session.run({ [inputName]: tensor });
    const data = out[outputName].data as Float32Array;
    const full = Array.from(data);
    results.push(full);
    if (quantize) quantized.push(quantize(full));
  }
  return { embeddings: results, quantized: quantize ? quantized : undefined };
}

export {};

self.onmessage = async (e: MessageEvent<{
  type: string;
  requestId: number;
  modelUrl?: string;
  modelDim?: number;
  texts?: string[];
  quantize?: boolean;
}>) => {
  const { type, requestId, modelUrl, modelDim, texts, quantize } = e.data;
  try {
    if (type === "init") {
      await init(modelUrl!, modelDim ?? 64);
      self.postMessage({ type: "ready", requestId });
    } else if (type === "embed") {
      const { embeddings, quantized } = await embed(texts!, quantize);
      self.postMessage({
        type: "result",
        requestId,
        embeddings,
        quantized,
      });
    }
  } catch (err) {
    self.postMessage({
      type: "error",
      requestId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
