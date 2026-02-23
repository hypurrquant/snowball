# Snowball Demo Scenario

> AI Agent DeFi Platform on Creditcoin — 데모 영상 촬영 시나리오
> 예상 소요: 5~7분

---

## 사전 준비

### 1. 환경 세팅

```bash
# 터미널 1: shared 빌드
cd snowball
pnpm --filter @snowball/shared build

# 터미널 2: CDP Provider (port 3001)
pnpm dev:provider

# 터미널 3: Consumer API (port 3000)
pnpm dev:consumer

# 터미널 4: Chatbot (port 3002)
pnpm dev:chatbot

# 터미널 5: Frontend (port 5173)
pnpm --filter @snowball/frontend dev
```

### 2. 지갑 준비

- MetaMask에 Creditcoin Testnet 추가 (Chain ID: 102031)
- RPC: `https://rpc.cc3-testnet.creditcoin.network`
- 테스트 계정에 CTC 잔액 확인

### 3. 테스트 토큰 민팅 (촬영 전 실행)

```bash
ADDR="0xYOUR_WALLET_ADDRESS"

# wCTC 100개 민팅
curl -s localhost:3000/api/admin/mint-tokens \
  -X POST -H "Content-Type: application/json" \
  -d "{\"token\":\"wCTC\",\"to\":\"$ADDR\",\"amount\":\"100000000000000000000\"}"

# lstCTC 100개 민팅
curl -s localhost:3000/api/admin/mint-tokens \
  -X POST -H "Content-Type: application/json" \
  -d "{\"token\":\"lstCTC\",\"to\":\"$ADDR\",\"amount\":\"100000000000000000000\"}"

# 가격 설정: wCTC = $5000, lstCTC = $5000
curl -s localhost:3000/api/admin/set-price \
  -X POST -H "Content-Type: application/json" \
  -d '{"branch":0,"price":"5000000000000000000000"}'

curl -s localhost:3000/api/admin/set-price \
  -X POST -H "Content-Type: application/json" \
  -d '{"branch":1,"price":"5000000000000000000000"}'
```

### 4. 화면 배치

```
┌──────────────────────────────────┬──────────────────┐
│                                  │                  │
│        브라우저 (5173)            │   터미널 패널     │
│        (데모 메인 화면)           │   - 서버 로그     │
│                                  │   - SSE 스트림    │
│                                  │   - curl 명령     │
└──────────────────────────────────┴──────────────────┘
```

---

## 씬 1: 랜딩 페이지 (30초)

**화면:** `http://localhost:5173/`

**내레이션:**
> "Snowball은 Creditcoin 위에서 동작하는 AI 에이전트 기반 DeFi 플랫폼입니다.
> ERC-8004 표준을 활용한 에이전트 레지스트리와, Liquity V2 프로토콜을 통해
> CDP(Collateralized Debt Position) 관리를 자동화합니다."

**액션:**
1. 랜딩 페이지 스크롤 — Hero, 통계, How it Works 섹션 보여주기
2. "시작하기" 또는 "Dashboard" 버튼 클릭

---

## 씬 2: 지갑 연결 (20초)

**화면:** Header 영역

**내레이션:**
> "MetaMask로 Creditcoin Testnet에 연결합니다."

**액션:**
1. Header의 "Connect Wallet" 클릭
2. MetaMask 팝업에서 승인
3. 연결 후 주소 표시 확인

---

## 씬 3: 대시보드 확인 (30초)

**화면:** `/dashboard`

**내레이션:**
> "대시보드에서 프로토콜 전체 현황을 실시간으로 확인할 수 있습니다.
> 아직 포지션이 없는 상태입니다."

**액션:**
1. 프로토콜 통계 카드 4개 보여주기 (TVL, 대출총액, sbUSD 가격, 활성 에이전트)
2. 빈 포지션 리스트 확인
3. (선택) 터미널에서 pino JSON 로그 출력 보여주기 → **F7 구조화 로깅**

---

## 씬 4: AI 추천 받기 (40초)

**화면:** `/borrow`

**내레이션:**
> "AI 에이전트에게 투자 전략을 추천받겠습니다.
> 담보 타입과 금액을 선택하면, 에이전트가 시장 평균 이자율을 분석해서
> 최적의 전략을 제안합니다."

**액션:**
1. 담보 타입: wCTC 선택
2. 금액: 10 wCTC 입력
3. 전략 선택 3개 비교:

