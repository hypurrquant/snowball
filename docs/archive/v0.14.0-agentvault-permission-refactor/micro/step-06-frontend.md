# Step 06: 프론트엔드 수정

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: ✅
- **선행 조건**: Step 03

---

## 1. 구현 내용 (design.md 기반)
- types/index.ts: Permission 타입 → ExecutionPermission + TokenAllowance 교체
- hooks/useVaultPermission.ts: grantPermission에 tokenCaps 파라미터, getPermission에 tokens 파라미터
- components/PermissionForm.tsx: preset 모드에 토큰별 cap 입력 UI, custom 모드에서 tokenCaps=[]
- components/PermissionList.tsx: 토큰별 cap/spent 목록 표시
- components/DelegationSetupWizard.tsx: grantPermission 호출부 tokenCaps 추가
- components/DelegationStatus.tsx: Permission 타입 참조 변경

## 2. 완료 조건
- [ ] F22: useVaultPermission.ts grantPermission/getPermission 파라미터 변경
- [ ] F23: PermissionForm.tsx preset에 토큰 cap UI, custom에서 tokenCaps=[]
- [ ] F24: PermissionList.tsx 토큰별 cap/spent 표시
- [ ] N2 (부분): web tsc --noEmit 통과

## 3. 롤백 방법
- git restore로 파일 복원

---

## Scope

### 수정 대상 파일
```
apps/web/src/domains/agent/
├── types/index.ts                    # 수정 - Permission 타입 교체
├── hooks/useVaultPermission.ts       # 수정 - 파라미터 변경
└── components/
    ├── PermissionForm.tsx            # 수정 - 토큰 cap UI
    ├── PermissionList.tsx            # 수정 - 토큰별 표시
    ├── DelegationSetupWizard.tsx     # 수정 - grantPermission 호출
    └── DelegationStatus.tsx          # 수정 - 타입 참조
```

### Side Effect 위험
- PermissionForm의 custom cap 입력 제거 시 기존 사용자 혼란 → 비범위 (테스트넷)

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 포함 근거 | 판정 |
|-----------|----------|------|
| types/index.ts | F22 — Permission 타입 교체 | ✅ OK |
| hooks/useVaultPermission.ts | F22 — grantPermission/getPermission 파라미터 변경 | ✅ OK |
| components/PermissionForm.tsx | F23 — 토큰 cap UI, custom 모드 처리 | ✅ OK |
| components/PermissionList.tsx | F24 — 토큰별 cap/spent 표시 | ✅ OK |
| components/DelegationSetupWizard.tsx | F22 — grantPermission 호출부 변경 | ✅ OK |
| components/DelegationStatus.tsx | F22 — Permission 타입 참조 변경 | ✅ OK |

### False Negative (누락)
| 후보 파일 | 제외 근거 | 판정 |
|----------|----------|------|
| hooks/useVaultActions.ts | agentVault 참조하지만 deposit/withdraw만 — Permission 무관 | ✅ 제외 OK |
| hooks/useVaultBalance.ts | getBalance만 호출 — 시그니처 미변경 | ✅ 제외 OK |
| hooks/useActivityLog.ts | agentVault 주소 참조만 — Permission 타입 미사용 | ✅ 제외 OK |
| components/VaultDepositDialog.tsx | deposit UI — Permission 무관 | ✅ 제외 OK |
| app/(more)/agent/delegate/[id]/page.tsx | agentVault 참조하지만 컴포넌트 조합만 — 타입 직접 사용 없음 | ✅ 제외 OK |

### 검증 통과: ✅

---

→ 다음: [Step 07: 통합 검증](step-07-verification.md)
