# Snowball Agent Architecture Guide

> 프로젝트를 처음 접하는 사람을 위한 Agent 시스템 전체 설계 가이드 (Contract + Runtime + Frontend)

---

## 개요

Snowball Protocol의 Agent 시스템은 **사용자가 AI 에이전트에게 DeFi 포트폴리오 관리를 위임**하는 온체인 자동화 플랫폼이다. 사용자는 토큰을 Vault에 예치하고, 에이전트에게 세밀한 권한을 부여하면, 에이전트가 Claude AI 기반으로 시장 상황을 판단해 자동으로 트랜잭션을 실행한다.

### 시스템 전체 흐름

```
사용자                         에이전트 (AI)
  |                               |
  |-- 1. Vault에 토큰 예치 ------->|
  |-- 2. 에이전트에 권한 부여 ----->|
  |-- 3. 프로토콜 위임 설정 ------>|
  |                               |
  |   [에이전트 자율 실행 루프]     |
  |                               |-- 4. 온체인 상태 관측
  |                               |-- 5. Claude AI로 전략 수립
  |                               |-- 6. 트랜잭션 실행
  |                               |
  |<-- 7. 실행 결과 확인 ----------|
```

---

## Part 1: Smart Contracts

### 1.1 시스템 구성

Agent 시스템은 4개의 컨트랙트로 구성된다.

| 컨트랙트 | 역할 | 배포 주소 (Creditcoin Testnet) |
|---------|------|------------------------------|
| **IdentityRegistry** | 에이전트 등록/관리 (ERC-721 NFT) | `0x993C...de9B` |
| **ReputationRegistry** | 에이전트 평판/리뷰 | `0x3E5E...0726` |
| **ValidationRegistry** | 에이전트 인증 | `0x84b9...a023` |
| **AgentVault** | 토큰 보관 + 권한 관리 + 위임 실행 | `0x7d3f...e3ed` |

### 1.2 IdentityRegistry - 에이전트 신원 관리

ERC-721 NFT를 발행하여 에이전트를 온체인에 등록한다.

```solidity
// 등록
function registerAgent(
    string name,          // "Morpho Optimizer"
    string agentType,     // "defi-yield"
    address endpoint,     // 에이전트 EOA 주소
    string tokenURI       // 메타데이터 URI
) returns (uint256 agentId);

// 조회
function getAgentInfo(uint256 agentId) returns (AgentInfo);
function getOwnerAgents(address owner) returns (uint256[]);
function totalAgents() returns (uint256);

// 생명주기
function deactivateAgent(uint256 agentId);
function activateAgent(uint256 agentId);
```

**AgentInfo 구조:**
```
{
  name: "Morpho Optimizer",
  agentType: "defi-yield",
  endpoint: 0x1234...ABCD,    // 에이전트 지갑 주소
  registeredAt: 1709784000,
  isActive: true
}
```

### 1.3 ReputationRegistry - 평판 시스템

사용자가 에이전트에 대한 리뷰를 제출하고, 에이전트 소유자가 실행 결과를 기록한다.

```solidity
// 리뷰 제출 (1~5점, 100~500으로 스케일)
function submitReview(uint256 agentId, int128 score, string comment, string tag);

// 실행 기록 (소유자만)
function recordInteraction(uint256 agentId, string tag, bool success);

// 조회
function getReputation(uint256 agentId, string tag)
    returns (ReputationData);     // totalInteractions, successfulInteractions, reputationScore, decimals
function getSuccessRate(uint256 agentId, string tag)
    returns (uint256);            // 0~10000 (basis points)
function getReviews(uint256 agentId) returns (Review[]);
```

### 1.4 ValidationRegistry - 인증 시스템

사전 승인된 validator가 에이전트를 인증한다.

```solidity
function validateAgent(uint256 agentId, uint256 validityPeriod, string certificationURI);
function isValidated(uint256 agentId) returns (bool);
function suspendAgent(uint256 agentId);
function revokeAgent(uint256 agentId);
```

