# Step 11: FE 훅 — Delegation

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅ (파일 삭제)
- **선행 조건**: Step 10 (ABI 보충)
- **DoD 매핑**: F29, F30

---

## 1. 구현 내용 (design.md 기반)

- `apps/web/src/domains/defi/lend/hooks/useMorphoAuthorization.ts`
  - `setAuthorization(authorized: Address, isAuthorized: boolean)` — write
  - `isAuthorized(authorizer: Address, authorized: Address)` — read (useReadContract)
  - wagmi `useWriteContract` + `useWaitForTransactionReceipt` 패턴
- `apps/web/src/domains/defi/borrow/hooks/useTroveDelegate.ts`
  - `setAddManager(troveId, manager)` — write
  - `setRemoveManagerWithReceiver(troveId, manager, receiver)` — write
  - `setInterestIndividualDelegate(troveId, delegate, minRate, maxRate, ...)` — write
  - `getInterestIndividualDelegateOf(troveId)` — read
  - `addManagerOf(troveId)` — read

## 2. 완료 조건

- [ ] `useMorphoAuthorization.ts` 파일 존재, `setAuthorization` + `isAuthorized` 호출 기능
- [ ] `useTroveDelegate.ts` 파일 존재, `setAddManager` + `setRemoveManagerWithReceiver` + `setInterestIndividualDelegate` + 조회 기능
- [ ] 위임 셋업 페이지에서 Morpho authorization tx 전송 확인 (F30)
- [ ] 위임 셋업 페이지에서 Liquity delegation tx 전송 확인 (F29)
- [ ] `tsc --noEmit` 통과

## 3. 롤백 방법
- 2개 파일 삭제

---

## Scope

### 신규 생성 파일
```
apps/web/src/domains/defi/lend/hooks/
└── useMorphoAuthorization.ts     # 신규

apps/web/src/domains/defi/borrow/hooks/
└── useTroveDelegate.ts           # 신규
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| core/abis/lend.ts | 직접 import | Morpho ABI (setAuthorization, isAuthorized) |
| core/abis/liquity.ts | 직접 import | BorrowerOps ABI (setAddManager 등) |
| core/config/addresses.ts | 직접 import | 컨트랙트 주소 |

### 참고할 기존 패턴
- `apps/web/src/domains/agent/hooks/useVaultPermission.ts` — useWriteContract + useWaitForTransactionReceipt
- `apps/web/src/domains/defi/borrow/hooks/useTroveActions.ts` — Liquity write 패턴

## FP/FN 검증

### 검증 체크리스트
- [x] useMorphoAuthorization — F30
- [x] useTroveDelegate — F29
- [x] 두 훅 모두 read + write 기능

### 검증 통과: ✅

---

> 다음: [Step 12: FE 훅 — Agent Run + Activity](step-12-fe-hooks-agent.md)
