# 설계 - v0.11.0 Agent Delegation Demo

## 변경 규모
**규모**: 서비스 경계
**근거**: 외부 API(Claude API) 의존성 추가, secret ownership(ANTHROPIC_API_KEY, AGENT_PRIVATE_KEY) 도입, 3개 도메인 수정, 신규 백엔드 서비스(NestJS) + agent-runtime 모듈 추가

---

## 문제 요약
에이전트가 실제로 유저 자산을 Morpho/Liquity에서 운용하는 end-to-end 데모가 없다. Bot script + 위임 셋업 UI + 활동 로그 + 마켓플레이스→위임 연결이 필요.

> 상세: [README.md](README.md) 참조

## 접근법

4개 축으로 구현:

1. **Agent Runtime**: 온체인 상태를 읽고 → LLM이 판단 → AgentVault를 통해 실행 (프레임워크-agnostic 순수 모듈)
2. **NestJS 백엔드 서비스**: Agent Runtime을 HTTP API + cron 스케줄러로 감싸서 외부 호출 가능하게
3. **프론트엔드 위임 셋업**: Liquity manager/delegate + Morpho authorization 설정 UI + "Run Agent" 버튼
4. **활동 로그 + UX 연결**: ExecutedOnBehalf 이벤트 표시 + 마켓플레이스→위임 흐름

## 대안 검토

### Bot 아키텍처

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: 하드코딩 룰 스크립트 | 단순, LLM 의존 없음 | "AI 에이전트"가 아님, 판단 로직 없음 | ❌ |
| B: Claude API (tool use) | 구조화된 응답, function calling 지원, 판단 근거 제공 | API 비용, 네트워크 의존 | ✅ |
| C: Codex CLI (MCP) | 이미 프로젝트에 MCP 설정 있음 | 비동기 CLI 호출, 구조화된 응답 파싱 어려움 | ❌ |
| D: Local LLM (Ollama) | 비용 없음, 오프라인 | 셋업 복잡, tool use 지원 제한적 | ❌ |

**선택 이유**: Claude API의 tool use가 "온체인 상태 읽기 → 판단 → 실행" 패턴에 가장 적합. LLM은 **Capability Registry에서 자동 생성된 tool 중 하나를 선택**하고, 각 capability는 **고정된 buildCalls() 메서드**로 트랜잭션을 빌드한다 (LLM이 raw calldata를 생성하지 않음).

### Bot 확장 모델

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: Tool Registry | 타입 안전, permission mapping, precondition 검증 | 새 프로토콜 추가 시 코드 작성 필요 | ✅ 런타임 코어 |
| B: Plugin (배포 단위) | 프로토콜 capability 묶음 설치 | Registry 위에 구축해야 함 | ⏳ 향후 |
| C: MCP-like (원격) | 상호운용성 | settlement path에 원격 신뢰 부적합 | ⏳ read-only용 |

**결론**: Registry-centric + 향후 Plugin-packaged. 오픈 에이전트 = AgentManifest 작성 (코드 없음), 새 프로토콜 = Capability Plugin (코드 필요, 심사 필요).

### 백엔드 서버 프레임워크

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: NestJS | 모노레포 TS 호환, DI/모듈 구조, viem/ABI 공유 | 보일러플레이트 다소 많음 | ✅ |
| B: FastAPI (Python) | AI 생태계 풍부 | 타입/ABI 공유 불가, 별도 빌드 파이프라인 | ❌ |
| C: Express (minimal) | 경량 | 구조 없음, DI 없음, 프로덕션 확장 어려움 | ❌ |
| D: CLI only (서버 없음) | 가장 단순 | 외부 호출 불가, 스케줄러 불가, FE 연동 불가 | ❌ |

**선택 이유**: 모노레포가 전부 TypeScript이므로 타입/ABI/config 공유가 핵심. NestJS의 DI + 모듈 구조로 agent-runtime을 서비스로 깔끔하게 inject 가능. 프로덕션 확장(인증, 큐, 모니터링)도 NestJS 생태계에서 자연스럽게 지원.

### 프론트엔드 위임 UI 위치

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: agent/[id] 페이지에 통합 | 한 곳에서 모든 셋업 | 페이지가 비대해짐 | ❌ |
| B: 별도 /agent/delegate/[id] 페이지 | 깔끔한 분리, 단계별 위저드 가능 | 새 라우트 추가 | ✅ |
| C: 모달/다이얼로그 | 기존 페이지 변경 최소화 | 복잡한 셋업을 모달에 넣기 어려움 | ❌ |

**선택 이유**: 위임 셋업은 여러 단계(vault 예치 → permission 부여 → Liquity manager 설정 / Morpho authorization)를 거쳐야 하므로 전용 페이지가 적합.