상태: `Unvalidated(0)` → `Pending(1)` → `Validated(2)` → `Suspended(3)` / `Revoked(4)`

### 1.5 AgentVault - 핵심 컨트랙트 (v3)

사용자가 토큰을 예치하고, 에이전트에게 세밀한 권한을 부여하는 금고.

#### 1.5.1 데이터 구조

**관심사 분리** - 실행 권한과 토큰 지출 권한이 분리되어 있다:

```solidity
// 실행 권한: "어떤 컨트랙트의 어떤 함수를 호출할 수 있는가"
struct ExecutionPermission {
    address[] allowedTargets;     // 허용된 컨트랙트 주소 목록
    bytes4[] allowedFunctions;    // 허용된 함수 셀렉터 목록
    uint256 expiry;               // 만료 시간 (0 = 영구)
    bool active;                  // 활성 여부
}

// 토큰 지출 한도: "어떤 토큰을 얼마까지 쓸 수 있는가"
struct TokenAllowance {
    uint256 cap;       // 최대 한도
    uint256 spent;     // 이미 사용한 금액
    uint256 nonce;     // stale 방지 (grantPermission마다 증가)
}

// 입력용 (cap 설정 시)
struct TokenCapInput {
    address token;     // 토큰 주소
    uint256 cap;       // 한도
}
```

**Storage 레이아웃:**
```
_balances:         user → token → uint256                      (예치 잔고)
_execPerms:        user → agent → ExecutionPermission          (실행 권한)
_tokenAllowances:  user → agent → token → TokenAllowance      (토큰별 한도)
_permNonce:        user → agent → uint256                      (권한 버전)
_delegatedUsers:   agent → address[]                           (위임한 유저 목록)
```

#### 1.5.2 핵심 함수

**예치/출금** (사용자 직접 호출):
```solidity
function deposit(address token, uint256 amount) external;    // ERC-20 예치
function withdraw(address token, uint256 amount) external;   // 출금
```

**권한 관리** (사용자 직접 호출):
```solidity
// 에이전트에 권한 부여 (실행 권한 + 토큰 cap 동시 설정)
function grantPermission(
    address agent,                     // 에이전트 주소
    address[] targets,                 // 허용 컨트랙트들
    bytes4[] functions,                // 허용 함수들
    uint256 expiry,                    // 만료 시간
    TokenCapInput[] tokenCaps          // 토큰별 한도 [{wCTC, 100e18}, {sbUSD, 1000e18}]
) external;

// 토큰 한도만 업데이트 (실행 권한 변경 없이)
function setTokenAllowances(address agent, TokenCapInput[] tokenCaps) external;

// 즉시 권한 취소
function revokePermission(address agent) external;
```

**에이전트 실행** (에이전트가 호출):
```solidity
// 실행만 (토큰 이동 없음) - 예: 이자율 조정
function executeOnBehalf(
    address user,      // 권한 부여한 사용자
    address target,    // 호출 대상 컨트랙트
    bytes data         // 호출 데이터
) external returns (bytes memory);

// 토큰 approve + 실행 + cleanup (atomic) - 예: 담보 추가, 공급
function approveAndExecute(
    address user,
    address token,     // approve할 토큰
    uint256 amount,    // approve 금액
    address target,    // 호출 대상 = approve 대상
    bytes data         // 호출 데이터
) external returns (bytes memory);

// 토큰 전송 (목적지 제한)
function transferFromVault(
    address user,
    address token,
    address to,        // allowedTargets 또는 user 본인만 허용
    uint256 amount
) external;
```

**조회** (누구나 호출):
```solidity
// 권한 + 토큰 한도 일괄 조회
function getPermission(address user, address agent, address[] tokens)
    returns (PermissionView);

// 단일 토큰 한도 조회
function getTokenAllowance(address user, address agent, address token)
    returns (uint256 cap, uint256 spent);

// 권한 버전 조회
function getPermNonce(address user, address agent) returns (uint256);

// 잔고 조회
function getBalance(address user, address token) returns (uint256);

// 특정 에이전트에게 권한 부여한 유저 목록
function getDelegatedUsers(address agent) returns (address[]);
```

