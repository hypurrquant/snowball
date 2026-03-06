# Step 02: PriceChart 컴포넌트

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅ (파일 삭제)
- **선행 조건**: Step 01 (mock 데이터)

---

## 1. 구현 내용 (design.md 기반)
- `domains/trade/components/PriceChart.tsx` 신규 생성
- Props: `{ tokenIn: Address; tokenOut: Address }`
- Recharts AreaChart: ResponsiveContainer + linearGradient (#60a5fa) + Area (monotone)
- 차트 헤더: 토큰 쌍 이름 (TOKEN_INFO 조회) + 현재가 (마지막 데이터 포인트) + 변동률 (첫/끝 비교)
- XAxis (날짜), YAxis (가격), Tooltip (다크 스타일)
- tokenIn === tokenOut 시 "Select a different pair" placeholder
- 데이터 없을 때 "No data available" placeholder
- 높이: h-[300px], Card 컨테이너

## 2. 완료 조건
- [ ] `domains/trade/components/PriceChart.tsx` 파일 존재
- [ ] `<PriceChart tokenIn={TOKENS.wCTC} tokenOut={TOKENS.sbUSD} />` 렌더 시 AreaChart 표시
- [ ] 차트 헤더에 "wCTC / sbUSD" 텍스트, 현재가, 변동률(% 포맷) 표시
- [ ] hover 시 해당 날짜의 가격이 tooltip으로 표시
- [ ] tokenIn === tokenOut 시 "Select a different pair" 텍스트 표시
- [ ] XAxis에 날짜 라벨, YAxis에 가격 라벨 표시
- [ ] Ice Blue 그래디언트 fill + stroke 적용
- [ ] TypeScript 에러 없음

## 3. 롤백 방법
- `domains/trade/components/PriceChart.tsx` 삭제
- 영향 범위: 없음 (아직 page.tsx에서 미참조)

---

## Scope

### 신규 생성 파일
```
apps/web/src/domains/trade/components/PriceChart.tsx  # 신규 - Recharts AreaChart 컴포넌트
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| domains/trade/data/mockPriceData.ts | 읽기 참조 | getPriceData import |
| core/config/addresses.ts | 읽기 참조 | TOKEN_INFO import |
| recharts | 라이브러리 | AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer |
| shared/components/ui/card.tsx | UI 참조 | Card, CardHeader, CardContent |

### Side Effect 위험
- 없음 (신규 파일, 기존 코드 미접촉)

### 참고할 기존 패턴
- `app/(more)/analytics/page.tsx`: AreaChart + linearGradient + Tooltip 스타일 (직접 복사 가능)

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| PriceChart.tsx | 차트 컴포넌트 전체 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| AreaChart + gradient | PriceChart.tsx 내 | ✅ OK |
| 차트 헤더 (쌍 이름, 현재가, 변동률) | PriceChart.tsx 내 | ✅ OK |
| placeholder (동일 토큰, 데이터 없음) | PriceChart.tsx 내 | ✅ OK |

### 검증 통과: ✅

---

→ 다음: [Step 03: Swap 페이지 레이아웃 변경](step-03-layout.md)
