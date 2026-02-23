# Snowball Frontend Specification — For Gemini

> **"더 이상 홀딩만 하지 마세요. 굴리세요."**
> *Stop holding. Start snowballing.*

## Product Overview

**Snowball**은 Creditcoin 네트워크의 AI Agent DeFi 플랫폼입니다. CTC 홀더가 토큰을 예치하면 AI 에이전트가 CDP(담보부채포지션)를 자동 관리하여 수익을 극대화합니다.

- **CDP 시스템:** Liquity V2 포크 — 담보(wCTC/lstCTC) 예치 → sbUSD(스테이블코인) 발행
- **AI Agent:** 포지션 모니터링, 자동 리밸런싱, 청산 방지
- **상담봇:** 챗봇으로 포지션 상태 질문, 전략 추천, DeFi 교육

## UI References

| Reference | URL | Notes |
|---------|-----|----------|
| **Felix Protocol** (CDP) | https://www.usefelix.xyz/stats | Stats page layout, market tables, Borrow/Earn flow |
| **ARMA by Giza** (Agent) | https://arma.xyz | "Launch Agent" CTA, 3-step onboarding, agent status display |

## Design Direction

- **Dark theme** (Felix/ARMA style)
- **Snowball branding:** snowball rolling and growing visual metaphor
- **Slogan:** "더 이상 홀딩만 하지 마세요. 굴리세요." / "Stop holding. Start snowballing."
- **Core colors:** Dark background + ice blue/white accent (snow theme)

## Pages

1. `/` — Landing (ARMA style)
2. `/dashboard` — Main app (positions + agent status)
3. `/borrow` — Open/manage troves (Felix style)
4. `/earn` — Stability Pool deposits
5. `/stats` — Protocol statistics
6. `/agent` — Agent management
7. `/chat` — Chatbot (also floating bubble on all pages)

## API Base URL

**Development:** `http://localhost:3000/api`

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/protocol/stats` | Total TVL, debt, sbUSD price |
| GET | `/api/protocol/markets` | Per-branch collateral, debt, CR, rates, SP |
| GET | `/api/user/:address/positions` | User's open troves |
| GET | `/api/user/:address/trove/:id` | Specific trove detail |
| GET | `/api/user/:address/sp-deposits` | SP deposit status |
| GET | `/api/user/:address/balance` | wCTC, lstCTC, sbUSD balances |
| POST | `/api/agent/recommend` | Strategy recommendation |
| POST | `/api/agent/execute` | Execute strategy (open trove, etc.) |
| POST | `/api/agent/adjust` | Adjust position |
| POST | `/api/agent/close` | Close position |
| GET | `/api/agents` | Registered agent list |
| GET | `/api/agents/:id/reputation` | Agent reputation score |
| GET | `/api/agents/:id/history` | Agent action history |
| POST | `/api/chat` | Chatbot message (port 3002) |
| GET | `/api/chat/history` | Chat history (port 3002) |
| POST | `/api/admin/set-price` | Set mock price |
| POST | `/api/admin/mint-tokens` | Mint test tokens |
| POST | `/api/admin/set-exchange-rate` | Set lstCTC exchange rate |

## Creditcoin Testnet Chain Config

```typescript
import { defineChain } from 'viem';