#### 1.5.3 보안 설계

**Nonce 메커니즘 (Stale Allowance 방지):**
```
1. 사용자가 grantPermission() 호출 → nonce 증가 (예: 1 → 2)
2. wCTC cap=100, sbUSD cap=1000 설정 (nonce=2로 기록)
3. 사용자가 revokePermission() 호출 → active=false
4. 사용자가 다시 grantPermission() 호출 → nonce 증가 (2 → 3)
5. 이번에는 wCTC cap=50만 설정 (nonce=3)
6. 이전의 sbUSD allowance (nonce=2) → nonce 불일치로 사용 불가
```

**approveAndExecute Atomic 보호:**
```
1. 실행 권한 체크 (active, expiry, target, selector)
2. 토큰 한도 차감 (nonce 체크 + cap 체크)
3. 사용자 잔고 차감
4. forceApprove(target, amount)     ← approve
5. target.call(data)                ← 실행
6. forceApprove(target, 0)          ← cleanup (잔여 approve 제거)
7. 실패 시 전체 revert (상태 원복)
```

**transferFromVault 목적지 제한:**
- `to`가 `allowedTargets` 배열에 포함되거나 `user` 본인이어야 함
- 에이전트가 임의 주소로 자금 전송 불가

---

## Part 2: Agent Runtime (TypeScript 실행 엔진)

### 2.1 아키텍처 개요

```
packages/agent-runtime/src/
  types.ts              # 공통 타입 정의
  config.ts             # 환경변수 기반 설정
  abis.ts               # 온체인 호출용 ABI
  runtime.ts            # 메인 실행 엔진
  registry.ts           # Capability 필터링
  observers/
    vault.ts            # Vault 상태 관측
    morpho.ts           # Morpho 상태 관측
    liquity.ts          # Liquity 상태 관측
  planner/
    anthropic-planner.ts    # Claude AI 기반 전략 수립
    anthropic-tools.ts      # Capability → Claude Tool 변환
  capabilities/
    morpho-supply.ts        # Morpho 공급
    morpho-withdraw.ts      # Morpho 출금
    liquity-add-collateral.ts     # Liquity 담보 추가
    liquity-adjust-interest-rate.ts  # Liquity 이자율 조정
```

### 2.2 실행 파이프라인

`AgentRuntime.run(manifest, user, troveId, runId)` 호출 시:
- `runId`는 외부(Agent Server)에서 주입 — 2-Phase Write를 위해 서버가 사전에 UUID를 생성하여 DB에 `started` 레코드를 삽입한 후 runtime에 전달한다.
- Anthropic SDK에 60초 타임아웃이 설정되어 있다.

```
[1. Observe]  온체인 상태 수집 (Vault + Morpho + Liquity 병렬)
      ↓
[2. Filter]   실행 가능한 Capability 필터링
      ↓
[3. Plan]     Claude AI에게 상태 전달 → 전략 수립 (60s timeout)
      ↓
[4. Execute]  계획된 트랜잭션 순차 실행
      ↓
[5. Report]   실행 결과 반환
```

### 2.3 Snapshot (온체인 상태 수집)

세 영역의 온체인 상태를 병렬로 조회한다:

```typescript
interface Snapshot {
  vault: VaultSnapshot;     // 잔고 + 권한 상태
  morpho: MorphoSnapshot;   // 공급 포지션 + 인가 상태
  liquity: LiquitySnapshot; // Trove 담보/부채/이자율 + 위임 상태
  timestamp: number;
}
```

**VaultSnapshot:**
```typescript
{
  balances: {
    "0x8aef...": 1000000000000000000n,   // wCTC: 1.0
    "0xbc7d...": 5000000000000000000n,   // sbUSD: 5.0
  },
  permissions: [{
    agent: "0x1234...",
    targets: ["0xMorpho..."],
    selectors: ["0x12345678", "0xabcdef01"],
    expiry: 1712000000n,
    active: true,
    tokenAllowances: [
      { token: "0xsbUSD...", cap: 1000n * 10n**18n, spent: 200n * 10n**18n }
    ]
  }]
}
```

