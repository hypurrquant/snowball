"use client";

import { useMemo } from "react";
import { TOKEN_INFO } from "@/core/config/addresses";
import type { NextAction } from "@/shared/components/NextActionBanner";
import type { Address } from "viem";

export interface TxResult {
  type:
    | "swap"
    | "cdp-mint"
    | "morpho-supply"
    | "aave-supply"
    | "yield-deposit"
    | "stability-deposit"
    | "stake";
  outputToken?: Address;
  outputAmount?: bigint;
  protocol?: string;
}

interface NextActionSuggestion {
  title: string;
  actions: NextAction[];
  strategyLink?: string;
}

export function useNextActions(txResult: TxResult | null): NextActionSuggestion | null {
  return useMemo(() => {
    if (!txResult) return null;

    const tokenInfo = txResult.outputToken ? TOKEN_INFO[txResult.outputToken] : null;
    const symbol = tokenInfo?.symbol ?? "tokens";
    const amountStr = txResult.outputAmount
      ? (Number(txResult.outputAmount) / 10 ** (tokenInfo?.decimals ?? 18)).toLocaleString()
      : "";

    switch (txResult.type) {
      case "cdp-mint":
        return {
          title: `sbUSD ${amountStr}개가 생겼습니다!`,
          actions: [
            {
              label: "LP + Staking",
              description: "~18% APY 가능",
              href: "/earn/strategy",
              protocol: "DEX+Staker",
            },
            {
              label: "Morpho Supply",
              description: "~5% APY 가능",
              href: "/morpho/supply",
              protocol: "Morpho",
            },
            {
              label: "Stability Pool 예치",
              description: "청산 수익 가능",
              href: "/liquity/earn",
              protocol: "Liquity",
            },
          ],
          strategyLink: "/earn/strategy",
        };

      case "swap": {
        if (tokenInfo?.symbol === "wCTC" || tokenInfo?.symbol === "lstCTC") {
          return {
            title: `${symbol} ${amountStr}개를 받았습니다!`,
            actions: [
              {
                label: "Aave Supply",
                description: "~7% APY",
                href: "/aave/supply",
                protocol: "Aave",
              },
              {
                label: "CDP → sbUSD → LP",
                description: "~18% APY",
                href: "/earn/strategy",
                protocol: "Liquity+DEX",
              },
            ],
            strategyLink: "/earn/strategy",
          };
        }
        if (tokenInfo?.symbol === "sbUSD") {
          return {
            title: `sbUSD ${amountStr}개를 받았습니다!`,
            actions: [
              {
                label: "Stability Pool",
                description: "청산 수익 가능",
                href: "/liquity/earn",
                protocol: "Liquity",
              },
              {
                label: "Morpho Supply",
                description: "~5% APY",
                href: "/morpho/supply",
                protocol: "Morpho",
              },
            ],
            strategyLink: "/earn/strategy",
          };
        }
        return {
          title: `${symbol} ${amountStr}개를 받았습니다!`,
          actions: [
            {
              label: "수익 경로 탐색",
              description: "최적 APY 찾기",
              href: "/earn/strategy",
            },
          ],
          strategyLink: "/earn/strategy",
        };
      }

      case "morpho-supply":
        return {
          title: "공급 완료!",
          actions: [
            {
              label: "Yield Vault",
              description: "자동 복리로 수익 극대화",
              href: "/yield",
              protocol: "Yield",
            },
            {
              label: "더 높은 APY 찾기",
              description: "Strategy Router",
              href: "/earn/strategy",
            },
          ],
          strategyLink: "/earn/strategy",
        };

      case "aave-supply":
        return {
          title: "Aave 공급 완료!",
          actions: [
            {
              label: "Yield Vault",
              description: "자동 복리",
              href: "/yield",
              protocol: "Yield",
            },
            {
              label: "다른 자산도 공급",
              description: "통합 Supply",
              href: "/earn/supply",
            },
          ],
          strategyLink: "/earn/strategy",
        };

      case "yield-deposit":
        return {
          title: "Vault 예치 완료!",
          actions: [
            {
              label: "포트폴리오 확인",
              description: "수익 모니터링",
              href: "/dashboard",
            },
            {
              label: "더 많은 전략",
              description: "Strategy Router",
              href: "/earn/strategy",
            },
          ],
          strategyLink: "/earn/strategy",
        };

      case "stability-deposit":
        return {
          title: "Stability Pool 예치 완료!",
          actions: [
            {
              label: "포트폴리오 확인",
              description: "청산 수익 모니터링",
              href: "/dashboard",
            },
            {
              label: "더 높은 APY?",
              description: "Strategy Router",
              href: "/earn/strategy",
            },
          ],
          strategyLink: "/earn/strategy",
        };

      case "stake":
        return {
          title: "LP 스테이킹 완료!",
          actions: [
            {
              label: "보상 확인",
              description: "Emission 수령",
              href: "/stake",
            },
            {
              label: "포트폴리오",
              description: "전체 현황",
              href: "/dashboard",
            },
          ],
          strategyLink: "/earn/strategy",
        };

      default:
        return null;
    }
  }, [txResult]);
}
