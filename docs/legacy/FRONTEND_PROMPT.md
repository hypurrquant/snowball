# Snowball 프론트엔드 구현 프롬프트

> Version: v1.0.0 | Status: Archive
> [INDEX](INDEX.md)

아래 프롬프트를 Gemini(또는 프론트엔드 담당 AI)에게 그대로 전달하세요.

---

# 프롬프트 시작

---

Snowball이라는 DeFi 프로젝트의 프론트엔드를 React + TypeScript로 구현해줘.

## 프로젝트 개요

**Snowball**은 Creditcoin 네트워크 위의 AI Agent DeFi 플랫폼이야.
- CTC(Creditcoin) 홀더가 담보를 예치하면 sbUSD(스테이블코인)를 빌릴 수 있는 CDP(Liquity V2 포크) 시스템
- AI 에이전트가 포지션을 자동 관리 (CR 모니터링, 리밸런싱, 청산 방지)
- 챗봇으로 포지션 상담, 전략 추천, DeFi 교육

**슬로건:** "더 이상 홀딩만 하지 마세요. 굴리세요." / "Stop holding. Start snowballing."

## 디자인 방향

- **다크 테마** 필수
- **컬러:** 다크 배경(#0a0a0f ~ #111827) + 아이스 블루(#60a5fa, #93c5fd) + 화이트 포인트
- **브랜딩:** 눈덩이가 굴러가면서 커지는 비주얼 메타포
- **UI 레퍼런스:**
  - Felix Protocol (https://www.usefelix.xyz/stats) — CDP Stats/Borrow/Earn 페이지 레이아웃 참고
  - ARMA by Giza (https://arma.xyz) — 랜딩 페이지, "Launch Agent" CTA, 에이전트 상태 표시 참고

## 기술 스택

```
React 18 + TypeScript
Vite (빌드)
TailwindCSS (스타일링, 다크 테마)
viem + wagmi (Web3 지갑 연결)
@tanstack/react-query (서버 상태 관리)
React Router v6 (라우팅)
recharts (차트)
lucide-react (아이콘)
```

## Creditcoin 테스트넷 체인 설정

```typescript
import { defineChain } from 'viem'

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
})
```

## 페이지 구성 (총 7개)

### Page 1: Landing (`/`)

ARMA 스타일 랜딩 페이지.

```
┌────────────────────────────────────────────────┐
│  [❄ Snowball Logo]              [Launch App]   │
├────────────────────────────────────────────────┤
│                                                │
│     더 이상 홀딩만 하지 마세요.                    │
│     굴리세요.                                    │
│                                                │
│     AI Agent가 당신의 CTC를 자동으로 굴립니다.     │
│     담보 예치, 스테이블코인 발행, 수익 최적화까지.   │
│                                                │
│              [Launch Agent ➜]                   │
│                                                │
│  ┌──────┐  ┌──────────┐  ┌──────┐  ┌────────┐ │
│  │ TVL  │  │ Total    │  │ sbUSD│  │ Active │ │
│  │ $XXX │  │ Borrowed │  │ $1.00│  │ Agents │ │
│  └──────┘  └──────────┘  └──────┘  └────────┘ │
├────────────────────────────────────────────────┤
│  How Snowball Works                            │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │1. Deposit│  │2. Agent │  │3. Earn  │       │
│  │  CTC    │  │  Manages│  │  sbUSD  │       │
│  └─────────┘  └─────────┘  └─────────┘       │
├────────────────────────────────────────────────┤
│  Agent vs Manual 수익 비교 차트                  │
├────────────────────────────────────────────────┤
│  Footer: Docs | Twitter | Discord              │
└────────────────────────────────────────────────┘
```

- 상단 통계 카드는 `GET /api/protocol/stats` 로 가져옴
- [Launch App] 버튼 → `/dashboard` 이동

### Page 2: Dashboard (`/dashboard`)

지갑 연결 후 메인 화면. Felix 스타일 좌측 사이드바 + ARMA 스타일 에이전트 상태.

```
┌──────────┬─────────────────────────────────────┐
│ ❄Snowball│  [Network: Creditcoin]  [0xAb..cD]  │
│          │                                     │
│ Dashboard│  ┌─── Agent Status ───────────────┐ │
│ Borrow   │  │ 🟢 Active | Strategy: Safe CR  │ │
│ Earn     │  │ Last action: CR adjusted 2h ago │ │
│ Stats    │  └────────────────────────────────┘ │
│ Agent    │                                     │
│ ──────── │  ┌─── My Positions ──────────────┐ │
│ Chat 💬  │  │                                │ │
│          │  │  Trove #1 (wCTC)               │ │
│          │  │  Collateral: 5,000 wCTC ($1K)  │ │
│          │  │  Debt: 500 sbUSD               │ │
│          │  │  CR: 200% ████████░░ MCR:110%  │ │
│          │  │  Interest: 5.0% APR            │ │
│          │  │  Liquidation Price: $0.11       │ │
│          │  │  [Adjust] [Close]              │ │
│          │  │                                │ │
│          │  └────────────────────────────────┘ │
│          │                                     │
│          │  ┌─── Agent Activity Log ─────────┐ │
│          │  │ 14:32 CR 조정 180%→200% (wCTC) │ │
│          │  │ 12:01 가격 모니터링 정상         │ │
│          │  │ 09:15 SP 보상 수확 +2.3 sbUSD  │ │
│          │  └────────────────────────────────┘ │
└──────────┴─────────────────────────────────────┘
```

- 좌측 사이드바: 네비게이션 (Dashboard, Borrow, Earn, Stats, Agent, Chat)
- 상단 우측: 지갑 연결 버튼 (wagmi ConnectButton)
- Agent Status: `GET /api/agents/1/history` 로 최근 활동
- My Positions: `GET /api/user/:address/positions`
- CR 프로그레스바: CR값을 MCR~300% 범위로 시각화 (빨강~초록 그라데이션)

### Page 3: Borrow (`/borrow`)

Felix /borrow 스타일. Trove 열기 폼.

```
┌──────────┬─────────────────────────────────────┐
│ Sidebar  │  Open a Position                    │
│          │                                     │
│          │  Collateral: [wCTC ▼] [lstCTC]      │
│          │                                     │
│          │  Deposit Amount                     │
│          │  ┌────────────────────────────────┐ │
│          │  │ 1,000              wCTC        │ │
│          │  └────────────────────────────────┘ │
│          │  Balance: 5,000 wCTC                │
│          │                                     │
│          │  Borrow Amount                      │
│          │  ┌────────────────────────────────┐ │
│          │  │ 500                sbUSD       │ │
│          │  └────────────────────────────────┘ │
│          │                                     │
│          │  Interest Rate                      │
│          │  ┌────────────────────────────────┐ │
│          │  │ 5.0% APR     ◄━━━━●━━━━━━━►   │ │
│          │  └────────────────────────────────┘ │
│          │  ⓘ 낮은 이자율 = 저비용, 높은 상환위험 │
│          │  ⓘ 높은 이자율 = 고비용, 낮은 상환위험 │
│          │                                     │
│          │  ┌─ Position Summary ─────────────┐ │
│          │  │ Collateral Ratio: 200%         │ │
│          │  │ Liquidation Price: $0.11       │ │
│          │  │ 7-day Upfront Fee: 0.96 sbUSD  │ │
│          │  └────────────────────────────────┘ │
│          │                                     │
│          │  ☐ Let Agent manage this position   │
│          │     (AI가 CR, 이자율을 자동 관리)     │
│          │                                     │
│          │  [Open Position]                    │
└──────────┴─────────────────────────────────────┘
```

- 담보 토큰 선택: wCTC / lstCTC 탭 전환
- 잔액 표시: `GET /api/user/:address/balance`
- 이자율 슬라이더: 0.5% ~ 25% 범위
- Position Summary: 실시간 계산 (프론트에서)
  - CR = (담보 × 가격) / 부채 × 100
  - 청산가 = (부채 × MCR) / 담보
  - Upfront Fee = 부채 × 이자율 × 7/365
- "Let Agent manage" 체크박스: 에이전트 자동 관리 여부
- [Open Position] 클릭 → `POST /api/agent/execute` with action: "openTrove"
- 가격은 컨트랙트 직접 호출: `MockPriceFeed.lastGoodPrice()`

### Page 4: Earn (`/earn`)

Felix /earn 스타일. Stability Pool 예치/인출.

```
┌──────────┬─────────────────────────────────────┐
│ Sidebar  │  Stability Pools                    │
│          │                                     │
│          │  ┌─ wCTC Pool ────────────────────┐ │
│          │  │ Total Deposits: 50,000 sbUSD   │ │
│          │  │ APY: 6.5%                      │ │
│          │  │ My Deposit: 1,000 sbUSD        │ │
│          │  │ My Rewards: +12.3 wCTC         │ │
│          │  │ [Deposit] [Withdraw] [Claim]   │ │
│          │  └────────────────────────────────┘ │
│          │                                     │
│          │  ┌─ lstCTC Pool ──────────────────┐ │
│          │  │ Total Deposits: 30,000 sbUSD   │ │
│          │  │ APY: 7.1%                      │ │
│          │  │ My Deposit: 0 sbUSD            │ │
│          │  │ [Deposit]                      │ │
│          │  └────────────────────────────────┘ │
└──────────┴─────────────────────────────────────┘
```

- 브랜치별 SP 카드 2개
- 풀 통계: `GET /api/protocol/markets` 에서 spDeposits, spAPY
- 개인 예치: 컨트랙트 직접 호출
  - `StabilityPool.getCompoundedBoldDeposit(address)` → 내 예치량
  - `StabilityPool.getDepositorCollGain(address)` → 내 보상
- Deposit/Withdraw/Claim 버튼은 컨트랙트 직접 TX (wagmi useWriteContract)

### Page 5: Stats (`/stats`)

Felix /stats 와 동일한 레이아웃.

```
┌──────────┬─────────────────────────────────────┐
│ Sidebar  │  General                            │
│          │  ┌──────────┐┌──────────┐┌────────┐ │
│          │  │Total Coll││Total Borr││sbUSD   │ │
│          │  │$XX,XXX   ││$XX,XXX   ││$1.00   │ │
│          │  └──────────┘└──────────┘└────────┘ │
│          │                                     │
│          │  Individual Markets                 │
│          │  ┌────────────────────────────────┐ │
│          │  │Coll │TotalColl│CR/MCR │CCR│LTV│ │
│          │  │─────│─────────│───────│───│───│ │
│          │  │wCTC │$XXX     │XX%/110│150│XX%│ │
│          │  │lstC │$XXX     │XX%/120│160│XX%│ │
│          │  └────────────────────────────────┘ │
│          │  (+ Avg Interest, SP Deposits, APY) │
└──────────┴─────────────────────────────────────┘
```

- 상단 카드: `GET /api/protocol/stats`
- 마켓 테이블: `GET /api/protocol/markets`
- 10초마다 자동 리프레시 (react-query refetchInterval)

### Page 6: Agent (`/agent`)

ARMA 스타일 에이전트 관리.

```
┌──────────┬─────────────────────────────────────┐
│ Sidebar  │  Your Snowball Agent                │
│          │                                     │
│          │  Status: 🟢 Active                  │
│          │  Strategy: Conservative (CR > 200%) │
│          │  Managed Positions: 2               │
│          │  Total Value Managed: $2,500        │
│          │                                     │
│          │  ┌─ Agent Settings ───────────────┐ │
│          │  │ Min CR Target:  [200%] ◄━●━━►  │ │
│          │  │ Auto-Rebalance: [ON]           │ │
│          │  │ Liquidation Alert: [ON]        │ │
│          │  │ Strategy: [Conservative ▼]     │ │
│          │  │   - Conservative: CR > 200%    │ │
│          │  │   - Moderate: CR > 160%        │ │
│          │  │   - Aggressive: CR > 130%      │ │
│          │  └────────────────────────────────┘ │
│          │                                     │
│          │  ┌─ Agent Reputation (ERC-8004) ──┐ │
│          │  │ CDP Provider Agent             │ │
│          │  │ Score: 4.8/5.0 (32 reviews)    │ │
│          │  │ Success Rate: 98.5%            │ │
│          │  │ Uptime: 99.9%                  │ │
│          │  │ Avg Response: 2.3s             │ │
│          │  └────────────────────────────────┘ │
│          │                                     │
│          │  ┌─ Activity History ─────────────┐ │
│          │  │ 시간순 에이전트 액션 로그          │ │
│          │  │ (TX hash → Blockscout 링크)     │ │
│          │  └────────────────────────────────┘ │
└──────────┴─────────────────────────────────────┘
```

- 에이전트 목록: `GET /api/agents`
- 평판: `GET /api/agents/:id/reputation`
- 활동 이력: `GET /api/agents/:id/history`
- TX hash 링크: `https://creditcoin-testnet.blockscout.com/tx/{hash}`

### Page 7: Chat (`/chat`)

전체 페이지 챗봇 + 모든 페이지에 우측 하단 플로팅 버블(💬).

```
┌──────────┬─────────────────────────────────────┐
│ Sidebar  │  Snowball Assistant                 │
│          │                                     │
│          │  ┌────────────────────────────────┐ │
│          │  │ 🤖 안녕하세요! Snowball         │ │
│          │  │    어시스턴트입니다.              │ │
│          │  │    무엇을 도와드릴까요?           │ │
│          │  │                                │ │
│          │  │ 👤 내 포지션 안전한가요?          │ │
│          │  │                                │ │
│          │  │ 🤖 현재 wCTC Trove의 CR은      │ │
│          │  │    200%로 MCR(110%) 대비       │ │
│          │  │    충분히 안전합니다...           │ │
│          │  └────────────────────────────────┘ │
│          │                                     │
│          │  Quick Actions:                     │
│          │  [내 포지션 요약] [전략 추천]         │
│          │  [청산이 뭐예요?] [이자율 설명]       │
│          │                                     │
│          │  ┌────────────────────────┐         │
│          │  │ 메시지를 입력하세요...   │ [Send]  │
│          │  └────────────────────────┘         │
└──────────┴─────────────────────────────────────┘
```

- 챗봇 API (포트 3002): `POST http://localhost:3002/api/chat`
- Quick Action 버튼: 클릭하면 해당 텍스트를 메시지로 전송
- suggestedActions 응답을 버튼으로 렌더링
- relatedData가 있으면 CR 게이지 등 시각화 인라인 표시
- 플로팅 버블: 우측 하단 고정, 클릭 시 미니 챗 팝업 (높이 400px 정도)

## API 엔드포인트 상세

### Base URL
- 메인 API: `http://localhost:3000/api`
- 챗봇 API: `http://localhost:3002/api`

### 프로토콜 통계

```
GET /api/protocol/stats
→ {
    totalCollateralUSD: "34286322.90",
    totalBorrowedUSD: "16194181.02",
    sbUSDPrice: "1.00",
    activeAgents: 2
  }

GET /api/protocol/markets
→ [
    {
      branch: 0,
      collateralSymbol: "wCTC",
      collateralAddress: "0x...",
      totalCollateral: "1000000000000000000000",
      totalCollateralUSD: "200000.00",
      currentCR: "198.22",
      mcr: "110.00",
      ccr: "150.00",
      ltv: "90.91",
      totalBorrow: "100000000000000000000",
      avgInterestRate: "5.32",
      spDeposits: "50000000000000000000",
      spAPY: "6.56"
    },
    { branch: 1, collateralSymbol: "lstCTC", ...same structure }
  ]
```

### 유저 포지션

```
GET /api/user/0xABC.../positions
→ [
    {
      troveId: 1,
      branch: 0,
      collateralSymbol: "wCTC",
      collateral: "5000000000000000000000",    // wei
      collateralUSD: "1000.00",
      debt: "500000000000000000000",            // wei
      cr: "200.00",
      interestRate: "5.00",
      liquidationPrice: "0.11",
      agentManaged: true,
      agentStrategy: "conservative",
      status: "active"
    }
  ]

GET /api/user/0xABC.../balance
→ {
    nativeCTC: "10000000000000000000000",
    wCTC: "5000000000000000000000",
    lstCTC: "3000000000000000000000",
    sbUSD: "1500000000000000000000"
  }
```

주의: collateral, debt, balance 등의 값은 모두 **wei (18 decimals)** 문자열이야.
프론트에서 `formatEther()`로 변환해서 표시해줘.

### 에이전트 액션

```
POST /api/agent/recommend
Body: {
  userAddress: "0xABC...",
  collateralType: "wCTC",         // "wCTC" 또는 "lstCTC"
  amount: "1000000000000000000000", // 담보량 (wei)
  riskLevel: "conservative"        // "conservative" | "moderate" | "aggressive"
}
→ {
    strategy: "conservative",
    recommendedCR: 200,
    recommendedDebt: "500000000000000000000",
    recommendedInterestRate: "50000000000000000",
    estimatedAPY: "3.5",
    liquidationPrice: "0.11",
    reasoning: "현재 시장 변동성이 낮아 200% CR이 적절합니다..."
  }

POST /api/agent/execute
Body: {
  userAddress: "0xABC...",
  action: "openTrove",              // "openTrove" | "adjustTrove" | "closeTrove"
  params: {
    branch: 0,                      // 0=wCTC, 1=lstCTC
    collateralAmount: "1000000000000000000000",
    debtAmount: "500000000000000000000",
    interestRate: "50000000000000000",  // 5% = 0.05e18
    agentManaged: true
  }
}
→ {
    txHash: "0x...",
    troveId: 42,
    status: "success",
    unsignedTx: { to, data, value, gasLimit, chainId }
  }

POST /api/agent/close
Body: {
  userAddress: "0xABC...",
  params: { branch: 0, troveId: 42 }
}
```

### 상담봇

```
POST http://localhost:3002/api/chat
Body: {
  userAddress: "0xABC...",
  message: "내 포지션 안전한가요?",
  conversationId: "uuid"            // 첫 메시지면 생략
}
→ {
    reply: "현재 wCTC Trove의 CR은 200%로...",
    conversationId: "uuid",
    suggestedActions: ["포지션 요약 보기", "CR 조정하기"],
    relatedData: {
      currentCR: "200.00",
      liquidationPrice: "0.11",
      healthStatus: "safe"           // "safe" | "warning" | "danger"
    }
  }

GET http://localhost:3002/api/chat/history?conversationId=uuid
→ {
    conversationId: "uuid",
    messages: [
      { role: "user", content: "...", timestamp: 1234567890 },
      { role: "assistant", content: "...", timestamp: 1234567891 }
    ]
  }
```

### 관리자 (테스트넷)

```
POST /api/admin/set-price
Body: { branch: 0, price: "200000000000000000" }  // $0.20

POST /api/admin/mint-tokens
Body: { token: "wCTC", to: "0xABC...", amount: "10000000000000000000000" }  // 10,000

POST /api/admin/set-exchange-rate
Body: { rate: "1050000000000000000" }  // 1.05 (5% staking yield)
```

## 컨트랙트 직접 호출 (프론트에서)

REST API 외에 실시간성이 필요한 데이터는 viem으로 컨트랙트를 직접 읽어.

```typescript
// 가격 조회
const price = await publicClient.readContract({
  address: priceFeedAddress,
  abi: [{ type: 'function', name: 'lastGoodPrice', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' }],
  functionName: 'lastGoodPrice',
})
// → 200000000000000000n (= $0.20, 18 decimals)

// 유저 Trove NFT 개수
const count = await publicClient.readContract({
  address: troveNFTAddress,
  abi: [{ type: 'function', name: 'balanceOf', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' }],
  functionName: 'balanceOf',
  args: [userAddress],
})

// SP 총 예치
const spDeposits = await publicClient.readContract({
  address: stabilityPoolAddress,
  abi: [{ type: 'function', name: 'getTotalBoldDeposits', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' }],
  functionName: 'getTotalBoldDeposits',
})

// ERC-20 잔액
const balance = await publicClient.readContract({
  address: tokenAddress,
  abi: [{ type: 'function', name: 'balanceOf', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' }],
  functionName: 'balanceOf',
  args: [userAddress],
})

// ERC-20 approve (TX 전에 필요)
const hash = await walletClient.writeContract({
  address: wCTCAddress,
  abi: [{ type: 'function', name: 'approve', inputs: [{ type: 'address', name: 'spender' }, { type: 'uint256', name: 'amount' }], outputs: [{ type: 'bool' }], stateMutability: 'nonpayable' }],
  functionName: 'approve',
  args: [borrowerOperationsAddress, collAmount],
})
```

## 컨트랙트 주소

아래가 실제 배포된 주소야. `src/config/addresses.json`으로 넣어줘.

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

## 프로젝트 구조 (권장)

```
packages/frontend/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── config/
│   │   ├── addresses.json          # 컨트랙트 주소
│   │   ├── chain.ts               # creditcoinTestnet 정의
│   │   ├── wagmi.ts               # wagmi config
│   │   └── api.ts                 # API base URL
│   ├── hooks/
│   │   ├── useProtocolStats.ts    # react-query: GET /api/protocol/stats
│   │   ├── useMarkets.ts          # react-query: GET /api/protocol/markets
│   │   ├── useUserPositions.ts    # react-query: GET /api/user/:addr/positions
│   │   ├── useUserBalance.ts      # react-query: GET /api/user/:addr/balance
│   │   ├── useAgentRecommend.ts   # mutation: POST /api/agent/recommend
│   │   ├── useAgentExecute.ts     # mutation: POST /api/agent/execute
│   │   ├── useChat.ts             # mutation: POST /api/chat (port 3002)
│   │   └── usePrice.ts            # 컨트랙트 직접 호출
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── AppLayout.tsx
│   │   ├── common/
│   │   │   ├── StatCard.tsx        # 통계 카드
│   │   │   ├── CRGauge.tsx         # CR 프로그레스바 (빨강→초록)
│   │   │   ├── TokenAmount.tsx     # wei → 사람읽기 변환
│   │   │   └── TxLink.tsx          # Blockscout TX 링크
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx      # 채팅 UI
│   │   │   ├── ChatBubble.tsx      # 메시지 버블
│   │   │   ├── FloatingChat.tsx    # 우측 하단 플로팅 챗
│   │   │   └── QuickActions.tsx    # 빠른 액션 버튼
│   │   ├── positions/
│   │   │   ├── TroveCard.tsx       # 개별 Trove 카드
│   │   │   └── PositionsList.tsx   # Trove 목록
│   │   ├── borrow/
│   │   │   ├── CollateralInput.tsx
│   │   │   ├── DebtInput.tsx
│   │   │   ├── InterestSlider.tsx
│   │   │   └── PositionSummary.tsx
│   │   └── agent/
│   │       ├── AgentStatus.tsx
│   │       ├── AgentSettings.tsx
│   │       └── ActivityLog.tsx
│   └── pages/
│       ├── Landing.tsx
│       ├── Dashboard.tsx
│       ├── Borrow.tsx
│       ├── Earn.tsx
│       ├── Stats.tsx
│       ├── Agent.tsx
│       └── Chat.tsx
```

## 핵심 구현 사항

### 1. 지갑 연결
- wagmi의 `useConnect`, `useAccount`, `useDisconnect` 사용
- MetaMask / WalletConnect 지원
- 연결 시 Creditcoin Testnet(102031) 자동 체인 전환
- 지갑 미연결 시 Landing 페이지만 접근 가능

### 2. 숫자 포맷팅
- 모든 on-chain 값은 18 decimals wei 문자열
- `viem`의 `formatEther()`로 변환
- 금액: 소수점 2자리, 천단위 콤마
- CR: 소수점 2자리 + "%" 표시
- 이자율: 소수점 2자리 + "% APR"

### 3. CR 시각화
```
CR >= 200%  → 초록색 🟢
150% <= CR < 200%  → 노란색 🟡
MCR <= CR < 150%   → 빨간색 🔴
```
프로그레스바로 MCR~300% 범위를 시각화.

### 4. TX 흐름 (Borrow 페이지)
1. 유저가 담보/부채/이자율 입력
2. [Open Position] 클릭
3. `POST /api/agent/recommend`로 전략 확인 (선택사항)
4. ERC-20 approve TX 전송 (담보 토큰 → BorrowerOperations)
5. `POST /api/agent/execute`로 unsigned TX 데이터 받기
6. wagmi `useSendTransaction`으로 TX 서명/전송
7. TX 확인 후 포지션 목록 리프레시

### 5. 반응형
- 데스크톱: 사이드바 + 메인 컨텐츠
- 모바일: 하단 탭 네비게이션, 사이드바 숨김

### 6. 에러 처리
- API 호출 실패 시 토스트 알림
- 지갑 미연결 시 "지갑을 연결하세요" 안내
- TX 실패 시 에러 메시지 + Blockscout 링크

## 중요 참고사항

- **모든 금액은 wei (18 decimals) 문자열**이야. 반드시 `formatEther()`로 변환해서 표시해줘.
- **이자율도 18 decimals**야. 5% = "50000000000000000" (0.05 × 1e18). 표시할 때 × 100 해서 퍼센트로.
- **branch 0 = wCTC**, **branch 1 = lstCTC**
- 챗봇 API는 **포트 3002**야. 메인 API는 포트 3000.
- `unsignedTx` 응답의 `data` 필드를 그대로 `useSendTransaction`에 넣으면 돼.
- TX hash 링크: `https://creditcoin-testnet.blockscout.com/tx/${txHash}`
- **최소 부채(Minimum Debt)는 200 sbUSD**야. Trove를 열 때 200 sbUSD 이상 빌려야 해.
- **Mock 가격:** wCTC = $0.20, lstCTC = $0.21 (환율 1.05)
- **MCR:** wCTC = 110%, lstCTC = 120%
- **CCR:** wCTC = 150%, lstCTC = 160%

## E2E 검증 완료 (테스트넷)

아래 사항이 실제 Creditcoin Testnet에서 검증 완료됐어:

1. wCTC Trove 오픈: 5,000 wCTC 담보 → 200 sbUSD 부채 → CR ~499%
2. lstCTC Trove 오픈: 5,000 lstCTC 담보 → 200 sbUSD 부채 → CR ~524%
3. `GET /api/protocol/stats` → TVL $2,050, Total Debt $400.38
4. `GET /api/protocol/markets` → 2개 브랜치 정보 정상
5. `GET /api/user/:address/positions` → 2개 Trove 정보 정상
6. `GET /api/user/:address/balance` → 토큰 잔액 정상
7. `POST /api/agent/recommend` → 전략 추천 정상
8. `POST /api/agent/execute` → Trove 오픈 TX 성공
9. `POST /api/chat` → 챗봇 응답 정상
10. `GET /api/agents` → 2개 에이전트 (Consumer, CDP Provider) 정상

---

# 프롬프트 끝
