# OP.md — Snowball Protocol Operations Guide

> 운영 담당자를 위한 가이드. 서버 실행, 배포, 모니터링, 트러블슈팅, 향후 개발 계획을 포함합니다.
> Last updated: 2026-02-24

---

## 1. 서버 실행

### 포트 구성

| 서비스 | 포트 | 역할 | 상태 |
|--------|------|------|------|
| **Frontend** | 5173 | React UI (Vite dev server) | ✅ 운영 중 |
| **agent-consumer** | 3000 | 메인 REST API + 포지션 모니터 | ✅ 운영 중 |
| **agent-chatbot** | 3002 | AI 챗봇 서버 | ✅ 운영 중 |
| agent-cdp-provider | 3001 | A2A 트랜잭션 빌더 | ⏸️ 미사용 |

---

### 백엔드 실행 (agent-consumer — port 3000)

```bash
cd snowball/packages/agent-consumer
pnpm dev
```

정상 실행 확인:
```
{"msg":"Snowball Consumer Agent API listening on port 3000"}
{"msg":"API docs: http://localhost:3000/api/docs"}
{"msg":"Monitor started"}
```

---

### 백엔드 실행 (agent-chatbot — port 3002)

```bash
cd snowball/packages/agent-chatbot
pnpm dev
```

정상 실행 확인:
```
Snowball Chatbot listening on port 3002
```

---

### 프론트엔드 실행 (port 5173)

```bash
cd snowball/packages/frontend
pnpm dev
```

정상 실행 확인:
```
VITE v5.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

브라우저에서 http://localhost:5173 접속

---

### 전체 한 번에 시작 (터미널 3개 사용)

**터미널 1 — agent-consumer:**
```bash
cd snowball/packages/agent-consumer && pnpm dev
```

**터미널 2 — agent-chatbot:**
```bash
cd snowball/packages/agent-chatbot && pnpm dev
```

**터미널 3 — frontend:**
```bash
cd snowball/packages/frontend && pnpm dev
```

---

### 재시작 시 포트 정리

이미 실행 중인 프로세스가 있으면 충돌 발생. 먼저 종료:

```bash
# 포트 기준 한 번에 종료
lsof -ti:3000,3002,5173 | xargs kill -9 2>/dev/null

# 확인
lsof -i :3000
lsof -i :3002
lsof -i :5173
```

---

### 헬스 체크

```bash
curl http://localhost:3000/api/health   # consumer
curl http://localhost:3002/health       # chatbot
```

---

### ABI / 컨트랙트 변경 후 재빌드

```bash
# 1. 컨트랙트 컴파일
cd snowball/packages/contracts-liquity
npx hardhat compile

# 2. 공유 ABI 재빌드
cd ../shared && pnpm build

# 3. 프론트엔드는 Vite HMR이 자동 반영 (재시작 불필요)
```

---

## 2. 환경 변수 설정 (신규 환경 세팅)

> 각 패키지별로 `.env` 파일을 직접 생성해야 합니다. `.gitignore`에 의해 커밋되지 않으므로 **새 환경마다 수동 생성 필수**.

---

### 2-1. 루트 `.env` → `snowball/.env`

```env
# ─── 배포자 지갑 ───────────────────────────────────────────
# 컨트랙트 배포 및 관리자 작업에 사용되는 프라이빗 키
DEPLOYER_PRIVATE_KEY=0x_your_private_key_here
ADMIN_PRIVATE_KEY=0x_your_private_key_here   # 보통 DEPLOYER와 동일

# ─── Privy (서버 월렛 관리) ────────────────────────────────
# https://privy.io 에서 앱 생성 후 발급
PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_app_secret

# ─── OpenAI (챗봇 LLM) ────────────────────────────────────
# 없으면 rule-based fallback으로 동작 (선택사항)
OPENAI_API_KEY=sk-your-openai-api-key