---

## 기술 결정

### 1. 기술 스택
- **런타임**: Node.js + TypeScript
- **백엔드 프레임워크**: NestJS
- **엔트리 2개**: NestJS 서버 (프로덕션) + CLI (디버깅/테스트용)
- **Agent Runtime**: 프레임워크-agnostic 순수 TS 모듈 (NestJS/CLI 양쪽에서 호출)
- **블록체인**: viem (기존 deploy-viem.ts 패턴 재사용)
- **AI**: `@anthropic-ai/sdk` (Claude API, tool use) — planner 모듈에만 의존
- **실행**: `npm run start:server` (NestJS) 또는 `npx tsx packages/integration/scripts/agent-bot.ts` (CLI)

#### 모듈 구조

```
packages/agent-server/                    ← 신규 패키지
  src/
    main.ts                               ← NestJS bootstrap
    app.module.ts                         ← root module
    agent/
      agent.module.ts                     ← AgentModule
      agent.controller.ts                 ← REST API endpoints
      agent.service.ts                    ← runtime inject + 실행 관리
      dto/
        run-agent.dto.ts                  ← POST /agent/run request DTO
        agent-status.dto.ts               ← GET /agent/status response DTO
    scheduler/
      scheduler.module.ts                 ← SchedulerModule
      scheduler.service.ts                ← @Cron 기반 자동 실행
    common/
      filters/                            ← exception filters
      guards/                             ← API key auth guard

packages/agent-runtime/                   ← 신규 패키지 (순수 TS, 프레임워크-agnostic)
  src/
    types.ts                              ← Capability, StrategyPlan, PreparedCall, Snapshot
    config.ts                             ← env + contract addresses 로드
    registry.ts                           ← CapabilityRegistry + buildDemoRegistry() + listExecutable()
    runtime.ts                            ← AgentRuntime 클래스 (Observer → Planner → Executor 오케스트레이션)
    observers/
      vault.ts                            ← vault balance, permission 상태
      morpho.ts                           ← supply position, utilization rate
      liquity.ts                          ← trove CR, 이자율, 시장 평균
      build-snapshot.ts                   ← 전체 snapshot 조합
    capabilities/
      morpho-supply.ts                    ← Morpho supply capability
      morpho-withdraw.ts                  ← Morpho withdraw capability
      liquity-adjust-interest-rate.ts     ← 이자율 조정 capability
      liquity-add-collateral.ts           ← 담보 추가 capability
    planner/
      anthropic-planner.ts                ← Claude API 호출 → StrategyPlan 반환
      anthropic-tools.ts                  ← registry → Claude tools[] 자동 변환
    executor/
      execute-plan.ts                     ← precondition 검증 → tx 실행 → state refresh
    utils/
      liquity-hints.ts                    ← HintHelpers readContract 이식
  manifests/demo-agent.json               ← 첫 번째 에이전트 정의
  prompts/demo-agent-system.md            ← LLM system prompt (마크다운)

packages/integration/
  scripts/agent-bot.ts                    ← CLI 엔트리 (디버깅/테스트용, agent-runtime import)
```

**핵심 원칙**: `agent-runtime`은 NestJS에 의존하지 않는다. NestJS `agent-server`가 runtime을 import해서 서비스로 감쌀 뿐이다. CLI도 동일한 runtime을 직접 호출한다.

### 2. 실행 흐름

#### 2-1. 서버 경유 (프로덕션)

```
┌──────────────┐  /api/agent/run   ┌─────────────────┐  POST /agent/run  ┌──────────────────┐
│  브라우저     │ ────────────────→ │  Next.js BFF    │ ────────────────→ │  NestJS Server   │
│  "Run Agent"  │                  │  (API route)    │  + X-API-Key      │  (agent-server)  │
│  버튼 클릭    │  /api/agent/runs │  API_KEY 주입    │  GET /agent/runs  │                  │
│  이력 조회    │ ←──────────────── │                 │ ←──────────────── │  AgentController │
└──────────────┘                  └─────────────────┘                  │  ├─ runAgent()   │
                                                                        │  ├─ getRunHistory│
┌──────────────┐                        @Cron('0 */6 * * *')           │  └─ getStatus()  │
│  Scheduler   │ ──────────────────────────────────────────────────────→│                  │
│  (자동 실행)  │                                                       │  AgentService    │
└──────────────┘                                                       │  └─ runtime.run()│
                                                                        └────────┬─────────┘
                                                                                 ▼
                                                                        ┌──────────────────┐
                                                                        │  Agent Runtime    │
                                                                        │  (agent-runtime) │
                                                                        │  ※ 아래 2-2 참조 │
                                                                        └──────────────────┘
```

