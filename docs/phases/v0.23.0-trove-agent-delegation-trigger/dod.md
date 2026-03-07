# DoD (Definition of Done) - v0.23.0

## 기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| F1 | Borrow 페이지의 각 Trove 카드에 "Delegate to Agent" 버튼이 표시된다 | `/liquity/borrow` 접속 후 Trove 보유 계정으로 확인. wCTC/lstCTC 브랜치 각각 버튼 존재 |
| F2 | "Delegate to Agent" 클릭 시 `/agent/delegate/{defaultAgentId}?scenario=liquity&troveId={id}&branch={branch}` 로 이동한다 | 버튼 클릭 후 URL 확인. troveId, branch query param이 정확히 전달됨 |
| F3 | Delegate 페이지에서 query param(scenario, troveId, branch)이 자동 반영되어 위저드가 pre-fill된다 | 라우팅 후 위저드에서 scenario=liquity 선택됨, troveId 입력란에 값 채워짐, branch에 맞는 BorrowerOps 사용 |
| F4 | DelegationSetupWizard가 branch prop을 받아 해당 브랜치의 BorrowerOperations 주소로 위임 트랜잭션을 전송한다 | wCTC branch → wCTC BorrowerOps, lstCTC branch → lstCTC BorrowerOps 주소 확인 (on-chain tx target 검증) |
| F5 | 위임 완료 후 Borrow 페이지로 돌아오면 해당 Trove에 "Agent Delegated" 뱃지가 표시된다 | 위임 완료 → Borrow 페이지 새로고침 → 뱃지 확인 (30초 refetch interval 이내) |
| F6 | 위임 상태 뱃지는 addManager + interestDelegate 둘 다 AgentVault일 때만 표시된다 | on-chain에서 `getAddManagerOf(troveId)` == AgentVault AND `getInterestIndividualDelegateOf(troveId).account` == AgentVault 검증 |
| F7 | 위임된 Trove에 "Undelegate" 버튼이 표시되고, 클릭 시 확인 다이얼로그가 뜬다 | 위임 상태 Trove에서 버튼 확인 + 클릭 → 다이얼로그 표시 |
| F8 | Undelegate 확인 시 `setRemoveManagerWithReceiver` + `removeInterestIndividualDelegate` 두 트랜잭션이 순차 실행된다 | on-chain에서 해제 후 `getAddManagerOf(troveId)` != AgentVault AND `getInterestIndividualDelegateOf(troveId).account` != AgentVault 확인 |
| F9 | `ERC8004.defaultAgentId` 상수가 `packages/core/src/config/addresses.ts`에 추가되어 web/runtime/server에서 import 가능하다 | `grep -r "defaultAgentId" packages/core/` + import 확인 |
| F10 | `removeInterestIndividualDelegate` ABI가 `packages/core/src/abis/liquity.ts`의 `InterestDelegateABI`에 추가된다 | ABI 배열에 해당 함수 entry 존재 확인 |
| F11 | Agent runtime config가 `liquityBranches: { wCTC, lstCTC }` 형태로 마이그레이션된다 | `packages/agent-runtime/src/config.ts`에서 `liquityBranches` 구조 확인. 기존 `liquity` 단일 필드 제거 |
| F12 | lstCTC manifest가 등록되고, scheduler가 manifest별 branch에 맞는 troveId를 전달한다 | `packages/agent-runtime/manifests/`에 lstCTC manifest 존재 + scheduler 코드에서 양 브랜치 TroveManager 스캔 + manifest의 `liquityBranch`에 해당하는 branch의 troveId만 `runAgent`에 전달하는 로직 확인 (코드 리뷰) |
| F13 | `buildSnapshot`이 manifest의 `liquityBranch`를 읽어 `liquityBranches[branch]` config로 on-chain 상태를 조회한다 | `packages/agent-runtime/src/observers/` 코드에서 branch 기반 config 선택 로직 확인 + lstCTC manifest로 실행 시 lstCTC 주소 사용 확인 |
| F14 | capability가 runtime context에서 active branch config를 받아 해당 BorrowerOps에 트랜잭션을 전송한다 | `packages/agent-runtime/src/capabilities/liquity-*.ts`에서 branch config 사용 확인 |

