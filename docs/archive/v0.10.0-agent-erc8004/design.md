# 설계 - v0.10.0 Agent (ERC-8004)

## 변경 규모
**규모**: 일반 기능 (Large)
**근거**: 신규 도메인 디렉토리 전체 생성, 라우트 4개, 훅 9개, 컴포넌트 7개, 컨트랙트 4개 연동. 약 22~24개 파일 신규/수정.

---

## 문제 요약
배포된 ERC-8004 컨트랙트 4개가 프론트엔드와 완전 단절. ABI·훅·컴포넌트 없이 플레이스홀더 UI만 존재.

> 상세: [README.md](README.md) 참조

## 대안 검토

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: 단일 페이지 + 탭 | 파일 수 최소, nav 변경 불필요 | 코드 비대, 딥링크 불가, 9개 플로우 과밀 | ❌ |
| B: 멀티 라우트 + 도메인 분리 | 딥링크 지원, DDD 일관, Pool 패턴 동일, 응집도 높음 | 파일 수 증가 (~24개), 공수 1.5배 | ✅ |
| C: 2페이지 분리 (마켓+볼트) | A보다 구조적 | 딥링크 여전히 불가, 마켓 페이지 과밀 | ❌ |

**선택 이유**: Pool 도메인(`/pool` + `/pool/[pair]`)과 동일한 멀티 라우트 패턴. 프로필 딥링크 필수(데모/공유). DDD 4계층 원칙 준수.

## 접근법

1. `core/abis/agent.ts`에 JSON ABI 작성 (컨트랙트 소스 기반 정확성 보장)
2. `domains/agent/` 도메인 신설 — hooks + components + types
3. 4개 라우트로 9개 유저 플로우 분배
4. 기존 패턴(useYieldVaults, VaultActionDialog, useSwap) 재사용

## 기술 결정

| 결정 | 선택 | 이유 |
|------|------|------|
| ABI 포맷 | JSON object (`core/abis/agent.ts`) | 기존 dex.ts, yield.ts, lend.ts와 일관성 |
| 에이전트 탐색 | `totalAgents()` + 배치 `getAgentInfo` | 테스트넷 소규모 전제, 인덱싱 불필요 |
| 프로필 데이터 | 3개 레지스트리 `useReadContracts` 1회 호출 | multicall 배치로 RPC 최소화 |
| 볼트 다이얼로그 | VaultActionDialog 패턴 복제 | approve → deposit/withdraw 동일 흐름 |
| 권한 부여 UI | 프리셋 기반 + 고급 커스텀 | targets/functions bytes4 직접 입력은 일반 사용자에게 난해 |
| 주소 통합 | `ERC8004` 객체에 `agentVault` 추가 | 4개 컨트랙트 주소 한 곳 관리 |

---

## 아키텍처 개요

### 라우트 구조

```
apps/web/src/app/(more)/agent/
├── page.tsx              # 마켓플레이스: 전체 탐색 + 내 에이전트 [플로우 2,3]
├── register/page.tsx     # 에이전트 등록 폼 [플로우 1]
├── [id]/page.tsx         # 프로필: 상세+평판+인증+리뷰+활성화+권한부여 [플로우 4,5,6,8]
└── vault/page.tsx        # 볼트: 예치/출금 + 권한 조회/취소 [플로우 7,9]
```

### 도메인 레이어

```
apps/web/src/domains/agent/
├── hooks/
│   ├── useAgentList.ts         # totalAgents + getAgentInfo 배치 [R]
│   ├── useMyAgents.ts          # getOwnerAgents + getAgentInfo 배치 [R]
│   ├── useAgentProfile.ts      # 3개 레지스트리 조합 (7개 호출 1 multicall) [R]
│   ├── useRegisterAgent.ts     # registerAgent [W]
│   ├── useAgentActions.ts      # activate/deactivate [W]
│   ├── useSubmitReview.ts      # submitReview [W]
│   ├── useVaultActions.ts      # deposit/withdraw + useTokenApproval [W]
│   ├── useVaultPermission.ts   # grantPermission/revokePermission + getPermission [R+W]
│   └── useVaultBalance.ts      # getBalance (다중 토큰) [R]
├── components/
│   ├── AgentCard.tsx           # 에이전트 카드 (탐색 목록용)
│   ├── AgentProfileHeader.tsx  # 프로필 상단 (이름, 타입, 상태, 인증 배지)
│   ├── ReputationSection.tsx   # 평판 점수 + 리뷰 목록
│   ├── ReviewForm.tsx          # 별점 선택 + 코멘트 작성
│   ├── VaultDepositDialog.tsx  # 볼트 예치/출금 (VaultActionDialog 패턴)
│   ├── PermissionForm.tsx      # 권한 부여 폼 (프리셋 + 커스텀)
│   └── PermissionList.tsx      # 부여된 권한 목록 + 취소
└── types/
    └── index.ts                # AgentInfo, Review, ReputationData, Validation, Permission
```

