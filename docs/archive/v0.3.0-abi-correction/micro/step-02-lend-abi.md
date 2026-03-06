# Step 02: lend.ts ABI 교정 + useLendMarkets.ts 동기화

## 메타데이터
- **난이도**: 🟢 쉬움
- **롤백 가능**: ✅ (`git checkout -- apps/web/src/abis/lend.ts apps/web/src/hooks/defi/useLendMarkets.ts`)
- **선행 조건**: 없음 (Step 01과 독립)

---

## 1. 구현 내용 (design.md 기반)

### lend.ts 수정

| 조치 | 대상 | 변경 내용 |
|------|------|----------|
| 수정 | `MockOracleABI` | `getPrice` → `price` (IOracle 인터페이스 준수) |
| 추가 | `SnowballLendABI` | `idToMarketParams(bytes32) → (address, address, address, address, uint256)` |

### useLendMarkets.ts 동기화

| 변경 | 내용 |
|------|------|
| 함수명 | `getPrice` → `price` |
| Dead import | `AdaptiveCurveIRMABI` import 제거 |

## 2. 완료 조건

- [ ] `lend.ts`의 `MockOracleABI`에 `price(view, returns uint256)` 존재
- [ ] `lend.ts`의 `MockOracleABI`에 `getPrice` 없음
- [ ] `lend.ts`의 `SnowballLendABI`에 `idToMarketParams(bytes32)` 존재, 5개 반환값
- [ ] `useLendMarkets.ts`에서 `price` 호출 (not `getPrice`)
- [ ] `useLendMarkets.ts`에 `AdaptiveCurveIRMABI` import 없음

## 3. 롤백 방법
- `git checkout -- apps/web/src/abis/lend.ts apps/web/src/hooks/defi/useLendMarkets.ts`
- 영향 범위: Lend 마켓 페이지만

---

## Scope

### 수정 대상 파일
```
apps/web/src/
├── abis/lend.ts                  # 수정 - MockOracleABI 함수명 변경 + SnowballLendABI 함수 추가
└── hooks/defi/useLendMarkets.ts  # 수정 - 함수명 1개 변경 + dead import 1개 제거
```

### 참조 파일 (읽기 전용)
```
packages/morpho/src/
├── mocks/OracleMock.sol    # price() 시그니처 확인
└── SnowballLend.sol        # idToMarketParams 시그니처 확인
```

### Side Effect 위험
- 없음. lend.ts와 useLendMarkets.ts만 영향.

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| lend.ts | design.md lend.ts 섹션 | ✅ OK |
| useLendMarkets.ts | design.md 호출부 동기화 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| MockOracleABI 함수명 수정 | ✅ lend.ts | OK |
| idToMarketParams 추가 | ✅ lend.ts | OK |
| useLendMarkets 동기화 | ✅ useLendMarkets.ts | OK |
| AdaptiveCurveIRMABI dead import | ✅ useLendMarkets.ts | OK |

### 검증 통과: ✅

---

→ 다음: [Step 03: options.ts ABI 교정](step-03-options-abi.md)