#### 2-2. Agent Runtime (프레임워크-agnostic)

```
┌─────────────────────────────────────────────────────────┐
│  AgentRuntime.run(manifest, user)                        │
│                                                          │
│  1. Observer: buildSnapshot()                            │
│     ├─ vault: balance, permissions, allowances           │
│     ├─ morpho: supply position, utilization rate         │
│     └─ liquity: trove CR, interest rate, market avg      │
│                                                          │
│  2. Planner: anthropicPlanner.plan(snapshot, manifest)   │
│     ├─ registry.listExecutable(manifest, snapshot)       │
│     │   → 현재 permission/authorization 기준 필터링       │
│     ├─ buildAnthropicTools(executableCaps)                │
│     ├─ Claude API call (system prompt + tools + state)   │
│     └─ 응답 → StrategyPlan { steps[] }                   │
│     (no tool selected → steps: [] → 종료)                │
│                                                          │
│  3. Executor: executePlan(plan, ctx)                     │
│     for each step:                                       │
│       ├─ capability.preconditions(ctx, input) → 검증     │
│       ├─ capability.buildCalls(ctx, input) → PreparedCall[] │
│       ├─ send transactions (AgentVault 경유)             │
│       └─ refresh snapshot (다음 step 대비)               │
│                                                          │
│  4. RunResult 반환 (plan, txHashes, logs, LLM reasoning) │
└─────────────────────────────────────────────────────────┘
```

#### 2-3. CLI (디버깅/테스트용)

```
npx tsx packages/integration/scripts/agent-bot.ts --user 0x... --manifest manifests/demo-agent.json
→ agent-runtime 직접 호출 (NestJS 미경유)
→ 결과를 터미널에 출력
```

### 2-4. API 엔드포인트

#### Browser-facing (Next.js BFF 프록시)

브라우저에서 직접 호출하는 엔드포인트. Next.js API route가 서버사이드에서 API_KEY를 주입하여 NestJS로 프록시.

| Browser 호출 | NestJS 프록시 대상 | 설명 |
|-------------|-------------------|------|
| `POST /api/agent/run` | `POST /agent/run` | 에이전트 1회 실행 |
| `GET /api/agent/runs` | `GET /agent/runs` | 실행 이력 조회 |

> `/agent/status`, `/agent/manifests`는 v0.11.0에서 **server-internal only** (admin/디버깅용). 향후 필요 시 BFF로 노출 가능.

#### Server-internal (NestJS 직접 — X-API-Key 필수)

스케줄러, CLI, 외부 서비스에서 직접 호출. 브라우저에서는 BFF 경유만 허용.

| Method | Path | 설명 | Request | Response |
|--------|------|------|---------|----------|
| POST | `/agent/run` | 에이전트 1회 실행 | `{ user, manifestId }` | `{ runId, status, plan, txHashes }` |
| GET | `/agent/runs` | 실행 이력 조회 | `?user=0x...&limit=20` | `RunResult[]` |
| GET | `/agent/runs/:id` | 특정 실행 상세 | - | `RunResult` |
| GET | `/agent/status` | 서버 + 에이전트 상태 | - | `{ uptime, lastRun, registeredAgents }` |
| GET | `/agent/manifests` | 등록된 manifest 목록 | - | `AgentManifest[]` |

### 2-5. FE → NestJS 프록시 (BFF)

브라우저에서 NestJS API를 직접 호출하면 `API_KEY`를 클라이언트에 노출해야 하므로, **Next.js API route를 BFF 프록시**로 사용한다.

```
브라우저 → /api/agent/run (Next.js API route)
           → API_KEY를 서버사이드에서 주입
           → POST http://localhost:3001/agent/run (NestJS)
           → 결과를 브라우저에 반환
```

Next.js API route 파일:
- `apps/web/src/app/api/agent/run/route.ts`
- `apps/web/src/app/api/agent/runs/route.ts`

이 패턴으로 `API_KEY`는 Next.js 서버 환경변수에만 존재하고 브라우저에 노출되지 않는다.

### 3. Capability Registry

#### 핵심 타입

```typescript
// types.ts
type Capability<TInput = Record<string, unknown>> = {
  id: string;                              // e.g. "morpho.supply"
  description: string;
  inputSchema: JsonSchema;                 // Claude tool input_schema로 변환됨
  requiredPermissions(config: Config): PermissionSpec[];
  preconditions(ctx: ExecutionContext, input: TInput): CheckResult[];
  buildCalls(ctx: ExecutionContext, input: TInput): PreparedCall[];
};

type PlanStep = {
  capabilityId: string;
  input: Record<string, unknown>;
};

type StrategyPlan = {
  goal: string;
  steps: PlanStep[];          // steps: [] = no action
};

type PreparedCall = {
  to: Address;
  abi: Abi;
  functionName: string;
  args: unknown[];
};

type ExecutionContext = {
  config: Config;
  user: Address;
  snapshot: Snapshot;         // observer 결과
  walletClient: WalletClient;
  publicClient: PublicClient;
};
```