### ABI 매핑 테이블

| 컨트랙트 | 함수 | 훅 | 페이지 |
|---------|------|-----|-------|
| IdentityRegistry | `totalAgents` | useAgentList | /agent |
| IdentityRegistry | `getAgentInfo` | useAgentList, useMyAgents, useAgentProfile | /agent, /agent/[id] |
| IdentityRegistry | `getOwnerAgents` | useMyAgents | /agent |
| IdentityRegistry | `ownerOf` | useAgentProfile | /agent/[id] |
| IdentityRegistry | `registerAgent` | useRegisterAgent | /agent/register |
| IdentityRegistry | `activateAgent` | useAgentActions | /agent/[id] |
| IdentityRegistry | `deactivateAgent` | useAgentActions | /agent/[id] |
| ReputationRegistry | `getReputation` | useAgentProfile | /agent/[id] |
| ReputationRegistry | `getSuccessRate` | useAgentProfile | /agent/[id] |
| ReputationRegistry | `getReviews` | useAgentProfile | /agent/[id] |
| ReputationRegistry | `submitReview` | useSubmitReview | /agent/[id] |
| ValidationRegistry | `isValidated` | useAgentProfile | /agent/[id] |
| ValidationRegistry | `getValidation` | useAgentProfile | /agent/[id] |
| AgentVault | `deposit` | useVaultActions | /agent/vault |
| AgentVault | `withdraw` | useVaultActions | /agent/vault |
| AgentVault | `grantPermission` | useVaultPermission | /agent/[id] |
| AgentVault | `revokePermission` | useVaultPermission | /agent/vault |
| AgentVault | `getPermission` | useVaultPermission | /agent/vault |
| AgentVault | `getBalance` | useVaultBalance | /agent/vault |

### 컴포넌트 트리

```
/agent (page.tsx)
├── StatCard × 2 (총 에이전트 수, 내 에이전트 수)
├── AgentCard × N (탐색 그리드)
│   └── Link → /agent/[id]
└── Button → /agent/register

/agent/register (page.tsx)
└── 폼: name, agentType, endpoint, tokenURI
    └── useRegisterAgent → 성공 시 /agent/[id]로 리다이렉트

/agent/[id] (page.tsx)
├── AgentProfileHeader
│   ├── Badge (isValidated → Validated/Unvalidated)
│   └── Button (activate/deactivate) — 소유자만
├── ReputationSection
│   ├── 점수 표시 (별점 + 수치)
│   ├── 성공률 Progress
│   └── Review[] 목록
├── ReviewForm — 로그인 사용자용
└── PermissionForm — 해당 에이전트에게 권한 부여
    └── useVaultPermission.grantPermission

/agent/vault (page.tsx)
├── VaultBalance 표시 (토큰별 잔고)
├── VaultDepositDialog
│   ├── Tab: Deposit (useTokenApproval → deposit)
│   └── Tab: Withdraw
└── PermissionList
    ├── Permission 카드 × N
    │   └── revoke 버튼
    └── Empty state
```

---

## 범위 / 비범위

**범위(In Scope)**:
- ABI 파일 생성 + index export
- 주소 설정 보완 (ERC8004.agentVault)
- 타입 정의
- READ 훅 4개 + WRITE 훅 5개
- 페이지 4개 + 컴포넌트 7개
- 로딩/에러/empty state 기본 처리

**비범위(Out of Scope)**:
- executeOnBehalf, approveFromVault, transferFromVault (봇 전용 함수)
- ValidationRegistry 관리자 함수 (addValidator, removeValidator)
- 이벤트 인덱싱 / 백엔드 캐시
- Options 모듈 관련
- 다른 프로토콜 (Liquity, Morpho) 개선

## 테스트 전략

