# Step 01: InterestRateSlider + PositionSummary 공유 컴포넌트 추출

## 메타데이터
- **난이도**: 🟢 쉬움
- **롤백 가능**: ✅ (순수 리팩터링, 동작 변경 없음)
- **선행 조건**: 없음

---

## 1. 구현 내용 (design.md 기반)
- page.tsx의 InterestRateSlider 함수(lines 35-92)를 별도 파일로 추출
- page.tsx의 Open Trove 다이얼로그 내 Position Summary JSX(lines 418-456)를 별도 컴포넌트로 추출
- page.tsx에서 추출된 컴포넌트를 import하여 동일하게 사용

## 2. 완료 조건
- [ ] `domains/defi/liquity/components/InterestRateSlider.tsx` 파일 존재
- [ ] `domains/defi/liquity/components/PositionSummary.tsx` 파일 존재
- [ ] page.tsx에서 InterestRateSlider는 추출된 컴포넌트를 import
- [ ] page.tsx에서 PositionSummary는 추출된 컴포넌트를 import
- [ ] Open Trove 다이얼로그가 추출 전과 동일하게 동작 (tsc 통과)

## 3. 롤백 방법
- 롤백 절차: 추출된 파일 2개 삭제, page.tsx에서 인라인 코드 복원
- 영향 범위: Open Trove 다이얼로그만 (동작 변경 없으므로 리스크 없음)

---

## Scope

### 수정 대상 파일
```
apps/web/src/app/(defi)/liquity/borrow/page.tsx  # InterestRateSlider 함수 제거 + PositionSummary JSX를 컴포넌트 호출로 교체
```

### 신규 생성 파일
```
apps/web/src/domains/defi/liquity/components/InterestRateSlider.tsx  # 추출
apps/web/src/domains/defi/liquity/components/PositionSummary.tsx     # 추출
```

### 참고할 기존 패턴
- `domains/trade/components/DepositPanel.tsx`: 도메인 내 컴포넌트 분리 패턴

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| page.tsx | InterestRateSlider 제거 + PositionSummary 교체 | ✅ OK |
| InterestRateSlider.tsx | 추출 대상 | ✅ OK |
| PositionSummary.tsx | 추출 대상 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| InterestRateSlider 추출 | ✅ | OK |
| PositionSummary 추출 | ✅ | OK |
| page.tsx import 변경 | ✅ | OK |

### 검증 통과: ✅

---

→ 다음: [Step 02: TxStepType 확장 + adjustTrove approve 분리](step-02-hook-refactor.md)
