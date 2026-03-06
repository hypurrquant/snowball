import { NextRequest, NextResponse } from "next/server";

const AGENT_SERVER_URL = process.env.AGENT_SERVER_URL || "http://localhost:3001";
const API_KEY = process.env.API_KEY || "";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await fetch(`${AGENT_SERVER_URL}/agent/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Proxy error";
    return NextResponse.json({ message }, { status: 502 });
  }
}
