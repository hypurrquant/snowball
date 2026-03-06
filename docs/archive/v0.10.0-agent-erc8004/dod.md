# DoD (Definition of Done) - v0.10.0 Agent (ERC-8004)

## 검증 전제 데이터

테스트넷에서 검증 시 다음 fixture가 필요함. Step 5 개발 중 registerAgent 등으로 직접 생성:

| fixture | 설명 | 필수 | 검증 경로 |
|---------|------|:---:|----------|
| owner wallet | 에이전트를 등록한 지갑 (개발자 지갑) | ✅ | 테스트넷 직접 생성 |
| non-owner wallet | 에이전트를 소유하지 않은 별도 지갑 | ✅ | 테스트넷 별도 계정 |
| agentId (최소 1개) | owner wallet이 등록한 에이전트. 이름/타입/endpoint 설정 완료 | ✅ | Step 5에서 registerAgent tx로 생성 |
| agentId with reviews | submitReview로 1건 이상 리뷰가 있는 에이전트 | ✅ | Step 5에서 submitReview tx로 생성 |
| validated agentId | ValidationRegistry에서 validate된 에이전트 | ✅ | 배포자 지갑(=validator)으로 validateAgent tx 실행 |
| vault funded wallet | AgentVault에 wCTC 또는 sbUSD가 deposit된 지갑 | ✅ | Step 5에서 approve + deposit tx로 생성 |

> 모든 fixture는 테스트넷에서 실제 tx로 생성. mock 대체 불가.

## 기능 완료 조건

### ABI / 인프라

| # | 조건 | 검증 방법 |
|---|------|----------|
| F1 | `core/abis/agent.ts` 파일이 존재하며 IdentityRegistryABI, ReputationRegistryABI, ValidationRegistryABI, AgentVaultABI 4개 ABI를 JSON object 포맷으로 export | `core/abis/agent.ts` 파일 확인 + `core/abis/index.ts`에서 re-export 확인 |
| F2 | ABI의 모든 함수 시그니처가 컨트랙트 소스 `.sol` 파일과 1:1 일치 | ABI의 각 함수 name/inputs/outputs를 IdentityRegistry.sol, ReputationRegistry.sol, ValidationRegistry.sol, AgentVault.sol과 수동 대조 |
| F3 | `addresses.ts`의 `ERC8004` 객체에 `agentVault` 필드 추가되어 4개 주소가 한 곳에 모임 | `addresses.ts` 파일 확인 |

### 에이전트 마켓플레이스 (READ)

| # | 조건 | 검증 방법 |
|---|------|----------|
| F4 | `/agent` 페이지에서 전체 등록된 에이전트 목록이 카드 형태로 표시됨 (이름, 타입, 상태) | 브라우저에서 `/agent` 접속 → 에이전트 카드 확인 |
| F5 | `/agent` 페이지에서 내 에이전트(지갑 연결 시)가 별도 섹션으로 표시됨 | 지갑 연결 후 `/agent` 접속 → "My Agents" 섹션 확인 |
| F6 | `/agent/[id]` 프로필 페이지에서 에이전트 상세 정보(이름, 타입, endpoint, 소유자, 활성화 상태)가 표시됨 | fixture agentId로 `/agent/[agentId]` 접속 → AgentProfileHeader 렌더링 확인 |
| F7 | `/agent/[id]` 프로필 페이지에서 평판 점수(별점 + 수치)와 성공률이 표시됨 | fixture "agentId with reviews"로 접속 → ReputationSection 렌더링 확인 |
| F8 | `/agent/[id]` 프로필 페이지에서 리뷰 목록(작성자, 점수, 코멘트, 시간)이 표시됨 | fixture "agentId with reviews"로 접속 → 리뷰 리스트 렌더링 확인 |
| F9 | `/agent/[id]` 프로필 페이지에서 인증 상태(Validated/Unvalidated + 만료일)가 배지로 표시됨 | fixture "validated agentId"로 접속 → Validated 배지 확인, 미인증 에이전트로 접속 → Unvalidated 배지 확인 |

