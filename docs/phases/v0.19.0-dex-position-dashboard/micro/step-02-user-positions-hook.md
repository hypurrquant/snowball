# Step 02: useUserPositions hook

## 메타데이터
- **난이도**: 🔴 어려움
- **롤백 가능**: ✅ (신규 파일 1개)
- **선행 조건**: Step 01 (getPositionAmounts)

---

## 1. 구현 내용 (design.md 기반)
- `domains/trade/hooks/useUserPositions.ts` 신규 생성
- 6-phase waterfall fetch:
  1. balanceOf → count (최대 20)
  2. tokenOfOwnerByIndex → tokenId[]
  3. positions(tokenId) → raw data[]
  4. Factory.getPool → poolAddress[] (고유 조합)
  5. Pool.slot0 → currentTick[] (고유 풀)
  6. Oracle.price → USD price[] (고유 토큰, fallback: TOKEN_INFO.mockPriceUsd)
- liquidity > 0 필터링 (Open 포지션만)
- 파생 데이터 계산: isInRange, amount0/1, valueUsd, feesUsd
- 토큰 주소 → 오라클 주소 매핑 (LEND.oracles)

## 2. 완료 조건
- [ ] `useUserPositions(address)` hook이 export됨
- [ ] 반환 타입: `{ positions: UserPosition[], totalValueUsd, totalFeesUsd, positionCount, isLoading }`
- [ ] `positionCount`는 balanceOf 전체 개수, `positions`는 최대 20개
- [ ] Open 포지션만 반환 (liquidity > 0)
- [ ] isInRange: tickLower <= currentTick < tickUpper
- [ ] valueUsd: Oracle price() / 1e36 기반 + TOKEN_INFO fallback
- [ ] feesUsd: tokensOwed0/1 × price 기반
- [ ] 테스트넷에서 LP 포지션 생성 후 hook 동작 확인

## 3. 롤백 방법
- `useUserPositions.ts` 파일 삭제

---

## Scope

### 수정 대상 파일
없음

### 신규 생성 파일
```
apps/web/src/domains/trade/hooks/useUserPositions.ts  # 신규 - LP 포지션 열거 hook
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| NonfungiblePositionManagerABI | 읽기 | balanceOf, tokenOfOwnerByIndex, positions |
| UniswapV3FactoryABI | 읽기 | getPool |
| UniswapV3PoolABI | 읽기 | slot0 |
| LEND.oracles | 읽기 | 오라클 주소 |
| getPositionAmounts (Step 01) | 호출 | underlying amounts 계산 |
| TOKEN_INFO | 읽기 | symbol, decimals, mockPriceUsd fallback |

### 참고할 기존 패턴
- `domains/trade/hooks/usePool.ts`: useReadContract + useReadContracts waterfall
- `domains/trade/hooks/usePoolTicks.ts`: multi-phase fetch, refetchInterval

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| useUserPositions.ts | 6-phase hook | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| 6-phase fetch + 파생 데이터 | ✅ | OK |
| Oracle ABI | ✅ 해결 | `MockOracleABI.price()` 이미 존재 (packages/core/src/abis/lend.ts) |

### 검증 통과: ✅

---

→ 다음: [Step 03: PositionCard 컴포넌트](step-03-position-card.md)
