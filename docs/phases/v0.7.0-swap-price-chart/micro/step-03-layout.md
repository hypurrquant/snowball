# Step 03: Swap 페이지 레이아웃 변경

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅ (git revert)
- **선행 조건**: Step 01, Step 02

---

## 1. 구현 내용 (design.md 기반)
- `app/(trade)/swap/page.tsx` 레이아웃 변경
- 기존: `flex justify-center` + `max-w-[480px]` 1컬럼 중앙 정렬
- 변경: `max-w-5xl mx-auto` + `grid grid-cols-1 lg:grid-cols-12 gap-6`
- 좌측 `lg:col-span-7`: PriceChart 컴포넌트
- 우측 `lg:col-span-5`: 기존 스왑 카드 (max-w 제거)
- 모바일: grid-cols-1 → 차트 위, 스왑 아래
- PriceChart에 tokenIn, tokenOut props 전달

## 2. 완료 조건
- [ ] 데스크탑(1024px+)에서 /swap 접속 시 좌측 차트 + 우측 스왑 2컬럼 배치
- [ ] 모바일(<1024px)에서 /swap 접속 시 차트 위 + 스왑 아래 세로 스택
- [ ] TokenSelector에서 토큰 변경 시 차트가 즉시 갱신
- [ ] flip 버튼 클릭 시 차트가 역방향 가격으로 갱신
- [ ] 기존 스왑 기능(토큰 선택, 금액 입력, approve, swap 버튼)이 정상 동작
- [ ] 브라우저 리사이즈 시 차트가 새 크기에 맞게 리사이즈
- [ ] TypeScript 에러 없음
- [ ] 빌드 성공 (`npm run build`)

## 3. 롤백 방법
- `git checkout -- apps/web/src/app/(trade)/swap/page.tsx`
- 영향 범위: swap 페이지 레이아웃만 원복

---

## Scope

### 수정 대상 파일
```
apps/web/src/app/(trade)/swap/page.tsx  # 수정 - 레이아웃 Grid 변경 + PriceChart import/배치
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| domains/trade/components/PriceChart.tsx | 새 import | 차트 컴포넌트 추가 |
| 기존 swap 로직 (useSwap, TokenSelector 등) | 변경 없음 | 레이아웃 래퍼만 변경 |

### Side Effect 위험
- **max-w 변경**: 기존 `max-w-[480px]` → 전체 레이아웃 `max-w-5xl`로 변경. 스왑 카드 자체 너비가 달라질 수 있음 → 스왑 카드에 `max-w-[480px]` 유지 필요.

### 참고할 기존 패턴
- `app/(more)/analytics/page.tsx`: `grid grid-cols-1 lg:grid-cols-3` 2컬럼 레이아웃

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| swap/page.tsx | 레이아웃 변경 + PriceChart 연동 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| Grid 레이아웃 변경 | page.tsx 수정 | ✅ OK |
| PriceChart import/배치 | page.tsx 수정 | ✅ OK |
| 스왑 카드 max-w 유지 | page.tsx 수정 | ✅ OK |

### 검증 통과: ✅
