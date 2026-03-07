#!/usr/bin/env node
"use strict";

const http = require("http");
const { spawn } = require("child_process");

const PORT = process.env.CLAUDE_PROXY_PORT || 3002;
const DEFAULT_MODEL = process.env.CODEX_MODEL || "gpt-5.4";
const DEFAULT_EFFORT = process.env.CODEX_REASONING_EFFORT || "xhigh";
const TIMEOUT_MS = 180_000; // 3 minutes

function callCodex(prompt, model, reasoningEffort) {
  return new Promise((resolve, reject) => {
    const cmdArgs = [
      "-a", "never",
      "exec",
      "--model", model,
      "-c", `model_reasoning_effort="${reasoningEffort}"`,
      "--skip-git-repo-check",
      prompt,
    ];

    console.log(`[codex-proxy] Running: codex ${cmdArgs.slice(0, 7).join(" ")} "<prompt ${prompt.length} chars>"`);

    const proc = spawn("codex", cmdArgs, {
      stdio: ["pipe", "pipe", "pipe"],
      timeout: TIMEOUT_MS,
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => (stdout += data));
    proc.stderr.on("data", (data) => (stderr += data));

    proc.on("close", (code) => {
      // Codex outputs to both stdout and stderr
      const response = stdout || stderr || "";
      if (code === 0 || response) {
        resolve(response.trim());
      } else {
        reject(new Error(`codex exited with code ${code}: ${stderr}`));
      }
    });

    proc.on("error", (err) => reject(err));
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "POST" || req.url !== "/plan") {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found. Use POST /plan" }));
    return;
  }

  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", async () => {
    try {
      const { prompt, model, reasoningEffort } = JSON.parse(body);
      if (!prompt) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing 'prompt' field" }));
        return;
      }

      const selectedModel = model || DEFAULT_MODEL;
      const selectedEffort = reasoningEffort || DEFAULT_EFFORT;

      console.log(`[codex-proxy] Request: model=${selectedModel}, effort=${selectedEffort}, prompt=${prompt.length} chars`);

      const response = await callCodex(prompt, selectedModel, selectedEffort);

      console.log(`[codex-proxy] Codex responded (${response.length} chars)`);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ response }));
    } catch (err) {
      const message = err.message || String(err);
      console.error(`[codex-proxy] Error: ${message}`);

      const status = message.includes("timed out") ? 504 : 500;
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`[codex-proxy] Listening on port ${PORT}`);
  console.log(`[codex-proxy] Default model: ${DEFAULT_MODEL}, effort: ${DEFAULT_EFFORT}`);
  console.log(`[codex-proxy] Timeout: ${TIMEOUT_MS / 1000}s`);
});