export const creditcoinTestnet = defineChain({
  id: 102031,
  name: 'Creditcoin Testnet',
  nativeCurrency: { name: 'CTC', symbol: 'tCTC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.cc3-testnet.creditcoin.network'] },
  },
  blockExplorers: {
    default: {
      name: 'Blockscout',
      url: 'https://creditcoin-testnet.blockscout.com',
    },
  },
  testnet: true,
});
```

## Tech Stack (Recommended)

| Area | Tech |
|------|------|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Styling | TailwindCSS (dark theme) |
| Web3 | viem + wagmi |
| State | @tanstack/react-query |
| Routing | React Router v6 |
| Charts | recharts |
| Icons | lucide-react |

## Contract Addresses (Deployed on Creditcoin Testnet)

```json
{
  "network": {
    "name": "Creditcoin Testnet",
    "chainId": 102031,
    "rpc": "https://rpc.cc3-testnet.creditcoin.network",
    "explorer": "https://creditcoin-testnet.blockscout.com"
  },
  "tokens": {
    "wCTC": "0x359719088dd54bb3b33af516eadef4636e0ca5c5",
    "lstCTC": "0x1fce7616b14bc632477302c5661b5694d4daae0a",
    "sbUSD": "0xc311d5c11d3716b04b7825154235f1aaee013eaa"
  },
  "branches": {
    "wCTC": {
      "addressesRegistry": "0xf91400bc1977de95ac7b9681c9a60e4bb2902c72",
      "borrowerOperations": "0x49a385291e5529a946d359de4277274fcca2bf8d",
      "troveManager": "0xe9d72aa79d1f204a0719d83f016154370b9ab509",
      "stabilityPool": "0xb606a6756624245da2ec843b30466d543646cff2",
      "activePool": "0x2f0d7383d71f243868f1d8d5fa5f07ae7f3d1c9a",
      "defaultPool": "0x420a6be006a2fc8f7b9f71829e5d6c517ddb433c",
      "gasPool": "0x3198648ea015b448d46b94e5ad0834b3e938bf8e",
      "collSurplusPool": "0x789f3acc3c79a39934a5775ccd28b116e9cde0e2",
      "sortedTroves": "0x5302ca309208a737fbb56bcb4103a6ce99b24ecd",
      "troveNFT": "0xd2231c5ae835334efd21369874bb4d44b509637c",
      "priceFeed": "0xb7374d3fbbe851e86c737e945d9c198390a30e89"
    },
    "lstCTC": {
      "addressesRegistry": "0x969d1eb1fe868ae498c5cedcaff1dcdf453b2b90",
      "borrowerOperations": "0x55a4930ea275fb734b3039cd4215abed943646f9",
      "troveManager": "0xfd72a4fa82ca0e2f011286fce473b3daa5b0d6bf",
      "stabilityPool": "0x704c6e7ec4bf58acd576316500213c88c0aa2b82",
      "activePool": "0x4e62ce4dda0ded6cafac13192ebd630f933d12c3",
      "defaultPool": "0x0e879377d630d013872ab6e0000a851f5f881082",
      "gasPool": "0x7b7ac84b027305d8c9c30f60486d7d82769c5e55",
      "collSurplusPool": "0x2eb0127a5ea43af1b64e5222d86fa0999c6f892d",
      "sortedTroves": "0xd233c1c82647c4f6de84c7955e3584e5feb278b5",
      "troveNFT": "0xd3b3c84b0761861cb5236f380371866acc9afe45",
      "priceFeed": "0x844b44c92d90f9039d86a5afabc780754c291c57"
    }
  },
  "shared": {
    "collateralRegistry": "0xf832af6c4a8f81a65aa5f61e77104f260e741d2f",
    "hintHelpers": "0xbd0e4cd41a6948dfefc39663e336229db82fe943",
    "multiTroveGetter": "0x8f9a56d0f860cc2c91e4a21ea7e60c9323cf1d10"
  },
  "erc8004": {
    "identityRegistry": "0x993C9150f074435BA79033300834FcE06897de9B",
    "reputationRegistry": "0x3E5E194e39b777F568c9a261f46a5DCC43840726",
    "validationRegistry": "0x84b9B2121187155C1c85bA6EA34e35c981BbA023"
  }
}
```

Also available at `deployments/addresses.json` and through `@snowball/shared` package for types and ABIs.

## Verified Live Data (Testnet)

The following was verified via E2E testing:

- **wCTC Branch:** Trove opened with 5,000 wCTC collateral, 200 sbUSD debt, CR ~499%
- **lstCTC Branch:** Trove opened with 5,000 lstCTC collateral, 200 sbUSD debt, CR ~524%
- **Minimum debt:** 200 sbUSD per Trove
- **Mock prices:** wCTC = $0.20, lstCTC = $0.21 (1.05x exchange rate)
- **All API endpoints tested and functional on ports 3000, 3001, 3002**
