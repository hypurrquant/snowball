"use client";

import { useState, useCallback } from "react";

interface RunAgentParams {
  user: string;
  manifestId: string;
  troveId?: string;
}

interface RunResult {
  runId: string;
  status: string;
  plan: unknown;
  txHashes: string[];
  logs: string[];
  errors: string[];
  reasoning?: string;
  timestamp: number;
}

export function useRunAgent() {
  const [data, setData] = useState<RunResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAgent = useCallback(async (params: RunAgentParams) => {
    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `HTTP ${res.status}`);
      }

      const result: RunResult = await res.json();
      setData(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { runAgent, data, isLoading, error };
}
