# 설계 - v0.7.0 Swap 가격 차트

## 변경 규모
**규모**: 일반 기능
**근거**: 신규 파일 3개 생성 + 기존 파일 1개 수정, 신규 UI 기능 추가

---

## 문제 요약
/swap 페이지에 토큰 쌍 가격 차트가 없어 사용자가 가격 추이를 확인할 수 없음. 1컬럼 스왑 전용 레이아웃을 2컬럼(차트+스왑)으로 변경하여 트레이딩 경험을 개선한다.

> 상세: [README.md](README.md) 참조

## 접근법
- swap/page.tsx의 레이아웃을 CSS Grid 2컬럼으로 변경
- Recharts AreaChart 기반 PriceChart 컴포넌트를 trade 도메인에 신규 생성
- mock 데이터로 ~1개월 가격 히스토리 표시
- 토큰 쌍 변경 시 차트가 즉시 반응

## 대안 검토

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: 직접 AreaChart (Analytics 패턴) | 검증된 패턴, 낮은 복잡도, 코드베이스 일관성 | trade 도메인 한정 재사용 | ✅ |
| B: ChartContainer 래퍼 (chart.tsx) | shadcn/ui 공식 패턴 | 현재 프로젝트에서 미사용, 간접성 증가 | ❌ |
| C: 범용 shared 컴포넌트 | 높은 재사용성 | 재사용처 불확실, 과잉 추상화 (YAGNI) | ❌ |

**선택 이유**: Analytics 페이지에서 동일한 Recharts 직접 사용 패턴이 검증됨. ChartContainer는 프로젝트 내 실제 사용처가 없어 강제 도입 시 혼란. 추후 pool 상세 등에서 필요하면 그때 shared로 승격.

## 기술 결정

### 레이아웃: CSS Grid 12칼럼, 7:5 비율

```tsx
<div className="max-w-5xl mx-auto px-4 py-8 lg:py-12">
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
    <div className="lg:col-span-7">  {/* 차트 */}</div>
    <div className="lg:col-span-5">  {/* 스왑 카드 */}</div>
  </div>
</div>
```

- Grid: 프로젝트 전체 표준 (yield, earn, agent, dashboard 4곳에서 사용)
- 7:5 비율: 차트가 스왑보다 넓어야 함 (Hybra 참조: 646px vs 538px)
- max-w-5xl (1024px): 기존 480px에서 확장, 적절한 밀도 유지
- 모바일: grid-cols-1 → 차트 위, 스왑 아래로 스택

### 컴포넌트 위치: `domains/trade/components/PriceChart.tsx`

- 스왑의 tokenIn/tokenOut 상태에 직접 반응 → trade 도메인에 귀속
- Props: `{ tokenIn: Address; tokenOut: Address }`

### Mock 데이터: `domains/trade/data/mockPriceData.ts`

```typescript
type PriceDataPoint = {
  date: string;    // "Feb 04" 형식
  price: number;   // tokenOut 기준 가격
};

type PairKey = `${Address}-${Address}`;

// 주소를 정렬하여 방향 무관 키 생성
function getPairKey(a: Address, b: Address): PairKey;

// 역방향 조회 시 1/price 변환
function getPriceData(tokenIn: Address, tokenOut: Address): PriceDataPoint[];
```

- 4개 토큰 → 6개 쌍 (4C2), 각 30개 데이터 포인트 (일별)
- 정렬 키로 방향 무관 조회, 역방향 시 price 역수 변환

### 차트 UI

- Analytics 패턴 동일: linearGradient (#60a5fa) + Area fill + monotone curve
- 높이: h-[300px], Card 컨테이너 (bg-bg-card)
- 차트 헤더: 토큰 쌍 이름 + 현재가 + 변동률
- Tooltip: 다크 스타일 (bg #1C1D30, border #1F2037)
- 동일 토큰 선택 시 "Select a different pair" placeholder

### 토큰 변경 반응

- PriceChart는 tokenIn/tokenOut을 props로 수신
- 내부 useMemo로 해당 쌍의 mock 데이터 조회
- TokenSelector 변경/flip 시 React re-render로 즉시 갱신

---

## 범위 / 비범위

**범위 (In Scope)**:
- swap/page.tsx 레이아웃 변경 (1컬럼 → 2컬럼 Grid)
- PriceChart 컴포넌트 신규 생성
- Mock 가격 데이터 생성
- 반응형 레이아웃 (모바일 스택 / 데스크탑 좌우)

**비범위 (Out of Scope)**:
- 실제 가격 데이터 연동
- 타임프레임 선택 UI
- 캔들스틱/OHLC 차트
- 차트 인터랙션 (줌, 드래그)

## 아키텍처 개요

```
swap/page.tsx (레이아웃 변경)
├── PriceChart (신규)
│   ├── domains/trade/components/PriceChart.tsx
│   └── domains/trade/data/mockPriceData.ts
└── 기존 스왑 카드 (변경 없음)
    ├── TokenSelector
    ├── useSwap hook
    └── useTokenBalance hook
```

## 파일 변경 목록

| 파일 | 작업 | 설명 |
|------|------|------|
| `domains/trade/components/PriceChart.tsx` | 신규 | Recharts AreaChart 기반 가격 차트 컴포넌트 |
| `domains/trade/data/mockPriceData.ts` | 신규 | 토큰 쌍별 mock 가격 데이터 + 조회 유틸 |
| `app/(trade)/swap/page.tsx` | 수정 | 레이아웃을 2컬럼 Grid로 변경, PriceChart 추가 |

## 테스트 전략

시각적 UI 컴포넌트이므로 수동 확인 체크리스트로 검증:
- [ ] 데스크탑 (1024px+): 좌측 차트, 우측 스왑 카드 정상 배치
- [ ] 모바일 (<1024px): 차트 위, 스왑 아래 스택
- [ ] 토큰 변경 시 차트 즉시 갱신
- [ ] flip 버튼 클릭 시 차트 반전 (역방향 가격)
- [ ] 동일 토큰 선택 시 placeholder 표시
- [ ] 차트 hover 시 tooltip 표시
- [ ] 차트 헤더에 토큰 쌍 이름 + 현재가 표시

## 리스크/오픈 이슈

- **max-w-5xl 적합성**: 기존 전체 페이지 레이아웃과의 조화. 다른 페이지들이 max-w-6xl을 사용하므로 시각적 차이 확인 필요.
- **mock 데이터 품질**: 현실감 있는 가격 변동 패턴 필요 (단순 랜덤 X, 트렌드+노이즈).