#### Capability 구현 예시 (morpho.supply)

```typescript
// capabilities/morpho-supply.ts
export const morphoSupply: Capability<{ amount: string; reason: string }> = {
  id: "morpho.supply",
  description: "Morpho 마켓에 토큰을 공급한다",
  inputSchema: {
    type: "object",
    properties: {
      amount: { type: "string", description: "공급량 (wei)" },
      reason: { type: "string", description: "공급 이유" },
    },
    required: ["amount", "reason"],
  },

  requiredPermissions: (config) => [
    { target: config.morpho.core, selectors: ["supply", "withdraw"] },
  ],

  preconditions(ctx, input) {
    const amt = BigInt(input.amount);
    return [
      check(amt > 0n, "amount must be > 0"),
      check(ctx.snapshot.vault.loanTokenBalance >= amt, "insufficient vault balance"),
      check(ctx.snapshot.vault.permission.active, "permission not active"),
      check(ctx.snapshot.morpho.isAuthorized, "Morpho authorization missing"),
    ];
  },

  buildCalls(ctx, input) {
    const amt = BigInt(input.amount);
    const supplyData = encodeFunctionData({
      abi: MorphoABI,
      functionName: "supply",
      args: [ctx.config.morpho.marketParams, amt, 0n, ctx.user, "0x"],
    });
    return [
      { to: ctx.config.agentVault, abi: AgentVaultABI, functionName: "approveFromVault",
        args: [ctx.user, ctx.config.morpho.loanToken, ctx.config.morpho.core, amt] },
      { to: ctx.config.agentVault, abi: AgentVaultABI, functionName: "executeOnBehalf",
        args: [ctx.user, ctx.config.morpho.core, supplyData] },
      { to: ctx.config.agentVault, abi: AgentVaultABI, functionName: "approveFromVault",
        args: [ctx.user, ctx.config.morpho.loanToken, ctx.config.morpho.core, 0n] },  // cleanup
    ];
  },
};
```

#### Registry → Claude Tools 자동 변환

```typescript
// planner/anthropic-tools.ts
type ToolMapping = {
  tools: AnthropicTool[];
  toolToCapability: Map<string, string>;  // "morpho_supply" → "morpho.supply"
};

function buildAnthropicTools(capabilities: Capability[]): ToolMapping {
  const toolToCapability = new Map<string, string>();
  const tools = capabilities.map((cap) => {
    const toolName = cap.id.replace(".", "_");  // "morpho.supply" → "morpho_supply"
    toolToCapability.set(toolName, cap.id);
    return { name: toolName, description: cap.description, input_schema: cap.inputSchema };
  });
  return { tools, toolToCapability };
}
```

### 3-1. AgentManifest

에이전트 정의는 코드가 아닌 **선언적 manifest 파일**로 관리한다. 누구든 manifest를 작성하면 에이전트를 만들 수 있고, 실행 코드는 공통 runtime이 담당한다.

```json
// manifests/demo-agent.json
{
  "id": "snowball-demo-defi-manager",
  "version": "0.11.0",
  "name": "Snowball Demo DeFi Manager",
  "network": { "chainId": 102031 },
  "llm": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-20250514",
    "systemPromptFile": "../prompts/demo-agent-system.md"
  },
  "scope": {
    "singleUser": true,
    "morphoMarket": "wCTC/sbUSD",
    "liquityBranch": "wCTC",
    "maxSteps": 1
  },
  "allowedCapabilities": [
    "morpho.supply",
    "morpho.withdraw",
    "liquity.adjustInterestRate",
    "liquity.addCollateral"
  ],
  "riskPolicy": {
    "abortOnFailedPrecondition": true,
    "cleanupAllowanceAfterUse": true
  }
}
```

**확장 경로**: `maxSteps`를 올리면 멀티스텝 전략 가능. `allowedCapabilities`에 새 capability를 추가하면 새 프로토콜 지원. manifest만 바꾸면 다른 에이전트가 된다.

### 4. ABI 보충

**liquity.ts에 추가**:
- `setAddManager(uint256 _troveId, address _manager)`
- `setRemoveManagerWithReceiver(uint256 _troveId, address _manager, address _receiver)`
- `setInterestIndividualDelegate(uint256 _troveId, address _delegate, uint128 _minInterestRate, uint128 _maxInterestRate, uint256 _newAnnualInterestRate, uint256 _upperHint, uint256 _lowerHint, uint256 _maxUpfrontFee, uint256 _minInterestRateChangePeriod)`
- `getInterestIndividualDelegateOf(uint256 _troveId)` (view)
- `addManagerOf(uint256 _troveId)` (view)

