# Step 02: Liquity 도메인 훅

## 메타데이터
- **난이도**: 🔴 어려움
- **롤백 가능**: ✅ (파일 추가만)
- **선행 조건**: Step 01 (types, lib)

---

## 1. 구현 내용 (design.md 기반)
- `useLiquityBranch(branch)`: 브랜치 통계 배치 READ (TVL, debt, price, TCR, MCR, CCR)
- `useTroves(branch)`: 유저 트로브 열거 + 상세 READ (getTroveIdsCount, getTroveFromTroveIdsArray, getLatestTroveData, getCurrentICR)
- `useTroveActions(branch)`: openTrove, adjustTrove, adjustTroveInterestRate, closeTrove WRITE (approve + hint 계산 + 트랜잭션)
- `useStabilityPool(branch)`: SP 통계 + 유저 포지션 READ + provideToSP/withdrawFromSP/claimAllCollGains WRITE
- `domains/defi/liquity/data/fixtures.ts`: 데모 트로브 데이터 (TEST_MODE용)

## 2. 완료 조건
- [ ] `useLiquityBranch('wCTC')` 호출 시 `stats.totalColl`, `stats.totalDebt`, `stats.price`, `stats.tcr` 반환
- [ ] `useTroves('wCTC')` 호출 시 `troves: TroveData[]`, `troveCount: bigint` 반환
- [ ] `useTroveActions('wCTC').openTrove({coll, debt, rate, maxFee})` 호출 가능 (approve → hint → openTrove 시퀀스)
- [ ] `useTroveActions('wCTC').adjustTrove(...)`, `.adjustInterestRate(...)`, `.closeTrove(...)` 호출 가능
- [ ] `useStabilityPool('wCTC')` 호출 시 `position.totalDeposits`, `.userDeposit`, `.collGain` 반환
- [ ] `useStabilityPool('wCTC').deposit(amount)`, `.withdraw(amount)`, `.claimAll()` 호출 가능
- [ ] `fixtures.ts`에 `DEMO_TROVES: TroveData[]` export (3~5개 항목)
- [ ] `cd apps/web && npx tsc --noEmit` 에러 0

## 3. 롤백 방법
- 추가된 파일 삭제
- 영향 범위: Step 04 (Liquity 페이지)만 의존

---

## Scope

### 신규 생성 파일
```
apps/web/src/domains/defi/liquity/
├── hooks/
│   ├── useLiquityBranch.ts      # 신규 - 브랜치 통계 READ
│   ├── useTroves.ts             # 신규 - 트로브 목록+상세 READ
│   ├── useTroveActions.ts       # 신규 - 트로브 CRUD WRITE
│   └── useStabilityPool.ts      # 신규 - SP READ+WRITE
└── data/
    └── fixtures.ts              # 신규 - 데모 트로브 데이터
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| Step 01 산출물 (types, lib) | 직접 import | TroveData, BranchStats, liquityMath |
| `core/abis/liquity.ts` | import | BorrowerOperationsABI, TroveManagerABI, StabilityPoolABI 등 |
| `core/config/addresses.ts` | import | LIQUITY.branches, LIQUITY.shared |
| `shared/hooks/useTokenApproval.ts` | import | approve 플로우 |
| `shared/hooks/useTokenBalance.ts` | import | 잔고 조회 |
| wagmi | import | useReadContracts, useWriteContract, useAccount |

### Side Effect 위험
- 없음 (신규 파일만, 기존 코드 미수정)

### 참고할 기존 패턴
- `domains/defi/yield/hooks/useYieldVaults.ts`: 배치 READ 패턴
- `domains/defi/yield/components/VaultActionDialog.tsx`: approve + action WRITE 패턴
- `app/(defi)/earn/page.tsx`: SP 기존 구현 (추출 대상)

## FP/FN 검증

### False Positive (과잉)
모든 파일이 구현 내용과 1:1 매핑 — FP 없음

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| useStabilityPool에서 getDepositorYieldGain 추가 | 미포함 | ✅ OK (ABI에 있지만 PRD 비목표 아님 — 추가 가능) |

### 검증 통과: ✅

---

→ 다음: [Step 03: Morpho 도메인 훅](step-03-morpho-hooks.md)