### 에이전트 등록/관리 (WRITE)

| # | 조건 | 검증 방법 |
|---|------|----------|
| F10 | `/agent/register` 페이지에서 이름, 타입, endpoint, tokenURI를 입력하고 등록 트랜잭션을 전송할 수 있음 | `/agent/register` 접속 → 폼 입력 → 등록 버튼 클릭 → 테스트넷 tx 성공 확인 |
| F11 | 등록 성공 후 tx receipt에서 agentId를 파싱하여 `/agent/[id]` 로 리다이렉트됨 | F10 이후 URL이 `/agent/[agentId]`로 변경 확인 |
| F12 | 에이전트 소유자가 `/agent/[id]`에서 activate/deactivate 토글 버튼을 클릭하여 상태를 변경할 수 있음 | 소유 에이전트 프로필 → 토글 클릭 → tx 성공 → 상태 반영 확인 |

### 리뷰 (WRITE)

| # | 조건 | 검증 방법 |
|---|------|----------|
| F13 | `/agent/[id]`에서 로그인된 사용자가 1~5 별점 + 코멘트를 입력하고 리뷰를 제출할 수 있음 | 프로필 페이지 → ReviewForm 작성 → 제출 tx 성공 → 리뷰 목록에 반영 확인 |
| F14 | 리뷰 제출 시 `"general"` 태그가 자동으로 사용됨 (사용자 입력 불필요) | submitReview tx의 calldata에서 tag 파라미터가 "general"인지 확인 |

### 볼트 관리 (WRITE)

| # | 조건 | 검증 방법 |
|---|------|----------|
| F15 | `/agent/vault` 페이지에서 토큰별(wCTC, sbUSD, USDC, lstCTC) 볼트 잔고가 표시됨 | `/agent/vault` 접속 → 4개 토큰 잔고 표시 확인 |
| F16 | `/agent/vault`에서 토큰 선택 → 금액 입력 → ERC20 approve → deposit 트랜잭션을 순차 실행할 수 있음 | VaultDepositDialog → deposit 탭 → approve → deposit tx 성공 → 잔고 증가 확인 |
| F17 | `/agent/vault`에서 토큰 선택 → 금액 입력 → withdraw 트랜잭션을 실행할 수 있음 | VaultDepositDialog → withdraw 탭 → tx 성공 → 잔고 감소 확인 |

### 권한 관리 (R+W)

| # | 조건 | 검증 방법 |
|---|------|----------|
| F18 | `/agent/[id]` 프로필에서 해당 에이전트에게 권한을 부여할 수 있음. 프리셋 선택(예: "DEX 스왑만 허용") 또는 고급 커스텀 입력(targets, functions, cap, expiry)을 지원 | PermissionForm에서 프리셋 선택 → grantPermission tx 성공 확인 + 커스텀 입력 → tx 성공 확인 |
| F19 | `/agent/vault`에서 내가 부여한 권한 목록이 표시됨 (에이전트 주소, targets, cap, 만료일, active 상태) | `/agent/vault` 접속 → PermissionList에 권한 카드 표시 확인 |
| F20 | `/agent/vault`에서 부여한 권한을 즉시 취소(revoke)할 수 있음 | PermissionList → revoke 버튼 클릭 → tx 성공 → 목록에서 제거/비활성 확인 |

## 비기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| N1 | TypeScript strict 모드 에러 0 | `pnpm --filter @snowball/web exec tsc --noEmit` 실행 → 에러 없음 |
| N2 | ESLint 통과 | `pnpm --filter @snowball/web lint` 실행 → 에러 없음 |
| N3 | Next.js 빌드 성공 | `pnpm --filter @snowball/web build` 실행 → 에러 없음 |
| N4 | DDD 4계층 위반 없음 — `domains/agent/` 훅이 `app/` 레이어를 import하지 않음 | `rg "from.*app/" apps/web/src/domains/agent/` → 결과 없음 |
| N5 | READ 전용 페이지(`/agent`, `/agent/[id]`)는 지갑 미연결 시에도 에이전트 목록/프로필을 읽기 가능. WRITE 페이지(`/agent/register`, `/agent/vault`)는 "Connect wallet" 안내 표시 | 미연결 상태로 4개 라우트 접속 → `/agent`, `/agent/[id]`는 데이터 표시, `/agent/register`, `/agent/vault`는 연결 안내 확인 |
| N6 | 모든 READ 훅에서 로딩 중 Skeleton/로딩 표시가 있음 | 느린 네트워크에서 각 페이지 접속 → 로딩 상태 확인 |

