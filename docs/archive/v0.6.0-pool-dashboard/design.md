# 설계 - v0.6.0

## 변경 규모
**규모**: 일반 기능
**근거**: 2개+ 파일 수정/추가 (훅 2개 신규 + 페이지 수정), 내부 데이터 인터페이스 설계 포함

---

## 문제 요약
`/pool` 페이지에 프로토콜 통계, 트렌딩 풀 하이라이트, 강화된 풀 테이블이 없어 사용자의 투자 판단과 프로토콜 파악이 어려움.

> 상세: [README.md](README.md) 참조

## 접근법
- BE에서 내려주는 것을 가정한 **훅 인터페이스를 먼저 설계**, 내부에서 mock 데이터 리턴
- 페이지는 훅만 소비 → BE 전환 시 **훅 내부만 교체** (페이지 코드 변경 0)
- 기존 `StatCard` 컴포넌트 재사용 (lend/dashboard 동일 패턴)
- Trending은 CSS-only 가로 스크롤 (3개 카드)

## 대안 검토

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: 페이지 상수 mock | 간단, 파일 0개 추가 | BE 전환 시 페이지 코드 전체 수정 필요 | ❌ |
| B: 훅 인터페이스 + mock 리턴 | BE 전환 시 훅 내부만 교체, 페이지 코드 불변, 타입 안전 | 파일 2개 추가 | ✅ |
| C: MSW(Mock Service Worker) | 실제 API 호출 시뮬레이션 | 이 단계에 과도한 인프라 | ❌ |

**선택 이유**: B 방식이 "mock → 실데이터" 전환 비용을 최소화. 훅 시그니처가 BE API 계약서 역할.

## 기술 결정

### 레이아웃 구조 (위→아래)

```
┌─────────────────────────────────────────────────┐
│  Liquidity Pools (h1)              [New Position]│  ← 기존 헤더
├─────────────────────────────────────────────────┤
│  [StatCard]  [StatCard]  [StatCard]  [StatCard] │  ← Protocol Stats
│   TVL         24h Vol     24h Fees    Pools     │
├─────────────────────────────────────────────────┤
│  Trending Pools                                  │  ← 섹션 타이틀
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ wCTC/USDC│ │ wCTC/sb  │ │ lstCTC/  │  →     │  ← 가로 스크롤 카드
│  │ TVL $1.2M│ │ TVL $820K│ │ TVL $280K│        │
│  │ APR 18.4%│ │ APR 12.1%│ │ APR 8.2% │        │
│  │ +5.2% ↑  │ │ +2.1% ↑  │ │ -0.8% ↓  │        │
│  └──────────┘ └──────────┘ └──────────┘        │
├─────────────────────────────────────────────────┤
│  Pool Table (기존 + 2컬럼 추가)                  │
│  Pair | Category | Fee | TVL | Volume | APR | ⊕ │
└─────────────────────────────────────────────────┘
```

### 훅 설계 (핵심)

**위치**: `domains/trade/hooks/` (기존 usePool, useSwap과 동일 레이어)

#### 1. `useProtocolStats`

```typescript
// domains/trade/hooks/useProtocolStats.ts

interface ProtocolStats {
  tvl: string;
  volume24h: string;
  fees24h: string;
  totalPools: number;
  tvlChange24h: number;  // % 변동
}

interface UseProtocolStatsReturn {
  data: ProtocolStats;
  isLoading: boolean;
}

export function useProtocolStats(): UseProtocolStatsReturn {
  // TODO: BE API 연동 시 useSWR/useQuery로 교체
  return {
    data: {
      tvl: "$2.45M",
      volume24h: "$384.2K",
      fees24h: "$1,152",
      totalPools: 4,
      tvlChange24h: +2.3,
    },
    isLoading: false,
  };
}
```

#### 2. `usePoolList`

```typescript
// domains/trade/hooks/usePoolList.ts

interface PoolListItem {
  name: string;
  token0: Address;
  token1: Address;
  icon0: string;
  icon1: string;
  category: string;
  tvl: string;
  volume24h: string;
  fees24h: string;
  feesAPR: string;
  change24h: number;     // % 변동
  isTrending: boolean;   // trending 표시 여부
}

interface UsePoolListReturn {
  pools: PoolListItem[];
  trending: PoolListItem[];  // isTrending=true인 풀 필터
  isLoading: boolean;
}

export function usePoolList(): UsePoolListReturn {
  // TODO: BE API 연동 시 교체
  const pools: PoolListItem[] = [
    {
      name: "wCTC / USDC",
      token0: TOKENS.wCTC, token1: TOKENS.USDC,
      icon0: "wCTC", icon1: "USDC",
      category: "Major",
      tvl: "$1.2M", volume24h: "$210.5K", fees24h: "$631",
      feesAPR: "18.4%", change24h: +5.2, isTrending: true,
    },
    // ... 나머지 풀
  ];

  return {
    pools,
    trending: pools.filter(p => p.isTrending),
    isLoading: false,
  };
}
```