**lend.ts에 추가**:
- `setAuthorization(address authorized, bool newIsAuthorized)`
- `isAuthorized(address authorizer, address authorized)` (view)

### 5. 프론트엔드 신규 훅

**agent 도메인**:
- `useRunAgent.ts` — Next.js API route (`/api/agent/run`) 호출 + 결과 상태 관리
- `useAgentRuns.ts` — Next.js API route (`/api/agent/runs`) 호출 (서버 실행 이력)
- `useActivityLog.ts` — ExecutedOnBehalf 이벤트 로그 조회 (온체인)

**liquity 도메인**:
- `useTroveDelegate.ts` — setAddManager, setRemoveManagerWithReceiver, setInterestIndividualDelegate, 조회

**lend 도메인**:
- `useMorphoAuthorization.ts` — setAuthorization, isAuthorized

### 6. 프론트엔드 신규 컴포넌트

- `DelegationSetupPage.tsx` — `/agent/delegate/[id]` 전용 페이지
  - Step 1: Vault 예치 상태 확인 + 예치
  - Step 2: AgentVault Permission 부여
  - Step 3: 프로토콜별 위임 설정 (Liquity manager/delegate OR Morpho authorization)
- `RunAgentButton.tsx` — "Run Agent" 버튼 (Next.js API route 경유 → NestJS 호출)
- `ActivityLog.tsx` — 실행 이력 표시 (서버 GET /agent/runs + ExecutedOnBehalf 이벤트 병합)
- `DelegationStatus.tsx` — 현재 위임 상태 요약 (어떤 프로토콜에 무슨 권한)

### 7. 라우팅 + UX 흐름

```
/agent (마켓플레이스)
  → 에이전트 카드 클릭
    → /agent/[id] (프로필)
      → "Delegate" 버튼 클릭
        → /agent/delegate/[id] (위임 셋업 — 신규)
          → Step 1: Vault 예치
          → Step 2: Permission 부여
          → Step 3: Liquity/Morpho 위임 설정
      → "Run Agent" 버튼 → /api/agent/run (BFF → NestJS)
      → ActivityLog (/api/agent/runs + 온체인 이벤트 병합)
```

---

## 범위 / 비범위

### 범위 (In Scope)
- **agent-runtime 패키지**: Observer, Capability Registry, Planner, Executor (순수 TS)
- **agent-server 패키지**: NestJS 서버 (REST API + cron 스케줄러)
- AgentManifest + system prompt (demo-agent.json)
- 4개 Capability 구현 (morpho.supply, morpho.withdraw, liquity.adjustInterestRate, liquity.addCollateral)
- REST API 엔드포인트 (run, runs, status, manifests)
- cron 스케줄러 (설정 가능한 주기)
- CLI 엔트리 유지 (디버깅/테스트용)
- ABI 보충 (liquity.ts, lend.ts)
- Liquity manager/delegate 설정 훅 + UI
- Morpho authorization 설정 훅 + UI
- `/agent/delegate/[id]` 위임 셋업 페이지
- Next.js API route (BFF 프록시: `/api/agent/run`, `/api/agent/runs`)
- "Run Agent" 버튼 (FE → BFF → NestJS)
- 실행 이력 조회 (FE → BFF → NestJS + ExecutedOnBehalf 이벤트)
- 마켓플레이스→프로필→위임 UX 흐름

### 비범위 (Out of Scope)
- 컨트랙트 수정/배포
- Morpho supply/withdraw 프론트엔드 훅 (봇이 직접 호출, FE에서는 authorization 설정만)
- 에이전트 검색/필터 고도화
- SSE/WebSocket 실시간 모니터링
- 외부 Plugin 동적 로딩
- 멀티스텝 전략 체이닝 (maxSteps > 1)
- 인증/인가 (API key guard는 단순 구현, OAuth/JWT는 scope 외)
- DB 영속화 (실행 이력은 in-memory, 서버 재시작 시 초기화)

