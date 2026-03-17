import type { Address } from "viem";
import type { YieldPath, PathStep, ProtocolContext } from "../types";
import type { MorphoMarket } from "../../morpho/types";
import type { AaveMarket } from "../../aave/types";
import type { VaultData } from "../../yield/types";
import type { ApyState } from "../../yield/hooks/useYieldVaultAPY";
import { TOKEN_INFO, TOKENS, YIELD } from "@snowball/core/src/config/addresses";
import { DEFAULT_BORROW_RATE, LIQUITY_LTV } from "./constants";

export interface ProtocolData {
  morphoMarkets: MorphoMarket[];
  aaveMarkets: AaveMarket[];
  vaults: VaultData[];
  vaultAPYs: Record<Address, ApyState>;
}

export function calculatePaths(
  asset: string,
  amount: bigint,
  protocolData: ProtocolData,
): YieldPath[] {
  const paths: YieldPath[] = [];
  const assetLower = asset.toLowerCase();
  const assetInfo = TOKEN_INFO[asset] ?? TOKEN_INFO[assetLower];
  if (!assetInfo) return paths;

  const price = assetInfo.mockPriceUsd;

  // ── 1. Aave Supply ──────────────────────────────────────────────────────────
  const aaveMarket = protocolData.aaveMarkets.find(
    (m) => m.underlying.toLowerCase() === assetLower,
  );
  if (aaveMarket && aaveMarket.isActive) {
    const steps: PathStep[] = [
      {
        action: "approve",
        protocol: "Aave",
        inputToken: assetInfo.symbol,
        description: `Approve ${assetInfo.symbol} for Aave`,
      },
      {
        action: "supply",
        protocol: "Aave",
        inputToken: assetInfo.symbol,
        description: `Supply ${assetInfo.symbol} to Aave V3`,
      },
    ];
    const ctx: ProtocolContext = { type: "aave", asset: asset as Address };
    paths.push({
      id: "aave-supply",
      name: "Aave Supply",
      description: `Supply ${assetInfo.symbol} to Aave V3 and earn interest`,
      protocol: "Aave",
      estimatedAPY: aaveMarket.supplyAPY,
      apyLabel: `${aaveMarket.supplyAPY.toFixed(2)}%`,
      riskLevel: "low",
      steps,
      stepCount: steps.length,
      protocolContext: ctx,
      isMultiHop: false,
    });
  }

  // ── 2. Morpho Supply ────────────────────────────────────────────────────────
  // Find a market where the input asset is the loan token (user supplies it)
  const morphoMarket = protocolData.morphoMarkets.find(
    (m) => m.loanToken.toLowerCase() === assetLower,
  );
  if (morphoMarket) {
    const steps: PathStep[] = [
      {
        action: "approve",
        protocol: "Morpho",
        inputToken: assetInfo.symbol,
        description: `Approve ${assetInfo.symbol} for SnowballLend`,
      },
      {
        action: "supply",
        protocol: "Morpho",
        inputToken: assetInfo.symbol,
        description: `Supply ${assetInfo.symbol} to SnowballLend`,
      },
    ];
    const ctx: ProtocolContext = { type: "morpho", market: morphoMarket };
    paths.push({
      id: "morpho-supply",
      name: "Morpho Supply",
      description: `Supply ${assetInfo.symbol} to SnowballLend and earn interest`,
      protocol: "Morpho",
      estimatedAPY: morphoMarket.supplyAPY,
      apyLabel: `${morphoMarket.supplyAPY.toFixed(2)}%`,
      riskLevel: "low",
      steps,
      stepCount: steps.length,
      protocolContext: ctx,
      isMultiHop: false,
    });
  }

  // ── 3. Yield Vault ──────────────────────────────────────────────────────────
  // Match against YIELD.vaults where vault.want === asset
  const matchingVaultConfig = YIELD.vaults.find(
    (v) => v.want.toLowerCase() === assetLower,
  );
  if (matchingVaultConfig) {
    const vaultAddress = matchingVaultConfig.address as Address;
    const apyState = protocolData.vaultAPYs[vaultAddress];

    // Only include if APY state is ready or variable (skip loading/error)
    if (apyState && (apyState.kind === "ready" || apyState.kind === "variable")) {
      const estimatedAPY = apyState.kind === "ready" ? apyState.value : null;
      const apyLabel = apyState.kind === "ready" ? `${apyState.value.toFixed(2)}%` : "Variable";

      const steps: PathStep[] = [
        {
          action: "approve",
          protocol: "Yield",
          inputToken: assetInfo.symbol,
          description: `Approve ${assetInfo.symbol} for Yield Vault`,
        },
        {
          action: "vaultDeposit",
          protocol: "Yield",
          inputToken: assetInfo.symbol,
          description: `Deposit ${assetInfo.symbol} into ${matchingVaultConfig.name} vault`,
        },
      ];
      const ctx: ProtocolContext = {
        type: "yieldVault",
        vaultAddress,
        wantToken: matchingVaultConfig.want as Address,
      };
      paths.push({
        id: `yield-vault-${vaultAddress}`,
        name: matchingVaultConfig.name,
        description: matchingVaultConfig.description,
        protocol: "Yield",
        estimatedAPY,
        apyLabel,
        riskLevel: "low",
        steps,
        stepCount: steps.length,
        protocolContext: ctx,
        isMultiHop: false,
      });
    }
  }

  // ── 4. Stability Pool ────────────────────────────────────────────────────────
  // Only available when asset is sbUSD
  if (assetLower === TOKENS.sbUSD.toLowerCase()) {
    // Determine which branch to show; default to wCTC branch for sbUSD deposits
    // The SP accepts sbUSD from any branch depositor — show wCTC branch as primary
    const branch = "wCTC" as const;
    const steps: PathStep[] = [
      {
        action: "approve",
        protocol: "Liquity",
        inputToken: "sbUSD",
        description: "Approve sbUSD for Stability Pool",
      },
      {
        action: "deposit",
        protocol: "Liquity",
        inputToken: "sbUSD",
        description: "Deposit sbUSD into Stability Pool",
      },
    ];
    const ctx: ProtocolContext = { type: "stabilityPool", branch };
    paths.push({
      id: "stability-pool",
      name: "Stability Pool",
      description: "Deposit sbUSD into Liquity Stability Pool and earn liquidation rewards",
      protocol: "Liquity",
      estimatedAPY: null,
      apyLabel: "Variable",
      riskLevel: "low",
      steps,
      stepCount: steps.length,
      protocolContext: ctx,
      isMultiHop: false,
    });
  }

  // ── 5. CDP → Morpho Supply ───────────────────────────────────────────────────
  // Only for wCTC / lstCTC collateral assets
  const isCdpAsset =
    assetLower === TOKENS.wCTC.toLowerCase() ||
    assetLower === TOKENS.lstCTC.toLowerCase();

  if (isCdpAsset && amount > 0n) {
    const branch = assetLower === TOKENS.wCTC.toLowerCase() ? "wCTC" : "lstCTC";
    const ltv = LIQUITY_LTV[branch];

    // Calculate mintable sbUSD: amount (18 decimals) * price * LTV
    // amount is in wei (1e18), price is USD float, result needs to be in 1e18 sbUSD
    const mintableFloat = (Number(amount) / 1e18) * price * ltv;
    const mintAmount = BigInt(Math.floor(mintableFloat * 1e18));

    // Find the sbUSD supply market in Morpho (loanToken === sbUSD)
    const sbUsdMarket = protocolData.morphoMarkets.find(
      (m) => m.loanToken.toLowerCase() === TOKENS.sbUSD.toLowerCase(),
    );

    if (sbUsdMarket) {
      const netAPY = sbUsdMarket.supplyAPY - DEFAULT_BORROW_RATE;

      const steps: PathStep[] = [
        {
          action: "approve",
          protocol: "Liquity",
          inputToken: assetInfo.symbol,
          description: `Approve ${assetInfo.symbol} as collateral`,
        },
        ...(branch === "lstCTC"
          ? [
              {
                action: "approve",
                protocol: "Liquity",
                inputToken: assetInfo.symbol,
                outputToken: "ETH",
                description: "Approve gas compensation",
              } satisfies PathStep,
            ]
          : []),
        {
          action: "openTrove",
          protocol: "Liquity",
          inputToken: assetInfo.symbol,
          outputToken: "sbUSD",
          description: `Open Trove with ${assetInfo.symbol} collateral`,
        },
        {
          action: "approve",
          protocol: "Morpho",
          inputToken: "sbUSD",
          description: "Approve sbUSD for SnowballLend",
        },
        {
          action: "supply",
          protocol: "Morpho",
          inputToken: "sbUSD",
          description: "Supply sbUSD to SnowballLend",
        },
      ];

      const ctx: ProtocolContext = {
        type: "cdpMorpho",
        branch,
        market: sbUsdMarket,
        collAmount: amount,
        mintAmount,
      };
      paths.push({
        id: `cdp-morpho-${branch}`,
        name: `CDP → Morpho (${branch})`,
        description: `Open a ${branch} Trove, mint sbUSD, and supply to SnowballLend`,
        protocol: "Liquity + Morpho",
        estimatedAPY: netAPY,
        apyLabel: `${netAPY.toFixed(2)}%`,
        riskLevel: "medium",
        steps,
        stepCount: steps.length,
        protocolContext: ctx,
        isMultiHop: true,
      });
    }
  }

  // Sort: numeric APY descending, null (Variable) last
  paths.sort((a, b) => {
    if (a.estimatedAPY === null && b.estimatedAPY === null) return 0;
    if (a.estimatedAPY === null) return 1;
    if (b.estimatedAPY === null) return -1;
    return b.estimatedAPY - a.estimatedAPY;
  });

  return paths;
}
