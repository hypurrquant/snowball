"use client";

import { useState, useEffect, useCallback } from "react";

interface RunResult {
  runId: string;
  status: string;
  plan: unknown;
  txHashes: string[];
  logs: string[];
  errors: string[];
  reasoning?: string;
  timestamp: number;
  user: string;
  manifestId: string;
}

export function useAgentRuns(user?: string, limit = 20) {
  const [runs, setRuns] = useState<RunResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRuns = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (user) params.set("user", user);
      params.set("limit", String(limit));

      const res = await fetch(`/api/agent/runs?${params}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data: RunResult[] = await res.json();
      setRuns(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [user, limit]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  return { runs, isLoading, error, refetch: fetchRuns };
}