## 가정/제약
- Claude API key가 환경변수로 제공됨 (`ANTHROPIC_API_KEY`)
- Bot script 실행 시 agent EOA의 private key가 환경변수로 제공됨 (`AGENT_PRIVATE_KEY`)
- 대상 유저 주소는 API request body 또는 CLI 인자로 전달
- Morpho market params는 고정값 (특정 wCTC/sbUSD 마켓)
- 테스트넷에 충분한 테스트 토큰이 있음
- **Non-batch trove only**: Liquity 데모는 batch에 속하지 않는 개별 trove만 대상. Batch trove는 이번 scope에서 제외
- **Hint 계산**: Bot script에서 adjustTroveInterestRate 호출 시 필요한 upperHint/lowerHint는 기존 프론트엔드의 HintHelpers 패턴(useTroveActions.ts)을 viem readContract로 재구현
- **기존 PermissionForm 처리**: `/agent/[id]`의 기존 PermissionForm은 제거하고, "Delegate" 버튼으로 `/agent/delegate/[id]`로 리다이렉트. 위임 관련 모든 UX는 새 페이지로 통합
- **maxUpfrontFee**: adjustTroveInterestRate의 maxUpfrontFee 파라미터는 cooldown 기간 중이면 해당 액션을 skip하는 방식으로 처리. Fee prediction은 이번 scope 외
- **Manifest 기반**: 에이전트 정의는 JSON manifest 파일로 관리. v0.11.0에서는 `demo-agent.json` 1개만 사용
- **maxSteps = 1**: 데모에서는 LLM이 1개 capability만 선택. 멀티스텝 체이닝은 manifest의 `maxSteps`를 올려서 향후 확장
- **Plugin 로딩 없음**: v0.11.0에서는 capability를 코드에 직접 등록. 외부 plugin 동적 로딩은 scope 외
- **ABI canonical source**: Bot runtime은 `packages/shared/src/abis/`를 사용. FE는 `apps/web/src/core/abis/`를 사용 (Step 4 티켓에서 파일별 명시)
- **Permission compile 정책**: AgentVault의 Cartesian product 제약(target × function) 때문에, FE 위임 셋업에서는 **시나리오별로 별도 grantPermission**을 호출한다. Morpho 시나리오는 `[Morpho] × [supply, withdraw]`, Liquity 시나리오는 `[BorrowerOps] × [adjustRate, addColl]`. 두 프로토콜을 하나의 permission에 union하지 않는다
- **Capability 노출 필터링**: Planner에 전달되는 tool 목록은 manifest 전체가 아니라, `registry.listExecutable(manifest, snapshot)`으로 **현재 활성 permission/authorization 기준**으로 필터링된 subset만 노출한다. 이로써 Claude가 권한 없는 tool을 선택하는 것을 원천 차단
- **NestJS 서버**: 단일 프로세스, in-memory 실행 이력. DB 없음 (프로덕션 DB는 향후 phase)
- **cron 주기**: manifest에 설정 가능하되, 기본값 6시간. 데모 시에는 수동 API 호출 위주
- **API 인증**: 단순 API key guard (`X-API-Key` 헤더). OAuth/JWT는 scope 외

---

## 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────┐
│                      프론트엔드 (Next.js)                     │
│                                                             │
│  /agent                    /agent/[id]                      │
│  ├─ AgentCard[]            ├─ AgentProfileHeader            │
│  └─ "Browse agents"       ├─ ReputationSection              │
│                            ├─ [Run Agent] → /api/agent/run  │
│                            ├─ [Delegate] → /delegate/[id]   │
│                            └─ ActivityLog (/api/agent/runs) │
│                                                             │
│  /agent/delegate/[id] (NEW)                                 │
│  ├─ Step 1: VaultDeposit                                    │
│  ├─ Step 2: PermissionGrant (시나리오별 permission)          │
│  └─ Step 3: ProtocolDelegation                              │
│       ├─ Liquity: setAddManager + setInterestDelegate       │
│       └─ Morpho: setAuthorization                           │
└────────┬──────────────────────┬─────────────────────────────┘
         │ on-chain tx          │ Next.js API route (BFF)
         │ (wagmi/viem)         │ API_KEY 서버사이드 주입
         ▼                      ▼
┌─────────────────┐  ┌──────────────────────────────────────┐
│ Creditcoin      │  │  NestJS Server (agent-server)        │
│ Testnet         │  │                                      │
│                 │  │  AgentController                     │
│ AgentVault      │  │  ├─ POST /agent/run                  │
│ ├─ deposit      │  │  ├─ GET  /agent/runs                 │
│ ├─ grantPerm    │  │  └─ GET  /agent/status               │
│ ├─ executeOn    │  │                                      │
│ │  Behalf ──►   │  │  SchedulerService                    │
│ │  Borrower/    │  │  └─ @Cron → 자동 실행                │
│ │  Morpho       │  │                                      │
│                 │  │  AgentService                         │
│ BorrowerOps     │  │  └─ runtime.run(manifest, user)      │
│ Morpho          │  └──────────────┬───────────────────────┘
└─────────────────┘                 │ import
                      ▲              ▼
                      │  ┌──────────────────────────────────┐
                      │  │  Agent Runtime (agent-runtime)   │
                      │  │  (순수 TS, 프레임워크-agnostic)   │
                      │  │                                  │
                      │  │  Observer → Planner → Executor   │
                      └──│  CapabilityRegistry              │
            viem         │  AgentManifest                    │
            writeContract│                                  │
                         │  CLI: agent-bot.ts (디버깅용)     │
                         └──────────────────────────────────┘
