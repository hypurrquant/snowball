export * from "@snowball/core/src/config/addresses";

// Backend API (Next.js-specific, uses process.env)
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
export const CHAT_API_BASE = process.env.NEXT_PUBLIC_CHAT_API_BASE || "http://localhost:3002/api";