**MorphoSnapshot:**
```typescript
{
  supplyAssets: 5000000000000000000n,  // 공급 자산 (wei)
  supplyShares: 4800000000000000000n,  // 공급 지분
  isAuthorized: true,                  // AgentVault가 Morpho에서 인가되었는지
  utilizationRate: 35.42               // 마켓 활용률 (%)
}
```

**LiquitySnapshot:**
```typescript
{
  troveId: 123n,
  hasTrove: true,
  collateral: 10000000000000000000n,   // 담보 (wei)
  debt: 5000000000000000000n,           // 부채 (wei)
  annualInterestRate: 50000000000000000n, // 5%
  lastInterestRateAdjTime: 1709500000n,
  isAddManager: true,                   // AgentVault가 addManager인지
  isInterestDelegate: true              // AgentVault가 이자율 대리인인지
}
```

### 2.4 Capability (에이전트 행동 단위)

각 Capability는 에이전트가 수행할 수 있는 하나의 행동을 정의한다:

```typescript
interface Capability<TInput> {
  id: string;                        // "morpho.supply"
  description: string;               // Claude가 이해하는 설명
  inputSchema: JsonSchema;           // Claude가 파라미터를 채울 스키마
  requiredPermissions(config): PermissionSpec[];  // 필요 권한
  preconditions(ctx, input): CheckResult[];       // 사전 조건 체크
  buildCalls(ctx, input): PreparedCall[];          // 트랜잭션 생성
}
```

**구현된 4개 Capability:**

| ID | 설명 | 필요 권한 | 핵심 로직 |
|----|------|----------|---------|
| `morpho.supply` | Morpho 마켓에 토큰 공급 | Morpho.supply | `approveAndExecute(user, sbUSD, amount, morpho, supply(...))` |
| `morpho.withdraw` | Morpho 마켓에서 토큰 출금 | Morpho.withdraw | `executeOnBehalf(user, morpho, withdraw(...))` |
| `liquity.addCollateral` | Liquity Trove에 담보 추가 | BorrowerOps.addColl | `approveAndExecute(user, wCTC, amount, borrowerOps, addColl(...))` |
| `liquity.adjustInterestRate` | Liquity Trove 이자율 변경 | BorrowerOps.adjustTroveInterestRate | `executeOnBehalf(user, borrowerOps, adjustRate(...))` |

**사전 조건 예시 (morpho.supply):**
1. amount > 0
2. Vault에 sbUSD 잔고 충분
3. Vault 권한 활성 상태
4. Morpho에서 AgentVault 인가됨

### 2.5 Planner (Claude AI 전략 수립)

**Flow:**
1. 실행 가능한 Capability 목록 → Claude Tool로 변환
2. 현재 포트폴리오 상태를 텍스트로 구성
3. Claude API 호출 (tool_use 모드)
4. Claude가 선택한 tool_use → PlanStep으로 변환

**Claude에게 전달되는 상태 메시지 예시:**
```
## Current Portfolio State
### Vault
- Balances: { wCTC: "10.0", sbUSD: "5000.0" }
- Active permissions: 1

### Morpho
- Supply position: 2000.0 sbUSD
- Authorization: yes
- Utilization rate: 35.42%

### Liquity
- Has trove: true
- Collateral: 10.0 wCTC
- Debt: 3000.0 sbUSD
- Annual Interest Rate: 5.0%
```

**Claude의 응답 (tool_use):**
```json
{
  "type": "tool_use",
  "name": "morpho_supply",
  "input": {
    "amount": "3000000000000000000000",
    "reason": "Utilization rate is 35%, room to supply more sbUSD for yield"
  }
}
```

### 2.6 Capability Registry (필터링)

`listExecutable(manifest, snapshot, config)` 메서드가 3단계 필터를 적용한다:

```
1. Manifest 화이트리스트: manifest.allowedCapabilities에 포함된 것만
2. Vault 권한 상태: 스냅샷에서 해당 target/selector가 active인지
3. 프로토콜 인가: Morpho.isAuthorized, Liquity.isAddManager 등
```