# ─── 포트 설정 ────────────────────────────────────────────
PORT=3000               # agent-consumer REST API
CDP_PROVIDER_PORT=3001  # agent-cdp-provider (현재 미사용)
CHATBOT_PORT=3002       # agent-chatbot

# ─── 서비스 간 URL ────────────────────────────────────────
CDP_PROVIDER_URL=http://localhost:3001
CONSUMER_API_URL=http://localhost:3000

# ─── 개발 옵션 ────────────────────────────────────────────
AUTH_DISABLED=true      # 개발 전용 — 프로덕션에서 반드시 제거
# AUTO_REBALANCE=false  # 자동 리밸런스 활성화 여부 (기본 false)
# LOG_LEVEL=info        # 로그 레벨 (debug | info | warn | error)
```

---

### 2-2. agent-consumer `.env` → `snowball/packages/agent-consumer/.env`

위 루트 `.env`를 그대로 복사하거나, 아래 항목만 단독으로 작성:

```env
DEPLOYER_PRIVATE_KEY=0x_your_private_key_here
ADMIN_PRIVATE_KEY=0x_your_private_key_here
PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_app_secret
PORT=3000
CDP_PROVIDER_URL=http://localhost:3001
AUTH_DISABLED=true
```

> agent-consumer는 루트 `.env`를 자동으로 읽으므로 루트에만 있어도 동작합니다.

---

### 2-3. agent-chatbot `.env` → `snowball/packages/agent-chatbot/.env`

```env
CHATBOT_PORT=3002
CONSUMER_API_URL=http://localhost:3000
OPENAI_API_KEY=sk-your-openai-api-key   # 없으면 rule-based fallback
```

---

### 2-4. frontend `.env` → `snowball/packages/frontend/.env`

```env
# Privy 앱 ID (공개 키, 노출 가능)
VITE_PRIVY_APP_ID=your_privy_app_id

# 백엔드 API 엔드포인트
VITE_API_BASE=http://localhost:3000/api
VITE_CHAT_API_BASE=http://localhost:3002/api
```

---

### 2-5. contracts `.env` → `snowball/packages/contracts-liquity/.env`

```env
# 컨트랙트 배포용 프라이빗 키
DEPLOYER_PRIVATE_KEY=0x_your_private_key_here
```

---

### 환경 변수 요약표

| 변수명 | 위치 | 필수 | 설명 |
|--------|------|------|------|
| `DEPLOYER_PRIVATE_KEY` | root, contracts, consumer | ✅ | 컨트랙트 배포 및 관리자 트랜잭션 서명 키 |
| `ADMIN_PRIVATE_KEY` | root, consumer | ✅ | 관리자 작업용 (보통 DEPLOYER와 동일) |
| `PRIVY_APP_ID` | root, consumer, frontend | ✅ | Privy 앱 식별자 (privy.io에서 발급) |
| `PRIVY_APP_SECRET` | root, consumer | ✅ | Privy 서버 시크릿 (절대 프론트에 노출 금지) |
| `OPENAI_API_KEY` | root, chatbot | ❌ | GPT 챗봇용 (없으면 rule-based fallback) |
| `PORT` | root, consumer | ❌ | consumer API 포트 (기본: 3000) |
| `CHATBOT_PORT` | root, chatbot | ❌ | chatbot 포트 (기본: 3002) |
| `CONSUMER_API_URL` | root, chatbot | ❌ | chatbot → consumer 통신 URL |
| `CDP_PROVIDER_URL` | root, consumer | ❌ | consumer → cdp-provider URL (미사용) |
| `AUTH_DISABLED` | consumer | ❌ | `true` 시 API 인증 우회 (개발 전용) |
| `VITE_PRIVY_APP_ID` | frontend | ✅ | 프론트엔드용 Privy App ID |
| `VITE_API_BASE` | frontend | ✅ | consumer API 기본 URL |
| `VITE_CHAT_API_BASE` | frontend | ✅ | chatbot API 기본 URL |

**⚠️ 주의사항:**
- `DEPLOYER_PRIVATE_KEY`, `ADMIN_PRIVATE_KEY`, `PRIVY_APP_SECRET`은 절대 커밋 금지 (`.gitignore` 적용됨)
- `AUTH_DISABLED=true`는 개발 전용. 프로덕션 배포 시 반드시 제거
- `VITE_` 접두사 변수는 빌드 시 번들에 포함되므로 시크릿 값 절대 사용 금지

---

## 3. 컨트랙트 배포

### 재배포 절차

```bash
cd packages/contracts-liquity