```

---

## 데이터 흐름

### Morpho Supply 시나리오 (풀 사이클)

```
[사전 셋업 — 프론트엔드]
User → ERC20.approve(AgentVault, amount)
User → AgentVault.deposit(token, amount)
User → AgentVault.grantPermission(botEOA, [Morpho], [supply, withdraw], cap, expiry)
       ↑ Morpho 시나리오 전용 permission (Liquity targets 미포함)
User → Morpho.setAuthorization(AgentVault, true)

[Bot 실행 — Observer]
Observer → buildSnapshot(): vault balance, Morpho position, utilization rate

[Bot 실행 — Planner]
Planner → registry.listExecutable(manifest, snapshot)
          → Morpho permission active → morpho.supply, morpho.withdraw 포함
          → Liquity permission 없음 → liquity.* 제외
Planner → buildAnthropicTools(executableCaps) → Claude tools[]
Planner → Claude API: snapshot + system prompt + tools
Claude  → tool_use: morpho_supply({ amount: "1000000", reason: "..." })
Planner → StrategyPlan { steps: [{ capabilityId: "morpho.supply", input }] }

[Bot 실행 — Executor]
Executor → morphoSupply.preconditions(ctx, input) → 검증
Executor → morphoSupply.buildCalls(ctx, input) →
           [approveFromVault, executeOnBehalf(supply), approveFromVault(0)]  // cleanup
Executor → send 3 transactions sequentially
           → Morpho: user 명의로 supply 기록

[Bot 재실행 — 인출 (별도 run)]
Observer → buildSnapshot(): 현재 supply position
Planner → Claude: "인출 판단"
Claude  → morpho_withdraw({ amount, reason })
Executor → morphoWithdraw.buildCalls → [executeOnBehalf(withdraw)]
           → Morpho: user 지갑으로 직접 반환

[회수 — 프론트엔드]
User → AgentVault.withdraw(token, remainingBalance)
```

### Liquity 이자율 조정 시나리오

```
[사전 셋업 — 프론트엔드]
User → BorrowerOps.setAddManager(troveId, AgentVault)  // addColl 권한
User → BorrowerOps.setInterestIndividualDelegate(troveId, AgentVault, minRate, maxRate, ...)
User → AgentVault.deposit(wCTC, amount)  // addColl용
User → AgentVault.grantPermission(botEOA, [BorrowerOps], [adjustRate, addColl], cap, expiry)
       ↑ Liquity 시나리오 전용 permission (Morpho targets 미포함)

[Bot 실행 — Observer]
Observer → buildSnapshot(): trove CR, 현재 이자율, 시장 평균 이자율

[Bot 실행 — Planner]
Planner → registry.listExecutable(manifest, snapshot)
          → Liquity permission active → liquity.adjustInterestRate, liquity.addCollateral 포함
Planner → Claude API: snapshot + tools
Claude  → tool_use: liquity_adjustInterestRate({ troveId, newRate, reason })
Planner → StrategyPlan { steps: [{ capabilityId: "liquity.adjustInterestRate", input }] }

[Bot 실행 — Executor]
Executor → adjustInterestRate.preconditions(ctx, input) → 검증 (cooldown 체크 포함)
Executor → adjustInterestRate.buildCalls(ctx, input) →
           [executeOnBehalf(adjustTroveInterestRate(... hints ...))]
Executor → send transaction

[Bot 재실행 — 담보 추가 (CR 위험 시, 별도 run)]
Observer → buildSnapshot(): trove CR 확인
Planner → Claude: "CR 분석"
Claude  → liquity_addCollateral({ troveId, amount, reason })
Executor → addCollateral.buildCalls →
           [approveFromVault(wCTC), executeOnBehalf(addColl), approveFromVault(0)]
