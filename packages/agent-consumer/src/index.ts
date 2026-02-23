import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import pinoHttp from "pino-http";
import { logger } from "./logger";
import { protocolRouter } from "./routes/protocol";
import { userRouter } from "./routes/user";
import { agentRouter } from "./routes/agent";
import { agentInfoRouter } from "./routes/agentInfo";
import { adminRouter } from "./routes/admin";
import { spRouter } from "./routes/sp";
import { eventsRouter } from "./routes/events";
import { errorHandler } from "./middleware/errorHandler";
import { authMiddleware } from "./middleware/auth";
import { PositionMonitor } from "./monitor";
import { setupSwagger } from "./swagger";

// Load .env from project root first, then local
dotenv.config({ path: path.join(__dirname, "../../../.env") });
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Structured request logging
if (process.env.NODE_ENV !== "test") {
  app.use(pinoHttp({ logger }));
}

const PORT = process.env.PORT || 3000;

// Position Monitor
const monitor = new PositionMonitor();
app.locals.monitor = monitor;

// Auth middleware (before routes)
app.use(authMiddleware);

// Routes
app.use("/api/protocol", protocolRouter);
app.use("/api/user", userRouter);
app.use("/api/agent", agentRouter);
app.use("/api/agents", agentInfoRouter);
app.use("/api/admin", adminRouter);
app.use("/api/sp", spRouter);
app.use("/api/events", eventsRouter);

// Swagger docs
setupSwagger(app);

// Health check
app.get("/api/health", (_, res) => {
  res.json({ status: "ok", agent: "consumer", version: "1.0.0" });
});

// Error handler (must be after routes)
app.use(errorHandler);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    logger.info({ port: PORT }, `Snowball Consumer Agent API listening on port ${PORT}`);
    logger.info(`API docs: http://localhost:${PORT}/api/docs`);
    monitor.start();
  });
}

export default app;
