# Pool Deposit Amounts 연동 - v0.13.0

## 문제 정의

### 현상
Pool New Position 페이지(`/pool/[pair]`)에서 Token0와 Token1 금액을 **독립적으로** 입력해야 한다.
Uniswap V3의 concentrated liquidity 특성상 current tick과 선택된 price range에 따라 두 토큰의 비율이 결정되는데, 현재 구현은 이 비율을 계산하지 않아 사용자가 잘못된 비율로 입력할 수 있다.

- Token0 금액을 입력해도 Token1이 자동 계산되지 않음
- Token1 금액을 입력해도 Token0이 자동 계산되지 않음
- Max 버튼이 단순히 단일 토큰 잔고의 100%만 채우고, 양쪽 토큰의 균형을 고려하지 않음
- Price range가 current tick 밖에 있을 때(out-of-range) 불필요한 토큰 입력 필드가 비활성화되지 않음

### 원인
`useCreatePosition` 훅에서 `setAmount0`과 `setAmount1`이 완전히 독립적으로 동작한다.
Uniswap V3의 tick coefficient 기반 금액 계산 로직(`calcCoefficients`, `calcOtherTokenAmount`)이 구현되어 있지 않다.

핵심 수학 부재:
```
sqrtP  = 1.0001^(currentTick / 2)
sqrtPl = 1.0001^(tickLower / 2)
sqrtPu = 1.0001^(tickUpper / 2)

Case 1: In-range (tickLower <= currentTick < tickUpper)
  c0 = (sqrtPu - sqrtP) / (sqrtPu * sqrtP)   // token0 coefficient
  c1 = sqrtP - sqrtPl                          // token1 coefficient
  ratio = c1 / c0  → token1 = token0 * ratio

Case 2: Out-of-range below (currentTick < tickLower)
  c0 = 1, c1 = 0  → token0 only, token1 입력 비활성화

Case 3: Out-of-range above (currentTick >= tickUpper)
  c0 = 0, c1 = 1  → token1 only, token0 입력 비활성화
```

### 영향
- **사용자 혼란**: 올바른 비율을 모르고 임의 금액을 입력하면, mint 시 한쪽 토큰만 소진되고 나머지는 반환됨
- **자금 비효율**: Max 버튼이 양쪽 잔고의 균형을 고려하지 않아 최대 유동성을 공급하지 못함
- **UX 불일치**: 다른 Uniswap V3 프론트엔드와 동작이 달라 사용자 기대와 맞지 않음

### 목표
1. **양방향 금액 자동계산**: Token0 입력 시 Token1 자동 계산 (역방향 동일)
2. **Max Mint**: 양쪽 잔고를 고려해 최대 유동성을 공급하는 금액 자동 계산 (`L = min(balance0/c0, balance1/c1)`)
3. **Out-of-range 처리**: price range가 current tick 밖일 때 불필요 토큰 입력 비활성화 + 값 `0`으로 클리어
4. **Range 변경 시 재계산**: tick range가 변경되면 **마지막 편집 토큰을 기준으로** paired amount 재계산. 잔고 초과 시 큰 쪽 자동 축소.

### 비목표 (Out of Scope)
- **Zap Mint** (스왑 후 LP): 비율 불일치 시 자동 스왑 → 향후 Phase
- **Fee Tier 선택**: 현재 3000 (0.3%) 고정 → 향후 Phase
- **Position 관리**: 기존 LP 포지션 조회/수정/제거 → 향후 Phase
- **Slippage 커스터마이징**: 현재 50bps 고정 → 향후 Phase
- **Price Impact 경고**: mint 시 가격 영향 표시 → 향후 Phase
- **Transaction Preview Modal**: mint 전 상세 요약 → 향후 Phase

## 제약사항
- 기존 DDD 4계층 아키텍처(core → domains → shared → app) 준수
- pure math 함수는 `packages/core/src/dex/` 에 배치 (React-free)
- core math(`tokenAllocation.ts`)는 **human-readable Number**로 계산 (tick coefficient가 Number이므로 동일 스케일 통일). bigint(wei) ↔ Number 변환은 **hook 경계(useSmartDeposit)**에서 수행. on-chain 전송 시에만 bigint 사용
- 참조 구현: `/Users/mousebook/Documents/side-project/HypurrQuant_FE/apps/web/src/domains/mint/`
  - `lib/tokenAllocation.ts` (pure math)
  - `hooks/useSmartDeposit.ts` (hook)
- 기존 컴포넌트(`DepositPanel`, `PriceRangeSelector`) 확장, 새 파일 최소화

## 참조 구현 핵심 구조

| 파일 | 역할 |
|------|------|
| `lib/tokenAllocation.ts` | `calcCoefficients`, `calcOtherTokenAmount`, `calcMaxAmountsFromBalances` |
| `hooks/useSmartDeposit.ts` | 양방향 입력, Max, range 변경 시 재계산 |
| `components/SmartDepositInput.tsx` | fill bar, disabled 상태, balance 표시 |