## 비기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| N1 | apps/web TypeScript strict 모드 에러 0 | `cd apps/web && npx tsc --noEmit` — exit code 0 |
| N2 | apps/web 빌드 성공 | `cd apps/web && npm run build` — exit code 0 |
| N3 | packages/agent-runtime TypeScript 에러 0 | `cd packages/agent-runtime && npx tsc --noEmit` — exit code 0 |
| N4 | apps/agent-server TypeScript 에러 0 | `cd apps/agent-server && npx tsc --noEmit` — exit code 0 |
| N5 | DDD 계층 규칙 준수 — app 레이어만 cross-domain import | `useTroveDelegationStatus`는 `domains/defi/liquity/` 내부. borrow page(app layer)에서만 agent 도메인 상수 import. `grep -r "from.*domains/agent" apps/web/src/domains/` — 결과 0건 |
| N6 | 위임 상태 조회 refetchInterval 30초 이상 | `useTroveDelegationStatus` 코드에서 `refetchInterval: 30_000` 이상 확인 |
| N7 | 외부 계약에서 `branch: "wCTC" \| "lstCTC"` string 사용, `branchIndex`는 on-chain 경계에서만 변환 | query param, props, hook 파라미터 모두 `branch` string 사용 확인 |

## 엣지케이스

| # | 시나리오 | 기대 동작 | 검증 방법 |
|---|---------|----------|----------|
| E1 | Trove가 없는 사용자 | "Delegate to Agent" 버튼이 표시되지 않음 (Trove 카드 자체가 없으므로) | Trove 미보유 계정으로 `/liquity/borrow` 접속 |
| E2 | 이미 위임된 Trove에서 "Delegate to Agent" 클릭 | 위임 버튼 대신 "Undelegate" 버튼만 표시 | 위임 완료 Trove 카드에서 버튼 상태 확인 |
| E3 | 부분 위임 상태 (addManager만 설정, interestDelegate 미설정) | "Agent Delegated" 뱃지 표시 안 됨. "Delegate to Agent" 버튼 유지 | on-chain에서 addManager만 설정 후 UI 확인 |
| E4 | Undelegate 중 두 번째 트랜잭션 실패 (removeManager 성공, removeInterestDelegate 실패) | 에러 메시지 표시 + 뱃지가 사라짐(부분 해제 상태 반영 — addManager 해제됨). "Delegate to Agent" 버튼 다시 표시 | `fullUndelegate` 코드에서 두 번째 tx 실패 시 에러 처리 로직 확인 (코드 리뷰). 실제 검증: 부분 해제 상태(addManager만 해제)에서 UI가 E3과 동일하게 동작하는지 확인 |
| E5 | 지갑 미연결 상태 | 위임/해제 버튼 비활성화 또는 지갑 연결 프롬프트 | 지갑 미연결 상태로 페이지 접속 |

## PRD 목표 ↔ DoD 매핑

| PRD 목표 | DoD 항목 | 커버 |
|----------|---------|------|
| 1. Trove 카드 "Agent 위임" 버튼 + 라우팅 | F1, F2, F3 | ✅ |
| 1-1. defaultAgentId 상수 | F9 | ✅ |
| 2. 위임 상태 뱃지 표시 | F5, F6 | ✅ |
| 3. 양 브랜치 풀스택 (FE) | F4 | ✅ |
| 3. 양 브랜치 풀스택 (Runtime config) | F11 | ✅ |
| 3. 양 브랜치 풀스택 (Runtime snapshot) | F13 | ✅ |
| 3. 양 브랜치 풀스택 (Runtime capability) | F14 | ✅ |
| 3. 양 브랜치 풀스택 (Manifest + Scheduler) | F12 | ✅ |
| 4. 완전한 undelegation | F7, F8, F10 | ✅ |

## 설계 결정 ↔ DoD 반영

| 설계 결정 | DoD 항목 | 커버 |
|----------|---------|------|
| 하이브리드 접근 (Navigation + Inline) | F1-F3 (Navigation), F5-F8 (Inline) | ✅ |
| defaultAgentId in packages/core | F9 | ✅ |
| removeInterestIndividualDelegate ABI 추가 | F10 | ✅ |
| DelegationSetupWizard branch prop | F4 | ✅ |
| Delegate page query param | F2, F3 | ✅ |
| liquityBranches config 마이그레이션 | F11 | ✅ |
| Manifest 분리 + scheduler 양 브랜치 | F12 | ✅ |
| buildSnapshot branch-aware 조회 | F13 | ✅ |
| capability branch config 사용 | F14 | ✅ |
| branch string 통일 | N7 | ✅ |
| useTroveDelegationStatus 30s refetch | N6 | ✅ |
| monorepo 전체 타입 검증 | N1, N3, N4 | ✅ |
