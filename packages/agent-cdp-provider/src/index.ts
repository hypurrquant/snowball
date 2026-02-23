import express from "express";
import dotenv from "dotenv";
import { CDPProviderService } from "./service";
import type { A2ARequest, A2AResponse } from "@snowball/shared";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.CDP_PROVIDER_PORT || 3001;

const service = new CDPProviderService();

// A2A JSON-RPC endpoint
app.post("/a2a", async (req, res) => {
  const request: A2ARequest = req.body;

  try {
    let result: unknown;

    switch (request.method) {
      case "cdp.openTrove":
        result = await service.buildOpenTroveTx(request.params);
        break;
      case "cdp.adjustTrove":
        result = await service.buildAdjustTroveTx(request.params);
        break;
      case "cdp.closeTrove":
        result = await service.buildCloseTroveTx(request.params);
        break;
      case "cdp.adjustTroveInterestRate":
        result = await service.buildAdjustTroveInterestRateTx(request.params);
        break;
      case "sp.deposit":
        result = await service.buildSPDepositTx(request.params);
        break;
      case "sp.withdraw":
        result = await service.buildSPWithdrawTx(request.params);
        break;
      case "sp.claim":
        result = await service.buildSPClaimTx(request.params);
        break;
      case "query.troveStatus":
        result = await service.getTroveStatus(request.params);
        break;
      case "query.price":
        result = await service.getPrice(request.params);
        break;
      case "query.branchStats":
        result = await service.getBranchStats(request.params);
        break;
      default:
        const response: A2AResponse = {
          error: { code: -32601, message: `Method not found: ${request.method}` },
          id: request.id,
        };
        return res.json(response);
    }

    const response: A2AResponse = { result, id: request.id };
    res.json(response);
  } catch (error: any) {
    const response: A2AResponse = {
      error: { code: -32000, message: error.message },
      id: request.id,
    };
    res.json(response);
  }
});

// Health check
app.get("/health", (_, res) => {
  res.json({ status: "ok", agent: "cdp-provider", version: "1.0.0" });
});

app.listen(PORT, () => {
  console.log(`CDP Provider Agent listening on port ${PORT}`);
});
