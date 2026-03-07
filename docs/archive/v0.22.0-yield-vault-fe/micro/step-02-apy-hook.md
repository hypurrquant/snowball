# Step 02: useYieldVaultAPY 훅

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: ✅
- **선행 조건**: Step 01 (morphoMath shared 승격, addresses.ts morphoMarketId)

---

## 1. 구현 내용 (design.md 기반)

### TD-3: ApyState discriminated union 정의
```typescript
type ApyState =
  | { kind: "loading" }
  | { kind: "variable" }
  | { kind: "ready"; value: number }
  | { kind: "error" }
```

### TD-4: useYieldVaultAPY 훅 구현
- YIELD.vaults에서 `strategyType === "morpho"`인 볼트만 필터
- Phase 1: `useReadContracts` → `SnowballLend.market(marketId)` × N개
- Phase 2: `useReadContracts` → `AdaptiveCurveIRM.borrowRateView(marketParams, marketState)` × N개
- APY 계산: `borrowRateToAPR → utilization → supplyAPY → × 0.955`
- StabilityPool: `{ kind: "variable" }` 반환
- IRM fallback: `borrowAPR = utilization × 0.08`
- 초기 상태: StabilityPool → `{ kind: "variable" }`, Morpho → `{ kind: "loading" }`
- 반환: `Record<Address, ApyState>` (key = vault.address)

### wCTC market MarketParams 구성
- wCTC market은 LEND.markets에 없으므로 별도 MarketParams를 훅 내부에서 구성
- oracle: `0x13c355b49b53c3bdfcba742fd015fe30a39896ca`

## 2. 완료 조건
- [ ] `apps/web/src/domains/defi/yield/hooks/useYieldVaultAPY.ts` 파일이 존재
- [ ] ApyState 타입이 4개 kind (`loading`, `variable`, `ready`, `error`)를 가짐
- [ ] 반환 타입이 `Record<Address, ApyState>` (key = vault.address)
- [ ] 초기 상태: Morpho 볼트 → `{ kind: "loading" }`, StabilityPool → `{ kind: "variable" }` (undefined 없음)
- [ ] 브라우저 콘솔에서 Morpho 3개 볼트의 APY 값이 0 이상 (유동성 있는 경우) 또는 0.00 (유동성 없는 경우)
- [ ] StabilityPool 볼트가 `{ kind: "variable" }` 반환
- [ ] 온체인 호출 실패 시 `{ kind: "error" }` 반환 (RPC 에러 시나리오)
- [ ] `npx tsc --noEmit` 통과

## 3. 롤백 방법
- 신규 파일 삭제만으로 완전 롤백 가능 (기존 코드 수정 없음)

---

## Scope

### 신규 생성 파일
```
apps/web/src/domains/defi/yield/hooks/useYieldVaultAPY.ts  # APY 계산 훅
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| shared/lib/morphoMath.ts | import 사용 | borrowRateToAPR, utilization, supplyAPY |
| addresses.ts (YIELD, LEND) | import 사용 | morphoMarketId, snowballLend, adaptiveCurveIRM |
| core/abis (SnowballLendABI, AdaptiveCurveIRMABI) | import 사용 | 온체인 호출 |
| wagmi (useReadContracts) | 훅 사용 | 2-phase 온체인 데이터 읽기 |

### Side Effect 위험
- 없음 (신규 파일, 기존 코드 수정 없음)

### 참고할 기존 패턴
- `apps/web/src/domains/defi/morpho/hooks/useMorphoMarkets.ts`: 2-phase useReadContracts + IRM fallback 패턴

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| useYieldVaultAPY.ts | TD-3, TD-4 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| ApyState 타입 정의 | ✅ (훅 파일 내부 또는 별도 export) | OK |
| 2-phase IRM 호출 | ✅ | OK |
| morphoMath 함수 import | ✅ | OK |
| wCTC MarketParams 구성 | ✅ (훅 내부) | OK |

### 검증 통과: ✅

---

→ 다음: [Step 03: VaultCard 개선](step-03-vault-card.md)
