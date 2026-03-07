# Step 03: Wizard + Delegate 페이지 (branch 지원)

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: ✅
- **선행 조건**: Step 01 (ABI), Step 02 (hooks)

---

## 1. 구현 내용 (design.md 기반)
- `DelegationSetupWizard`에 `branch?: "wCTC" | "lstCTC"` prop 추가
- `LIQUITY_PERMISSION.targets`를 `LIQUITY.branches[branch].borrowerOperations`로 동적 변환
- `useTroveDelegate("wCTC")` 하드코딩을 `useTroveDelegate(branch)` 동적 호출로 변경
- lstCTC 선택 시 token cap을 lstCTC 토큰으로 변경
- Delegate 페이지에서 URL searchParams(scenario, troveId, branch) 읽어서 상태 초기화
- Delegate 페이지의 `useTroveDelegate("wCTC")` 하드코딩 제거

## 2. 완료 조건
- [ ] DelegationSetupWizard가 `branch` prop을 받음 (기본값 "wCTC")
- [ ] wCTC branch 시 wCTC BorrowerOps 주소로 permission 설정
- [ ] lstCTC branch 시 lstCTC BorrowerOps 주소로 permission 설정
- [ ] Delegate 페이지가 `?scenario=liquity&troveId=X&branch=lstCTC` query param을 읽어서 위저드에 전달
- [ ] Delegate 페이지의 DelegationStatus가 branch에 맞는 BorrowerOps로 상태 확인
- [ ] query param과 props에서 `branch` string 사용 (`branchIndex` 아님 — N7)
- [ ] `npx tsc --noEmit` (apps/web) 통과

## 3. 롤백 방법
- `branch` prop 제거, 하드코딩 복원

---

## Scope

### 수정 대상 파일
```
apps/web/src/domains/agent/components/DelegationSetupWizard.tsx   # branch prop, 동적 BorrowerOps/token cap
apps/web/src/app/(more)/agent/delegate/[id]/page.tsx              # query param 읽기, branch 전달
```

### 신규 생성 파일
없음

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| LIQUITY.branches | 직접 사용 | wCTC/lstCTC BorrowerOps 주소 참조 |
| useTroveDelegate | 파라미터 변경 | "wCTC" → branch 동적 |
| TOKENS | 직접 사용 | lstCTC branch 시 token cap 변경 |

### Side Effect 위험
- 기존 wCTC 위임 플로우가 branch 기본값("wCTC")으로 동작 유지 확인 필요

### 참고할 기존 패턴
- `DelegationSetupWizard.tsx:37`: 기존 LIQUITY_PERMISSION 하드코딩
- `page.tsx:38`: 기존 useTroveDelegate("wCTC") 하드코딩

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| DelegationSetupWizard.tsx | branch prop + 동적 주소 | ✅ OK |
| delegate/[id]/page.tsx | query param + branch 전달 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| wizard branch prop | ✅ DelegationSetupWizard.tsx | OK |
| delegate page query params | ✅ page.tsx | OK |
| DelegationStatus branch-aware | ✅ page.tsx (DelegationStatus는 page에서 branch를 prop으로 받음) | OK |

### 검증 통과: ✅

---

→ 다음: [Step 04: Borrow 페이지 UI](step-04-borrow-page.md)
