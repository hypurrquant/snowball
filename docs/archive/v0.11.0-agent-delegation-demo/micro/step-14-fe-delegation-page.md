# Step 14: FE 위임 셋업 페이지

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: ✅ (파일/디렉토리 삭제)
- **선행 조건**: Step 10 (ABI), Step 11 (delegation 훅)
- **DoD 매핑**: F31, F32, F36, F40 (FE 셋업 부분), F43 (vault 회수), F44 (FE 셋업 부분)

---

## 1. 구현 내용 (design.md 기반)

- `/agent/delegate/[id]` 라우트 생성
  - `apps/web/src/app/(more)/agent/delegate/[id]/page.tsx` (기존 agent 라우트는 `(more)` 그룹)
- `DelegationSetupWizard.tsx` — 3단계 위저드 컴포넌트
  - **Step 1: VaultDeposit** — vault 잔액 확인 + 예치 (기존 훅 재사용)
  - **Step 2: PermissionGrant** — 시나리오별 별도 grantPermission
    - Morpho: `[Morpho] × [supply, withdraw]`
    - Liquity: `[BorrowerOps] × [adjustRate, addColl]`
  - **Step 3: ProtocolDelegation** — 프로토콜별 위임 설정/해제
    - Morpho: `setAuthorization(AgentVault, true/false)` 토글 (설정 + 해제)
    - Liquity: `setAddManager` + `setInterestIndividualDelegate` (설정)
    - Liquity: `setRemoveManagerWithReceiver` (해제)
- `DelegationStatus.tsx` — 현재 위임 상태 요약
  - 어떤 프로토콜에 무슨 권한이 설정되어 있는지 표시
- **Vault 회수** — 위저드에 vault withdraw 기능 포함 (F43 커버)
  - 기존 `useVaultActions.withdraw()` 재사용
  - 위임 해제 후 vault에서 잔여 토큰 회수 UI 제공

## 2. 완료 조건

- [ ] `/agent/delegate/[id]` 라우트가 존재하고 접근 가능
- [ ] 3단계 위저드 (Vault 예치 → Permission 부여 → Protocol Delegation) 순서대로 동작 (F31)
- [ ] Step 2에서 시나리오별 별도 grantPermission 호출 (F32)
- [ ] Step 3에서 Morpho `setAuthorization(true/false)` 토글 동작 (설정+해제)
- [ ] Step 3에서 Liquity `setAddManager` + `setInterestIndividualDelegate` 호출 가능 (설정)
- [ ] Step 3에서 Liquity `setRemoveManagerWithReceiver` 호출 가능 (해제)
- [ ] `DelegationStatus` 컴포넌트가 현재 위임 상태 표시 (F36)
- [ ] Vault 회수: vault에서 잔여 토큰 withdraw 성공 (F43)
- [ ] Morpho 풀 사이클 FE 셋업: vault 예치 → grantPermission → setAuthorization 성공 (F40 FE 부분)
- [ ] Liquity 시나리오 FE 셋업: setAddManager + setInterestDelegate + vault 예치 + grantPermission 성공 (F44 FE 부분)
- [ ] `tsc --noEmit` 통과

## 3. 롤백 방법
- `apps/web/src/app/(more)/agent/delegate/` 디렉토리 삭제
- 관련 컴포넌트 파일 삭제

---

## Scope

### 신규 생성 파일
```
apps/web/src/app/(more)/agent/delegate/[id]/
└── page.tsx                              # 신규 — 위임 셋업 위저드 페이지

apps/web/src/domains/agent/components/
├── DelegationSetupWizard.tsx             # 신규 — 3단계 위저드 + vault 회수
└── DelegationStatus.tsx                  # 신규 — 위임 상태 요약
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| useTroveDelegate | 직접 import | Step 3 Liquity 위임 |
| useMorphoAuthorization | 직접 import | Step 3 Morpho 위임 |
| useVaultActions | 직접 import | Step 1 Vault 예치 |
| useVaultPermission | 직접 import | Step 2 Permission 부여 |
| useVaultBalance | 직접 import | 잔액 확인 |
| core/config/addresses.ts | 직접 import | AgentVault, Morpho, BorrowerOps 주소 |

### 참고할 기존 패턴
- `apps/web/src/domains/agent/components/PermissionForm.tsx` — 기존 permission 부여 UI
- `apps/web/src/domains/agent/components/VaultDepositDialog.tsx` — vault 예치 UI

### Side Effect 위험
- 기존 PermissionForm.tsx는 Step 15에서 제거 → 이 Step에서는 신규 파일만 생성

## FP/FN 검증

### 검증 체크리스트
- [x] page.tsx — 라우트 접근
- [x] DelegationSetupWizard — F31 (3단계), F32 (시나리오별 permission)
- [x] DelegationStatus — F36
- [x] F40 FE 부분 — Morpho 셋업
- [x] F43 — vault 회수 (잔여 토큰 withdraw)
- [x] F44 FE 부분 — Liquity 셋업
- [x] G3 revoke/unset — setAuthorization(false), setRemoveManagerWithReceiver UI 포함

### 검증 통과: ✅

---

> 다음: [Step 15: FE 에이전트 프로필 업데이트 + UX 흐름](step-15-fe-agent-profile.md)
