# OP.md — Snowball Protocol Operations Guide

> 운영 담당자를 위한 가이드. 서버 실행, 배포, 모니터링, 트러블슈팅, 향후 개발 계획을 포함합니다.
> Last updated: 2026-02-24

---

## 1. 서버 실행 (현재 운영 방식)

### 포트 구성

| 서비스 | 포트 | 설명 | 현재 상태 |
|--------|------|------|-----------|
| Frontend | 5173 | Vite dev server | ✅ 운영 중 |
| agent-consumer | 3000 | 메인 REST API + 포지션 모니터 | ✅ 운영 중 |
| agent-chatbot | 3002 | AI 챗봇 | ✅ 운영 중 |
| agent-cdp-provider | 3001 | A2A JSON-RPC 트랜잭션 빌더 | ⏸️ 미사용 (AgentVault 비활성화) |

### 현재 시작 방법 (개발 환경)

```bash
# 0. 루트 디렉토리로 이동
cd /path/to/snowball

# 1. 기존 프로세스 정리 (재시작 시)
lsof -ti:3000,3002,5173 | xargs kill -9 2>/dev/null

# 2. agent-consumer 실행 (port 3000)
cd packages/agent-consumer && pnpm dev &

# 3. agent-chatbot 실행 (port 3002)
cd ../agent-chatbot && pnpm dev &

# 4. 프론트엔드 실행 (port 5173)
cd ../frontend && pnpm dev
```

또는 루트에서 한 번에:

```bash
pnpm dev:consumer &
pnpm dev:chatbot &
pnpm --filter @snowball/frontend dev
```

### ABI 변경 후 재빌드 순서

```bash
# 1. 컨트랙트 컴파일
cd packages/contracts-liquity && npx hardhat compile

# 2. shared ABI 재빌드
cd ../shared && pnpm build

# 3. 프론트엔드 재시작 (HMR 자동 반영 or 수동)
# Vite HMR이 자동으로 반영하므로 대부분 재시작 불필요
```

### 헬스 체크

```bash
curl http://localhost:3000/api/health   # consumer API
curl http://localhost:3002/health       # chatbot
# 프론트엔드는 브라우저에서 http://localhost:5173 접속
```

### 프로세스 종료

```bash
# 포트 기준 종료 (가장 안전)
lsof -ti:3000,3002,5173 | xargs kill -9 2>/dev/null

# 또는 프로세스명 기준
pkill -f "agent-consumer"
pkill -f "agent-chatbot"
pkill -f "vite"
```

---

## 2. 환경 변수 (.env)

루트 `.env` 기준:

```env
# 배포자 지갑
DEPLOYER_PRIVATE_KEY=0x...

# Privy (서버 월렛 관리)
PRIVY_APP_ID=...
PRIVY_APP_SECRET=...

# OpenAI (챗봇 LLM, 없으면 rule-based fallback)
OPENAI_API_KEY=sk-...

# 포트
PORT=3000
CDP_PROVIDER_PORT=3001
CHATBOT_PORT=3002

# 개발용 인증 우회
AUTH_DISABLED=true

# 컨슈머 API URL (챗봇이 참조)
CONSUMER_API_URL=http://localhost:3000
```

**주의:**
- `AUTH_DISABLED=true`는 개발 전용. 프로덕션에서 절대 사용 금지
- `DEPLOYER_PRIVATE_KEY`는 절대 커밋하지 말 것 (`.gitignore`에 포함됨)

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
