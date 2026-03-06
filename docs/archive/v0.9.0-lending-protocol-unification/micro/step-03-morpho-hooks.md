# Step 03: Morpho 도메인 훅

## 메타데이터
- **난이도**: 🔴 어려움
- **롤백 가능**: ✅ (파일 추가만)
- **선행 조건**: Step 01 (types, lib)

---

## 1. 구현 내용 (design.md 기반)
- `useMorphoMarkets()`: useLendMarkets.ts 기반 마이그레이션 + MorphoMarket 타입 적용 (마켓 목록 READ)
- `useMorphoPosition(marketId)`: 유저별 포지션 READ — `SnowballLend.position(marketId, user)` + 환산(supplyAssets, borrowAssets, healthFactor, liquidationPrice)
- `useMorphoActions(market)`: 6개 WRITE 액션 — supply, withdraw, supplyCollateral, borrow, repay, withdrawCollateral (approve + getMarketParams + 트랜잭션)
- `domains/defi/morpho/data/fixtures.ts`: 데모 포지션 데이터 (TEST_MODE용)

## 2. 완료 조건
- [ ] `useMorphoMarkets()` 호출 시 `markets: MorphoMarket[]`, `isLoading: boolean` 반환
- [ ] `useMorphoPosition(marketId)` 호출 시 `position: MorphoPosition | null` 반환 (supplyAssets, borrowAssets, collateral, healthFactor, liquidationPrice 포함)
- [ ] `useMorphoActions(market).supply(amount)` 호출 가능 (approve → supply 시퀀스)
- [ ] `useMorphoActions(market).withdraw(amount)`, `.borrow(amount)`, `.repay(amount)`, `.supplyCollateral(amount)`, `.withdrawCollateral(amount)` 호출 가능
- [ ] `fixtures.ts`에 `DEMO_POSITIONS: MorphoPosition[]` export (3개 항목, 마켓별 1개)
- [ ] `cd apps/web && npx tsc --noEmit` 에러 0

## 3. 롤백 방법
- 추가된 파일 삭제
- 영향 범위: Step 05 (Morpho 페이지)만 의존

---

## Scope

### 신규 생성 파일
```
apps/web/src/domains/defi/morpho/
├── hooks/
│   ├── useMorphoMarkets.ts      # 신규 - useLendMarkets 마이그레이션 + MorphoMarket 타입
│   ├── useMorphoPosition.ts     # 신규 - 유저 포지션 READ
│   └── useMorphoActions.ts      # 신규 - 6개 WRITE 액션
└── data/
    └── fixtures.ts              # 신규 - 데모 포지션 데이터
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| Step 01 산출물 (types, lib) | 직접 import | MorphoMarket, MorphoPosition, morphoMath, getMarketParams |
| `core/abis/lend.ts` | import | SnowballLendABI, MockOracleABI |
| `core/config/addresses.ts` | import | LEND.snowballLend, LEND.markets, LEND.oracles |
| `shared/hooks/useTokenApproval.ts` | import | approve 플로우 |
| `shared/hooks/useTokenBalance.ts` | import | 잔고 조회 |
| `domains/defi/lend/hooks/useLendMarkets.ts` | 참조 원본 | useMorphoMarkets로 기능 복사 (삭제는 Step 06) |
| wagmi | import | useReadContracts, useReadContract, useWriteContract, useAccount |

### Side Effect 위험
- 없음 (신규 파일만, 기존 코드 미수정)

### 참고할 기존 패턴
- `domains/defi/lend/hooks/useLendMarkets.ts`: 마이그레이션 원본 (배치 READ)
- `domains/defi/yield/components/VaultActionDialog.tsx`: approve + action WRITE 패턴
- `domains/defi/lend/lib/lendMath.ts`: 수학 함수 원본 (Step 01에서 morphoMath로 복사)

## FP/FN 검증

### False Positive (과잉)
모든 파일이 구현 내용과 1:1 매핑 — FP 없음

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| useMorphoMarkets가 기존 useLendMarkets와 동일 인터페이스 유지 | 암묵적 | ✅ OK (MorphoMarket 타입으로 확장) |

### 검증 통과: ✅

---

→ 다음: [Step 04: Liquity 라우트](step-04-liquity-routes.md)
