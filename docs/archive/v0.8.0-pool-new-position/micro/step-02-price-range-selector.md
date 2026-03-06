# Step 02: PriceRangeSelector 확장 — Custom 프리셋 + 줌 컨트롤

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: ✅
- **선행 조건**: 없음 (Step 01과 독립)

---

## 1. 구현 내용 (design.md 기반)

기존 PriceRangeSelector 컴포넌트에 3가지 기능 추가:

### 1-1. Custom 프리셋 추가
- RANGE_PRESETS에 `{ label: "Custom", percent: 0 }` 추가 (5번째)
- 사용자가 드래그 핸들 이동 또는 PriceInput 직접 입력으로 범위 수정 시 Custom 자동 선택
- 프리셋 카드 클릭으로 기존 4개 프리셋 선택 시 해당 프리셋으로 전환

### 1-2. 줌 컨트롤
- `[+] [-] [↻]` 3개 버튼 추가 (히스토그램 상단 또는 하단)
- `+` 클릭: 뷰포트 마진 축소 (확대 효과 — 양쪽 끝 가격이 중앙으로 좁혀짐)
- `-` 클릭: 뷰포트 마진 확대 (축소 효과 — 양쪽 끝 가격이 넓어짐)
- `↻` 클릭: 기본 마진으로 복원
- 상태: `zoomLevel` (기본 1.0, + → 0.5 → 0.25..., - → 2.0 → 4.0...)

### 1-3. 프리셋 카드 레이아웃 개선
- 각 프리셋 카드에 미니 바 아이콘 (div 기반 하드코딩 5개 바) 추가
- 선택된 카드: ice-blue 하이라이트

## 2. 완료 조건
- [ ] 프리셋 5개 (Narrow/Common/Wide/Full/Custom) 카드 렌더링
- [ ] 드래그 핸들 이동 시 Custom 프리셋 자동 선택 (하이라이트)
- [ ] PriceInput 직접 입력 시 Custom 프리셋 자동 선택
- [ ] 기존 프리셋(Narrow/Common/Wide/Full) 클릭 시 해당 프리셋으로 전환
- [ ] 줌 `+` 클릭 → 히스토그램 양쪽 끝 가격 축 값이 중앙으로 좁혀짐
- [ ] 줌 `-` 클릭 → 히스토그램 양쪽 끝 가격 축 값이 넓어짐
- [ ] 줌 `↻` 클릭 → 초기 상태와 동일
- [ ] 각 프리셋 카드에 미니 바 아이콘 표시
- [ ] 회귀: 히스토그램 80개 바 렌더링 유지 (F5)
- [ ] 회귀: 현재가 수직선 (yellow) 유지 (F6)
- [ ] 회귀: 드래그 핸들 2개 정상 동작 (F7)
- [ ] 회귀: MIN/MAX 가격 입력 ±step 정상 동작 (F8)
- [ ] 회귀: CURRENT PRICE 표시 유지 (F9)
- [ ] `npx tsc --noEmit` 기존 에러 외 신규 에러 0

## 3. 롤백 방법
- `git checkout -- apps/web/src/domains/trade/components/PriceRangeSelector.tsx`
- 영향 범위: PriceRangeSelector.tsx 1개 파일

---

## Scope

### 수정 대상 파일
```
apps/web/src/domains/trade/components/PriceRangeSelector.tsx  # 수정 - Custom 프리셋 + 줌 + 미니 바 아이콘
```

### 신규 생성 파일
없음

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| pool/[pair]/page.tsx | 간접 영향 | PriceRangeSelector 사용처 — props 변경 없으므로 영향 없음 |

### Side Effect 위험
- 기존 4개 프리셋의 동작이 변경되지 않아야 함 (회귀 위험)
- 줌 상태가 드래그 핸들 좌표 계산에 영향 → priceToPx/pxToPrice 함수 수정 필요

### 참고할 기존 패턴
- `PriceRangeSelector.tsx`: 현재 프리셋 버튼 + LiquidityHistogram 내부 priceToPx/pxToPrice

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| PriceRangeSelector.tsx | Custom + 줌 + 미니바 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| Custom 프리셋 | ✅ PriceRangeSelector.tsx | OK |
| 줌 컨트롤 | ✅ PriceRangeSelector.tsx | OK |
| 미니 바 아이콘 | ✅ PriceRangeSelector.tsx | OK |

### 검증 체크리스트
- [x] Scope의 모든 파일이 구현 내용과 연결됨
- [x] 구현 내용의 모든 항목이 Scope에 반영됨
- [x] 불필요한 파일(FP)이 제거됨
- [x] 누락된 파일(FN)이 추가됨

### 검증 통과: ✅

---

→ 다음: [Step 03: useCreatePosition 훅](step-03-use-create-position.md)