## 엣지케이스

| # | 시나리오 | 기대 동작 | 검증 방법 |
|---|---------|----------|----------|
| E1 | 에이전트가 0개 등록된 상태에서 `/agent` 접속 | "등록된 에이전트가 없습니다" empty state + 등록 버튼 표시 | totalAgents=0인 상태에서 페이지 접속 |
| E2 | 존재하지 않는 agentId로 `/agent/999` 접속 | 에이전트 정보가 빈 값이면 "에이전트를 찾을 수 없습니다" 표시 | `/agent/999` 접속 → not found 상태 확인 |
| E3 | 볼트 잔고가 0인 상태에서 withdraw 시도 | withdraw 버튼 disabled 또는 "잔고 부족" 에러 표시 | 잔고 0 → withdraw 시도 → UI 피드백 확인 |
| E4 | ERC20 approve 없이 deposit 시도 | approve 버튼이 먼저 표시되고 deposit 버튼은 disabled | approve 전 상태에서 UI 확인 |
| E5 | 비소유자가 에이전트 activate/deactivate 시도 | 토글 버튼이 표시되지 않음 (소유자만 보임) | 다른 지갑으로 `/agent/[id]` 접속 → 토글 없음 확인 |
| E6 | 이미 revoke된 권한을 다시 revoke 시도 | revoke 버튼이 비활성 상태이거나 해당 항목이 목록에서 사라짐 | PermissionList에서 비활성 권한 확인 |
| E7 | grantPermission에서 expiry를 과거 시점으로 설정 | 컨트랙트가 revert → UI에서 에러 메시지 표시 | 과거 timestamp 입력 → tx 실패 → 에러 표시 확인 |

## PRD 목표 ↔ DoD 매핑

| PRD 플로우 | DoD 항목 | 커버 |
|-----------|---------|------|
| 1. 에이전트 등록 | F10, F11 | ✅ |
| 2. 내 에이전트 목록 | F5 | ✅ |
| 3. 전체 에이전트 탐색 | F4 | ✅ |
| 4. 에이전트 프로필 | F6, F7, F8, F9 | ✅ |
| 5. 활성화/비활성화 | F12, E5 | ✅ |
| 6. 리뷰 작성 | F13, F14 | ✅ |
| 7. 볼트 예치/출금 | F15, F16, F17, E3, E4 | ✅ |
| 8. 권한 부여 | F18 | ✅ |
| 9. 권한 조회/취소 | F19, F20, E6 | ✅ |

## 설계 결정 ↔ DoD 매핑

| 설계 결정 | DoD 반영 | 커버 |
|----------|---------|------|
| JSON ABI 포맷 | F1, F2 | ✅ |
| 주소 통합 (ERC8004.agentVault) | F3 | ✅ |
| 멀티 라우트 4개 | F4~F20 (4개 라우트 전체 커버) | ✅ |
| totalAgents 클라이언트 스캔 | F4 | ✅ |
| PermissionGranted 로그 기반 목록 | F19 (로그 복원으로 구현, 다른 방식은 불가) | ✅ |
| AgentRegistered 이벤트 파싱 | F11 (receipt 파싱으로 구현, getOwnerAgents 재조회는 비결정적) | ✅ |
| "general" 단일 태그 | F14 | ✅ |
| 프리셋 기반 권한 UI | F18 (프리셋 선택 또는 커스텀 입력 지원) | ✅ |
| VaultActionDialog 패턴 재사용 | F16, F17 | ✅ |
| DDD 4계층 준수 | N4 | ✅ |
| READ 페이지 비연결 접근 | N5 | ✅ |