# 1. 컴파일
npx hardhat compile

# 2. 배포 (Creditcoin Testnet)
npx tsx scripts/deploy-viem.ts
```

배포 완료 후 **반드시** 주소 파일 2곳 업데이트:

```bash
# 자동 업데이트됨 (deploy script가 처리)
deployments/addresses.json

# 수동 업데이트 필요
packages/frontend/src/config/addresses.json
```

SSOT.md도 업데이트:

```
/SSOT.md  ← 배포 날짜, 모든 컨트랙트 주소
```

### 가격 변경 (테스트용)

```bash
# wCTC 가격 설정 (wei 단위)
curl -X POST http://localhost:3000/api/admin/set-price \
  -H "Content-Type: application/json" \
  -d '{"branch": 0, "price": "200000000000000000"}'  # 0.2 CTC/USD
```

### 테스트 토큰 발행

```bash
curl -X POST http://localhost:3000/api/admin/mint-tokens \
  -H "Content-Type: application/json" \
  -d '{"address": "0x...", "amount": "1000000000000000000000"}'
```

---

## 4. 모니터링

### 실시간 이벤트 스트림 (SSE)

```bash
curl -N http://localhost:3000/api/events
```

이벤트 타입:
- `position_update` — 포지션 CR/HF 변경
- `liquidation_risk` — 청산 위험 감지
- `rebalance_executed` — 자동 리밸런스 실행
- `rate_adjusted` — 이자율 자동 조정

### 로그 확인

```bash
tail -f /tmp/consumer.log   # 포지션 모니터
tail -f /tmp/provider.log   # A2A 트랜잭션
tail -f /tmp/chatbot.log    # 챗봇
```

### API 문서 (Swagger)

```
http://localhost:3000/api/docs
```

---

## 5. 트러블슈팅

### 포트 충돌

```bash
lsof -i :3000  # 점유 프로세스 확인
kill -9 <PID>
```

### 프론트엔드 흰 화면

1. 브라우저 콘솔 에러 확인
2. shared 패키지 재빌드: `pnpm --filter @snowball/shared build`
3. Vite 재시작: `pkill -f vite && pnpm --filter @snowball/frontend dev`

### "Authentication required" 에러

`.env`에 `AUTH_DISABLED=true` 설정 후 consumer 재시작

### "Failed to fetch" 에러 (에이전트 페이지)

백엔드 3개 모두 실행 중인지 확인:
```bash
ps aux | grep -E "(agent-consumer|agent-cdp-provider|agent-chatbot)" | grep -v grep
```

### 트랜잭션 실패 "ICR below MCR"

담보 가격이 변경됐거나 포지션 HF가 최소치 미만. `set-price` API로 가격 확인 후 담보 추가.

### SP Claim이 안 됨

`collGain`과 `boldGain` 모두 0인 경우:
- `collGain`: 청산이 발생해야 쌓임 (가격 하락 후 청산 트리거 필요)
- `boldGain`: 트로브 작업(openTrove, adjustTrove, closeTrove) 발생 시 이자 accrual로 쌓임

---

## 6. 현재 운영 중인 것

> 마지막 배포: **2026-02-24 v3** (Creditcoin Testnet, Chain ID 102031)

| 항목 | 상태 | 비고 |
|------|------|------|
| Creditcoin Testnet 배포 (v3) | ✅ 완료 | Chain ID 102031 |
| 프론트엔드 (5173) | ✅ 운영 중 | Privy 로그인, 전체 UI |
| Consumer API (3000) | ✅ 운영 중 | 포지션 모니터 30초 폴링 |
| Chatbot (3002) | ✅ 운영 중 | Rule-based (OpenAI key 없이 동작) |
| CDP Provider (3001) | ⏸️ 미사용 | AgentVault 비활성화로 대기 중 |
| 이자 Accrual → SP 분배 | ✅ 완료 | BorrowerOperations에서 자동 처리 |
| Claim Reward (both gains) | ✅ 완료 | collGain + boldGain 동시 클레임 |
| CollSurplusPool accounting | ✅ 완료 | 리뎀션 후 잉여 담보 추적 |
| CollateralRegistry 리뎀션 | ✅ 완료 | 멀티 브랜치 balance 추적 버그 수정 |
| **보안 패치 v3 (P1)** | ✅ 완료 | CollSurplusPool deployer guard, SortedTroves MAX_FIND_ITERATIONS=200, CollateralRegistry MAX_BRANCHES=10 |
| **Approve → OpenTrove 순서 보장** | ✅ 완료 | approve tx 컨펌 후 openTrove 팝업 (waitForTransactionReceipt) |

### 현재 배포 주소 요약

| 토큰/컨트랙트 | 주소 |
|--------------|------|
| wCTC (Mock) | `0x8f7f60a0f615d828eafcbbf6121f73efcfb56969` |
| lstCTC (Mock) | `0x72968ff9203dc5f352c5e42477b84d11c8c8f153` |
| sbUSD | `0x5772f9415b75ecca00e7667e0c7d730db3b29fbd` |
| BorrowerOps (wCTC) | `0xe8285b406dc77d16c193e6a1a2b8ecc1f386602c` |
| BorrowerOps (lstCTC) | `0x34f36f41f912e29c600733d90a4d210a49718a5d` |
| TroveManager (wCTC) | `0x30ef6615f01be4c9fea06c33b07432b40cab7bdc` |
| TroveManager (lstCTC) | `0xda7b322d26b3477161dc80282d1ea4d486528232` |
| CollateralRegistry | `0xb18f7a1944e905739e18f96d6e60427aab93c23d` |
| HintHelpers | `0x7e8fa8852b0c1d697905fd7594d30afe693c76bb` |

> 전체 주소는 `/SSOT.md` 참조

---

## 7. 추가로 개발해야 할 것

### 🔴 HIGH — 프로토콜 완성도

#### 7.1 리뎀션 수수료 (Redemption Fee)
현재 `redeemCollateral`에 수수료 없음. Liquity V2에서는 리뎀션 시 `baseRate`에 따라 0.5%–5% 수수료를 부과해 스팸 리뎀션 방지.
```
// TroveManager.sol에 추가 필요
uint256 public baseRate;
uint256 public lastFeeOperationTime;
function _calcRedemptionFee(uint256 collDrawn) internal returns (uint256)
function _updateBaseRateFromRedemption(...) internal
```

#### 7.2 Recovery Mode 구현
시스템 HF가 CCR 미만일 때 Recovery Mode 진입 로직이 선언만 되어 있고 실제로 동작하지 않음.
- Recovery Mode 진입 시 청산 기준을 CCR로 올려야 함
- 신규 트로브 개설 제한 (시스템 HF를 낮추는 방향 금지)
- BorrowerOperations에서 시스템 HF 체크 후 분기 처리

#### 7.3 DefaultPool 실제 활용
현재 DefaultPool이 배포는 되지만 미사용 상태. 청산 시 SP로 흡수 안 된 잔여 부채/담보를 DefaultPool에 보관하는 로직 추가 필요.

#### 7.4 Stakes/Snapshots 시스템
TroveManager에 `totalStakesSnapshot`, `L_Coll`, `L_BoldDebt` 변수가 선언되어 있지만 미사용. 이 시스템은 청산 손실을 기존 트로브에 按분 배분하는 Liquity V1 메커니즘으로, 구현 또는 제거 결정 필요.

#### 7.5 SortedTroves Hint 검증
`adjustTrove` 파라미터로 받는 `upperHint/lowerHint`가 현재 무시됨. 이자율 변경 외의 작업에서는 sorted 리스트 재정렬이 불필요하지만, 코드 정리 (파라미터 제거 또는 활용) 필요.

---

### 🟡 MEDIUM — 에이전트 기능

#### 7.6 실제 자동 리밸런스 실행
현재 `PositionMonitor`가 DANGER 감지 시 로그만 찍고 실제 트랜잭션은 권고만 함. 서버 월렛 보유 트로브에 대해 `addColl` 또는 `repayBold` 자동 실행 로직 연결 필요.

#### 7.7 이자율 자동 조정
리뎀션 위험 감지 시 자동 이자율 조정 (`adjustTroveInterestRate`) 실행 연결.

#### 7.8 에이전트 성과 추적 (ERC-8004)
IdentityRegistry, ReputationRegistry에 에이전트 등록/성과 기록 로직 연결 아직 미구현.

#### 7.9 포지션 생성 (에이전트 관리 모드)
Borrow 페이지에서 "Let Agent manage" 체크 시 실제 서버 월렛으로 openTrove 실행하는 플로우 완성 필요. (현재 서버 월렛 생성까지만 됨)

---

### 🟢 LOW — UX / 운영 개선

#### 7.10 StabilityPool depositors 배열 정리
완전 출금 시 `depositors[]`에서 제거 로직 추가. 가스 최적화 목적.
```solidity
// withdrawFromSP에 추가
if (dep.initialValue == 0) {
    // depositors 배열에서 swap-and-pop으로 제거
}
```

#### 7.11 챗봇 멀티턴 대화 개선
현재 history를 OpenAI에 전달하지만 rule-based fallback은 히스토리 무시. 문맥 유지 로직 개선.

#### 7.12 실시간 가격 오라클
현재 MockPriceFeed (수동 설정). 실제 체인링크 오라클 또는 Creditcoin 네이티브 피드 연결 필요.

#### 7.13 청산봇 (Keeper)
외부 keeper가 `liquidate()` 호출해줘야 청산이 발생. 자동 청산봇 or keeper 인센티브 구조 구현.

#### 7.14 프론트엔드 반응형 개선
모바일 레이아웃 미최적화. 대시보드, Borrow 페이지 모바일 UX 개선 필요.

#### 7.15 sbUSD Faucet UI
현재 admin API로만 발행 가능. 프론트엔드에 테스트넷 faucet 페이지 추가.

#### 7.16 테스트 코드
현재 컨트랙트 테스트 미존재. Hardhat 기반 단위 테스트 추가 필요:
- `openTrove` → `adjustTrove` → `liquidate` → `claimReward` 시나리오
- 이자 accrual 검증
- 리뎀션 surplus 클레임 검증

---

## 8. 향후 메인넷 전환 체크리스트

- [ ] 실제 가격 오라클 연결 (Chainlink / Creditcoin native)
- [ ] 리뎀션 수수료 메커니즘 구현 (#7.1)
- [ ] Recovery Mode 구현 (#7.2)
- [ ] 스마트 컨트랙트 외부 감사 완료
- [ ] `AUTH_DISABLED=true` 제거, 실제 API 인증 구현
- [ ] Privy 프로덕션 앱 설정 전환
- [ ] 청산봇 / keeper 네트워크 운영
- [ ] 멀티시그 deployer 설정 (Gnosis Safe)
- [ ] 모니터링 대시보드 (Grafana / Datadog)
- [ ] 인시던트 대응 플레이북 작성
