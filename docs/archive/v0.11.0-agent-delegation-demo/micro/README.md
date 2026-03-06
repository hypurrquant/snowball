# 작업 티켓 - v0.11.0 Agent Delegation Demo

## 전체 현황

| # | Step | 난이도 | 롤백 | 선행 | DoD 매핑 | 개발 | 완료일 |
|---|------|--------|------|------|---------|------|--------|
| 01 | [agent-runtime 스캐폴딩](step-01-runtime-scaffolding.md) | 🟡 | ✅ | - | F1, F2 | ⏳ | - |
| 02 | [CapabilityRegistry + ToolMapping](step-02-capability-registry.md) | 🟡 | ✅ | 01 | F3, F11 | ⏳ | - |
| 03 | [Observer — Snapshot 수집](step-03-observer.md) | 🟠 | ✅ | 01 | F8 | ⏳ | - |
| 04 | [4개 Capability 구현](step-04-capabilities.md) | 🟠 | ✅ | 01, 02 | F4, F5, F6, F7 | ⏳ | - |
| 05 | [Planner — Claude API tool use](step-05-planner.md) | 🔴 | ✅ | 02 | F9, F10, E6 | ⏳ | - |
| 06 | [Executor — precondition + tx](step-06-executor.md) | 🟠 | ✅ | 01, 04 | F12, E2, E4, E5, E9 | ⏳ | - |
| 07 | [Runtime 오케스트레이터 + Manifest](step-07-runtime-orchestrator.md) | 🟡 | ✅ | 02~06 | F13, F14, E3, E10 | ⏳ | - |
| 08 | [CLI 엔트리](step-08-cli-entry.md) | 🟡 | ✅ | 07 | F46 | ⏳ | - |
| 09 | [agent-server NestJS](step-09-nestjs-server.md) | 🔴 | ✅ | 07 | F15~F23, N2 | ⏳ | - |
| 10 | [FE ABI 보충](step-10-fe-abi.md) | 🟢 | ✅ | - | F24, F25 | ⏳ | - |
| 11 | [FE 훅 — Delegation](step-11-fe-hooks-delegation.md) | 🟡 | ✅ | 10 | F29, F30 | ⏳ | - |
| 12 | [FE 훅 — Agent Run + Activity](step-12-fe-hooks-agent.md) | 🟡 | ✅ | 13 | F26, F27, F28 | ⏳ | - |
| 13 | [FE BFF 프록시](step-13-fe-bff-proxy.md) | 🟡 | ✅ | 09 | F37, F38 | ⏳ | - |
| 14 | [FE 위임 셋업 페이지](step-14-fe-delegation-page.md) | 🟠 | ✅ | 10, 11 | F31, F32, F36, F43 | ⏳ | - |
| 15 | [FE 에이전트 프로필 + UX](step-15-fe-agent-profile.md) | 🟠 | ✅ | 12, 13, 14 | F33, F34, F35, F39 | ⏳ | - |

## 의존성

```
Backend (agent-runtime → agent-server → CLI)
01 ─┬─ 02 ──── 04 ──── 05
    │          │
    └─ 03      └─ 06
                   │
          02+03+04+05+06 → 07 ─┬─ 08 (CLI)
                                └─ 09 (NestJS)

Frontend (ABI → hooks → pages)
10 ─── 11 ───┐
             14 ──── 15
09 ── 13 ── 12 ──┘

병렬 가능:
- 01~03 (runtime 기반) ∥ 10 (FE ABI)
- 04+05+06 (capabilities/planner/executor) ∥ 11 (FE delegation hooks)
- 08 (CLI) ∥ 09 (NestJS) — 둘 다 07에만 의존
- 12+13 (FE agent hooks + BFF) ∥ 14 (FE delegation page) — 독립적
```

## 커버리지 매트릭스

### PRD 목표 → 티켓

| PRD 목표 | 관련 티켓 | 커버 |
|----------|----------|------|
| G1: Morpho 위임 데모 (풀 사이클) | Step 01~08 (runtime), Step 10~15 (FE) | ✅ |
| G2: Liquity 위임 데모 (이자율/담보) | Step 01~08 (runtime), Step 10~15 (FE) | ✅ |
| G3: 프론트엔드 위임 셋업 UI (설정+해제) | Step 10, 11, 14, 15 (setAuth true/false 토글, setRemoveManager 포함, 마켓플레이스→위임 UX 흐름) | ✅ |
| G4: 에이전트 활동 로그 | Step 12, 15 | ✅ |

