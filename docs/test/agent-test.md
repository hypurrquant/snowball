# Agent 이자율 관리 — E2E 시나리오 테스트

> agent-server + claude-proxy 파이프라인으로 Liquity V2 이자율 자동 조정이 동작하는지 검증

## 아키텍처

```
                    ┌──────────────┐
                    │  claude-proxy │  (port 3003, codex CLI spawn)
                    │  /plan 엔드포인트 │
                    └──────┬───────┘
                           │ JSON: {actions: [{capability, input, reason}]}
                           │
┌──────────────────────────┴──────────────────────────┐
│                    agent-server                       │
│  ┌────────────┐  ┌──────────┐  ┌─────────────────┐  │
│  │ Scheduler   │→│ Observer  │→│ Planner(cli)    │  │
│  │ (cron)      │  │ snapshot  │  │ → claude-proxy  │  │
│  │             │  │ + avg rate│  │ → parse JSON    │  │
│  └────────────┘  └──────────┘  └────────┬────────┘  │
│                                          │            │
│                                 ┌────────┴────────┐  │
│                                 │ Executor         │  │
│                                 │ AgentVault       │  │
│                                 │ .executeOnBehalf │  │
│                                 └─────────────────┘  │
└──────────────────────────────────────────────────────┘
                           │
                    ┌──────┴───────┐
                    │  On-chain     │
                    │  Liquity V2   │
                    │  adjustTrove  │
                    │  InterestRate │
                    └──────────────┘
```

## 목적

1. Observer가 `ActivePool`에서 시장 평균 이자율(avg rate)을 수집하는지
2. Planner(LLM)가 user rate vs avg rate를 비교하여 올릴지/내릴지 판단하는지
3. Executor가 `AgentVault.executeOnBehalf`로 `adjustTroveInterestRate`를 실행하는지
4. 전체 파이프라인이 cron → observer → planner → executor로 자동 동작하는지

## 계정 배정

| 역할 | 계정 | 주소 | 비고 |
|------|------|------|------|
| **User** (Agent에게 위임) | #5 Moderate Borrower | `0xdC810e6749C8D6c5108f0143845Bb61a3059bEb2` | AgentVault에 위임 |
| **Market Maker** (수동) | #1 Whale LP | `0x4BBae64C6d84E4dCD843CfEFB92A9E1d9400BD20` | 이자율 흔들기 역할 |

> 계정 키: `scripts/simulation-accounts.json`

## 사전 조건

