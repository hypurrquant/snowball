# Step 03: useCreatePosition 훅 — 상태 오케스트레이션

## 메타데이터
- **난이도**: 🔴 어려움
- **롤백 가능**: ✅
- **선행 조건**: Step 01 (mockPriceUsd 필요)

---

## 1. 구현 내용 (design.md 기반)

page.tsx의 상태/로직을 추출하여 `useCreatePosition` 훅을 신규 생성한다.

### 1-1. 입력
- `token0: Address`, `token1: Address` (URL pair 파라미터에서 파싱)
- `token0Decimals`, `token1Decimals` (TOKEN_INFO 조회)

### 1-2. 내부 조합 훅
- `usePool(token0, token1)` → currentTick, currentPrice, tickSpacing, isPoolLoading
- `usePoolTicks(token0, token1, decimals0, decimals1)` → ticks, isLoading
- `useTokenBalance({ address, token: token0 })` × 2
- `useTokenApproval(token0, nfpmAddress, amount0)` × 2
- `useAddLiquidity()` → approveToken, mint, isPending

### 1-3. 상태 관리
- `tickLower`, `tickUpper`, `setTickRange(lower, upper)`
- `amount0`, `amount1` (string), `setAmount0`, `setAmount1`
- `handleHalf0/Max0/Half1/Max1` — 잔고 기반 Half(50%)/Max(100%) 설정
- `txState`: 'idle' | 'approving0' | 'approving1' | 'minting' | 'success' | 'error'

### 1-4. 파생 값 (derived)
- `amount0Usd`, `amount1Usd`: amount × TOKEN_INFO[token].mockPriceUsd
- `totalDepositUsd`: amount0Usd + amount1Usd
- `tokenRatio`: [amount0Usd/totalUsd × 100, amount1Usd/totalUsd × 100]
- `estimatedApr`: usePoolList에서 token0-token1 매칭 풀의 feesAPR, 실패 시 "—"
- `needsApproval0`, `needsApproval1`: useTokenApproval 결과

### 1-5. 트랜잭션 플로우
- `handleAddLiquidity()`: approve0 → approve1 → mint 순차 실행
- parseTokenAmount(amount, decimals) 사용 (parseEther 대신)
- txState 상태 머신 업데이트

### 1-6. 반환 타입
design.md의 `UseCreatePositionReturn` 인터페이스 (약 20개 필드)

## 2. 완료 조건
- [ ] `domains/trade/hooks/useCreatePosition.ts` 파일 생성
- [ ] 인터페이스 `UseCreatePositionReturn` export
- [ ] `usePool`, `usePoolTicks`, `useTokenBalance×2`, `useTokenApproval×2`, `useAddLiquidity` 내부 조합
- [ ] Half/Max 버튼 로직: Half = balance / 2, Max = balance 전체 (formatUnits 사용)
- [ ] USD 환산: amount × TOKEN_INFO[token].mockPriceUsd (parseFloat)
- [ ] tokenRatio 계산: [amount0Usd/total×100, amount1Usd/total×100], total=0이면 [50,50]
- [ ] estimatedApr: usePoolList 호출 → token0-token1 매칭 → feesAPR 반환, 매칭 실패 시 "—"
- [ ] txState 상태 머신: idle → approving0 → approving1 → minting → success / error
- [ ] handleAddLiquidity: parseTokenAmount 사용, 순차 approve→mint
- [ ] `npx tsc --noEmit` 기존 에러 외 신규 에러 0

## 3. 롤백 방법
- `rm apps/web/src/domains/trade/hooks/useCreatePosition.ts`
- 영향 범위: 신규 파일 1개 삭제만으로 완전 롤백

---

## Scope

### 수정 대상 파일
없음 (기존 파일 수정 불필요)

### 신규 생성 파일
```
apps/web/src/domains/trade/hooks/useCreatePosition.ts  # 신규 - 핵심 상태 관리 훅
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| usePool.ts | import | currentTick, tickSpacing 읽기 |
| usePoolTicks.ts | import | ticks, currentPrice 읽기 |
| useTokenBalance.ts | import | balance0, balance1 읽기 |
| useTokenApproval.ts | import | needsApproval, approve 사용 |
| useAddLiquidity.ts | import | mint, approveToken 사용 |
| usePoolList.ts | import | feesAPR 매칭 |
| addresses.ts | import | TOKEN_INFO.mockPriceUsd, CONTRACTS.nonfungiblePositionManager |
| core/dex/calculators.ts | import | alignTickToSpacing (기본 tick 계산) |

### Side Effect 위험
- 없음. 신규 파일 생성만으로 기존 코드에 영향 없음.
- Step 05에서 page.tsx가 이 훅을 사용할 때 통합됨.

### 참고할 기존 패턴
- `apps/web/src/app/(trade)/pool/[pair]/page.tsx`: 현재 상태 관리 로직 (이 훅으로 추출 대상)
- `apps/web/src/domains/trade/hooks/useSwap.ts`: 도메인 훅 패턴 참조

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| useCreatePosition.ts | 전체 상태 오케스트레이션 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| Pool state 읽기 | ✅ usePool import | OK |
| Tick data 읽기 | ✅ usePoolTicks import | OK |
| Balance 읽기 | ✅ useTokenBalance import | OK |
| Approval 처리 | ✅ useTokenApproval import | OK |
| Mint 트랜잭션 | ✅ useAddLiquidity import | OK |
| USD 환산 | ✅ TOKEN_INFO.mockPriceUsd import | OK |
| APR 매칭 | ✅ usePoolList import | OK |
| Half/Max 로직 | ✅ useCreatePosition 내부 | OK |
| txState 상태 머신 | ✅ useCreatePosition 내부 | OK |

### 검증 체크리스트
- [x] Scope의 모든 파일이 구현 내용과 연결됨
- [x] 구현 내용의 모든 항목이 Scope에 반영됨
- [x] 불필요한 파일(FP)이 제거됨
- [x] 누락된 파일(FN)이 추가됨

### 검증 통과: ✅

---

→ 다음: [Step 04: DepositPanel 컴포넌트](step-04-deposit-panel.md)