```bash
# 터미널에서 3가지 전략 비교 (선택사항 — UI에서 해도 됨)
curl -s localhost:3000/api/agent/recommend \
  -X POST -H "Content-Type: application/json" \
  -d '{"userAddress":"0xYOUR","collateralType":"wCTC","amount":"10000000000000000000","riskLevel":"conservative"}' | jq .

curl -s localhost:3000/api/agent/recommend \
  -X POST -H "Content-Type: application/json" \
  -d '{"userAddress":"0xYOUR","collateralType":"wCTC","amount":"10000000000000000000","riskLevel":"moderate"}' | jq .

curl -s localhost:3000/api/agent/recommend \
  -X POST -H "Content-Type: application/json" \
  -d '{"userAddress":"0xYOUR","collateralType":"wCTC","amount":"10000000000000000000","riskLevel":"aggressive"}' | jq .
```

4. 결과에서 강조할 포인트:
   - `recommendedInterestRate` → 시장 평균 기반 동적 계산 (**F2**)
   - `reasoning` → 시장 평균 이자율 언급 확인
   - `estimatedAPY`, `liquidationPrice`

---

## 씬 5: 포지션 오픈 (40초)

**화면:** `/borrow` → 터미널

**내레이션:**
> "Moderate 전략으로 포지션을 개설합니다.
> 10 wCTC 담보, CR 160%로 설정합니다."

**액션:**
```bash
curl -s localhost:3000/api/agent/execute \
  -X POST -H "Content-Type: application/json" \
  -d '{
    "userAddress":"0xYOUR",
    "action":"openTrove",
    "params":{
      "branch":0,
      "collateralAmount":"10000000000000000000",
      "debtAmount":"31250000000000000000000",
      "interestRate":"50000000000000000",
      "agentManaged": true
    },
    "submit": true,
    "riskLevel": "moderate"
  }' | jq .
```

1. TX 해시 반환 확인
2. 블록 익스플로러에서 TX 확인 (선택)

---

## 씬 6: 포지션 확인 (30초)

**화면:** `/dashboard`

**내레이션:**
> "대시보드로 돌아오면 방금 생성된 포지션이 표시됩니다.
> CR, 청산가격, 이자율을 실시간으로 모니터링합니다."

**액션:**
1. Dashboard 새로고침
2. TroveCard 확인 — CR 게이지, 담보/부채, 이자율
3. 터미널에서 직접 확인:

```bash
curl -s localhost:3000/api/user/0xYOUR/positions | jq .
```

---

## 씬 7: API 문서 (20초)

**화면:** `http://localhost:3000/api/docs`

**내레이션:**
> "모든 API는 OpenAPI 3.0 Swagger UI로 문서화되어 있습니다.
> 개발자는 이 인터페이스로 API를 탐색하고 테스트할 수 있습니다."

**액션:**
1. Swagger UI 페이지 보여주기
2. 엔드포인트 목록 스크롤
3. `/api/protocol/stats` 한 번 "Try it out" 실행

---

## 씬 8: SSE 실시간 모니터링 시작 (20초)

**화면:** 터미널 (SSE) + 브라우저 병렬

**내레이션:**
> "SSE(Server-Sent Events)로 포지션 상태를 실시간 스트리밍합니다."

**액션:**
```bash
# 별도 터미널에서 SSE 연결
curl -N localhost:3000/api/events/positions/0xYOUR_ADDRESS
```

1. `{"type":"connected"}` 이벤트 수신 확인
2. heartbeat `:heartbeat` 표시

---

## 씬 9: 위기 시뮬레이션 — 가격 폭락 (40초)

**화면:** 터미널 (curl) + SSE 터미널 병렬

**내레이션:**
> "가격 폭락 상황을 시뮬레이션합니다.
> wCTC 가격을 $5000에서 $2000으로 60% 하락시킵니다."

**액션:**
```bash
# 가격 60% 하락: $5000 → $2000
curl -s localhost:3000/api/admin/set-price \
  -X POST -H "Content-Type: application/json" \
  -d '{"branch":0,"price":"2000000000000000000000"}'
```

1. 약 30초 후 SSE 터미널에 이벤트 수신:
   - `"level": "DANGER"` 또는 `"level": "WARNING"`
   - CR 급락 확인
   - `action` 필드에 리밸런스 추천 내용
2. 서버 로그에서 모니터 이벤트 확인 (pino JSON)

**포인트:** **F1 Auto-Rebalance** + **F4 SSE** + **F5 Redemption 감지** 동시 시연

---

## 씬 10: 이자율 조정 (20초)

**화면:** 터미널

**내레이션:**
> "Redemption 위험이 감지되면 이자율을 조정할 수 있습니다."

**액션:**
```bash
# 이자율 조정 (5% → 7%)
curl -s localhost:3000/api/agent/adjust-rate \
  -X POST -H "Content-Type: application/json" \
  -d '{
    "userAddress":"0xYOUR",
    "params":{
      "branch":0,
      "troveId":"YOUR_TROVE_ID",
      "newInterestRate":"70000000000000000"
    },
    "submit": true
  }' | jq .
```

---

