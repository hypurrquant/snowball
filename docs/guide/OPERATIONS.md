# Snowball — 전체 운영 플로우 & 기능 상세 & 유저 플로우

> Version: v0.3.0 | Status: Active
> Last updated: 2026-02-25
> [INDEX](../INDEX.md)

---

## 목차

1. [시스템 전체 아키텍처](#1-시스템-전체-아키텍처)
2. [운영 구성 요소](#2-운영-구성-요소)
3. [기능별 상세 설명](#3-기능별-상세-설명)
4. [유저 플로우](#4-유저-플로우)
5. [운영 플로우 (Operator)](#5-운영-플로우-operator)
6. [배포된 컨트랙트 주소](#6-배포된-컨트랙트-주소)
7. [API 엔드포인트](#7-api-엔드포인트)
8. [Docker 운영](#8-docker-운영)
9. [모니터링 & 장애 대응](#9-모니터링--장애-대응)

---

## 1. 시스템 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              사용자 (브라우저)                                 │
│                                                                             │
│  ┌─────────────────────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ apps/web            │  │ snowball-app  │  │ snowball-dex      │  │
│  │ (Next.js 16, Port 3000)     │  │ (Vite/React,  │  │ (Next.js 14)      │  │
│  │                              │  │  Port 5173)   │  │                   │  │
│  │ Swap│Pool│Lend│Borrow│Earn  │  │ Borrow│Earn   │  │ Swap│Pool│        │  │
│  │ Option│Chat│Agent│Analytics │  │ Lend│Agent    │  │ Positions│        │  │
│  │                              │  │ Chat│Stats    │  │ Analytics         │  │
│  │ Privy Auth + wagmi 3.5      │  │ Privy Auth    │  │ RainbowKit        │  │
│  │ + viem 2.46                 │  │ + wagmi 2.13  │  │ + wagmi 2.12      │  │
│  └──────────┬───────────────────┘  └──────┬───────┘  └────────┬──────────┘  │
└─────────────┼──────────────────────────────┼───────────────────┼─────────────┘
              │ 온체인 TX                     │ REST/WS           │ 온체인 TX
              │                              │                   │
              ▼                              ▼                   ▼
┌─────────────────────────────────────┐   ┌─────────────────────────────────┐
│    Creditcoin Testnet (102031)      │   │   Backend (FastAPI, Python)     │
│                                     │   │   Port 8000                     │
│  ┌─────────┐ ┌─────────┐           │   │                                 │
│  │Uniswap V3│ │ Liquity │           │   │  ┌──────────────┐ ┌──────────┐ │
│  │   DEX    │ │ V2 Fork │           │   │  │ Oracle Svc   │ │ Price WS │ │
│  │ (Swap,   │ │ (Borrow,│           │   │  │ (Binance WS) │ │ /ws/price│ │
│  │  Pool)   │ │  Earn)  │           │   │  └──────────────┘ └──────────┘ │
│  └─────────┘ └─────────┘           │   │  ┌──────────────┐ ┌──────────┐ │
│  ┌─────────┐ ┌─────────┐           │   │  │ FIFO Matching│ │Settlement│ │
│  │ Morpho   │ │ Options │◄──────────┼───│  │ Engine       │ │ Bot (5s) │ │
│  │ Blue     │ │ Protocol│           │   │  └──────────────┘ └──────────┘ │
│  │ (Lend)   │ │ (UUPS)  │           │   │  ┌──────────────┐              │
│  └─────────┘ └─────────┘           │   │  │ Relayer Flush│              │
│  ┌─────────┐ ┌─────────┐           │   │  │ (3s 주기)    │              │
│  │ Yield    │ │ BTC Mock│◄──────────┼───│  └──────────────┘              │
│  │ Vaults   │ │ Oracle  │           │   │                                 │
│  │ (Beefy)  │ │         │           │   │  Docker: snowball-backend       │
│  └─────────┘ └────▲────┘           │   └─────────────────────────────────┘
│  ┌─────────┐      │                │              │
│  │ ERC-8004│      │                │              │
│  │ Agent   │      │ updatePrice()  │              │
│  └─────────┘      │ (10초 주기)     │              │
└───────────────────┼─────────────────┘              │
                    └────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│          snowball-app Agents (Express.js)            │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐│
│  │ Consumer API  │  │ Provider A2A │  │ Chatbot    ││
│  │ Port 3000     │  │ Port 3001    │  │ Port 3002  ││
│  │ (모니터링)     │  │ (TX 빌더)    │  │ (AI 대화)  ││
│  └──────────────┘  └──────────────┘  └────────────┘│
└─────────────────────────────────────────────────────┘
```

### 핵심 데이터 흐름

```
① Binance WS → Backend → BTCMockOracle (온체인, 10초)
② 유저 주문(EIP-712) → Backend API → FIFO 매칭 → OptionsRelayer(온체인)
③ 라운드 만기 → Settlement Bot → SnowballOptions.settleOrders()(온체인)
④ 유저 TX (Swap/Borrow/Lend) → 프론트엔드 wagmi → 직접 온체인
⑤ Agent Consumer → 포지션 모니터링 → Provider A2A → 자동 TX 실행
```

---

## 2. 운영 구성 요소

### 2.1 프론트엔드 (3개 앱)

#### `apps/web/` — 통합 프로토콜 UI (메인)

| 항목 | 값 |
|------|-----|
| 프레임워크 | Next.js 16.1.6 + React 19.2.4 |
| 인증 | Privy (이메일/구글/지갑 + 임베디드 지갑) |
| 체인 연결 | wagmi 3.5.0 + viem 2.46.3 |
| 상태관리 | Zustand 5.0.11 + TanStack Query 5.90.21 |
| 차트 | Lightweight Charts 5.1.0 + Recharts 3.7.0 |
| UI | Radix UI + Tailwind CSS 4.2.1 + Shadcn |
| 포트 | 3000 |
| Docker | `snowball-frontend` 컨테이너 (Node 22 Alpine) |
| 테스트 | Playwright 1.58.2 (77 specs, 100% pass) |

**라우트:**
- `/` — 랜딩 페이지
- `/swap` — 토큰 스왑
- `/pool`, `/pool/add`, `/pool/[id]` — 유동성 풀
- `/lend`, `/lend/markets`, `/lend/positions` — 렌딩
- `/borrow` — CDP 대출
- `/earn` — Stability Pool
- `/options`, `/options/history` — 바이너리 옵션
- `/chat` — AI 채팅
- `/agent` — 에이전트 관리
- `/dashboard` — 대시보드
- `/analytics` — 프로토콜 분석

#### `snowball-app/packages/app/` — AI 렌딩 플랫폼

| 항목 | 값 |
|------|-----|
| 프레임워크 | Vite 5.4.11 + React 18.3.1 |
| 라우팅 | React Router DOM 6.28.0 |
| 인증 | Privy (@privy-io/react-auth ^3.14.1) |
| 체인 연결 | wagmi 2.13.5 + viem 2.21.54 |
| 포트 | 5173 (Vite dev) |
| Docker | 없음 (독립 실행) |

**라우트:** `/`, `/dashboard`, `/borrow`, `/earn`, `/stats`, `/lend`, `/lend/markets`, `/lend/markets/:id`, `/lend/positions`, `/agent`, `/chat`

#### `snowball-dex/` — DEX 전용 UI

| 항목 | 값 |
|------|-----|
| 프레임워크 | Next.js 14.2.15 + React 18.3.1 |
| 인증 | RainbowKit 2.1.0 |
| 체인 연결 | wagmi 2.12.0 + viem 2.17.0 |
| 포트 | 3000 (독립 실행) |
| Docker | 없음 (독립 실행) |

**라우트:** `/`, `/positions`, `/pool`, `/pool/add`, `/pool/[id]`, `/analytics`

### 2.2 백엔드 (`backend/`)

| 항목 | 값 |
|------|-----|
| 프레임워크 | Python 3.12 + FastAPI + asyncio |
| 가격 소스 | Binance WebSocket (1차) + CoinGecko REST (fallback) |
| 가격 캐시 | 86,400 ticks (24시간 @1/sec), OHLCV 집계 |
| 오라클 푸시 | 10초 간격 (설정: `ORACLE_PUSH_INTERVAL`) |
| 정산 폴링 | 5초 간격 (설정: `SETTLEMENT_POLL_INTERVAL`) |
| Relayer Flush | 3초 간격 |
| 라운드 시간 | 300초 / 5분 (설정: `ROUND_DURATION`) |
| 배치 크기 | 50 (설정: `BATCH_SIZE`) |
| 포트 | 8000 |
| Docker | `snowball-backend` 컨테이너 (Python 3.12 slim) |

### 2.3 Agent 서비스 (`snowball-app/packages/`)

| 서비스 | 패키지 | 포트 | 역할 |
|--------|--------|------|------|
| Agent Consumer | `agent-consumer` | 3000 | REST API + 포지션 모니터링 |
| Agent Provider | `agent-provider` | 3001 | A2A 프로토콜, TX 빌더 |
| Agent Chatbot | `agent-chatbot` | 3002 | AI 대화 (OpenAI + fallback) |

### 2.4 스마트 컨트랙트

| 프로토콜 | 패키지 | 컨트랙트 수 | 패턴 | 빌드 |
|----------|--------|-------------|------|------|
| Uniswap V3 DEX | `@uniswap/v3-core`, `v3-periphery` | ~80 | Standard Uniswap V3 | Foundry |
| Liquity V2 | `packages/liquity` | ~50 (x2 브랜치) | Ownable, ERC721 | Hardhat + Foundry |
| Morpho Blue | `packages/morpho` | ~9 | ERC4626 | Foundry |
| BTC Oracle | `packages/oracle` | 2 | AccessControl | Foundry |
| Options Protocol | `packages/options` | 8 | UUPS Proxy | Foundry |
| Yield Vaults | `packages/yield` | ~10 | Beefy V7, ReentrancyGuard | Foundry |
| ERC-8004 Agent | `packages/erc-8004` | 3 | ERC721URIStorage | Hardhat |

### 2.5 항시 구동 프로세스

| 프로세스 | 위치 | 역할 | 주기 |
|----------|------|------|------|
| Oracle Push Loop | `backend/app/oracle/service.py` | BTC 가격 → 온체인 | 10초 |
| Binance WS Feed | `backend/app/oracle/sources.py` | 실시간 가격 수신 | 실시간 |
| Price Broadcast | `backend/app/price/websocket.py` | WS /ws/price 브로드캐스트 | 1초 |
| Settlement Loop | `backend/app/options/settlement.py` | 만기 라운드 정산 | 5초 |
| Relayer Flush | `backend/app/options/relayer.py` | 매칭된 주문 배치 제출 | 3초 |

---

## 3. 기능별 상세 설명

### 3.1 Swap (토큰 스왑)

**프로토콜:** Uniswap V3 (집중 유동성 AMM)
**라우트:** `/swap` (apps/web), `/` (snowball-dex)
**앱:** apps/web, snowball-dex

**기능:**
- 4개 토큰 간 스왑 (wCTC, lstCTC, sbUSD, USDC)
- Dynamic Fee Plugin에 의한 자동 수수료 조정
- QuoterV2를 통한 실시간 견적
- 슬리피지 보호 (기본 0.5%)

**컨트랙트 호출 순서:**
```
1. QuoterV2.quoteExactInputSingle() → 예상 출력량 조회
2. ERC20.approve(Router, amount)     → 토큰 승인
3. Router.exactInputSingle()         → 스왑 실행
```

**풀 목록:**

| 풀 | 카테고리 |
|----|----------|
| wCTC / USDC | Major |
| wCTC / sbUSD | Major |
| sbUSD / USDC | Stablecoin |
| lstCTC / wCTC | Correlated |

---

### 3.2 Pool (유동성 공급)

**라우트:** `/pool`, `/pool/add`, `/pool/[id]`
**앱:** apps/web, snowball-dex

**기능:**
- 집중 유동성 포지션 생성 (틱 범위 지정)
- 4가지 범위 프리셋: Full / Safe / Common / Expert
- 포지션은 NFT로 발행 (NonfungiblePositionManager)
- 수수료 수집 (collect)

**컨트랙트 호출:**
```
1. ERC20.approve(NFTManager, amount0)  → token0 승인
2. ERC20.approve(NFTManager, amount1)  → token1 승인
3. NFTManager.mint({
     token0, token1, tickLower, tickUpper,
     amount0Desired, amount1Desired, ...
   })                                   → 포지션 생성, NFT 발행
```

---

### 3.3 Lend (대출 시장)

**프로토콜:** Morpho Blue Fork (SnowballLend)
**라우트:** `/lend`, `/lend/markets`, `/lend/positions`
**앱:** apps/web, snowball-app

**기능:**
- 격리 마켓 렌딩 (각 마켓이 독립적)
- 공급(Supply) → 이자 수익
- 담보 제공 + 차입(Borrow) → 레버리지
- Adaptive Curve IRM (이용률 기반 자동 금리)
- ERC4626 기반 Vault (SnowballVault)
- PublicAllocator를 통한 자동 리밸런싱

**마켓:**

| 마켓 | 담보 | 대출 | LLTV | Oracle |
|------|------|------|------|--------|
| wCTC / sbUSD | wCTC | sbUSD | 77% | `0xf3c2...` |
| lstCTC / sbUSD | lstCTC | sbUSD | 77% | `0xff5f...` |
| sbUSD / USDC | sbUSD | USDC | 90% | `0x32fc...` |

**핵심 수학:**
```
이용률 = totalBorrow / totalSupply
차입 APR = AdaptiveCurveIRM.borrowRateView() x 연환산
공급 APY = 차입APR x 이용률 x (1 - 프로토콜 수수료)
Health Factor = (담보가치 x LLTV) / 차입가치
```

---

### 3.4 Borrow (CDP 대출)

**프로토콜:** Liquity V2 Fork
**라우트:** `/borrow`
**앱:** apps/web, snowball-app

**기능:**
- wCTC 또는 lstCTC를 담보로 sbUSD 차입
- 사용자가 이자율 직접 설정 (연 0.5% ~ 1000%)
- Trove는 NFT로 발행 (TroveNFT)
- 담보 비율(CR) 110% 이하 시 청산

**두 개 브랜치:**

| 브랜치 | 담보 토큰 | 최소 CR | 위기 CR |
|--------|-----------|---------|---------|
| wCTC | wCTC | 110% (MCR) | 150% (CCR) |
| lstCTC | lstCTC | 110% (MCR) | 150% (CCR) |

**Trove 라이프사이클:**
```
1. openTrove(담보, 부채, 이자율)    -> Trove 생성 + sbUSD 수령
2. adjustTrove(담보변경, 부채변경)    -> 담보 추가/제거, 상환/추가 차입
3. adjustTroveInterestRate(새이자율) -> 이자율 조정
4. closeTrove()                     -> 부채 전액 상환 + 담보 회수
```

**청산 조건:**
- 개별 CR < 110% -> 청산 가능
- 시스템 TCR < 150% -> Recovery Mode 진입 (CR < 150% 인 Trove도 청산)

---

### 3.5 Earn (Stability Pool)

**프로토콜:** Liquity V2 Fork
**라우트:** `/earn`
**앱:** apps/web, snowball-app

**기능:**
- sbUSD를 Stability Pool에 예치
- 청산된 Trove의 담보(wCTC/lstCTC)를 할인 가격에 획득
- 각 브랜치(wCTC/lstCTC)별 별도 풀

**동작 원리:**
```
1. 유저가 sbUSD 예치 -> provideToSP(amount, false)
2. 청산 발생 시 -> 예치된 sbUSD로 부채 흡수
3. 대가로 담보 토큰 지급 (순이익 ~10%)
4. 유저가 담보 수익 클레임 -> claimAllCollGains()
5. 출금 -> withdrawFromSP(amount, true)
```

---

### 3.6 Options (BTC 바이너리 옵션)

**프로토콜:** Snowball Options (자체 개발)
**라우트:** `/options`, `/options/history`
**앱:** apps/web

**기능:**
- BTC 가격이 오를지(Over) 내릴지(Under) 예측
- EIP-712 서명으로 가스 없이 주문
- FIFO 매칭 엔진 (Over <-> Under 페어링)
- 미매칭 주문은 Vault가 상대방 (LP 풀)
- 라운드 기반 (시작가 -> 종료가 비교, 기본 5분)

**컨트랙트 구조:**

```
┌─────────────────┐     ┌─────────────────┐
│ ClearingHouse    │     │ OptionsVault    │
│ (CDP 잔고 관리)   │     │ (LP 풀)         │
│                  │     │                 │
│ deposit()        │     │ deposit()       │
│ withdraw()       │     │ lockCollateral()│
│ lockInEscrow()   │     │ payWinner()     │
└────────┬─────────┘     └────────┬────────┘
         │                        │
         ▼                        ▼
┌─────────────────────────────────────────┐
│ SnowballOptions (엔진)                   │
│                                          │
│ submitFilledOrders() <- Relayer만 호출    │
│ executeRound()       <- Operator만 호출   │
│ settleOrders()       <- Operator만 호출   │
│                                          │
│ Commission: 5% (승리자 payout에서 차감)   │
└─────────────────────────────────────────┘
         ▲
         │
┌────────┴────────┐     ┌─────────────────┐
│ OptionsRelayer   │     │ BTCMockOracle   │
│ (EIP-712 검증)   │     │ (가격 피드)      │
│                  │     │                 │
│ 서명 -> 온체인    │     │ Binance WS ->   │
│ nonce 관리       │     │ 10초 푸시        │
│                  │     │ MAX_AGE: 120s   │
└─────────────────┘     └─────────────────┘
```

**수수료 구조:**
- 커미션: 5% (500 bps, 승리 배당에서 차감)
- 가스비: 프로토콜 부담 (Relayer가 제출)

---

### 3.7 Yield (수익 볼트)

**프로토콜:** Beefy V7 Fork (SnowballYieldVault)
**패키지:** `packages/yield`
**라우트:** `/yield`
**상태:** 컨트랙트 배포 완료, 프론트엔드 연동 중

**기능:**
- ERC20 기반 Vault (deposit/withdraw + share minting)
- 전략 패턴으로 수익원 연결
- 48시간 타임락으로 전략 업그레이드 보호
- `getPricePerFullShare()`로 수익률 추적

**전략 목록:**

| 전략 | 수익원 | 자산 |
|------|--------|------|
| StrategySbUSDStabilityPool | Liquity Stability Pool 청산 수익 | sbUSD |
| StrategySbUSDMorpho | SnowballLend sbUSD 공급 이자 | sbUSD |
| StrategyWCTCMorpho | SnowballLend wCTC 공급 이자 | wCTC |
| StrategyUSDCMorpho | SnowballLend USDC 공급 이자 | USDC |

---

### 3.8 Dashboard

**라우트:** `/dashboard`
**앱:** apps/web, snowball-app

**기능:**
- 모든 토큰 잔고 (tCTC, wCTC, sbUSD, lstCTC)
- 활성 Trove 수 (브랜치별)
- Stability Pool 예치 잔고
- Quick Action 링크

---

### 3.9 Agent (ERC-8004)

**라우트:** `/agent`
**앱:** apps/web, snowball-app

**컨트랙트:**
- IdentityRegistry (ERC721URIStorage) — NFT 기반 에이전트 등록
- ReputationRegistry — 상호작용 기반 평점 (score x 1e2, 480 = 4.80점)
- ValidationRegistry — 검증 추적

**Agent 서비스 (snowball-app):**
- **Consumer** (Port 3000): 사용자 포지션 모니터링, 청산 위험 경고
- **Provider** (Port 3001): A2A 프로토콜 기반 트랜잭션 빌더
- **Chatbot** (Port 3002): AI 어시스턴트 (OpenAI 연동 + fallback)

**Hooks:**
- `useAgents`, `useAgentHistory`, `useAgentReputation`, `useAgentRecommend`
- `useChat` (FloatingChat, ChatWindow, QuickActions)

---

### 3.10 Chat

**라우트:** `/chat`
**앱:** apps/web, snowball-app

**기능:**
- AI 어시스턴트와 대화
- DeFi 용어, 포지션 관리 조언
- Agent Chatbot (Port 3002) 연동

---

### 3.11 Analytics

**라우트:** `/analytics`
**앱:** apps/web, snowball-dex

**기능:**
- 프로토콜 통계 (TVL, 거래량, 사용자 수)
- 풀 분석 대시보드

---

## 4. 유저 플로우

### 4.1 신규 유저 온보딩

```
┌──────────┐     ┌──────────────┐     ┌────────────────┐
│ 웹사이트  │────▶│ Privy 로그인  │────▶│ 지갑 자동 생성   │
│ 접속     │     │ (이메일/구글/ │     │ (임베디드 지갑)  │
│          │     │  지갑 연결)   │     │                 │
└──────────┘     └──────────────┘     └───────┬─────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │ Dashboard 진입    │
                                    │ - 잔고 확인       │
                                    │ - Quick Actions  │
                                    └─────────────────┘
```

**Privy 인증 방식 (apps/web, snowball-app):**
1. **이메일 로그인** -> 이메일 OTP -> 임베디드 지갑 자동 생성
2. **구글 로그인** -> OAuth -> 임베디드 지갑 자동 생성
3. **지갑 연결** -> MetaMask/WalletConnect -> 외부 지갑 직접 사용

**RainbowKit 인증 (snowball-dex):**
1. **지갑 연결** -> MetaMask, Coinbase, WalletConnect 등 다양한 지갑 지원

---

### 4.2 Swap 유저 플로우

```
유저                           프론트엔드                    온체인
 │                               │                           │
 │  1. 토큰 선택 (From/To)        │                           │
 │──────────────────────────────▶│                           │
 │                               │  QuoterV2.quote()         │
 │                               │──────────────────────────▶│
 │                               │◀──────────────────────────│
 │  2. 예상 수령액 확인            │                           │
 │◀──────────────────────────────│                           │
 │                               │                           │
 │  3. 금액 입력                  │                           │
 │──────────────────────────────▶│                           │
 │                               │                           │
 │  4. [Approve] 클릭             │                           │
 │──────────────────────────────▶│  ERC20.approve()          │
 │  (지갑 서명)                   │──────────────────────────▶│
 │                               │◀──────────────────────────│
 │                               │                           │
 │  5. [Swap] 클릭                │                           │
 │──────────────────────────────▶│  Router.exactInputSingle()│
 │  (지갑 서명)                   │──────────────────────────▶│
 │                               │◀──────────────────────────│
 │  6. 완료 확인                  │                           │
 │◀──────────────────────────────│                           │
```

---

### 4.3 Borrow 유저 플로우 (Trove 열기)

```
유저                           프론트엔드                      온체인
 │                               │                             │
 │  1. 브랜치 선택 (wCTC/lstCTC)   │                             │
 │──────────────────────────────▶│                             │
 │                               │  PriceFeed.getPrice()       │
 │                               │  TroveManager.getSystem*()  │
 │                               │─────────────────────────────▶│
 │  2. 현재 가격/TCR 확인          │◀────────────────────────────│
 │◀──────────────────────────────│                             │
 │                               │                             │
 │  3. 담보 금액 입력              │                             │
 │  4. 차입 금액 입력              │                             │
 │  5. 이자율 설정                │                             │
 │──────────────────────────────▶│                             │
 │                               │  CR 계산 (담보x가격/부채)     │
 │  6. CR 미리보기                │                             │
 │◀──────────────────────────────│                             │
 │                               │                             │
 │  7. [Open Trove] 클릭          │                             │
 │──────────────────────────────▶│  ERC20.approve(BorrowerOps) │
 │  (지갑 서명 x2)                │  BorrowerOps.openTrove()    │
 │                               │─────────────────────────────▶│
 │                               │◀────────────────────────────│
 │  8. Trove NFT 수령 확인        │                             │
 │◀──────────────────────────────│                             │
```

**CR(담보 비율) 계산:**
```
CR = (담보 수량 x 담보 가격) / 총 부채(원금 + 수수료) x 100%

예시:
  담보: 100 wCTC (가격 $2)
  차입: 100 sbUSD
  CR = (100 x 2) / 100 = 200%

안전 기준:
  > 200%    안전
  150~200%  주의
  < 150%    위험 (Recovery Mode 시 청산 가능)
  < 110%    청산
```

---

### 4.4 Earn 유저 플로우

```
유저                           프론트엔드                    온체인
 │                               │                           │
 │  1. 브랜치 선택 (wCTC/lstCTC)   │                           │
 │──────────────────────────────▶│                           │
 │                               │  StabilityPool 조회        │
 │                               │──────────────────────────▶│
 │  2. 풀 현황 확인               │◀──────────────────────────│
 │◀──────────────────────────────│                           │
 │                               │                           │
 │  3. sbUSD 금액 입력            │                           │
 │  4. [Deposit] 클릭             │                           │
 │──────────────────────────────▶│  ERC20.approve()          │
 │  (지갑 서명)                   │  StabilityPool.provideToSP│
 │                               │──────────────────────────▶│
 │  5. 예치 완료                  │◀──────────────────────────│
 │◀──────────────────────────────│                           │
 │                               │                           │
 │  ... (시간 경과, 청산 발생) ...  │                           │
 │                               │                           │
 │  6. 담보 Gain 확인             │  getDepositorCollGain()   │
 │◀──────────────────────────────│──────────────────────────▶│
 │                               │◀──────────────────────────│
 │  7. [Claim] 클릭               │                           │
 │──────────────────────────────▶│  claimAllCollGains()      │
 │  (지갑 서명)                   │──────────────────────────▶│
 │  8. 담보 토큰 수령              │◀──────────────────────────│
 │◀──────────────────────────────│                           │
```

---

### 4.5 Lend 유저 플로우 (공급)

```
유저                           프론트엔드                    온체인
 │                               │                           │
 │  1. 마켓 선택                  │                           │
 │     (예: wCTC/sbUSD)           │                           │
 │──────────────────────────────▶│                           │
 │                               │  SnowballLend.market()    │
 │  2. APY/이용률 확인             │──────────────────────────▶│
 │◀──────────────────────────────│◀──────────────────────────│
 │                               │                           │
 │  3. 공급 금액 입력 (sbUSD)      │                           │
 │  4. [Supply] 클릭              │                           │
 │──────────────────────────────▶│  ERC20.approve()          │
 │  (지갑 서명)                   │  SnowballLend.supply()    │
 │                               │──────────────────────────▶│
 │  5. Supply Share 수령           │◀──────────────────────────│
 │◀──────────────────────────────│                           │
 │                               │                           │
 │  ... (시간 경과, 이자 발생) ... │                           │
 │                               │                           │
 │  6. [Withdraw] 클릭             │                           │
 │──────────────────────────────▶│  SnowballLend.withdraw()  │
 │  (지갑 서명)                   │──────────────────────────▶│
 │  7. 원금 + 이자 수령            │◀──────────────────────────│
 │◀──────────────────────────────│                           │
```

---

### 4.6 Options 유저 플로우 (바이너리 옵션)

```
유저                    프론트엔드              백엔드                온체인
 │                        │                     │                     │
 │  1. BTC 가격 실시간 확인 │◀──── WS /ws/price ──│◀── Binance WS ──── │
 │◀───────────────────────│                     │                     │
 │                        │                     │                     │
 │  2. ClearingHouse에     │                     │                     │
 │     tCTC 예치           │                     │                     │
 │────────────────────────▶│  ClearingHouse      │                     │
 │  (지갑 서명)            │  .deposit{value}    │                     │
 │                        │─────────────────────┼────────────────────▶│
 │                        │◀────────────────────┼────────────────────│
 │                        │                     │                     │
 │  3. Over/Under 선택     │                     │                     │
 │  4. 금액 입력           │                     │                     │
 │  5. EIP-712 서명        │                     │                     │
 │────────────────────────▶│                     │                     │
 │  (지갑 서명, 가스 X)     │  POST /api/options/ │                     │
 │                        │  order              │                     │
 │                        │────────────────────▶│                     │
 │                        │                     │  FIFO 매칭            │
 │                        │                     │  (Over <-> Under)    │
 │                        │                     │                     │
 │                        │                     │  매칭 완료 시:         │
 │                        │                     │  Relayer.submit      │
 │                        │                     │  SignedOrders()      │
 │                        │                     │────────────────────▶│
 │                        │                     │◀────────────────────│
 │  6. 주문 접수 확인       │◀───────────────────│                     │
 │◀───────────────────────│                     │                     │
 │                        │                     │                     │
 │  ... (라운드 종료) ...   │                     │                     │
 │                        │                     │  executeRound()     │
 │                        │                     │────────────────────▶│
 │                        │                     │  settleOrders()     │
 │                        │                     │────────────────────▶│
 │                        │                     │◀────────────────────│
 │                        │                     │                     │
 │  7. 결과 확인           │  GET /api/options/  │                     │
 │     (승리: 잔고 증가)    │  history            │                     │
 │◀───────────────────────│◀───────────────────│                     │
```

**매칭 로직:**
```
Over 주문 큐:  [A: 10 tCTC] [B: 5 tCTC] [C: 20 tCTC]
Under 주문 큐: [X: 8 tCTC] [Y: 12 tCTC]

매칭 결과:
  A(10) <-> X(8): 8 tCTC 매칭, A 잔여 2
  A(2) + B(5) <-> Y(12): 7 매칭, Y 잔여 5
  Y(5) -> Vault가 상대방 (LP 풀)
  C(20) -> Vault가 상대방 (LP 풀)

50개 배치 단위로 OptionsRelayer에 제출
```

**정산 로직:**
```
if endPrice > startPrice:
  -> Over 승리: 배당 = 상대방 금액 x 0.95 (5% 커미션)
  -> Under 패배: 원금 몰수

if endPrice < startPrice:
  -> Under 승리
  -> Over 패배

if endPrice == startPrice:
  -> Draw: 양측 원금 반환
```

---

### 4.7 Pool 유동성 공급 유저 플로우

```
유저                           프론트엔드                    온체인
 │                               │                           │
 │  1. 토큰 페어 선택              │                           │
 │  2. 가격 범위 선택              │                           │
 │     (Full/Safe/Common/Expert) │                           │
 │  3. 양쪽 토큰 금액 입력         │                           │
 │──────────────────────────────▶│                           │
 │                               │                           │
 │  4. [Add Liquidity] 클릭       │                           │
 │──────────────────────────────▶│  ERC20.approve(token0)    │
 │  (지갑 서명 x3)                │  ERC20.approve(token1)    │
 │                               │  NFTManager.mint()        │
 │                               │──────────────────────────▶│
 │  5. LP NFT 수령                │◀──────────────────────────│
 │◀──────────────────────────────│                           │
 │                               │                           │
 │  ... (거래 수수료 발생) ...     │                           │
 │                               │                           │
 │  6. 수수료 수집                 │  NFTManager.collect()     │
 │──────────────────────────────▶│──────────────────────────▶│
 │  7. 토큰 수령                  │◀──────────────────────────│
 │◀──────────────────────────────│                           │
```

---

## 5. 운영 플로우 (Operator)

### 5.1 초기 배포 플로우

```
Step 1: 스마트 컨트랙트 빌드 & 테스트
  $ make build-contracts    # forge build (oracle + options)
  $ make test               # forge test

Step 2: Oracle 배포
  $ make deploy-oracle
  -> BTCMockOracle 배포
  -> OPERATOR_ROLE을 백엔드 지갑에 부여

Step 3: Options 배포
  $ make deploy-options
  -> ClearingHouse (Proxy) 배포
  -> OptionsVault (Proxy) 배포
  -> SnowballOptions (Proxy) 배포
  -> OptionsRelayer (Proxy) 배포
  -> 역할 설정:
    - ClearingHouse.PRODUCT_ROLE -> SnowballOptions
    - OptionsVault.ENGINE_ROLE -> SnowballOptions
    - SnowballOptions.RELAYER_ROLE -> OptionsRelayer
    - OptionsRelayer.OPERATOR_ROLE -> 백엔드 지갑

Step 4: 기타 프로토콜 배포
  $ pnpm deploy:liquity     # Liquity V2 (wCTC + lstCTC 브랜치)
  $ pnpm deploy:morpho      # Morpho Blue (SnowballLend)
  $ pnpm deploy:dex         # Uniswap V3 DEX
  $ pnpm deploy:erc-8004    # ERC-8004 Agent Registry

Step 5: 환경변수 설정
  backend/.env:
    RPC_URL=https://rpc.cc3-testnet.creditcoin.network
    CHAIN_ID=102031
    OPERATOR_PRIVATE_KEY=0x...
    ORACLE_BTC_ADDRESS=0xcfad...
    CLEARING_HOUSE_ADDRESS=0xd999...
    OPTIONS_VAULT_ADDRESS=0x7745...
    SNOWBALL_OPTIONS_ADDRESS=0x595e...
    OPTIONS_RELAYER_ADDRESS=0xe58f...
    PRICE_SOURCE=binance
    ORACLE_PUSH_INTERVAL=10
    ROUND_DURATION=300
    SETTLEMENT_POLL_INTERVAL=5
    BATCH_SIZE=50

  apps/web/.env.local:
    NEXT_PUBLIC_PRIVY_APP_ID=...
    NEXT_PUBLIC_API_BASE=http://localhost:8000
    NEXT_PUBLIC_CHAT_API_BASE=...

Step 6: 시작
  $ make docker-up          # backend + frontend 컨테이너 시작
```

### 5.2 일상 운영 플로우

```
┌──────────────────────────────────────────────────┐
│                   정상 운영 상태                    │
│                                                  │
│  Backend (항시 구동):                              │
│  ├─ Oracle: Binance WS -> 10초마다 가격 푸시       │
│  ├─ Price WS: /ws/price 1초 간격 브로드캐스트       │
│  ├─ Matching: 주문 수신 -> FIFO 매칭 -> 배치 제출   │
│  ├─ Relayer: 3초 주기 매칭 주문 플러시              │
│  └─ Settlement: 만기 라운드 감지 -> 정산 실행       │
│                                                  │
│  모니터 포인트:                                     │
│  ├─ GET /health -> 200 OK                        │
│  ├─ Oracle TX 로그 (10초 간격)                     │
│  ├─ Binance WS 연결 상태                           │
│  ├─ Price stale 여부 (>120s)                       │
│  └─ Gas 잔고 (OPERATOR_ADDRESS)                   │
└──────────────────────────────────────────────────┘
```

### 5.3 장애 시나리오 & 대응

| 장애 | 증상 | 자동 대응 | 수동 대응 |
|------|------|----------|----------|
| Binance WS 끊김 | 가격 업데이트 멈춤 | CoinGecko fallback 자동 전환 (5s backoff 재연결) | WS 재연결 확인 |
| 오라클 TX 실패 | 가격 stale (>120초) | 재시도 로직 | 가스 잔고 확인, RPC 상태 확인 |
| 정산 TX 실패 | 라운드 미정산 | 재시도 (다음 폴링) | 수동 정산 호출 |
| Relayer Flush 실패 | 주문 미제출 | 배치 재큐잉 후 재시도 | 컨트랙트 상태 확인 |
| RPC 노드 다운 | 모든 TX 실패 | — | 다른 RPC 엔드포인트 설정 |
| Operator 가스 부족 | TX 제출 불가 | — | tCTC 충전 |
| Nonce 충돌 | TX pending/실패 | asyncio Lock으로 방지 | 백엔드 재시작 |

---

## 6. 배포된 컨트랙트 주소

> 네트워크: **Creditcoin Testnet (Chain ID: 102031)**
> RPC: `https://rpc.cc3-testnet.creditcoin.network`
> Explorer: https://creditcoin-testnet.blockscout.com

### 토큰

| 토큰 | 주소 |
|------|------|
| wCTC | `0xca69344e2917f026ef4a5ace5d7b122343fc8528` |
| lstCTC | `0xa768d376272f9216c8c4aa3063391bdafbcad4c2` |
| sbUSD | `0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5` |
| USDC (Mock) | `0x60e204104cfe1a93f630ea5ebc0a895cc80ebed9` |

### DEX (Uniswap V3)

| 컨트랙트 | 주소 |
|----------|------|
| Factory | `0x09616b503326dc860b3c3465525b39fe4fcdd049` |
| SwapRouter | `0xec48ed2e9c81b77ab6f8e79c257f9d0c21074154` |
| NonfungiblePositionManager | `0xa28bfaa2e84098de8d654f690e51c265e4ae01c9` |
| QuoterV2 | `0x2383343c2c7ae52984872f541b8b22f8da0b419a` |

**풀:**

| 풀 | 주소 |
|----|------|
| wCTC / USDC | `0xb6Db55F3d318B6b0C37777A818C2c195181B94C9` |
| lstCTC / USDC | `0x394ECC1c9094F5E3D83a6C9497a33a969e9B136a` |
| wCTC / sbUSD | `0x23e6152CC07d4DEBA597c9e975986E2B307E8874` |
| sbUSD / USDC | `0xe70647BF2baB8282B65f674b0DF8B7f0bb658859` |
| lstCTC / wCTC | `0xee0AF4a1Aa3ce7447248f87c384b8bE7de302DA5` |

### Liquity V2 (Borrow / Earn)

| 컨트랙트 | wCTC 브랜치 | lstCTC 브랜치 |
|----------|-------------|---------------|
| AddressesRegistry | `0x7cfed108ed84194cf37f93d47268fbdd14da73d2` | `0x0afe1c58a76c49d62bd7331f309aa14731efb1fc` |
| BorrowerOperations | `0xb637f375cbbd278ace5fdba53ad868ae7cb186ea` | `0x8700ed43989e2f935ab8477dd8b2822cae7f60ca` |
| TroveManager | `0xa20f9dfeb110e11c89147b9db5adb98a7d91e70e` | `0x83715c7e9873b0b8208adbbf8e07f31e83b94aed` |
| StabilityPool | `0xf1654541efb7a3c34a9255464ebb2294fa1a43f3` | `0xec700d805b5de3bf988401af44b1b384b136c41b` |
| ActivePool | `0xa7f0600a023cf6076f5d8dc51b46b91bafe095e5` | `0xa57cca34198bf262a278da3b2b7a8a5f032cb835` |
| DefaultPool | `0x201ff7ec1a9ceaf1396ea6d90cd24ac6b757e404` | `0x6ed045c0cadc55755dc09f1bfee0f964baf1f859` |
| GasPool | `0x4aa86795705a604e3dac4cfe45c375976eca3189` | `0x31d560b7a74b179dce8a8017a1de707c32dd67da` |
| CollSurplusPool | `0x0dc9642129470d6a0ac0bac2a5d1b18a2ea09111` | `0xa287db89e552698a118c89d8bbee25bf51a0ec33` |
| SortedTroves | `0xf5ef344759df7786cda9d2133e4d1e10e3b43f9f` | `0x25aa78c7b0dbc736ae23a316ab44579467ba9507` |
| TroveNFT | `0x72e383eff50893e2b2edeb711a81c3a812dcd2f9` | `0x51a90151e0dd1348e77ee6bcc30278ee311f29a8` |
| PriceFeed | `0xca9341894230b84fdff429ff43e83cc8f8990342` | `0xa12ed39d24d4bbc100d310ae1cbf10b4c67e4a08` |

**공유 컨트랙트:**

| 컨트랙트 | 주소 |
|----------|------|
| CollateralRegistry | `0x5c1683f9d8a8d77de48b380a15b623cf5d91bb59` |
| HintHelpers | `0x6ee9850b0915763bdc0c7edca8b66189449a447f` |
| MultiTroveGetter | `0xc26bce003e00dde70c0ecff8778e9edacd5ec6e6` |
| AgentVault | `0x7bca6fb903cc564d92ed5384512976c94f2730d7` |

### Morpho Blue (Lend)

| 컨트랙트 | 주소 |
|----------|------|
| SnowballLend | `0x190a733eda9ba7d2b52d56764c5921d5cd4752ca` |
| AdaptiveCurveIRM | `0xc4c694089af9bab4c6151663ae8424523fce32a8` |
| wCTC Oracle | `0xbd2c8afda5fa753669c5dd03885a45a3612171af` |
| lstCTC Oracle | `0xa9aeac36aab8ce93fe4a3d63cf6b1d263dd2eb31` |
| sbUSD Oracle | `0xf82396f39e93d77802bfecc33344faafc4df50f2` |

### Options Protocol

| 컨트랙트 | Proxy | Implementation | 타입 |
|----------|-------|----------------|------|
| BTCMockOracle | `0xcfad30e844685abb5ae1e8c21f727afd23f46abc` | — | AccessControl |
| OptionsClearingHouse | `0xd999f043760b4a372c57645e0c2daab3ce81b741` | `0x2a0461d19960a62883d4e34010dc51913d62f93b` | UUPS Proxy |
| OptionsVault | `0x7745cc64ff8ec8923876c9fe062d347f2fa78079` | `0x58a7f3e712b80c2d443fde981d5097c1dacae407` | UUPS Proxy |
| SnowballOptions | `0x595ed79d89623158d486a1a0daada35669ccc352` | `0x00fc0430fcf7e1ff38e71b0537da5318e8030591` | UUPS Proxy |
| OptionsRelayer | `0xe58f9cdb8ec63b88759bde403de0e062382f13b1` | `0x292d4ff4251d97b04e8ca00a75f7bd32ab06cb62` | UUPS Proxy |

### Yield Vaults (Beefy V7 Fork)

| Vault | Vault 주소 | Strategy 주소 | 예치 토큰 |
|-------|-----------|---------------|-----------|
| mooSbUSD-SP | `0x40a8b5b8a6c1e4236da10da2731944e59444c179` | `0x342c8a3385341b07111bbf1a73aac48cdda32917` | sbUSD |
| mooSbUSD-Morpho | `0x384ebff116bb8458628b62624ab9535a4636a397` | `0x9176910f4c9dc7a868d5e6261fd651f98d7cc0c3` | sbUSD |
| mooWCTC-Morpho | `0x766c8bf45d7a7356f63e830c134c07911b662757` | `0x241f5661d6db304434dfc48dab75f1c5be63404a` | wCTC |
| mooUSDC-Morpho | `0xa6f9c033dba98f2d0fc79522b1b5c5098dc567b7` | `0xcdb7a9fb0040d2631f4cd212601838d195e8d08b` | USDC |

### ERC-8004 (Agent)

| 컨트랙트 | 주소 |
|----------|------|
| IdentityRegistry | `0x993C9150f074435BA79033300834FcE06897de9B` |
| ReputationRegistry | `0x3E5E194e39b777F568c9a261f46a5DCC43840726` |
| ValidationRegistry | `0x84b9B2121187155C1c85bA6EA34e35c981BbA023` |

---

## 7. API 엔드포인트

### Backend (Port 8000)

#### 시스템

| Method | Path | 설명 |
|--------|------|------|
| GET | `/health` | 헬스체크 (`{"status": "ok", "version": "0.1.0"}`) |
| GET | `/` | 서비스 정보 + 엔드포인트 목록 |

#### 가격 API

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/price/btc/current` | 현재 BTC 가격 (`{price, timestamp, stale}`) |
| GET | `/api/price/btc/history?interval=1m&limit=100` | 가격 히스토리 (interval: 1m/5m/15m/1h, limit: 1-1000) |
| GET | `/api/price/btc/ohlcv?interval=1m&limit=100` | OHLCV 캔들 데이터 |
| WS | `/ws/price` | 실시간 가격 스트림 (`{type, symbol, price, timestamp}`) |

#### 옵션 API

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/options/order` | 서명된 주문 제출 |
| GET | `/api/options/rounds?limit=100` | 현재/과거 라운드 목록 (limit: 1-100) |
| GET | `/api/options/history?address=0x...` | 유저 거래 이력 (최근 20 라운드) |
| GET | `/api/options/balance?address=0x...` | 유저 잔고 조회 (`{address, balance, escrow}`) |

#### POST `/api/options/order` 요청 형식

```json
{
  "order": {
    "user": "0x...",
    "direction": 0,
    "amount": "1000000000000000000",
    "round_id": 1,
    "nonce": 0,
    "deadline": 1740500000,
    "signature": "0x..."
  }
}
```

**응답:** `{status, reason?, queue_depth: {over, under}}`

#### EIP-712 서명 도메인

```
{
  name: "SnowballOptionsRelayer",
  version: "1",
  chainId: 102031,
  verifyingContract: <RELAYER_ADDRESS>
}
```

---

## 8. Docker 운영

### 구성

```yaml
# docker-compose.yml
services:
  backend:
    build: ./backend
    container_name: snowball-backend
    ports: 8000:8000
    volumes: ./backend/abi:/app/abi:ro
    healthcheck: python urllib (30s interval)

  frontend:
    build: ./apps/web
    container_name: snowball-frontend
    ports: 3000:3000
    depends_on: backend (service_healthy)
    build_args: NEXT_PUBLIC_PRIVY_APP_ID, NEXT_PUBLIC_API_BASE, NEXT_PUBLIC_CHAT_API_BASE
    healthcheck: included
```

### 명령어

```bash
# 빌드 & 시작
make docker-build          # ABI 추출 + Docker 빌드
make docker-up             # 컨테이너 시작 (detach)

# 중지
make docker-down           # 컨테이너 중지

# 로그
make docker-logs           # 전체 로그
make docker-logs-backend   # 백엔드만
make docker-logs-frontend  # 프론트엔드만

# 개발 모드 (Docker 없이)
make backend-dev           # uvicorn --reload (Port 8000)
make frontend-dev          # next dev (Port 3000)
make backend-install       # Python venv 생성 + requirements.txt 설치
make frontend-install      # pnpm install

# 스마트 컨트랙트
make build-contracts       # forge build (oracle + options)
make test                  # forge test
make deploy-oracle         # Oracle 배포
make deploy-options        # Options 배포
make deploy-all            # Oracle + Options 일괄 배포
make extract-abi           # ABI 추출 (scripts/extract-abi.sh)

# 기타 프로토콜 배포 (pnpm)
pnpm deploy:liquity
pnpm deploy:morpho
pnpm deploy:algebra
pnpm deploy:erc-8004
pnpm merge-addresses       # 배포 주소 병합 (scripts/merge-addresses.ts)

# snowball-app 개발 모드 (별도 터미널)
cd snowball-app
pnpm dev:app               # Lending UI (Port 5173)
pnpm dev:consumer          # Agent Consumer (Port 3000)
pnpm dev:provider          # Agent Provider (Port 3001)
pnpm dev:chatbot           # Agent Chatbot (Port 3002)

# snowball-dex 개발 모드 (별도 터미널)
cd snowball-dex && pnpm dev  # DEX UI
```

### 환경변수

#### Backend (`.env`)

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `RPC_URL` | `https://rpc.cc3-testnet.creditcoin.network` | RPC 엔드포인트 |
| `CHAIN_ID` | `102031` | 체인 ID |
| `OPERATOR_PRIVATE_KEY` | — | Operator 지갑 키 |
| `ORACLE_BTC_ADDRESS` | — | BTCMockOracle 주소 |
| `CLEARING_HOUSE_ADDRESS` | — | ClearingHouse Proxy 주소 |
| `OPTIONS_VAULT_ADDRESS` | — | OptionsVault Proxy 주소 |
| `SNOWBALL_OPTIONS_ADDRESS` | — | SnowballOptions Proxy 주소 |
| `OPTIONS_RELAYER_ADDRESS` | — | OptionsRelayer Proxy 주소 |
| `HOST` | `0.0.0.0` | 서버 호스트 |
| `PORT` | `8000` | 서버 포트 |
| `PRICE_SOURCE` | `binance` | 가격 소스 (binance / coingecko) |
| `ORACLE_PUSH_INTERVAL` | `10` | 오라클 푸시 간격 (초) |
| `ROUND_DURATION` | `300` | 옵션 라운드 시간 (초) |
| `SETTLEMENT_POLL_INTERVAL` | `5` | 정산 폴링 간격 (초) |
| `BATCH_SIZE` | `50` | 주문 배치 크기 |

#### Frontend (docker-compose build args)

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `NEXT_PUBLIC_PRIVY_APP_ID` | — | Privy 앱 ID |
| `NEXT_PUBLIC_API_BASE` | `http://backend:8000` | API 주소 (Docker 내부) |
| `NEXT_PUBLIC_CHAT_API_BASE` | — | 채팅 API 주소 |
| `NEXT_PUBLIC_TEST_MODE` | — | E2E 테스트 모드 |

#### Agent 서비스

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `CDP_PROVIDER_URL` | `http://localhost:3001` | Agent Provider URL |
| `CONSUMER_API_URL` | `http://localhost:3000` | Agent Consumer URL |
| `OPENAI_API_KEY` | — | Chatbot AI 연동 |
| `CDP_PROVIDER_PORT` | `3001` | Provider 포트 |
| `CHATBOT_PORT` | `3002` | Chatbot 포트 |

---

## 9. 모니터링 & 장애 대응

### 9.1 헬스체크 포인트

```bash
# 백엔드 헬스
curl http://localhost:8000/health

# 프론트엔드 헬스
curl http://localhost:3000/

# 오라클 가격 확인 (stale=true 이면 120초 이상 갱신 안 됨)
curl http://localhost:8000/api/price/btc/current

# Docker 상태
docker compose ps
```

### 9.2 Operator 지갑 관리

백엔드가 온체인 TX를 보내려면 Operator 지갑에 tCTC(가스비)가 충분해야 합니다.

```
가스 설정:
- TX당 gas limit: 3,000,000 (고정, web3_client.py)
- Nonce 관리: asyncio Lock으로 동시성 보호

필요 가스 예측:
- Oracle 가격 푸시: ~0.001 tCTC x 6/분 x 60분 x 24시간 = 8.64 tCTC/일
- 옵션 정산: ~0.003 tCTC x 라운드당 x 하루 라운드 수
- Relayer 제출: ~0.005 tCTC x 배치당

권장 최소 잔고: 100 tCTC
```

### 9.3 로그 키워드

| 로그 | 의미 | 조치 |
|------|------|------|
| `Oracle price pushed: $XX,XXX` | 정상 가격 푸시 | — |
| `Connected to Binance WS` | WS 연결 성공 | — |
| `TX success: 0x...` | 트랜잭션 성공 | — |
| `CoinGecko BTC price` | Fallback 소스 사용 | Binance WS 연결 확인 |
| `Matched: ... (Over) vs ... (Under)` | 주문 매칭 성공 | — |
| `TX failed` | 트랜잭션 실패 | 가스/RPC 확인 |
| `Nonce too low` | 논스 충돌 | 백엔드 재시작 |
| `price stale` | 가격 120초+ 미갱신 | 오라클 서비스 상태 확인 |

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2026-02-25 | v0.2.0 | 최초 작성 — 전체 운영 플로우, 기능 상세, 유저 플로우 |
| 2026-02-25 | v0.3.0 | 현재 코드베이스 기준 전면 업데이트 — 멀티 프론트엔드 아키텍처 (apps/web Next.js 16 + snowball-app Vite/React + snowball-dex Next.js 14), Yield Vault 패키지 추가, Agent 서비스 (Consumer/Provider/Chatbot) 구체화, Morpho LLTV 수정 (lstCTC 80%, sbUSD/USDC 86%), Liquity/Morpho/Options 전체 배포 주소 정확한 값으로 갱신, Uniswap V3 DEX 미배포 상태 반영, Options Implementation 주소 추가, EIP-712 도메인 명세 추가, Relayer flush 3초 주기 반영, 백엔드 설정값 상세화, 개발/빌드 명령어 확장 |