### 2.7 Agent Manifest (에이전트 설정)

```json
{
  "id": "snowball-morpho-optimizer-v1",
  "version": "1.0.0",
  "name": "Morpho Optimizer",
  "network": { "chainId": 102031 },
  "llm": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-20250514",
    "systemPromptFile": "morpho-optimizer.md"
  },
  "scope": {
    "singleUser": true,
    "morphoMarket": "sbUSD-wCTC",
    "maxSteps": 3
  },
  "allowedCapabilities": ["morpho.supply", "morpho.withdraw"],
  "riskPolicy": {
    "abortOnFailedPrecondition": true,
    "cleanupAllowanceAfterUse": true
  }
}
```

---

## Part 3: Agent Server (NestJS 백엔드)

### 3.1 아키텍처

```
apps/agent-server/src/
  main.ts                          # 서버 진입점 (port 3001, Winston 로거)
  app.module.ts                    # 루트 모듈 (ThrottlerModule + DatabaseModule)
  database/
    database.module.ts             # Global 모듈 (DatabaseService export)
    database.service.ts            # SQLite + WAL + 마이그레이션 + crash recovery
  agent/
    agent.module.ts                # Agent 모듈 (DI: AGENT_RUNTIME provider)
    agent.service.ts               # 비즈니스 로직 (2-phase write)
    agent.controller.ts            # HTTP 엔드포인트 (Rate Limiting)
    run-store.service.ts           # DB CRUD (insertStarted, updateTerminal, findByUser...)
    dto/run-agent.dto.ts           # 요청 DTO
  scheduler/
    scheduler.module.ts            # 스케줄러 모듈
    scheduler.service.ts           # Cron 기반 자동 실행
  common/
    guards/api-key.guard.ts        # API Key 인증
    filters/http-exception.filter.ts  # 전역 예외 필터
    logger/winston.config.ts       # Winston 설정 (콘솔 + 파일 + 에러)
```

### 3.2 SQLite 영속화 (2-Phase Write)

실행 결과가 SQLite(WAL 모드)에 영구 저장된다. 2-Phase Write 패턴으로 서버 크래시 시 데이터 일관성을 보장한다:

```
Phase 1: Pre-insert
  RunStore.insertStarted(runId, user, manifestId)  → status='started'
  실패 시 → 500 (런타임 실행 안 함, fail-closed)

Phase 2: Runtime 실행 후
  RunStore.updateTerminal(runId, result)  → status='success'/'error'/'no_action'
  실패 시 → Fallback: updateError(runId) → status='error'
            Fallback도 실패 → 500
```

**Crash Recovery**: 서버 재시작 시 `status='started'` 레코드를 자동으로 `'error'`로 변경.

**started→error API 매핑**: GET /agent/runs 응답에서 `status='started'` 레코드는 `'error'`로 매핑하여 반환 (클라이언트에 started 노출 방지).

**스키마:**
```sql
CREATE TABLE agent_runs (
  run_id TEXT PRIMARY KEY,
  user TEXT NOT NULL,
  manifest_id TEXT NOT NULL,
  status TEXT NOT NULL,          -- 'started' | 'success' | 'error' | 'no_action'
  result_json TEXT,              -- JSON.stringify(RunResult, bigintReplacer)
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### 3.3 DI (Dependency Injection)

AgentRuntime을 NestJS provider로 주입하여 테스트에서 mock 교체 가능:

```typescript
// agent.module.ts
providers: [
  AgentService,
  RunStoreService,
  { provide: "AGENT_RUNTIME", useFactory: () => new AgentRuntime() },
]