## 씬 11: AI 챗봇 (30초)

**화면:** `/chat`

**내레이션:**
> "AI 챗봇에게 자연어로 포지션 상태를 물어볼 수 있습니다."

**액션:**
1. Chat 페이지 열기
2. 입력: "내 포지션 상태 알려줘"
3. AI 응답 확인 — CR, 청산가, 건강 상태
4. 입력: "안전한 전략을 추천해줘"
5. 추천 응답 확인

---

## 씬 12: Stability Pool 참여 (30초)

**화면:** `/earn`

**내레이션:**
> "Stability Pool에 sbUSD를 예치하여 수익을 얻을 수 있습니다."

**액션:**
```bash
# SP 예치
curl -s localhost:3000/api/sp/deposit \
  -X POST -H "Content-Type: application/json" \
  -d '{
    "branchIndex":0,
    "amount":"1000000000000000000000",
    "userAddress":"0xYOUR",
    "submit": true
  }' | jq .
```

1. UI에서 Earn 페이지의 Pool 상태 확인
2. My Deposit 잔액 표시

---

## 씬 13: API 인증 시연 (20초)

**화면:** 터미널

**내레이션:**
> "보호된 API 엔드포인트는 인증이 필요합니다.
> API 키 또는 지갑 서명으로 인증합니다."

**액션:**
```bash
# AUTH_DISABLED=false 상태에서 테스트
# (또는 환경변수 변경 후 서버 재시작)

# 인증 없이 요청 → 401
curl -s localhost:3000/api/agent/recommend \
  -X POST -H "Content-Type: application/json" \
  -d '{"userAddress":"0xf00f","amount":"1"}' | jq .

# API Key 포함 → 200
curl -s localhost:3000/api/agent/recommend \
  -X POST -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{"userAddress":"0xYOUR","collateralType":"wCTC","amount":"10000000000000000000","riskLevel":"moderate"}' | jq .
```

---

## 씬 14: 프로토콜 통계 마무리 (20초)

**화면:** `/stats`

**내레이션:**
> "Stats 페이지에서 프로토콜 전체 현황을 한눈에 확인할 수 있습니다.
> 두 개의 담보 브랜치(wCTC, lstCTC) 각각의 시장 데이터가 표시됩니다."

**액션:**
1. Stats 페이지 스크롤
2. 마켓 테이블 — CR, MCR, CCR, LTV, 이자율, SP APY 확인
3. 프로토콜 파라미터 섹션

---

## 씬 15: 가격 복구 & 마무리 (20초)

**화면:** 터미널 + 대시보드

**액션:**
```bash
# 가격 복구: $5000
curl -s localhost:3000/api/admin/set-price \
  -X POST -H "Content-Type: application/json" \
  -d '{"branch":0,"price":"5000000000000000000000"}'
```

**내레이션:**
> "Snowball은 AI 에이전트 자동화, 실시간 모니터링, 리스크 관리를
> 하나의 플랫폼으로 통합합니다. 감사합니다."

---

## 핵심 기능 체크리스트

촬영 중 반드시 보여줘야 할 7대 기능:

| 기능 | 씬 | 확인 포인트 |
|------|-----|------------|
| **F1** Auto-Rebalance | 씬 9-10 | DANGER 이벤트 + 리밸런스 추천/실행 |
| **F2** 이자율 최적화 | 씬 4 | 시장 평균 기반 동적 추천 (conservative/moderate/aggressive) |
| **F3** API 인증 | 씬 13 | 401 → API Key → 200 |
| **F4** SSE 실시간 알림 | 씬 8-9 | event-stream 연결 + DANGER 이벤트 수신 |
| **F5** Redemption 보호 | 씬 9 | 이자율 vs 시장 평균 비교, risk 필드 |
| **F6** OpenAPI/Swagger | 씬 7 | Swagger UI + Try it out |
| **F7** 구조화 로깅 | 씬 3,9 | 터미널 pino JSON 로그 |

---

## 트러블슈팅

| 문제 | 해결 |
|------|------|
| MetaMask 연결 안됨 | Chain ID 102031 수동 추가, RPC URL 확인 |
| 토큰 민팅 실패 | ADMIN_PRIVATE_KEY 환경변수 확인 |
| 포지션 생성 실패 | 최소 부채 200 sbUSD, 토큰 잔액 충분한지 확인 |
| SSE 이벤트 안옴 | monitor가 해당 주소를 추적 중인지 확인 (agentManaged: true) |
| 가격 변경 후 반응 없음 | monitor poll interval 30초 — 최대 30초 대기 |
| 챗봇 응답 없음 | chatbot 서비스 (3002) 실행 중인지 확인 |
| 인증 테스트 시 항상 통과 | AUTH_DISABLED=true면 바이패스됨, false로 변경 후 재시작 |
