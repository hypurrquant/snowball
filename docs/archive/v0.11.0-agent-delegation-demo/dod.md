# DoD (Definition of Done) - v0.11.0 Agent Delegation Demo

## 기능 완료 조건

### agent-runtime 패키지

| # | 조건 | 검증 방법 |
|---|------|----------|
| F1 | `packages/agent-runtime` 패키지가 존재하고 `tsc --noEmit` 통과 | `cd packages/agent-runtime && npx tsc --noEmit` |
| F2 | `Capability` 타입이 정의되어 있고 `id`, `description`, `inputSchema`, `requiredPermissions`, `preconditions`, `buildCalls` 필드를 포함 | `types.ts` 파일 확인 |
| F3 | `CapabilityRegistry`가 구현되어 `register()`, `list()`, `listExecutable()` 메서드를 제공 | `registry.ts` 파일 확인 |
| F4 | `morpho.supply` capability가 구현되어 `approveFromVault → executeOnBehalf(supply) → approveFromVault(0)` 3개 PreparedCall을 반환 | CLI로 `buildCalls()` 출력 확인 |
| F5 | `morpho.withdraw` capability가 구현되어 `executeOnBehalf(withdraw)` PreparedCall을 반환 | CLI로 `buildCalls()` 출력 확인 |
| F6 | `liquity.adjustInterestRate` capability가 구현되어 hint 계산 포함 `executeOnBehalf(adjustTroveInterestRate)` PreparedCall을 반환 | CLI로 `buildCalls()` 출력 확인 |
| F7 | `liquity.addCollateral` capability가 구현되어 `approveFromVault → executeOnBehalf(addColl) → approveFromVault(0)` PreparedCall을 반환 | CLI로 `buildCalls()` 출력 확인 |
| F8 | Observer가 vault balance, permission, Morpho position/authorization, Liquity trove 상태를 수집하여 `Snapshot` 반환 | CLI로 테스트넷 대상 `buildSnapshot()` 출력 확인 |
| F9 | Planner가 `registry.listExecutable(manifest, snapshot)`으로 현재 permission 기반 capability만 필터링하여 Claude tools[]를 생성 | Morpho permission만 있을 때 Liquity tool이 노출되지 않음을 로그로 확인 |
| F10 | Planner가 Claude API tool use를 호출하여 `StrategyPlan { steps[] }`를 반환. tool 미선택 시 `steps: []` | CLI 실행 로그에서 Claude 응답 + plan 확인 |
| F11 | `buildAnthropicTools()`가 `ToolMapping { tools, toolToCapability }` 양방향 매핑을 반환 | `anthropic-tools.ts` 코드 확인 |
| F12 | Executor가 precondition 검증 → buildCalls → 순차 tx 전송 → snapshot refresh를 수행 | CLI로 테스트넷에서 실제 tx 전송 + receipt 확인 |
| F13 | `AgentManifest` (`demo-agent.json`)가 존재하고 `allowedCapabilities`, `maxSteps: 1`, `riskPolicy` 필드 포함 | 파일 존재 + JSON schema 확인 |
| F14 | system prompt (`demo-agent-system.md`)가 존재하고 DeFi 포지션 관리 에이전트 역할을 정의 | 파일 존재 + 내용 확인 |

### agent-server 패키지 (NestJS)

| # | 조건 | 검증 방법 |
|---|------|----------|
| F15 | `packages/agent-server` 패키지가 NestJS 앱으로 부트스트랩되고 `npm run start` 성공 | 서버 시작 후 health check |
| F16 | `POST /agent/run` 엔드포인트가 `{ user, manifestId }` 요청을 받아 agent-runtime을 실행하고 `{ runId, status, plan, txHashes }` 반환 | `curl -X POST -H "X-API-Key: ..." localhost:3001/agent/run -d '...'` |
| F17 | `GET /agent/runs` 엔드포인트가 `?user=0x...&limit=20` 쿼리로 실행 이력을 반환 | `curl -H "X-API-Key: ..." localhost:3001/agent/runs?user=0x...` |
| F18 | `GET /agent/runs/:id` 엔드포인트가 특정 실행의 상세 결과를 반환 | `curl -H "X-API-Key: ..." localhost:3001/agent/runs/{runId}` |
| F19 | `GET /agent/status` 엔드포인트가 서버 상태(uptime, lastRun 등)를 반환 | `curl -H "X-API-Key: ..." localhost:3001/agent/status` |
| F20 | `GET /agent/manifests` 엔드포인트가 등록된 manifest 목록을 반환 | `curl -H "X-API-Key: ..." localhost:3001/agent/manifests` |
| F21 | `X-API-Key` guard가 동작하여 키 없는 요청에 401 반환 | `curl localhost:3001/agent/status` → 401 |
| F22 | `@Cron` 스케줄러가 설정된 주기로 agent-runtime을 자동 실행 | 서버 로그에서 cron 실행 로그 확인 |
| F23 | 동일 user+manifest 조합의 동시 실행 요청 시 409 반환 | 동시 2개 POST 요청 → 하나 409 |