// agent.service.ts
constructor(
  @Inject("AGENT_RUNTIME") private readonly runtime: AgentRuntime,
  private readonly runStore: RunStoreService,
) {}
```

### 3.4 로깅 (Winston)

3중 로깅 체계:

| Transport | 대상 | 포맷 | 로테이션 |
|-----------|------|------|---------|
| Console | stdout | colorize + timestamp | - |
| File | `logs/agent-YYYY-MM-DD.log` | JSON | 20MB × 14파일 |
| Error File | `logs/error-YYYY-MM-DD.log` | JSON | 20MB × 14파일 |

### 3.5 API 엔드포인트

모든 엔드포인트는 `x-api-key` 헤더 필수.

| Method | Path | Rate Limit | 설명 |
|--------|------|-----------|------|
| `POST` | `/agent/run` | **10회/분** | 에이전트 실행 요청 |
| `GET` | `/agent/runs` | 60회/분 | 실행 이력 조회 (?user=0x... 필터) |
| `GET` | `/agent/runs/:id` | 60회/분 | 특정 실행 결과 (200/404) |
| `GET` | `/agent/status` | 60회/분 | 서버 상태 (uptime, totalRuns, registeredAgents) |
| `GET` | `/agent/manifests` | 60회/분 | 등록된 Manifest 목록 |

**실행 요청:**
```json
POST /agent/run
x-api-key: <secret>

{
  "user": "0x1234...ABCD",
  "manifestId": "snowball-demo-defi-manager",
  "troveId": "123"  // optional, Liquity용
}
```

**실행 결과:**
```json
{
  "runId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "success",
  "plan": {
    "goal": "Optimize portfolio",
    "steps": [
      { "capabilityId": "morpho.supply", "input": { "amount": "1000...", "reason": "..." } }
    ]
  },
  "txHashes": ["0xabc..."],
  "logs": ["Supplied 1000 sbUSD to Morpho"],
  "errors": [],
  "reasoning": "Utilization rate is low, good time to supply",
  "timestamp": 1709784000,
  "user": "0x1234...ABCD",
  "manifestId": "snowball-demo-defi-manager"
}
```

**동시 실행 방지**: 동일 user+manifestId 조합의 실행이 이미 진행 중이면 `409 Conflict` 반환.

### 3.6 스케줄러 (Cron 자동 실행)

```typescript
// 5분마다 실행
@Cron('*/5 * * * *')
async handleCron() {
  // 1. 온체인에서 getDelegatedUsers() 호출 → active 유저 목록
  // 2. 각 유저에 대해 순차적으로 에이전트 실행
  // 3. 결과 로깅
}
```

### 3.7 프론트엔드 프록시

Next.js API Routes가 프론트엔드에서 에이전트 서버로 프록시한다:

```
[브라우저] → /api/agent/run → [Next.js 서버] → /agent/run → [Agent Server]
                                  ↑
                          API Key 주입 (서버사이드)
```

클라이언트에 API Key가 노출되지 않는다.

### 3.8 E2E 테스트

11개 시나리오로 서버 핵심 동작을 검증한다 (`apps/agent-server/test/agent.e2e-spec.ts`):

| # | 시나리오 | 검증 대상 |
|---|---------|----------|
| 1 | 정상 실행 | POST /agent/run → 200 + status=success |
| 2 | API Key 누락 | 401 Unauthorized |
| 3 | 동시 실행 | 409 Conflict (같은 user+manifest) |
| 4 | 유저 필터 | GET /agent/runs?user= → 해당 유저만 |
| 5 | 단건 조회 | GET /agent/runs/:id → 200 |
| 6 | 미존재 ID | GET /agent/runs/:id → 404 |
| 7 | 서버 상태 | uptime, registeredAgents, totalRuns |
| 8 | 영속성 | DB에 레코드 존재 확인 |
| 9 | Crash Recovery | started → error 자동 전환 |
| 10 | BigInt 직렬화 | JSON.stringify 에러 없음 |
| 11 | started→error 매핑 | API 응답에서 started가 error로 노출 |

테스트는 `TestDatabaseService`(임시 SQLite)와 `MockAgentRuntime`으로 외부 의존성 없이 동작한다.

---

## Part 4: Frontend (Next.js)

### 4.1 디렉토리 구조

```
apps/web/src/domains/agent/
  types/
    index.ts                      # 프론트엔드 타입 정의
  hooks/
    useAgentList.ts               # 에이전트 목록 조회
    useMyAgents.ts                # 내 에이전트 조회
    useAgentProfile.ts            # 에이전트 상세 프로필
    useVaultBalance.ts            # Vault 잔고 조회
    useVaultActions.ts            # Vault 예치/출금
    useVaultPermission.ts         # 권한 관리 (부여/취소/조회)
    useRunAgent.ts                # 에이전트 실행 API 호출
    useAgentRuns.ts               # 실행 이력 조회
    useActivityLog.ts             # 활동 로그 포맷팅
    useRegisterAgent.ts           # 에이전트 등록
    useSubmitReview.ts            # 리뷰 제출
    useAgentActions.ts            # 기타 에이전트 액션
  components/
    AgentCard.tsx                 # 에이전트 카드 (마켓플레이스)
    AgentProfileHeader.tsx        # 에이전트 프로필 헤더
    PermissionForm.tsx            # 권한 부여 폼 (preset/custom)
    PermissionList.tsx            # 부여된 권한 목록
    DelegationSetupWizard.tsx     # 3-Step 위임 설정 마법사
    DelegationStatus.tsx          # 위임 상태 표시
    RunAgentButton.tsx            # 에이전트 실행 버튼
    ReviewForm.tsx                # 리뷰 작성 폼
    ReputationSection.tsx         # 평판 표시
    VaultDepositDialog.tsx        # Vault 예치 다이얼로그
    ActivityLog.tsx               # 활동 로그 타임라인

