import { NextRequest, NextResponse } from "next/server";

const AGENT_SERVER_URL = process.env.AGENT_SERVER_URL || "http://localhost:3001";
const API_KEY = process.env.API_KEY || "";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const query = searchParams.toString();
    const url = `${AGENT_SERVER_URL}/agent/runs${query ? `?${query}` : ""}`;

    const res = await fetch(url, {
      headers: { "X-API-Key": API_KEY },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Proxy error";
    return NextResponse.json({ message }, { status: 502 });
  }
}
