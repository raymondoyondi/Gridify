import { useCallback, useEffect, useRef, useState } from "react";
import type { ArrowDevice } from "../lib/arrowClient";
import {
  duckDBAnalytics,
  type TypeAggregate,
} from "../lib/duckdbClient";
import type { DeviceQueryOptions } from "../lib/duckdbQueries";

interface DuckDBState {
  loading: boolean;
  error: string | null;
  /** True once the WASM engine has loaded and cached data is queryable. */
  ready: boolean;
}

/**
 * Hook that offloads filtering / sorting / aggregation to DuckDB-WASM.
 *
 * The first time `devices` is available it is loaded into the in-browser
 * database; subsequent local queries never touch the backend cluster.
 */
export function useDuckDBAnalytics(devices: ArrowDevice[]) {
  const [state, setState] = useState<DuckDBState>({
    loading: true,
    error: null,
    ready: false,
  });
  const loadedKey = useRef<string>("");

  useEffect(() => {
    if (devices.length === 0) return;
    const fingerprint = devices.map((d) => d.id).join("|");
    if (loadedKey.current === fingerprint) return;

    let cancelled = false;
    (async () => {
      try {
        await duckDBAnalytics.loadDevices(devices);
        loadedKey.current = fingerprint;
        if (!cancelled) {
          setState({ loading: false, error: null, ready: true });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            loading: false,
            error: err instanceof Error ? err.message : "DuckDB init failed",
            ready: false,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [devices]);

  const runQuery = useCallback(async (opts: DeviceQueryOptions = {}) => {
    if (!state.ready) return [];
    return duckDBAnalytics.runDevicesQuery(opts);
  }, [state.ready]);

  const runAggregate = useCallback(async (opts: DeviceQueryOptions = {}) => {
    if (!state.ready) return [];
    return duckDBAnalytics.runAggregateByType(opts);
  }, [state.ready]);

  return { ...state, runQuery, runAggregate };
}

export type { TypeAggregate };
