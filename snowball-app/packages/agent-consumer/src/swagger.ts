import path from "path";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import type { Express } from "express";

// Resolve routes path relative to this file (works with both tsx and compiled dist)
const routesDir = path.join(__dirname, "routes");

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Snowball Consumer Agent API",
      version: "1.0.0",
      description: "CDP management, monitoring, and agent automation API for Liquity V2 on Creditcoin",
    },
    servers: [
      { url: "http://localhost:3000", description: "Local development" },
    ],
    components: {
      securitySchemes: {
        ApiKey: {
          type: "apiKey",
          in: "header",
          name: "X-API-Key",
          description: "API key authentication",
        },
        WalletAuth: {
          type: "apiKey",
          in: "header",
          name: "X-Wallet-Signature",
          description: "Wallet signature authentication (also requires X-Wallet-Address and X-Wallet-Timestamp headers)",
        },
      },
      schemas: {
        ProtocolStats: {
          type: "object",
          properties: {
            totalCollateralUSD: { type: "string" },
            totalBorrowedUSD: { type: "string" },
            sbUSDPrice: { type: "string" },
            activeAgents: { type: "number" },
          },
        },
        MarketData: {
          type: "object",
          properties: {
            branch: { type: "number" },
            collateralSymbol: { type: "string" },
            collateralAddress: { type: "string" },
            totalCollateral: { type: "string" },
            totalCollateralUSD: { type: "string" },
            currentCR: { type: "string" },
            mcr: { type: "string" },
            ccr: { type: "string" },
            ltv: { type: "string" },
            totalBorrow: { type: "string" },
            avgInterestRate: { type: "string" },
            spDeposits: { type: "string" },
            spAPY: { type: "string" },
          },
        },
        UserPosition: {
          type: "object",
          properties: {
            troveId: { type: "number" },
            branch: { type: "number" },
            collateralSymbol: { type: "string" },
            collateral: { type: "string" },
            collateralUSD: { type: "string" },
            debt: { type: "string" },
            cr: { type: "string" },
            interestRate: { type: "string" },
            liquidationPrice: { type: "string" },
            agentManaged: { type: "boolean" },
            agentStrategy: { type: "string" },
            status: { type: "string", enum: ["active", "closedByOwner", "closedByLiquidation", "closedByRedemption"] },
            redemptionRisk: { type: "string", enum: ["low", "medium", "high"] },
          },
        },
        UserBalance: {
          type: "object",
          properties: {
            nativeCTC: { type: "string" },
            wCTC: { type: "string" },
            lstCTC: { type: "string" },
            sbUSD: { type: "string" },
          },
        },
        AgentRecommendation: {
          type: "object",
          properties: {
            strategy: { type: "string" },
            recommendedCR: { type: "number" },
            recommendedDebt: { type: "string" },
            recommendedInterestRate: { type: "string" },
            estimatedAPY: { type: "string" },
            liquidationPrice: { type: "string" },
            reasoning: { type: "string" },
          },
        },
        AgentInfo: {
          type: "object",
          properties: {
            id: { type: "number" },
            name: { type: "string" },
            agentType: { type: "string" },
            owner: { type: "string" },
            endpoint: { type: "string" },
            isActive: { type: "boolean" },
            registeredAt: { type: "number" },
          },
        },
      },
    },
    security: [{ ApiKey: [] }],
  },
  apis: [path.join(routesDir, "*.ts"), path.join(routesDir, "*.js")],
};

let swaggerSpec: object | null = null;

export function getSwaggerSpec(): object {
  if (!swaggerSpec) {
    swaggerSpec = swaggerJsdoc(options);
  }
  return swaggerSpec;
}

export function setupSwagger(app: Express): void {
  const spec = getSwaggerSpec();

  // JSON spec endpoint
  app.get("/api/docs.json", (_req, res) => {
    res.json(spec);
  });

  // Swagger UI
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(spec));
}
