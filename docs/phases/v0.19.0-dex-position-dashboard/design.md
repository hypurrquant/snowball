# 설계 - v0.19.0 DEX Position Dashboard

## 변경 규모
**규모**: 일반 기능
**근거**: 신규 hook 1개 + 컴포넌트 3개 + 페이지 1개 + 기존 파일 2개 수정. DB/외부 API 없음, 순수 on-chain read.

---

## 문제 요약
사용자가 LP 포지션을 생성한 뒤, 내 포지션을 한눈에 조회할 수 있는 페이지가 없음. Pool 페이지는 풀 목록(공급 기회) 중심이며, 사용자별 포지션 열거 기능 미구현.

> 상세: [README.md](README.md) 참조

## 접근법
- **Hybrid 방식**: Pool 페이지에 경량 배너("You have N positions [View All]") + 전용 `/pool/positions` 페이지
- NonfungiblePositionManager의 `balanceOf` → `tokenOfOwnerByIndex` → `positions` 순차 호출로 사용자 LP 열거
- Pool의 `slot0().tick`으로 In/Out of Range 판정
- CreditcoinOracle `price()` 기반 USD 가치 계산, 오라클 없는 토큰은 TOKEN_INFO.mockPriceUsd fallback

## 대안 검토

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: `/pool` 페이지 내 인라인 | 네비게이션 비용 0, 새 라우트 불필요 | 페이지 비대화, 딥링크 불가 | - |
| B: 전용 `/pool/positions` 페이지만 | 관심사 분리, 확장 용이 | 발견성(discoverability) 부족 | - |
| C: Hybrid (배너 + 전용 페이지) | 발견성 + 전용 공간 동시 충족, 배너는 balanceOf 1회만 | 구현량 최대 | **선택** |

**선택 이유**: Pool 페이지 방문 시 배너로 즉시 인지 + 상세는 전용 페이지에서 관리. `/pool/add`(생성)와 `/pool/positions`(조회)로 대칭 구조.

## 기술 결정

### Hook: `useUserPositions`
**위치**: `domains/trade/hooks/useUserPositions.ts`

6-phase waterfall fetch:
```
Phase 1: balanceOf(address) → count (최대 20, 인덱스 0~19)
Phase 2: tokenOfOwnerByIndex(address, 0..N-1) → tokenId[]
Phase 3: positions(tokenId) × N → raw position data[]
Phase 4: Factory.getPool(token0, token1, fee) → poolAddress[] (고유 조합만)
Phase 5: Pool.slot0() → currentTick[] (고유 풀만)
Phase 6: Oracle.price() → USD price[] (고유 토큰만, fallback: TOKEN_INFO.mockPriceUsd)
```

반환 타입:
```typescript
interface UserPosition {
  tokenId: bigint;
  token0: Address; token1: Address;
  fee: number;
  tickLower: number; tickUpper: number;
  liquidity: bigint;
  tokensOwed0: bigint; tokensOwed1: bigint;
  // Derived
  isInRange: boolean;
  amount0: number; amount1: number;  // human-readable
  valueUsd: number; feesUsd: number;
  token0Symbol: string; token1Symbol: string;
}

interface UseUserPositionsReturn {
  positions: UserPosition[];
  totalValueUsd: number;
  totalFeesUsd: number;
  positionCount: number;
  isLoading: boolean;
}
```

필터링: `liquidity > 0` (Open 포지션만)

### In/Out of Range 판정
```typescript
const isInRange = tickLower <= currentTick && currentTick < tickUpper;
```

### Underlying Token Amounts 계산
`packages/core/src/dex/calculators.ts`에 `getPositionAmounts()` 추가:
- In range: `amount0 = L * (1/sqrtP - 1/sqrtPu)`, `amount1 = L * (sqrtP - sqrtPl)`
- Below range: amount0만, Above range: amount1만
- 기존 `tickToSqrtPrice()` 활용

### USD 가치 계산

**가격 소스**: CreditcoinOracle `price()` (1e36 스케일) 우선, fallback으로 TOKEN_INFO.mockPriceUsd

