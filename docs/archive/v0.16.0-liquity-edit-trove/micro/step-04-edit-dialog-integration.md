# Step 04: EditTroveDialog + page.tsx 통합

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: ✅
- **선행 조건**: Step 01 (공유 컴포넌트), Step 03 (useEditTrove)

---

## 1. 구현 내용 (design.md 기반)
- EditTroveDialog 컴포넌트 생성:
  - useEditTrove 훅 소비
  - InterestRateSlider, PositionSummary 재사용
  - Open Trove와 유사한 레이아웃 (담보 입력, 부채 입력, 이자율 슬라이더, Position Summary)
  - TxPipelineModal 포함
- page.tsx 통합:
  - 기존 Adjust 다이얼로그 (adjustTroveId, adjustCollChange 등) 제거
  - 기존 Rate 다이얼로그 (rateTroveId, newRate) 제거
  - handleAdjustTrove, handleAdjustRate 핸들러 제거
  - Adjust + Rate 버튼 → Edit 버튼 1개로 교체
  - EditTroveDialog 추가

## 2. 완료 조건
- [ ] `domains/defi/liquity/components/EditTroveDialog.tsx` 파일 존재
- [ ] page.tsx에 adjustTroveId, rateTroveId 등 기존 state 없음
- [ ] page.tsx에 handleAdjustTrove, handleAdjustRate 핸들러 없음
- [ ] Trove 카드에 "Edit" 버튼 1개 (Adjust/Rate 버튼 없음)
- [ ] Edit 클릭 시 다이얼로그에 현재 trove 값이 pre-fill
- [ ] InterestRateSlider, PositionSummary가 다이얼로그에 표시
- [ ] 변경 내용에 따라 TxPipelineModal이 동적 스텝으로 표시
- [ ] tsc --noEmit 통과

## 3. 롤백 방법
- 롤백 절차: EditTroveDialog.tsx 삭제, page.tsx에서 기존 Adjust/Rate 다이얼로그 복원
- 영향 범위: Trove 관리 UI

---

## Scope

### 수정 대상 파일
```
apps/web/src/app/(defi)/liquity/borrow/page.tsx  # 기존 다이얼로그 제거 + EditTroveDialog 추가 + state 정리
```

### 신규 생성 파일
```
apps/web/src/domains/defi/liquity/components/EditTroveDialog.tsx  # Edit UI 컴포넌트
```

### Side Effect 위험
- 기존 Adjust/Rate 다이얼로그 제거 시 관련 state/handler를 모두 제거해야 함 (누락 시 dead code)

### 참고할 기존 패턴
- Open Trove 다이얼로그 (page.tsx lines 331-481): 동일한 UI 구조
- `domains/trade/components/DepositPanel.tsx`: 훅 소비 + TxPipelineModal 통합

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| page.tsx | 기존 다이얼로그 제거 + EditTroveDialog 추가 | ✅ OK |
| EditTroveDialog.tsx | 핵심 UI | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| EditTroveDialog 생성 | ✅ | OK |
| 기존 Adjust/Rate 제거 | ✅ page.tsx | OK |
| Edit 버튼 교체 | ✅ page.tsx | OK |
| TxPipelineModal 통합 | ✅ EditTroveDialog 내부 | OK |

### 검증 통과: ✅

---

→ 완료
