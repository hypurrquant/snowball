# Step 05: 볼트 + 권한 관리

## 메타데이터
- **난이도**: 🔴 어려움
- **롤백 가능**: ✅ (파일 삭제)
- **선행 조건**: Step 04 (WRITE 훅)

---

## 1. 구현 내용 (design.md 기반)
- `useVaultActions.ts` — deposit/withdraw WRITE + useTokenApproval 통합
- `useVaultPermission.ts` — grantPermission/revokePermission WRITE + PermissionGranted 로그 기반 목록 READ
- `/agent/vault` 페이지 신규 — 볼트 잔고 + 예치/출금 다이얼로그 + 권한 목록/취소
- `VaultDepositDialog.tsx` — VaultActionDialog 패턴 (Tabs: deposit/withdraw + approve 플로우)
- `PermissionForm.tsx` — 권한 부여 폼 (프리셋 + 고급 커스텀: targets, functions, cap, expiry)
- `PermissionList.tsx` — 부여된 권한 목록 카드 + revoke 버튼
- `/agent/[id]` 페이지에 PermissionForm 통합

## 2. 완료 조건
- [ ] `/agent/vault`에서 4개 토큰 잔고 표시 (DoD F15)
- [ ] approve → deposit tx 성공 + 잔고 증가 (DoD F16, E4)
- [ ] withdraw tx 성공 + 잔고 감소 (DoD F17)
- [ ] 잔고 0일 때 withdraw 불가 (DoD E3)
- [ ] `/agent/[id]`에서 프리셋 또는 커스텀으로 grantPermission tx 성공 (DoD F18)
- [ ] `/agent/vault`에서 권한 목록 표시 (PermissionGranted 로그 기반) (DoD F19)
- [ ] revoke tx 성공 + 목록에서 비활성/제거 (DoD F20, E6)
- [ ] 과거 expiry로 grantPermission 시 에러 표시 (DoD E7)
- [ ] `/agent/vault`는 지갑 미연결 시 "Connect wallet" 안내 (DoD N5)
- [ ] `pnpm --filter @snowball/web exec tsc --noEmit` 에러 없음

## 3. 롤백 방법
- 신규 파일 삭제 + `/agent/[id]/page.tsx` 이전 버전 복원

---

## Scope

### 신규 생성 파일
```
apps/web/src/
├── app/(more)/agent/vault/page.tsx         # 신규 — 볼트 관리 페이지
├── domains/agent/hooks/
│   ├── useVaultActions.ts                  # 신규 — deposit/withdraw WRITE
│   └── useVaultPermission.ts              # 신규 — permission R+W + 로그 조회
└── domains/agent/components/
    ├── VaultDepositDialog.tsx              # 신규 — 예치/출금 다이얼로그
    ├── PermissionForm.tsx                  # 신규 — 권한 부여 폼
    └── PermissionList.tsx                  # 신규 — 권한 목록 + 취소
```

### 수정 대상 파일
```
apps/web/src/app/(more)/agent/[id]/page.tsx # 수정 — PermissionForm 추가
```

### Side Effect 위험
- PermissionGranted 로그 조회 시 fromBlock 설정 필요 (전체 체인 스캔 방지)
- useTokenApproval은 기존 shared/hooks 재사용 — side effect 없음

### 참고할 기존 패턴
- `domains/defi/yield/components/VaultActionDialog.tsx`: Dialog + Tabs + approve → deposit/withdraw
- `shared/hooks/useTokenApproval.ts`: ERC20 approve 플로우

## FP/FN 검증

### 검증 통과: ✅
- 7개 구현 항목 → 6 신규 + 1 수정 파일. 매핑 완전.

---

→ 다음: [Step 06: 통합 마무리](step-06-integration.md)
