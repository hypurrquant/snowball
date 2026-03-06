# 작업 티켓 - v0.10.0 Agent (ERC-8004)

## 전체 현황

| # | Step | 난이도 | 롤백 | Scope | FP/FN | 개발 | 완료일 |
|---|------|--------|:---:|:---:|:---:|:---:|--------|
| 01 | ABI + 주소 + 타입 기반 인프라 | 🟢 | ✅ | ✅ | ✅ | ✅ | 2026-03-06 |
| 02 | READ 훅 구현 | 🟡 | ✅ | ✅ | ✅ | ✅ | 2026-03-06 |
| 03 | 마켓플레이스 UI | 🟠 | ✅ | ✅ | ✅ | ✅ | 2026-03-06 |
| 04 | WRITE 훅 + 등록/리뷰/활성화 | 🟠 | ✅ | ✅ | ✅ | ✅ | 2026-03-06 |
| 05 | 볼트 + 권한 관리 | 🔴 | ✅ | ✅ | ✅ | ✅ | 2026-03-06 |
| 06 | 통합 마무리 | 🟡 | ✅ | ✅ | ✅ | ✅ | 2026-03-06 |

## 의존성

```
01 → 02 → 03 → 04 → 05 → 06
```

선형 의존: 각 Step은 이전 Step의 산출물에 의존.

## 커버리지 매트릭스

### PRD 목표 → 티켓

| PRD 플로우 | 관련 티켓 | 커버 |
|-----------|----------|:---:|
| 1. 에이전트 등록 | Step 04 (useRegisterAgent, /agent/register) | ✅ |
| 2. 내 에이전트 목록 | Step 02 (useMyAgents), Step 03 (/agent My Agents) | ✅ |
| 3. 전체 에이전트 탐색 | Step 02 (useAgentList), Step 03 (/agent 카드 그리드) | ✅ |
| 4. 에이전트 프로필 | Step 02 (useAgentProfile), Step 03 (/agent/[id]) | ✅ |
| 5. 활성화/비활성화 | Step 04 (useAgentActions) | ✅ |
| 6. 리뷰 작성 | Step 04 (useSubmitReview, ReviewForm) | ✅ |
| 7. 볼트 예치/출금 | Step 02 (useVaultBalance), Step 05 (useVaultActions, VaultDepositDialog) | ✅ |
| 8. 권한 부여 | Step 05 (useVaultPermission, PermissionForm) | ✅ |
| 9. 권한 조회/취소 | Step 05 (useVaultPermission, PermissionList) | ✅ |

### DoD → 티켓

| DoD 항목 | 관련 티켓 | 커버 |
|----------|----------|:---:|
| F1 (ABI 파일) | Step 01 | ✅ |
| F2 (ABI 정확성) | Step 01 | ✅ |
| F3 (agentVault 주소) | Step 01 | ✅ |
| F4 (에이전트 목록) | Step 03 | ✅ |
| F5 (내 에이전트) | Step 03 | ✅ |
| F6 (프로필 상세) | Step 03 | ✅ |
| F7 (평판 점수) | Step 03 | ✅ |
| F8 (리뷰 목록) | Step 03 | ✅ |
| F9 (인증 배지) | Step 03 | ✅ |
| F10 (등록 tx) | Step 04 | ✅ |
| F11 (등록 후 리다이렉트) | Step 04 | ✅ |
| F12 (activate/deactivate) | Step 04 | ✅ |
| F13 (리뷰 제출) | Step 04 | ✅ |
| F14 ("general" 태그) | Step 04 | ✅ |
| F15 (볼트 잔고) | Step 05 | ✅ |
| F16 (deposit) | Step 05 | ✅ |
| F17 (withdraw) | Step 05 | ✅ |
| F18 (권한 부여 프리셋+커스텀) | Step 05 | ✅ |
| F19 (권한 목록) | Step 05 | ✅ |
| F20 (권한 취소) | Step 05 | ✅ |
| N1 (tsc) | Step 06 | ✅ |
| N2 (lint) | Step 06 | ✅ |
| N3 (build) | Step 06 | ✅ |
| N4 (DDD 레이어) | Step 06 | ✅ |
| N5 (비연결 READ 가능) | Step 03, 04, 05 | ✅ |
| N6 (로딩 Skeleton) | Step 03, 06 | ✅ |
| E1 (0개 empty state) | Step 03 | ✅ |
| E2 (없는 ID) | Step 03 | ✅ |
| E3 (잔고 0 withdraw) | Step 05 | ✅ |
| E4 (approve 없이 deposit) | Step 05 | ✅ |
| E5 (비소유자 토글) | Step 04 | ✅ |
| E6 (revoked 재revoke) | Step 05 | ✅ |
| E7 (과거 expiry) | Step 05 | ✅ |

### 설계 결정 → 티켓

| 설계 결정 | 관련 티켓 | 커버 |
|----------|----------|:---:|
| JSON ABI 포맷 | Step 01 | ✅ |
| 주소 통합 (ERC8004.agentVault) | Step 01 | ✅ |
| 멀티 라우트 4개 | Step 03, 04, 05 | ✅ |
| totalAgents 클라이언트 스캔 | Step 02 (useAgentList) | ✅ |
| 3개 레지스트리 multicall | Step 02 (useAgentProfile) | ✅ |
| PermissionGranted 로그 기반 | Step 05 (useVaultPermission) | ✅ |
| AgentRegistered 이벤트 파싱 | Step 04 (useRegisterAgent) | ✅ |
| "general" 단일 태그 | Step 04 (useSubmitReview) | ✅ |
| 프리셋 + 고급 커스텀 권한 UI | Step 05 (PermissionForm) | ✅ |
| VaultActionDialog 패턴 재사용 | Step 05 (VaultDepositDialog) | ✅ |
| DDD 4계층 준수 | Step 06 (검증) | ✅ |

## Step 상세
- [Step 01: ABI + 주소 + 타입 기반 인프라](step-01-abi-infra.md)
- [Step 02: READ 훅 구현](step-02-read-hooks.md)
- [Step 03: 마켓플레이스 UI](step-03-marketplace-ui.md)
- [Step 04: WRITE 훅 + 등록/리뷰/활성화](step-04-write-hooks.md)
- [Step 05: 볼트 + 권한 관리](step-05-vault-permission.md)
- [Step 06: 통합 마무리](step-06-integration.md)
