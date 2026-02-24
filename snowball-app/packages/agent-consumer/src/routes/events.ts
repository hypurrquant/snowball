import { Router, type Request, type Response, type NextFunction } from "express";
import type { MonitorEvent } from "../monitor";
import { logger } from "../logger";

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const eventsRouter = Router();

// SSE connection store: address -> Set of Response objects
const sseClients = new Map<string, Set<Response>>();
const MAX_CONNECTIONS_PER_ADDRESS = 5;
const MAX_TOTAL_CONNECTIONS = 1000;

let totalConnections = 0;

export function getSSEConnectionCount(): number {
  return totalConnections;
}

export function pushMonitorEvent(event: MonitorEvent): void {
  const addr = event.address.toLowerCase();
  const clients = sseClients.get(addr);
  if (!clients || clients.size === 0) return;

  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of clients) {
    try {
      res.write(data);
    } catch {
      clients.delete(res);
      totalConnections--;
    }
  }
}

/**
 * @openapi
 * /api/events/positions/{address}:
 *   get:
 *     tags: [Events]
 *     summary: SSE stream for position monitoring events
 *     parameters:
 *       - name: address
 *         in: path
 *         required: true
 *         schema: { type: string }
 *         description: Wallet address to monitor
 *     responses:
 *       200:
 *         description: SSE event stream
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 */
eventsRouter.get("/positions/:address", asyncHandler(async (req: Request, res: Response) => {
  const address = req.params.address.toLowerCase();

  // Check total connection limit
  if (totalConnections >= MAX_TOTAL_CONNECTIONS) {
    return res.status(503).json({ error: "Too many SSE connections" });
  }

  // Check per-address limit
  let clients = sseClients.get(address);
  if (clients && clients.size >= MAX_CONNECTIONS_PER_ADDRESS) {
    return res.status(429).json({ error: "Too many connections for this address" });
  }

  // Set SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: "connected", address })}\n\n`);

  // Register client
  if (!clients) {
    clients = new Set();
    sseClients.set(address, clients);
  }
  clients.add(res);
  totalConnections++;

  logger.info({ address, totalConnections }, "SSE client connected");

  // Heartbeat every 15 seconds
  const heartbeat = setInterval(() => {
    try {
      res.write(":heartbeat\n\n");
    } catch {
      cleanup();
    }
  }, 15_000);

  // Cleanup on disconnect
  function cleanup() {
    clearInterval(heartbeat);
    const c = sseClients.get(address);
    if (c) {
      c.delete(res);
      if (c.size === 0) sseClients.delete(address);
    }
    totalConnections--;
    logger.info({ address, totalConnections }, "SSE client disconnected");
  }

  req.on("close", cleanup);
}));