### DoD 기능 항목 → 티켓

| DoD | 설명 | 티켓 | 커버 |
|-----|------|------|------|
| F1 | agent-runtime 패키지 존재 + tsc | Step 01 | ✅ |
| F2 | Capability 타입 정의 | Step 01 | ✅ |
| F3 | CapabilityRegistry (register, list, listExecutable) | Step 02 | ✅ |
| F4 | morpho.supply capability | Step 04 | ✅ |
| F5 | morpho.withdraw capability | Step 04 | ✅ |
| F6 | liquity.adjustInterestRate capability | Step 04 | ✅ |
| F7 | liquity.addCollateral capability | Step 04 | ✅ |
| F8 | Observer buildSnapshot | Step 03 | ✅ |
| F9 | Planner — listExecutable 필터링 | Step 05 | ✅ |
| F10 | Planner — Claude API tool use → StrategyPlan | Step 05 | ✅ |
| F11 | buildAnthropicTools + ToolMapping | Step 02 | ✅ |
| F12 | Executor — precondition + tx 실행 | Step 06 | ✅ |
| F13 | AgentManifest (demo-agent.json) | Step 07 | ✅ |
| F14 | System prompt (demo-agent-system.md) | Step 07 | ✅ |
| F15 | agent-server NestJS bootstrap | Step 09 | ✅ |
| F16 | POST /agent/run | Step 09 | ✅ |
| F17 | GET /agent/runs | Step 09 | ✅ |
| F18 | GET /agent/runs/:id | Step 09 | ✅ |
| F19 | GET /agent/status | Step 09 | ✅ |
| F20 | GET /agent/manifests | Step 09 | ✅ |
| F21 | X-API-Key guard → 401 | Step 09 | ✅ |
| F22 | @Cron 스케줄러 | Step 09 | ✅ |
| F23 | 동시 실행 409 | Step 09 | ✅ |
| F24 | liquity.ts ABI 추가 | Step 10 | ✅ |
| F25 | lend.ts ABI 추가 | Step 10 | ✅ |
| F26 | useRunAgent 훅 | Step 12 | ✅ |
| F27 | useAgentRuns 훅 | Step 12 | ✅ |
| F28 | useActivityLog 훅 | Step 12 | ✅ |
| F29 | useTroveDelegate 훅 | Step 11 | ✅ |
| F30 | useMorphoAuthorization 훅 | Step 11 | ✅ |
| F31 | /agent/delegate/[id] 3단계 위저드 | Step 14 | ✅ |
| F32 | 시나리오별 grantPermission | Step 14 | ✅ |
| F33 | PermissionForm 제거 → Delegate 버튼 | Step 15 | ✅ |
| F34 | RunAgentButton | Step 15 | ✅ |
| F35 | ActivityLog 표시 | Step 15 | ✅ |
| F36 | DelegationStatus 컴포넌트 | Step 14 | ✅ |
| F37 | /api/agent/run BFF 프록시 | Step 13 | ✅ |
| F38 | /api/agent/runs BFF 프록시 | Step 13 | ✅ |
| F39 | 마켓플레이스→위임 UX 흐름 | Step 15 | ✅ |
| F40 | Morpho e2e: FE 셋업 | Step 14 | ✅ |
| F41 | Morpho e2e: bot supply | Step 08 (CLI) / 09 (API) | ✅ |
| F42 | Morpho e2e: bot withdraw | Step 08 (CLI) / 09 (API) | ✅ |
| F43 | Morpho e2e: vault 회수 | Step 14 (위저드 내 vault withdraw UI) | ✅ |
| F44 | Liquity e2e: FE 셋업 | Step 14 | ✅ |
| F45a | Liquity e2e: adjustInterestRate | Step 08 (CLI) / 09 (API) | ✅ |
| F45b | Liquity e2e: addCollateral | Step 08 (CLI) / 09 (API) | ✅ |
| F46 | CLI 엔트리 | Step 08 | ✅ |

### DoD 비기능 → 티켓

