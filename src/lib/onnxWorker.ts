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

async function embed(texts: string[]): Promise<number[][]> {
  if (!session) {
    throw new Error("ONNX worker not initialized");
  }
  const results: number[][] = [];
  for (const text of texts) {
    const vec = hashEmbedding(text, dim);
    const tensor = {
      data: Float32Array.from(vec),
      dims: [1, vec.length],
      type: "float32" as const,
    } as any;
    const out = await session.run({ [inputName]: tensor });
    const data = out[outputName].data;
    results.push(Array.from(data as Float32Array));
  }
  return results;
}

export {};

self.onmessage = async (e: MessageEvent<{
  type: string;
  requestId: number;
  modelUrl?: string;
  modelDim?: number;
  texts?: string[];
}>) => {
  const { type, requestId, modelUrl, modelDim, texts } = e.data;
  try {
    if (type === "init") {
      await init(modelUrl!, modelDim ?? 64);
      self.postMessage({ type: "ready", requestId });
    } else if (type === "embed") {
      const embeddings = await embed(texts!);
      self.postMessage({ type: "result", requestId, embeddings });
    }
  } catch (err) {
    self.postMessage({
      type: "error",
      requestId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
