# Step 02: Hooks 확장 (useTroveDelegate + useTroveDelegationStatus)

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅
- **선행 조건**: Step 01 (ABI 필요)

---

## 1. 구현 내용 (design.md 기반)
- `useTroveDelegate.ts`에 `removeInterestIndividualDelegate` 함수 추가
- `useTroveDelegate.ts`에 `fullUndelegate(troveId, receiver)` convenience 함수 추가 (setRemoveManagerWithReceiver + removeInterestIndividualDelegate 순차)
- `useTroveDelegationStatus.ts` 신규 생성 — multicall 배치 위임 상태 조회 훅

## 2. 완료 조건
- [ ] `useTroveDelegate`가 `removeInterestIndividualDelegate(troveId)` 함수를 반환
- [ ] `useTroveDelegate`가 `fullUndelegate(troveId, receiver)` 함수를 반환
- [ ] `fullUndelegate`가 setRemoveManagerWithReceiver → removeInterestIndividualDelegate 순서로 호출
- [ ] `useTroveDelegationStatus(branch, troveIds)`가 `delegationMap` + `isLoading` 반환
- [ ] `delegationMap`에서 각 troveId별 `isAddManager`, `isInterestDelegate`, `isDelegated` 확인 가능
- [ ] refetchInterval 30_000ms 이상 설정됨
- [ ] `useTroveDelegationStatus`는 `domains/defi/liquity/hooks/` 내부에 위치 (DDD 계층 준수 — N5)
- [ ] hook 파라미터에 `branch: "wCTC" | "lstCTC"` string 사용 (`branchIndex` 아님 — N7)
- [ ] 부분 위임 상태(addManager만 설정)에서 `isDelegated = false` 반환 (E3)
- [ ] `fullUndelegate`에서 두 번째 tx 실패 시 에러를 throw하고, 첫 번째 tx 성공에 의한 partial state는 상위 UI가 판별 가능 (E4)
- [ ] `npx tsc --noEmit` (apps/web) 통과

## 3. 롤백 방법
- 추가한 함수 삭제 + 신규 파일 삭제

---

## Scope

### 수정 대상 파일
```
apps/web/src/domains/defi/liquity/hooks/useTroveDelegate.ts   # removeInterestIndividualDelegate + fullUndelegate 추가
```

### 신규 생성 파일
```
apps/web/src/domains/defi/liquity/hooks/useTroveDelegationStatus.ts   # 배치 위임 상태 조회 훅
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| InterestDelegateABI | 직접 사용 | removeInterestIndividualDelegate ABI (Step 01) |
| AddRemoveManagersABI | 기존 사용 | setRemoveManagerWithReceiver (변경 없음) |
| ERC8004.agentVault | 직접 사용 | 위임 상태에서 AgentVault 주소 비교 |

### Side Effect 위험
- `useTroveDelegationStatus`의 multicall이 RPC 부하를 줄 수 있으나, 30초 refetch로 완화

### 참고할 기존 패턴
- `useTroveDelegate.ts`: 기존 hook 구조 (writeContractAsync 패턴)
- `useReadContracts` (wagmi): 배치 multicall 패턴

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| useTroveDelegate.ts | fullUndelegate 추가 | ✅ OK |
| useTroveDelegationStatus.ts | 신규 훅 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| removeInterestIndividualDelegate 함수 | ✅ useTroveDelegate.ts | OK |
| fullUndelegate 함수 | ✅ useTroveDelegate.ts | OK |
| 배치 위임 상태 조회 | ✅ useTroveDelegationStatus.ts | OK |

### 검증 통과: ✅

---

→ 다음: [Step 03: Wizard + Delegate 페이지](step-03-wizard-delegate.md)
