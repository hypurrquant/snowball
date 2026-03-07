# Trove Agent Delegation Trigger - v0.23.0

## 문제 정의

### 현상
- Liquity Borrow 페이지(`/liquity/borrow`)의 "Your Troves" 섹션에서 사용자가 자신의 Trove를 Agent에게 위임하는 진입점이 없다
- 현재 Agent 위임은 Agent 페이지(`/agent/{agentId}` → `/agent/delegate/{agentId}`)에서만 가능하다
- 사용자가 Trove를 보면서 "이 Trove를 Agent에게 맡기겠다"라는 자연스러운 흐름이 끊겨 있다
- Trove가 이미 Agent에 위임된 상태인지 확인할 방법도 Borrow 페이지에 없다

### 원인
- v0.10.0~v0.14.0 Agent 페이즈에서 위임 플로우를 Agent 페이지 기점으로만 구현했다
- Liquity Borrow 페이지는 Trove CRUD(Open/Edit/Close)에만 집중하여 Agent 연동 UI가 고려되지 않았다
- Agent 도메인과 Liquity 도메인이 UI 레벨에서 분리되어 있어 교차 진입점이 없다

### 영향
- **사용자 경험**: Trove를 보는 컨텍스트에서 Agent 위임을 하려면 별도 페이지로 이동해야 하며, 어떤 Agent에게 위임할지도 먼저 찾아야 한다
- **기능 발견성**: Agent 위임 기능이 존재하지만 Liquity 사용자가 이를 인지하기 어렵다
- **운영 효율**: Agent 자동화(이자율 조정, 담보 추가)는 Trove 관리의 핵심 가치인데, 진입 경로가 불편하다

### 목표
1. **FE 진입점**: Liquity Borrow 페이지의 각 Trove 카드에 "Agent 위임" 버튼을 추가하여 기존 위임 위저드(`/agent/delegate/{agentId}`)로 라우팅한다 (troveId + branchIndex 전달)
   - **agentId 결정**: 현재 등록된 Agent가 1개(이자율 조정 Agent)이므로 기본 Agent ID(IdentityRegistry NFT 토큰 ID, BigInt)를 `packages/core/src/config/addresses.ts`의 `ERC8004` 설정에 `defaultAgentId` 상수로 신규 추가. 추후 Agent가 늘어나면 선택 UI 추가
2. **위임 상태 표시**: Trove 카드에 현재 위임 상태를 표시한다 (on-chain 조회: `getAddManagerOf`, `getInterestIndividualDelegateOf`)
3. **양 브랜치 지원 (풀스택)**: wCTC와 lstCTC 두 브랜치 모두 위임 대상
   - FE 위저드: 선택된 Trove의 branchIndex에 따라 해당 BorrowerOperations 주소로 위임 설정
   - Agent 런타임: lstCTC BorrowerOperations config 추가 + capability 확장
   - Agent 서버: lstCTC 브랜치 config 반영
4. **완전한 undelegation**: 이미 위임된 Trove는 위임 상태 뱃지를 보여주고, 완전한 해제 옵션을 제공
   - `setRemoveManagerWithReceiver` + `removeInterestIndividualDelegate` 모두 호출하여 완전한 undelegation 보장
   - 기존 위저드의 부분 revoke(removeManager만) 개선

### 비목표 (Out of Scope)
- 새로운 위임 위저드 UI 전면 재개발 (기존 DelegationSetupWizard 재사용 + 확장)
- Agent 선택/검색 UI 신규 개발 (기본 Agent 고정으로 불필요)
- Morpho 위임 트리거 (이번 스코프는 Liquity Trove만)
- Options 모듈 관련 작업
- Agent AI 플래너/전략 로직 변경 (config/capability 확장만, 전략 자체는 변경 없음)

## 제약사항
- 기존 DelegationSetupWizard와 관련 훅(`useTroveDelegate`, `useVaultPermission`) 최대한 재사용
- DDD 4계층 아키텍처 준수 (`core/` → `domains/` → `shared/` → `app/`)
- 기존 Trove 카드 UI(Edit/Close)와 조화로운 디자인
- on-chain 조회 추가로 인한 성능 영향 최소화 (적절한 refetch interval)
- Agent 런타임 lstCTC 확장은 기존 wCTC 패턴을 따라 config + capability 복제 수준으로 최소화