**설계 포인트:**
- `isLoading` 필드로 로딩 상태 표현 → 페이지에서 StatCard의 `loading` prop에 바로 연결
- `trending`은 `pools`에서 파생 → 별도 API 없이 필터링
- 포맷팅된 문자열 리턴 (mock) → BE 전환 시 훅 내부에서 `formatUSD()` 처리
- `change24h`만 숫자 (양수/음수로 success/danger 색상 분기)

### 페이지 소비 패턴

```typescript
// pool/page.tsx
export default function PoolPage() {
  const { data: stats, isLoading: statsLoading } = useProtocolStats();
  const { pools, trending, isLoading: poolsLoading } = usePoolList();

  return (
    <>
      {/* Stats — StatCard에 loading prop 전달 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="TVL" value={stats.tvl} loading={statsLoading} ... />
        ...
      </div>

      {/* Trending — trending 배열 순회 */}
      <div className="flex gap-4 overflow-x-auto">
        {trending.map(pool => <TrendingPoolCard key={pool.name} pool={pool} />)}
      </div>

      {/* Table — pools 배열 순회 (기존 usePool 훅 제거) */}
      {pools.map(pool => <PoolRow key={pool.name} pool={pool} />)}
    </>
  );
}
```

**기존 대비 변경:**
- `INITIAL_POOLS` 상수 + `usePool()` 개별 호출 → `usePoolList()` 단일 훅으로 통합
- `PoolRow`가 `usePool` 호출하던 패턴 → props로 데이터 전달 (훅은 페이지 레벨에서 1회)

### 파일 변경 목록

| 파일 | 액션 | 설명 |
|------|------|------|
| `domains/trade/hooks/useProtocolStats.ts` | 신규 | 프로토콜 통계 훅 (mock) |
| `domains/trade/hooks/usePoolList.ts` | 신규 | 풀 목록 + 트렌딩 훅 (mock) |
| `app/(trade)/pool/page.tsx` | 수정 | 3개 섹션 추가, 훅 소비 |

### 컴포넌트 구조

| 컴포넌트 | 타입 | 설명 |
|---------|------|------|
| `StatCard` | 기존 shared | `grid-cols-2 lg:grid-cols-4` 4개 배치 |
| `TrendingPoolCard` | 페이지 인라인 | `min-w-[260px]` 카드, 토큰 아이콘+이름+TVL+APR+변동률 |
| `PoolRow` | 기존 수정 | props로 데이터 받음, 7컬럼 (Volume/APR 추가) |

### 반응형

| 영역 | Mobile | Desktop (lg+) |
|------|--------|---------------|
| Stats | 2x2 그리드 | 1x4 그리드 |
| Trending | 가로 스크롤 | 3카드 모두 표시 |
| Table | Pair + Fee + Deposit만 | 전체 7컬럼 |

## 범위 / 비범위
- **범위(In Scope)**: 훅 2개 신규, 페이지 UI 3섹션, mock 데이터
- **비범위(Out of Scope)**: BE API 구축, 검색/필터/정렬, 페이지네이션

## 아키텍처 개요

```
app/(trade)/pool/page.tsx
  ├── useProtocolStats()  ← domains/trade/hooks/
  ├── usePoolList()       ← domains/trade/hooks/
  └── StatCard            ← shared/components/common/
```

의존 방향: `app → domains → shared` (DDD 규칙 준수)

## 테스트 전략
- 시각 확인: 3개 섹션 렌더링, 반응형 breakpoint
- 기존 Deposit 링크 동작 확인
- 훅 단위 테스트는 mock이라 불필요 (BE 전환 시 추가)

## 리스크/오픈 이슈
- 기존 `PoolRow`에서 `usePool()` 개별 호출하던 패턴 제거 → 온체인 실시간 데이터(fee, liquidity)도 mock으로 대체됨. BE 전환 시 이 데이터도 API에서 가져와야 함.