오라클 주소: `LEND.oracles.wCTC`, `LEND.oracles.lstCTC`, `LEND.oracles.sbUSD`
- wCTC: 5e36, lstCTC: 5.2e36, sbUSD: 1e36
- USDC: 오라클 없음 → TOKEN_INFO.mockPriceUsd = 1.00

**스케일링 공식**:
```typescript
// Oracle price는 1e36 스케일 → USD로 변환
const oraclePriceUsd = Number(oraclePrice) / 1e36;

// amount는 이미 human-readable (getPositionAmounts에서 decimals 반영 완료)
valueUsd = amount0 * price0Usd + amount1 * price1Usd;
feesUsd = (tokensOwed0 / 10^decimals0) * price0Usd + (tokensOwed1 / 10^decimals1) * price1Usd;
```

**가격 조회 hook 구조**: `useUserPositions` 내부에서 고유 토큰 주소 기준으로 오라클 price() 배치 조회 (useReadContracts). 오라클 없는 토큰은 TOKEN_INFO fallback.

---

## 범위 / 비범위
- **In Scope**: 포지션 조회, 요약 통계, In/Out Range 표시, 미수령 수수료(tokensOwed), Manage 링크
- **Out of Scope**: Collect Fees/Remove/Increase Liquidity 트랜잭션, APR 계산, Closed 포지션

## 아키텍처 개요

```
app/(trade)/pool/positions/page.tsx    ← 페이지
  ├── LPPortfolioSummary               ← StatCard 그리드 (Total Value, Active, Fees)
  └── PositionCard × N                 ← 개별 포지션 카드

app/(trade)/pool/page.tsx              ← 기존 페이지 (수정)
  └── MyPositionsBanner                ← 1줄 배너 (balanceOf만 호출)

domains/trade/hooks/useUserPositions   ← 데이터 hook (6-phase fetch)
domains/trade/components/              ← UI 컴포넌트 3개

packages/core/src/dex/calculators.ts   ← getPositionAmounts() 추가
```

## 테스트 전략
- `getPositionAmounts()` 순수 함수: 단위 테스트 (known tick/liquidity → expected amounts)
- `useUserPositions`: 수동 테스트 (테스트넷에서 LP 생성 후 확인)
- UI: 지갑 미연결/포지션 0개/1개/다수 케이스 수동 확인

## 실패/에러 처리
N/A: 순수 read-only 기능. RPC 실패 시 wagmi의 기본 에러 핸들링 + isLoading 상태 표시.

## 성능/스케일
- 최대 20 포지션 × 4 phase(tokenId, positions, pool, oracle) + 1 balanceOf = ~80+ RPC 호출. `useReadContracts`로 배치 처리 (multicall). 고유 풀/토큰 기준 중복 제거로 실제 호출 수 감소
- refetchInterval: 30초
- Pool slot0 조회는 고유 풀 기준 (중복 풀은 1회만)

## 파일 변경 목록

### 신규 파일
| 파일 | 설명 |
|------|------|
| `domains/trade/hooks/useUserPositions.ts` | 사용자 LP 포지션 열거 hook |
| `domains/trade/components/PositionCard.tsx` | 개별 포지션 카드 |
| `domains/trade/components/LPPortfolioSummary.tsx` | 포트폴리오 요약 StatCard 그리드 |
| `domains/trade/components/MyPositionsBanner.tsx` | Pool 페이지 배너 |
| `app/(trade)/pool/positions/page.tsx` | 전용 대시보드 페이지 |

### 수정 파일
| 파일 | 변경 내용 |
|------|----------|
| `packages/core/src/dex/calculators.ts` | `getPositionAmounts()` 함수 추가 |
| `app/(trade)/pool/page.tsx` | MyPositionsBanner 삽입 |

## 엣지 케이스
- **포지션 0개**: "No active positions" 빈 상태 + "New Position" CTA 링크
- **미지 토큰**: TOKEN_INFO에 없는 토큰 → symbol "???", price 0 → USD에서 제외
- **tokensOwed 정확도**: positions().tokensOwed는 마지막 collect 이후 값. 실제 미수령 수수료는 더 클 수 있으나, PRD에서 이 제한을 수용
- **20개 초과**: "최대 20개만 표시 (인덱스 0~19)" 안내 문구. tokenOfOwnerByIndex는 인덱스 순 열거이며, 정렬 보장 없음