apps/web/src/app/(more)/agent/
  page.tsx                        # 에이전트 마켓플레이스
  register/page.tsx               # 에이전트 등록 페이지
  vault/page.tsx                  # Vault 대시보드
  [id]/page.tsx                   # 에이전트 상세 페이지
  delegate/[id]/page.tsx          # 위임 설정 페이지
```

### 4.2 핵심 Hook 설계

**READ Hooks (온체인 조회):**

| Hook | 데이터 소스 | 반환값 |
|------|-----------|--------|
| `useAgentList()` | IdentityRegistry | agents[], total |
| `useMyAgents()` | IdentityRegistry (getOwnerAgents) | myAgents[] |
| `useAgentProfile(id)` | Identity + Reputation + Validation | agent, reviews, validation |
| `useVaultBalance()` | AgentVault (getBalance x 4토큰) | balances[{symbol, balance}] |
| `useVaultPermission()` | AgentVault (이벤트 + getPermission) | permissions[] |
| `useAgentRuns()` | Agent Server API | runs[] |

**WRITE Hooks (트랜잭션):**

| Hook | 컨트랙트 | 함수 |
|------|---------|------|
| `useVaultActions()` | AgentVault | deposit, withdraw |
| `useVaultPermission()` | AgentVault | grantPermission, revokePermission |
| `useRegisterAgent()` | IdentityRegistry | registerAgent |
| `useSubmitReview()` | ReputationRegistry | submitReview |
| `useRunAgent()` | Agent Server API | POST /agent/run |

### 4.3 DelegationSetupWizard (3-Step 위임 마법사)

사용자가 에이전트에게 DeFi 위임을 설정하는 핵심 컴포넌트:

```
Step 1: Vault Deposit
  - 토큰 선택 (sbUSD, wCTC, lstCTC, USDC)
  - 금액 입력 → ERC-20 approve → AgentVault.deposit()
  - 현재 Vault 잔고 표시

Step 2: Permission Grant
  - 시나리오 선택 (Morpho vs Liquity)
  - Morpho: targets=[SnowballLend], functions=[supply, withdraw]
  - Liquity: targets=[BorrowerOperations], functions=[adjustRate, addColl]
  - tokenCaps 자동 설정 (Morpho: 1000 sbUSD, Liquity: 100 wCTC)
  - AgentVault.grantPermission() 호출

Step 3: Protocol Delegation
  - Morpho: Morpho.setAuthorization(agentVault, true)
  - Liquity: BorrowerOps.setAddManager(troveId, agentVault)
           + BorrowerOps.setInterestIndividualDelegate(troveId, agentVault, ...)