- **타입 체크**: `tsc --noEmit` 빌드 오류 없음
- **ABI 정확성**: 컨트랙트 소스 `.sol` 파일과 `agent.ts` ABI의 함수 시그니처 1:1 대조
- **훅 동작**: 브라우저에서 테스트넷 연결 후 READ 훅 데이터 반환 확인
- **WRITE 트랜잭션**: 실제 테스트넷 트랜잭션 성공 확인 (registerAgent, deposit 등)

## 설계 보완 사항

### 권한 목록 열거 전략
AgentVault는 `getPermission(user, agent)` 단건 조회만 제공하고 전체 목록 열거 함수가 없다.
- **MVP 접근**: 사용자가 권한을 부여한 에이전트 목록은 `PermissionGranted` 이벤트 로그로 복원
  - `useVaultPermission`에서 `getLogs({ event: "PermissionGranted", args: { user: address } })` 호출
  - 결과에서 agent 주소 추출 → 각각 `getPermission(user, agent)` 호출로 active 여부 확인
  - Revoked된 것은 `active: false`이므로 필터링
- **대안**: 전체 에이전트 endpoint 스캔은 비효율적이므로 채택하지 않음

### 등록 후 agentId 획득
`registerAgent`는 `uint256 agentId`를 반환하지만, FE에서 state-changing tx의 반환값을 직접 받기 어렵다.
- **접근**: tx receipt에서 `AgentRegistered` 이벤트 로그를 파싱하여 `agentId` 추출
  - `writeContractAsync` → `waitForTransactionReceipt` → `decodeEventLog(AgentRegistered)` → `agentId`
  - 성공 시 `/agent/[agentId]`로 리다이렉트

### tokenURI 처리
- **등록 시**: `registerAgent` 호출 시 사용자가 `tokenURI` 입력 (선택사항, 빈 문자열 허용)
- **읽기**: MVP에서는 프로필 페이지에서 `tokenURI`를 표시하지 않음 (write-only)
  - 향후 에이전트 아바타/메타데이터 표시 시 `tokenURI()` 읽기 추가 가능
- ABI 매핑 테이블에서 제외 (MVP 비사용)

### 이벤트 매핑 (ABI에 포함 필요)

| 컨트랙트 | 이벤트 | 용도 |
|---------|--------|------|
| IdentityRegistry | `AgentRegistered` | 등록 후 agentId 파싱 |
| AgentVault | `PermissionGranted` | 권한 목록 복원 |
| AgentVault | `PermissionRevoked` | 권한 목록 필터링 (참고용) |
| AgentVault | `Deposited` | 예치 확인 (참고용) |
| AgentVault | `Withdrawn` | 출금 확인 (참고용) |

## 리스크 / 오픈 이슈

| 리스크 | 영향 | 완화 |
|--------|------|------|
| totalAgents 동적 스캔 성능 | 에이전트 100+일 때 RPC 부하 | multicall 배치 + refetchInterval 30s + 페이지네이션 고려 |
| AgentVault 주소 불일치 가능성 | 트랜잭션 실패 | 배포 로그 확인 후 addresses.ts 업데이트 |
| PermissionForm UI 복잡도 | 일반 사용자 진입장벽 | 프리셋 제공 (e.g. "DEX 스왑만 허용") |
| Human-Readable → JSON ABI 변환 오류 | 함수 셀렉터 불일치 → revert | 컨트랙트 소스 기준 수동 검증 |

## 구현 단계 (권장 순서)

| 단계 | 내용 | 산출물 |
|------|------|--------|
| 1 | ABI + 주소 + 타입 기반 인프라 | agent.ts, addresses.ts, types/index.ts |
| 2 | READ 훅 (데이터 계층) | useAgentList, useMyAgents, useAgentProfile, useVaultBalance |
| 3 | 마켓플레이스 UI | /agent, /agent/[id], AgentCard, ProfileHeader, ReputationSection |
| 4 | WRITE 훅 + 등록/리뷰/활성화 | useRegisterAgent, useAgentActions, useSubmitReview, /agent/register, ReviewForm |
| 5 | 볼트 + 권한 관리 | useVaultActions, useVaultPermission, /agent/vault, VaultDepositDialog, PermissionForm, PermissionList |
| 6 | 통합 마무리 | 링크 연결, 에러 핸들링, 로딩 스켈레톤, empty state |
