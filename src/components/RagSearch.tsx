import { useState } from "react";
import { hybridRAG, type RAGResult } from "../lib/ragClient";

/**
 * Demonstrates the hybrid RAG edge path: the query is embedded and
 * cosine-matched against the locally cached semantic index *before* anything is
 * forwarded to the cloud Chroma vector store. With no ONNX model configured it
 * uses the deterministic hashing embedder so the local match still runs.
 */
export default function RagSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RAGResult[] | null>(null);
  const [status, setStatus] = useState<string>("ready");

  async function search() {
    if (!query.trim()) return;
    setStatus("matching…");
    await hybridRAG.loadIndex();
    const hits = await hybridRAG.search(query, 3);
    setResults(hits);
    setStatus(`matched ${hybridRAG.size} cached vectors locally`);
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-slate-800 text-base">
          Hybrid RAG · Edge Vector Match
        </h3>
        <span className="bg-violet-50 text-[10px] font-mono font-semibold text-violet-600 px-2 py-0.5 rounded border border-violet-100">
          ONNX · {status}
        </span>
      </div>

      <div className="relative flex items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Ask about temperature, proxies, uptime…"
          className="w-full pl-4 pr-28 py-3 text-xs font-medium bg-slate-50/50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-1 focus:ring-violet-500 focus:bg-white transition-all"
        />
        <button
          onClick={search}
          disabled={!query.trim()}
          className="absolute right-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
        >
          Match locally
        </button>
      </div>

      {results && (
        <ul className="space-y-2">
          {results.map((r) => (
            <li
              key={r.chunk.id}
              className="flex items-start gap-3 bg-slate-50/60 border border-slate-100 rounded-xl p-3"
            >
              <span className="text-[10px] font-mono font-bold text-violet-600 mt-0.5 w-14 flex-shrink-0">
                {(r.score * 100).toFixed(0)}%
              </span>
              <span className="text-xs text-slate-600 leading-relaxed">{r.chunk.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
