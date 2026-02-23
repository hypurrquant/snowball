import type { Request, Response, NextFunction } from "express";
import { verifyMessage } from "viem";
import { authLogger } from "../logger";

// Public routes that don't require authentication
const PUBLIC_PREFIXES = [
  "/api/health",
  "/api/protocol",
  "/api/agents",
  "/api/docs",
];

function isPublicRoute(path: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));
}

// Parse API keys from env
function getApiKeys(): Set<string> {
  const raw = process.env.API_KEYS || "";
  return new Set(raw.split(",").map((k) => k.trim()).filter(Boolean));
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Dev/test bypass
  if (process.env.AUTH_DISABLED === "true") {
    return next();
  }

  // Public routes bypass
  if (isPublicRoute(req.path)) {
    return next();
  }

  // Mode 1: API Key
  const apiKey = req.headers["x-api-key"] as string | undefined;
  if (apiKey) {
    const validKeys = getApiKeys();
    if (validKeys.size > 0 && validKeys.has(apiKey)) {
      return next();
    }
    authLogger.warn({ path: req.path }, "Invalid API key");
    return res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Invalid API key", statusCode: 401 },
    });
  }

  // Mode 2: Wallet signature
  const signature = req.headers["x-wallet-signature"] as string | undefined;
  const walletAddress = req.headers["x-wallet-address"] as string | undefined;
  const timestamp = req.headers["x-wallet-timestamp"] as string | undefined;

  if (signature && walletAddress && timestamp) {
    // Check timestamp freshness (5 minutes)
    const ts = parseInt(timestamp, 10);
    const now = Date.now();
    if (isNaN(ts) || Math.abs(now - ts) > 5 * 60 * 1000) {
      authLogger.warn({ path: req.path, walletAddress }, "Expired wallet signature");
      return res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "Signature expired", statusCode: 401 },
      });
    }

    try {
      const message = `snowball:${timestamp}`;
      const valid = await verifyMessage({
        address: walletAddress as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      });

      if (valid) {
        return next();
      }
    } catch {
      // fall through
    }

    authLogger.warn({ path: req.path, walletAddress }, "Invalid wallet signature");
    return res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Invalid wallet signature", statusCode: 401 },
    });
  }

  // No credentials provided
  authLogger.warn({ path: req.path }, "No authentication provided");
  return res.status(401).json({
    error: { code: "UNAUTHORIZED", message: "Authentication required", statusCode: 401 },
  });
}
