import { v4 as uuid } from "uuid";
import type { A2ARequest, A2AResponse } from "@snowball/shared";
import { UpstreamError } from "@snowball/shared";
import { a2aLogger } from "./logger";

const CDP_PROVIDER_URL = process.env.CDP_PROVIDER_URL || "http://localhost:3001";

export async function callCDPProvider(method: string, params: Record<string, unknown>): Promise<unknown> {
  const request: A2ARequest = {
    method,
    params,
    id: uuid(),
  };

  let response: Response;
  try {
    response = await fetch(`${CDP_PROVIDER_URL}/a2a`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch (err: any) {
    a2aLogger.error({ method, error: err.message }, "CDP Provider unreachable");
    throw new UpstreamError(`CDP Provider unreachable: ${err.message}`);
  }

  if (!response.ok) {
    a2aLogger.error({ method, status: response.status }, "CDP Provider HTTP error");
    throw new UpstreamError(`CDP Provider returned HTTP ${response.status}`);
  }

  const data: A2AResponse = await response.json();

  if (data.error) {
    a2aLogger.error({ method, code: data.error.code, message: data.error.message }, "A2A error response");
    throw new UpstreamError(`A2A Error [${data.error.code}]: ${data.error.message}`);
  }

  return data.result;
}