### 프론트엔드 — ABI 보충

| # | 조건 | 검증 방법 |
|---|------|----------|
| F24 | `liquity.ts`에 `setAddManager`, `setRemoveManagerWithReceiver`, `setInterestIndividualDelegate`, `getInterestIndividualDelegateOf`, `addManagerOf` ABI 추가 | 컨트랙트 소스코드와 1:1 대조 |
| F25 | `lend.ts`에 `setAuthorization`, `isAuthorized` ABI 추가 | 컨트랙트 소스코드와 1:1 대조 |

### 프론트엔드 — 훅

| # | 조건 | 검증 방법 |
|---|------|----------|
| F26 | `useRunAgent` 훅이 `/api/agent/run` BFF 프록시를 호출하고 실행 결과를 반환 | 브라우저에서 "Run Agent" 클릭 → 결과 표시 확인 |
| F27 | `useAgentRuns` 훅이 `/api/agent/runs` BFF 프록시를 호출하고 실행 이력을 반환 | 브라우저에서 ActivityLog에 이력 표시 확인 |
| F28 | `useActivityLog` 훅이 `ExecutedOnBehalf` 온체인 이벤트를 조회 | 브라우저에서 bot 실행 후 이벤트 로그 표시 확인 |
| F29 | `useTroveDelegate` 훅이 `setAddManager`, `setRemoveManagerWithReceiver`, `setInterestIndividualDelegate` 호출 + 조회 기능 제공 | 위임 셋업 페이지에서 Liquity delegation tx 전송 확인 |
| F30 | `useMorphoAuthorization` 훅이 `setAuthorization` 호출 + `isAuthorized` 조회 기능 제공 | 위임 셋업 페이지에서 Morpho authorization tx 전송 확인 |

### 프론트엔드 — 페이지/컴포넌트

| # | 조건 | 검증 방법 |
|---|------|----------|
| F31 | `/agent/delegate/[id]` 페이지가 3단계 위저드로 동작 (Vault 예치 → Permission 부여 → Protocol Delegation) | 브라우저에서 위저드 3단계 순서대로 진행 확인 |
| F32 | Step 2 (PermissionGrant)에서 시나리오별 별도 grantPermission 호출 (Morpho: `[Morpho]×[supply,withdraw]`, Liquity: `[BorrowerOps]×[adjustRate,addColl]`) | 브라우저에서 tx 전송 후 온체인 permission 확인 |
| F33 | `/agent/[id]` 페이지에서 기존 PermissionForm이 제거되고 "Delegate" 버튼이 `/agent/delegate/[id]`로 이동 | 브라우저에서 버튼 클릭 → 라우팅 확인 |
| F34 | `/agent/[id]` 페이지에 `RunAgentButton` 표시, 클릭 시 BFF 경유 agent 실행 | 브라우저에서 클릭 → 실행 결과 표시 확인 |
| F35 | `/agent/[id]` 페이지에 `ActivityLog` 표시 (서버 이력 + 온체인 이벤트 병합) | 브라우저에서 bot 실행 후 이력 표시 확인 |
| F36 | `DelegationStatus` 컴포넌트가 현재 위임 상태 (어떤 프로토콜에 무슨 권한) 요약 표시 | 위임 설정 후 브라우저에서 상태 표시 확인 |

### 프론트엔드 — BFF 프록시

