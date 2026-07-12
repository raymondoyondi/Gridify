import { describe, it, expect } from "vitest";
import {
  quantizeVector,
  dequantizeVector,
  quantizeBatch,
  dequantizeBatch,
  quantizedCosine,
  storageEstimate,
} from "./quantization";

describe("scalar quantization (float32 -> int8)", () => {
  it("round-trips a vector with small error", () => {
    const v = [0.1, -0.5, 0.9, 0.0, 0.42];
    const q = quantizeVector(v);
    const back = dequantizeVector(q);
    expect(back.length).toBe(v.length);
    for (let i = 0; i < v.length; i++) {
      expect(Math.abs(back[i] - v[i])).toBeLessThan(0.05);
    }
  });

  it("produces codes within the int8 range", () => {
    const q = quantizeVector([0, 1, 2, 3, 4, 5]);
    for (const c of q.codes) {
      expect(c).toBeGreaterThanOrEqual(-128);
      expect(c).toBeLessThanOrEqual(127);
    }
  });

  it("batch quantize/dequantize preserves length and shape", () => {
    const vectors = [
      [1, 2, 3],
      [4, 5, 6],
    ];
    const back = dequantizeBatch(quantizeBatch(vectors));
    expect(back).toHaveLength(2);
    expect(back[0]).toHaveLength(3);
  });

  it("cosine on int8 codes matches float cosine for similar vectors", () => {
    const a = quantizeVector([1, 0, 0]);
    const b = quantizeVector([1, 0.1, 0]);
    const c = quantizeVector([0, 1, 0]);
    expect(quantizedCosine(a, b)).toBeGreaterThan(quantizedCosine(a, c));
  });

  it("reports a ~4x storage reduction", () => {
    const est = storageEstimate(
      Array.from({ length: 100 }, () => new Array(64).fill(0))
    );
    expect(est.ratio).toBeCloseTo(4, 1);
    expect(est.int8Bytes * 4).toBe(est.float32Bytes);
  });
});
