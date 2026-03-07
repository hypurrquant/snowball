# 작업 티켓 - v0.23.0

## 전체 현황

| # | Step | 난이도 | 롤백 | Scope | FP/FN | 개발 | 완료일 |
|---|------|--------|------|-------|-------|------|--------|
| 01 | Core 인프라 (defaultAgentId + ABI) | 🟢 | ✅ | ✅ | ✅ | ⏳ | - |
| 02 | Hooks 확장 (useTroveDelegate + useTroveDelegationStatus) | 🟡 | ✅ | ✅ | ✅ | ⏳ | - |
| 03 | Wizard + Delegate 페이지 (branch 지원) | 🟠 | ✅ | ✅ | ✅ | ⏳ | - |
| 04 | Borrow 페이지 UI (위임 버튼 + 상태 뱃지 + 해제) | 🟠 | ✅ | ✅ | ✅ | ⏳ | - |
| 05 | Runtime lstCTC 확장 (config + capabilities + observers) | 🟠 | ✅ | ✅ | ✅ | ⏳ | - |
| 06 | lstCTC Manifest + Scheduler 양 브랜치 스캔 | 🟡 | ✅ | ✅ | ✅ | ⏳ | - |

## 의존성

```
01 (Core) ──→ 02 (Hooks) ──→ 03 (Wizard) ──→ 04 (Borrow Page)
    │
    └──→ 05 (Runtime) ──→ 06 (Manifest+Scheduler)
```

FE 트랙 (01→02→03→04)과 Runtime 트랙 (01→05→06)은 독립 병렬 가능.

## 커버리지 매트릭스

### PRD 목표 → 티켓

| PRD 목표 | 관련 티켓 | 커버 |
|----------|----------|------|
| 1. Trove 카드 "Agent 위임" 버튼 + 라우팅 | Step 04 | ✅ |
| 1-1. defaultAgentId 상수 | Step 01 | ✅ |
| 2. 위임 상태 뱃지 표시 | Step 02 (hook), Step 04 (UI) | ✅ |
| 3. 양 브랜치 풀스택 (FE wizard) | Step 03 | ✅ |
| 3. 양 브랜치 풀스택 (FE borrow page) | Step 04 | ✅ |
| 3. 양 브랜치 풀스택 (Runtime config) | Step 05 | ✅ |
| 3. 양 브랜치 풀스택 (Runtime snapshot) | Step 05 | ✅ |
| 3. 양 브랜치 풀스택 (Runtime capability) | Step 05 | ✅ |
| 3. 양 브랜치 풀스택 (Manifest + Scheduler) | Step 06 | ✅ |
| 4. 완전한 undelegation | Step 01 (ABI), Step 02 (hook), Step 04 (UI) | ✅ |

### DoD → 티켓

| DoD 항목 | 관련 티켓 | 커버 |
|----------|----------|------|
| F1: Trove 카드 Delegate 버튼 | Step 04 | ✅ |
| F2: Delegate 클릭 → URL 라우팅 | Step 04 | ✅ |
| F3: Delegate 페이지 query param pre-fill | Step 03 | ✅ |
| F4: Wizard branch-aware BorrowerOps | Step 03 | ✅ |
| F5: 위임 후 뱃지 표시 | Step 02, Step 04 | ✅ |
| F6: 뱃지 = addManager + interestDelegate | Step 02 | ✅ |
| F7: Undelegate 버튼 + 확인 다이얼로그 | Step 04 | ✅ |
| F8: 완전한 undelegation 실행 | Step 01 (ABI), Step 02 (hook), Step 04 (UI) | ✅ |
| F9: defaultAgentId 상수 | Step 01 | ✅ |
| F10: removeInterestIndividualDelegate ABI | Step 01 | ✅ |
| F11: liquityBranches config 마이그레이션 | Step 05 | ✅ |
| F12: lstCTC manifest + scheduler | Step 06 | ✅ |
| F13: buildSnapshot branch-aware | Step 05 | ✅ |
| F14: capability branch config | Step 05 | ✅ |
| N1: apps/web tsc | Step 01~04 각각 확인 | ✅ |
| N3: agent-runtime tsc | Step 05 | ✅ |
| N4: agent-server tsc | Step 06 | ✅ |
| N2: apps/web build | Step 04 (최종 FE step) | ✅ |
| N5: DDD 계층 규칙 | Step 02, Step 04 | ✅ |
| N6: refetchInterval 30s | Step 02 | ✅ |
| N7: branch string 통일 | Step 02~04 | ✅ |
| E1: Trove 없는 사용자 | Step 04 | ✅ |
| E2: 이미 위임된 Trove | Step 04 | ✅ |
| E3: 부분 위임 상태 | Step 02 (hook 판정), Step 04 (UI 반영) | ✅ |
| E4: Undelegate 부분 실패 | Step 02 (에러 처리), Step 04 (UI 반영) | ✅ |
| E5: 지갑 미연결 | Step 04 | ✅ |

### 설계 결정 → 티켓

| 설계 결정 | 관련 티켓 | 커버 |
|----------|----------|------|
| 하이브리드 접근 (Navigation + Inline) | Step 03 (Navigation), Step 04 (Inline) | ✅ |
| defaultAgentId in packages/core | Step 01 | ✅ |
| removeInterestIndividualDelegate ABI | Step 01 | ✅ |
| DelegationSetupWizard branch prop | Step 03 | ✅ |
| Delegate page query param | Step 03 | ✅ |
| useTroveDelegationStatus hook | Step 02 | ✅ |
| fullUndelegate convenience | Step 02 | ✅ |
| liquityBranches config 마이그레이션 | Step 05 | ✅ |
| Manifest 분리 | Step 06 | ✅ |
| Scheduler 양 브랜치 스캔 | Step 06 | ✅ |
| buildSnapshot branch-aware | Step 05 | ✅ |
| capability branch config | Step 05 | ✅ |
| branch string 통일 | Step 02~04 | ✅ |
| runAgent API 시그니처 유지 | Step 06 | ✅ |

## Step 상세
- [Step 01: Core 인프라](step-01-core-infra.md)
- [Step 02: Hooks 확장](step-02-hooks.md)
- [Step 03: Wizard + Delegate 페이지](step-03-wizard-delegate.md)
- [Step 04: Borrow 페이지 UI](step-04-borrow-page.md)
- [Step 05: Runtime lstCTC 확장](step-05-runtime-lstctc.md)
- [Step 06: Manifest + Scheduler](step-06-manifest-scheduler.md)