| DoD | 설명 | 티켓 | 커버 |
|-----|------|------|------|
| N1 | agent-runtime strict + tsc | Step 01 | ✅ |
| N2 | agent-server strict + tsc | Step 09 | ✅ |
| N3 | apps/web tsc | Step 15 (최종 빌드 확인) | ✅ |
| N4 | apps/web 빌드 | Step 15 | ✅ |
| N5 | agent-runtime에 @nestjs/* 없음 | Step 01 | ✅ |
| N6 | @anthropic-ai/sdk — planner/에만 | Step 05 | ✅ |
| N7 | .env git 미포함 | Step 01 (.gitignore 확인) | ✅ |
| N8 | secret 하드코딩 없음 | Step 01 (config.ts) + 전 Step | ✅ |

### DoD 엣지케이스 → 티켓

| DoD | 설명 | 티켓 | 커버 |
|-----|------|------|------|
| E1 | Claude API 호출 실패 | Step 05 (Planner 에러 처리) | ✅ |
| E2 | Vault 잔액 부족 → abort | Step 06 (Executor) | ✅ |
| E3 | Permission 만료 → listExecutable 제외 | Step 02 (Registry) + Step 07 (Runtime) | ✅ |
| E4 | Morpho authorization 없이 withdraw | Step 06 (Executor precondition) | ✅ |
| E5 | Liquity cooldown → abort | Step 06 (Executor precondition) | ✅ |
| E6 | unknown tool name (hallucination) | Step 05 (Planner + 단위 테스트) | ✅ |
| E7 | 동시 실행 409 | Step 09 (NestJS) | ✅ |
| E8 | X-API-Key 없이 호출 → 401 | Step 09 (NestJS guard) | ✅ |
| E9 | multi-call 중간 revert | Step 06 (Executor) | ✅ |
| E10 | maxSteps 초과 | Step 05 (Planner) + Step 07 (Runtime) | ✅ |

### 설계 결정 → 티켓

| 설계 결정 | 티켓 | 커버 |
|----------|------|------|
| agent-runtime / agent-server 분리 | Step 01, 09 | ✅ |
| CapabilityRegistry + listExecutable() | Step 02 | ✅ |
| Claude API tool use + ToolMapping | Step 02, 05 | ✅ |
| AgentManifest (선언적 JSON) | Step 07 | ✅ |
| NestJS REST API + cron | Step 09 | ✅ |
| BFF 프록시 (Next.js API route) | Step 13 | ✅ |
| 시나리오별 별도 grantPermission | Step 14 | ✅ |
| abortOnFailedPrecondition: true | Step 06 | ✅ |

## Scope 요약

### 신규 패키지 (2개)
- `packages/agent-runtime/` — 순수 TS 런타임 (Step 01~07)
- `packages/agent-server/` — NestJS 서버 (Step 09)

### 기존 패키지 수정 (2개)
- `packages/integration/scripts/` — agent-bot.ts CLI 추가 (Step 08)
- `apps/web/` — ABI, hooks, pages, BFF (Step 10~15)

### 신규 FE 파일
- `apps/web/src/core/abis/liquity.ts` — ABI 5개 추가
- `apps/web/src/core/abis/lend.ts` — ABI 2개 추가
- `apps/web/src/domains/defi/borrow/hooks/useTroveDelegate.ts`
- `apps/web/src/domains/defi/lend/hooks/useMorphoAuthorization.ts`
- `apps/web/src/domains/agent/hooks/useRunAgent.ts`
- `apps/web/src/domains/agent/hooks/useAgentRuns.ts`
- `apps/web/src/domains/agent/hooks/useActivityLog.ts`
- `apps/web/src/domains/agent/components/RunAgentButton.tsx`
- `apps/web/src/domains/agent/components/ActivityLog.tsx`
- `apps/web/src/domains/agent/components/DelegationStatus.tsx`
- `apps/web/src/app/(more)/agent/delegate/[id]/page.tsx`
- `apps/web/src/app/api/agent/run/route.ts`
- `apps/web/src/app/api/agent/runs/route.ts`

### 수정 FE 파일
- `apps/web/src/app/(more)/agent/[id]/page.tsx` — PermissionForm 제거, Delegate/RunAgent/ActivityLog 추가

### workspace 설정 변경
- `pnpm-workspace.yaml` — agent-runtime, agent-server 등록