```

### 4.4 PermissionList (토큰별 cap/spent 표시)

v0.14.0에서 단일 spendingCap 대신 토큰별 한도를 표시한다:

```
Agent: 0x1234...ABCD                     [Active]
  Targets: 0x9999...1111
  Functions: 0x12345678, 0xabcdef01
  ─────────────────────────────
  Token Caps
    0x8aef...wCTC    50.0 / 100.0
    0xbc7d...sbUSD   200.0 / 1000.0
  ─────────────────────────────
  Expires: 2026-04-07
                                      [Revoke]
```

### 4.5 페이지 흐름

```
/agent                    에이전트 마켓플레이스 (전체 목록 + 내 에이전트)
  |
  +-- /agent/register     에이전트 등록 → NFT 발행
  |
  +-- /agent/[id]         에이전트 상세 (프로필 + 평판 + 리뷰 + 실행 버튼)
  |     |
  |     +-- /agent/delegate/[id]  위임 설정 (3-Step 마법사)
  |
  +-- /agent/vault        Vault 대시보드 (잔고 + 권한 + 예치/출금)
```

---

## Part 5: 전체 흐름 종합

### 5.1 에이전트 등록부터 자동 실행까지

```
[Phase 1: 등록]
사용자 A → /agent/register
  → IdentityRegistry.registerAgent("My Agent", "defi-yield", 0xAgent, "ipfs://...")
  → agentId = 42 발급 (NFT)

[Phase 2: 위임 설정]
사용자 B → /agent/delegate/42
  Step 1: sbUSD 5000개 → AgentVault.deposit(sbUSD, 5000e18)
  Step 2: AgentVault.grantPermission(
            0xAgent,
            [Morpho],
            [supply, withdraw],
            30일 후 만료,
            [{sbUSD, 5000e18}]
          )
  Step 3: Morpho.setAuthorization(AgentVault, true)

[Phase 3: 자동 실행]
Cron (5분마다) or 수동 버튼
  → Agent Server: POST /agent/run { user: 사용자B, manifestId: "morpho-v1" }
  → Runtime:
    1. Observe: Vault 잔고=5000, Morpho 공급=0, 활용률=35%
    2. Plan: Claude → "supply 3000 sbUSD" 결정
    3. Execute: AgentVault.approveAndExecute(
                  사용자B, sbUSD, 3000e18,
                  Morpho, supply(...)
                )
    4. Result: { status: "success", txHashes: ["0x..."] }

[Phase 4: 모니터링]
사용자 B → /agent/42
  → 활동 로그에서 실행 이력 확인
  → Vault 잔고: sbUSD 2000 (3000은 Morpho에 공급됨)
  → 리뷰 작성: 4.5/5.0점
```

### 5.2 보안 계층

```
Layer 1: 스마트 컨트랙트
  - target/function 화이트리스트
  - 토큰별 cap (nonce 기반 stale 방지)
  - atomic approve-execute-cleanup
  - transferFromVault 목적지 제한
  - ReentrancyGuard

Layer 2: 런타임
  - Manifest 기반 Capability 화이트리스트
  - Precondition 체크 (잔고, 인가 상태 등)
  - maxSteps 제한
  - SDK 타임아웃 (60초)

Layer 3: 서버
  - API Key 인증 (x-api-key 헤더)
  - Rate Limiting (POST /agent/run 10회/분, 전역 60회/분)
  - 동시 실행 방지 (user+manifest 기준 activeRuns lock → 409)
  - 2-Phase Write + Crash Recovery (DB 일관성)
  - Winston 구조화 로깅 (감사 추적)
  - 프론트엔드 프록시 (클라이언트에 Key 미노출)

Layer 4: 프로토콜
  - Morpho: setAuthorization 필요
  - Liquity: addManager + interestDelegate 필요
```

---

**작성일**: 2026-03-07 KST
**갱신일**: 2026-03-07 KST (v0.18.0 반영: SQLite 영속화, Winston 로깅, Rate Limiting, DI, 2-Phase Write, E2E 테스트)