Executor → send 3 transactions
```

---

## 테스트 전략

- **Agent Runtime**: 테스트넷에서 실제 트랜잭션 실행으로 검증 (CLI로 e2e 수동 테스트)
- **NestJS 서버**: `curl` / Postman으로 API 엔드포인트 수동 검증 + `tsc --noEmit`
- **프론트엔드**: `tsc --noEmit`으로 타입 체크 + 브라우저에서 수동 UI 검증
- **ABI 정확성**: 컨트랙트 소스코드와 1:1 대조

---

## Dependency Map

| 의존 대상 | 유형 | 영향 방향 | 비고 |
|----------|------|----------|------|
| Claude API (`@anthropic-ai/sdk`) | 외부 API | Runtime → Anthropic | tool use 기반 판단. 장애 시 실행 불가 |
| Creditcoin Testnet RPC | 외부 인프라 | Runtime/FE → RPC | readContract/writeContract 모두 의존 |
| NestJS (`@nestjs/core`) | 프레임워크 | Server → NestJS | HTTP API + DI + 스케줄러 |
| `@nestjs/schedule` | 라이브러리 | Server → cron | cron 기반 자동 실행 |
| AgentVault (deployed) | 온체인 컨트랙트 | Runtime → AgentVault | 수정 불가, 있는 그대로 사용 |
| BorrowerOperations (deployed) | 온체인 컨트랙트 | FE/Runtime → BorrowerOps | manager/delegate 설정 |
| Morpho (deployed) | 온체인 컨트랙트 | FE/Runtime → Morpho | setAuthorization, supply/withdraw |

## Secret Ownership

| Secret | 소유자 | 용도 | 관리 방식 |
|--------|--------|------|----------|
| `ANTHROPIC_API_KEY` | 개발자 | Claude API 호출 | `.env` 파일, git 미포함 |
| `AGENT_PRIVATE_KEY` | Bot EOA | AgentVault.executeOnBehalf 서명 | `.env` 파일, git 미포함 |
| `API_KEY` | 서버 관리자 | NestJS API 인증 (X-API-Key) | `.env` 파일, git 미포함 (NestJS + Next.js 양쪽) |
| `AGENT_SERVER_URL` | 개발자 | Next.js BFF → NestJS 서버 주소 | `.env` 파일, 예: `http://localhost:3001` |

## 실패/에러 처리

| 실패 시나리오 | 처리 계층 | 처리 |
|-------------|----------|------|
| Claude API 호출 실패 (네트워크/rate limit) | Planner | 에러 로그 출력 + script 종료. 재시도 없음 (수동 재실행) |
| Precondition 실패 (잔액 부족, permission 만료 등) | Executor | `abortOnFailedPrecondition: true` → run 전체 중단 + 경고 출력. false면 해당 step skip |
| 온체인 tx revert | Executor | revert reason 출력 + script 종료 (multi-call 중간 실패 시 이후 call도 중단) |
| Capability not in manifest | Planner | LLM이 허용되지 않은 tool 호출 시 무시 + 경고 |
| Empty plan (steps: []) | Runtime | no_action 로그 출력 + 정상 종료 |
| API 인증 실패 | Server | 401 Unauthorized 반환 |
| 동시 실행 요청 | Server | 동일 user+manifest 조합에 대해 409 Conflict (실행 중 중복 방지) |

---

## Ownership Boundary

N/A — 단일 개발자 프로젝트. 모든 코드(FE, Bot, ABI)를 동일인이 소유.

## Contract Reference

| 컨트랙트 | 소스 위치 | 배포 상태 |
|----------|----------|----------|
| AgentVault | `packages/liquity/contracts/custom/AgentVault.sol` | 배포 완료, 수정 불가 |
| IdentityRegistry | `packages/erc-8004/contracts/IdentityRegistry.sol` | 배포 완료 |
| BorrowerOperations | `packages/liquity/contracts/src/BorrowerOperations.sol` | 배포 완료 |
| AddRemoveManagers | `packages/liquity/contracts/src/Dependencies/AddRemoveManagers.sol` | BorrowerOps 내부 |
| Morpho (IMorpho) | `packages/morpho/src/morpho-blue/interfaces/IMorpho.sol` | 배포 완료 |

---

## 리스크/오픈 이슈

1. **Liquity addColl via manager**: Explore 결과 setAddManager가 확인되었으나, addColl 호출 시 msg.sender=AgentVault가 add manager로 인정되는지 테스트넷에서 실제 검증 필요
2. **Morpho supply onBehalf**: approveFromVault로 Morpho에 approve 후, supply(onBehalf=user) 호출 시 토큰이 AgentVault에서 Morpho로 이동하는지 실제 검증 필요
3. **Claude API 비용**: 데모 1회 실행당 비용은 미미하나, 반복 테스트 시 누적 가능
4. **Bot private key 관리**: 데모용이므로 환경변수로 관리, 프로덕션은 별도 키 관리 필요
5. **Hint 계산 복잡도**: adjustTroveInterestRate에 필요한 hint를 bot에서 직접 계산해야 함. 기존 FE의 HintHelpers readContract 패턴을 이식