| # | 조건 | 검증 방법 |
|---|------|----------|
| F37 | `/api/agent/run` Next.js API route가 `API_KEY`를 서버사이드에서 주입하여 NestJS로 프록시 | `curl localhost:3000/api/agent/run` → NestJS 응답 반환. 브라우저 네트워크 탭에 API_KEY 미노출 |
| F38 | `/api/agent/runs` Next.js API route가 NestJS로 프록시 | `curl localhost:3000/api/agent/runs?user=0x...` → NestJS 응답 반환 |

### 마켓플레이스 → 위임 UX 흐름

| # | 조건 | 검증 방법 |
|---|------|----------|
| F39 | `/agent` → 에이전트 카드 클릭 → `/agent/[id]` → "Delegate" 버튼 → `/agent/delegate/[id]` 흐름이 끊김 없이 동작 | 브라우저에서 전체 흐름 수동 테스트 |

### End-to-end 데모 시나리오

| # | 조건 | 검증 방법 |
|---|------|----------|
| F40 | **Morpho 풀 사이클**: 위임 셋업 페이지에서 vault 예치 → grantPermission([Morpho],[supply,withdraw]) → Morpho.setAuthorization 성공 | 브라우저에서 위저드 완료 후 온체인 상태 확인 |
| F41 | **Morpho 풀 사이클**: bot 실행 → morpho.supply 실행 → Morpho에 user 명의 supply 기록 | `POST /agent/run` → txHashes 반환 → 온체인에서 supply position 확인 |
| F42 | **Morpho 풀 사이클**: bot 재실행 → morpho.withdraw 실행 → user 지갑으로 토큰 반환 | `POST /agent/run` → txHashes 반환 → user 잔액 증가 확인 |
| F43 | **Morpho 풀 사이클**: vault에서 잔여 토큰 withdraw 성공 | 브라우저에서 vault withdraw → user 지갑 잔액 확인 |
| F44 | **Liquity 시나리오**: 위임 셋업 페이지에서 setAddManager + setInterestIndividualDelegate + vault 예치 + grantPermission 성공 | 브라우저에서 위저드 완료 후 온체인 manager/delegate 확인 |
| F45a | **Liquity 시나리오**: bot 실행 → adjustInterestRate 실행 → 온체인에서 trove 이자율 변경 확인 | `POST /agent/run` → txHashes 반환 → 온체인에서 trove interestRate 변경 확인 |
| F45b | **Liquity 시나리오**: bot 실행 → addCollateral 실행 → 온체인에서 trove 담보 증가 확인 | `POST /agent/run` → txHashes 반환 → 온체인에서 trove collateral 증가 확인 |

### CLI 엔트리

| # | 조건 | 검증 방법 |
|---|------|----------|
| F46 | `npx tsx packages/integration/scripts/agent-bot.ts --user <addr> --manifest <path>` 실행 시 agent-runtime을 호출하고 결과를 터미널에 출력 | CLI 실행 → 출력 확인 (snapshot, plan, tx receipts) |

## 비기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| N1 | `packages/agent-runtime` TypeScript strict 에러 0 | `tsconfig.json`에 `"strict": true` 확인 + `cd packages/agent-runtime && npx tsc --noEmit` 통과 |
| N2 | `packages/agent-server` TypeScript strict 에러 0 | `tsconfig.json`에 `"strict": true` 확인 + `cd packages/agent-server && npx tsc --noEmit` 통과 |
| N3 | `apps/web` TypeScript 에러 0 (기존 + 신규 코드) | `cd apps/web && npx tsc --noEmit` 통과 |
| N4 | `apps/web` 빌드 성공 | `cd apps/web && npm run build` |
| N5 | agent-runtime이 NestJS에 의존하지 않음 (프레임워크-agnostic) | `packages/agent-runtime/package.json`에 `@nestjs/*` 없음 |
| N6 | Claude API 의존이 `planner/` 디렉토리에만 존재 | `grep -r "@anthropic-ai" packages/agent-runtime/src/` 결과가 `planner/` 파일만 |
| N7 | `.env` 파일이 git에 포함되지 않음 | `.gitignore`에 `.env` 포함 확인 + `git status`에 `.env` 미표시 |
| N8 | `AGENT_PRIVATE_KEY`, `ANTHROPIC_API_KEY`, `API_KEY`가 코드에 하드코딩되어 있지 않음 | `grep -r "PRIVATE_KEY\|sk-ant\|api-key-value" packages/ apps/web/src/` 결과 없음 (환경변수 참조 `process.env.*`는 허용) |