### On-chain 상태
- User(#5)가 wCTC branch에 활성 Trove 보유
- User(#5)의 Trove에 대해 AgentVault가 `interestDelegate`로 설정됨
- AgentVault permission에 `adjustTroveInterestRate`, `addColl` selector 포함
- MM(#1)이 wCTC branch에 활성 Trove 보유

### 서비스 실행
- `claude-proxy` — port 3003에서 실행 (`make -C apps/claude-proxy up`)
- `agent-server` — `PLANNER_MODE=cli`, `CLAUDE_PROXY_URL=http://localhost:3003`

## 컨트랙트 참조

| 컨트랙트 | 주소 | 용도 |
|----------|------|------|
| AgentVault | `0x7bca6fb903cc564d92ed5384512976c94f2730d7` | executeOnBehalf |
| BorrowerOperations (wCTC) | `0xb637f375cbbd278ace5fdba53ad868ae7cb186ea` | adjustTroveInterestRate |
| TroveManager (wCTC) | `0xa20f9dfeb110e11c89147b9db5adb98a7d91e70e` | getLatestTroveData |
| ActivePool (wCTC) | `0xa7f0600a023cf6076f5d8dc51b46b91bafe095e5` | aggWeightedDebtSum, aggRecordedDebt |
| SortedTroves (wCTC) | `0xf5ef344759df7786cda9d2133e4d1e10e3b43f9f` | findInsertPosition |
| HintHelpers | `0x6ee9850b0915763bdc0c7edca8b66189449a447f` | getApproxHint(branchIdx, rate, trials, seed) |

## Agent 판단 기준 (시스템 프롬프트)

| 조건 | 액션 | 목표 이자율 |
|------|------|------------|
| `user rate < avg rate` | RAISE | `avg + 1%` |
| `user rate > avg rate + 2%` | LOWER | `avg + 1%` |
| 그 외 (avg ~ avg+2%) | NO ACTION | 유지 |

> 시스템 프롬프트: `packages/agent-runtime/prompts/demo-agent-system.md`

## 테스트 순서

### Step 1: On-chain Smoke Test (CLI)

agent-server를 띄우기 전에 기본 온체인 호출이 되는지 확인:

```bash
# avg rate 조회 + hint 계산 + 이자율 조정이 작동하는지
NODE_PATH=apps/web/node_modules npx tsx scripts/sim/interest-rate-cli.ts status
NODE_PATH=apps/web/node_modules npx tsx scripts/sim/interest-rate-cli.ts check
```

### Step 2: 위임 설정

User(#5)의 Trove에 대해:
1. `setInterestIndividualDelegate(troveId, AgentVault, minRate, maxRate, ...)`
2. AgentVault permission에 `adjustTroveInterestRate` + `addColl` selector 부여

> `DelegationSetupWizard` UI 또는 스크립트로 수행

### Step 3: 서비스 실행

```bash
# Terminal 1: claude-proxy
make -C apps/claude-proxy up    # port 3003

# Terminal 2: agent-server
cd apps/agent-server
PLANNER_MODE=cli \
CLAUDE_PROXY_URL=http://localhost:3003 \
AGENT_PRIVATE_KEY=<agent-key> \
pnpm start:dev
```

### Step 4: 단건 실행 (POST /agent/run)

```bash
curl -X POST http://localhost:3001/agent/run \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -d '{
    "user": "0xdC810e6749C8D6c5108f0143845Bb61a3059bEb2",
    "manifestPath": "manifests/demo-agent.json"
  }'
```

응답에서 확인:
- `reasoning`: avg rate vs user rate 비교 설명
- `plan.steps`: `liquity.adjustInterestRate` 포함 여부
- `txHashes`: 실제 TX 해시
- `status`: `success`

### Step 5: Market Maker로 avg rate 흔들기

```bash
# MM(#1) 이자율을 15%로 올림 → avg rate 상승
NODE_PATH=apps/web/node_modules npx tsx scripts/sim/interest-rate-cli.ts mm 15

# 다시 agent 실행 → user rate < avg이면 RAISE 발생해야 함
curl -X POST http://localhost:3001/agent/run ...

# MM(#1) 이자율을 2%로 내림 → avg rate 하락
NODE_PATH=apps/web/node_modules npx tsx scripts/sim/interest-rate-cli.ts mm 2

# 다시 agent 실행 → user rate >> avg이면 LOWER 발생해야 함
curl -X POST http://localhost:3001/agent/run ...
```

### Step 6: Cron 자동 실행 (최종)

```bash
cd apps/agent-server
PLANNER_MODE=cli \
CLAUDE_PROXY_URL=http://localhost:3003 \
AGENT_CRON="*/1 * * * *" \
AGENT_CRON_MANIFEST=manifests/demo-agent.json \
AGENT_PRIVATE_KEY=<agent-key> \
pnpm start:dev
```

→ 1분마다 자동으로 delegated user 스캔 → snapshot → plan → execute

## 검증 포인트

- [ ] Observer: avg rate이 0이 아닌 유효한 값으로 조회됨
- [ ] Planner: reasoning에 user rate vs avg rate 비교가 포함됨
- [ ] Planner: 올바른 capability (`liquity.adjustInterestRate`) 선택
- [ ] Executor: `adjustTroveInterestRate` TX 성공 (txHash 존재)
- [ ] MM rate 변경 후 → agent가 반대 방향으로 조정
- [ ] Cron 경로에서도 동일하게 동작

## 핵심 온체인 공식

```
avg rate = ActivePool.aggWeightedDebtSum() / ActivePool.aggRecordedDebt()
```

- `aggWeightedDebtSum = sum(annualInterestRate_i * recordedDebt_i)` (1e36 스케일)
- `aggRecordedDebt = sum(recordedDebt_i)` (1e18 스케일)
- 결과: 1e18 스케일 (5% = 5e16)

## 관련 코드

| 파일 | 역할 |
|------|------|
| `packages/agent-runtime/src/observers/liquity.ts` | trove 데이터 + avg rate 수집 |
| `packages/agent-runtime/src/planner/cli-planner.ts` | prompt 생성 + proxy 호출 |
| `packages/agent-runtime/src/capabilities/liquity-adjust-interest-rate.ts` | TX 생성 |
| `packages/agent-runtime/src/utils/liquity-hints.ts` | hint 계산 |
| `packages/agent-runtime/prompts/demo-agent-system.md` | LLM 시스템 프롬프트 |
| `apps/agent-server/src/scheduler/scheduler.service.ts` | cron 스케줄러 |
| `apps/claude-proxy/server.js` | LLM proxy (codex CLI) |
