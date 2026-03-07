# Step 03: useEditTrove 훅 생성

## 메타데이터
- **난이도**: 🔴 어려움
- **롤백 가능**: ✅ (신규 파일 삭제)
- **선행 조건**: Step 02 (TxStepType 확장, adjustTrove approve 분리)

---

## 1. 구현 내용 (design.md 기반)
- `useEditTrove` 훅 생성: delta 계산 + 파이프라인 오케스트레이션
- 입력: `(branch, trove: TroveData, address)`
- 기존 trove 값으로 state pre-fill (collAmount, debtAmount, ratePercent)
- delta 계산: newColl - existingColl, newDebt - existingDebt, rate 변경 여부
- 파이프라인 동적 구성: Approve(조건부) → Adjust Trove(조건부) → Adjust Rate(조건부)
- handleEditTrove 함수: 스텝 순차 실행 + TxPipelineModal 상태 관리
- validation: MIN_DEBT, MCR, 잔액 부족
- quick-fill: HALF, MAX, SAFE (기존 담보 기반)

## 2. 완료 조건
- [ ] `domains/defi/liquity/hooks/useEditTrove.ts` 파일 존재
- [ ] trove.coll/debt/interestRate로 pre-fill됨
- [ ] hasAnyChange가 변경 없으면 false
- [ ] 담보만 변경 시 파이프라인에 Adjust Trove만 (+ Approve 조건부)
- [ ] 이자율만 변경 시 파이프라인에 Adjust Rate만
- [ ] 담보/부채 + 이자율 변경 시 최대 3스텝
- [ ] preview가 새 절대값 기준으로 CR/Liquidation Price 계산
- [ ] errors 배열에 MIN_DEBT/MCR/잔액 부족 에러 포함
- [ ] tsc --noEmit 통과

## 3. 롤백 방법
- 롤백 절차: useEditTrove.ts 삭제
- 영향 범위: 아직 UI에서 사용하지 않으므로 영향 없음

---

## Scope

### 신규 생성 파일
```
apps/web/src/domains/defi/liquity/hooks/useEditTrove.ts  # 핵심 훅
```

### 의존성 (import)
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| useTroveActions | 사용 | approveCollateral, adjustTrove, adjustInterestRate 호출 |
| usePositionPreview | 사용 | 새 절대값 기준 preview 계산 |
| useLiquityBranch | 사용 | stats (price, mcr, ccr) |
| useTokenBalance | 사용 | 지갑 잔액 |
| useMarketRateStats | 사용 | 평균 이자율 |
| TxStep, TxPhase | 타입 import | 파이프라인 상태 |

### 참고할 기존 패턴
- `domains/trade/hooks/useCreatePosition.ts`: 자기완결형 훅 + 파이프라인 패턴

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| useEditTrove.ts | 핵심 구현 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| delta 계산 로직 | ✅ useEditTrove 내부 | OK |
| 파이프라인 구성 | ✅ useEditTrove 내부 | OK |
| validation | ✅ useEditTrove 내부 | OK |
| pre-fill | ✅ useEditTrove 내부 | OK |
| quick-fill | ✅ useEditTrove 내부 | OK |

### 검증 통과: ✅

---

→ 다음: [Step 04: EditTroveDialog + page.tsx 통합](step-04-edit-dialog-integration.md)