## 엣지케이스

| # | 시나리오 | 기대 동작 | 검증 방법 |
|---|---------|----------|----------|
| E1 | Claude API 호출 실패 (인증 오류/네트워크) | Planner에서 에러 로그 + run 종료. 서버는 500 + error message 반환 | `ANTHROPIC_API_KEY`를 잘못된 값으로 설정 후 `POST /agent/run` 실행 → 500 응답 + 에러 메시지 확인 |
| E2 | Vault 잔액 부족 상태에서 morpho.supply 시도 | precondition 실패 → `abortOnFailedPrecondition: true` → run 전체 중단 + 경고 | vault에 0 잔액인 user로 실행 |
| E3 | Permission이 만료된 상태에서 실행 | `listExecutable()`에서 해당 capability 제외 → Claude에 tool 미노출 → `steps: []` (no action) | 만료된 permission으로 실행 → 로그에서 no_action 확인 |
| E4 | Morpho authorization 없이 morpho.withdraw 시도 | precondition에서 `isAuthorized` 체크 실패 → 중단 | authorization 미설정 user로 실행 |
| E5 | Liquity cooldown 기간 중 adjustInterestRate 시도 | precondition에서 cooldown 체크 실패 → `abortOnFailedPrecondition: true` → run 전체 중단 + 경고 | 최근 이자율 변경한 trove로 실행 → run 중단 로그 확인 |
| E6 | Claude가 알 수 없는 tool name을 반환 (hallucination) | Planner에서 `toolToCapability.get()` 실패 → 해당 step 무시 + 경고 로그 → `steps: []`로 처리 | 단위 테스트: `toolToCapability`에 없는 tool name을 포함한 mock Claude 응답을 Planner에 주입 → 해당 step이 무시되고 경고 로그가 출력되는지 검증 (`planner.test.ts` 존재 + 테스트 통과) |
| E7 | 동일 user+manifest 동시 실행 요청 | 서버에서 409 Conflict 반환 | 동시 2개 POST 요청 전송 |
| E8 | X-API-Key 없이 NestJS 직접 호출 | 401 Unauthorized 반환 | `curl localhost:3001/agent/run` (헤더 없이) |
| E9 | multi-call 중간 tx revert (예: approveFromVault 성공 후 executeOnBehalf revert) | revert reason 출력 + 이후 call 중단 + run 종료 | 잘못된 파라미터로 executeOnBehalf 호출 유도 |
| E10 | `maxSteps: 1` 상태에서 Claude가 여러 tool을 연속 호출 시도 | Planner가 첫 번째 tool_use만 `steps[0]`으로 채택, 나머지 무시 | Claude 응답에 복수 tool_use가 올 경우 로그 확인 |

## PRD 목표 ↔ DoD 매핑

| PRD 목표 | DoD 항목 |
|----------|---------|
| G1: Morpho 위임 데모 (풀 사이클) | F4, F5, F8~F12, F16, **F40~F43** (e2e: 셋업→supply→withdraw→vault회수) |
| G2: Liquity 위임 데모 (이자율/담보) | F6, F7, F8~F12, F16, **F44, F45a, F45b** (e2e: 셋업→adjustRate + addColl 각각) |
| G3: 프론트엔드 위임 셋업 UI | F24~F25, F29~F32, F36, F39, F40, F44 |
| G4: 에이전트 활동 로그 | F27, F28, F35 |
| (추가) NestJS 서비스 | F15~F23, F37~F38 |
| (추가) 확장 가능 아키텍처 | F2, F3, F11, F13, N5, N6 |
| (추가) CLI 엔트리 | F46 |

## 설계 결정 ↔ DoD 반영

| 설계 결정 | DoD 항목 |
|----------|---------|
| agent-runtime / agent-server 패키지 분리 | F1, F15, N5 |
| CapabilityRegistry + listExecutable() | F3, F9, E3, E6 |
| Claude API tool use + ToolMapping | F10, F11, E1 |
| AgentManifest (선언적 JSON) | F13, F14 |
| NestJS REST API + cron | F16~F23 |
| BFF 프록시 (Next.js API route) | F37, F38 |
| 시나리오별 별도 grantPermission | F32 |
| abortOnFailedPrecondition: true | E2, E4, E5 (모두 run 전체 중단) |
