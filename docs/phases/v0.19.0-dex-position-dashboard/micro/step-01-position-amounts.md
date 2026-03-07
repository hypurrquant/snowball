# Step 01: getPositionAmounts 순수 함수

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅ (파일 1개 수정, 함수 추가만)
- **선행 조건**: 없음

---

## 1. 구현 내용 (design.md 기반)
- `packages/core/src/dex/calculators.ts`에 `getPositionAmounts()` 함수 추가
- Uniswap V3 표준 수식으로 liquidity + tick range → underlying token amounts 계산
- 기존 `tickToSqrtPrice()` 활용

## 2. 완료 조건
- [ ] `getPositionAmounts(liquidity, tickLower, tickUpper, currentTick, decimals0, decimals1)` 함수가 export됨
- [ ] In range: amount0 = L * (1/sqrtP - 1/sqrtPu), amount1 = L * (sqrtP - sqrtPl) 수식 구현
- [ ] Below range: amount0만, amount1 = 0
- [ ] Above range: amount0 = 0, amount1만
- [ ] human-readable 값 반환 (decimals 반영)
- [ ] `packages/core/src/index.ts`에서 re-export (필요시)

## 3. 롤백 방법
- `calculators.ts`에서 추가한 함수만 제거

---

## Scope

### 수정 대상 파일
```
packages/core/src/dex/calculators.ts  # 수정 - getPositionAmounts() 추가
```

### 신규 생성 파일
없음

### 참고할 기존 패턴
- `calculators.ts`의 `tickToSqrtPrice()`, `sqrtPriceX96ToPrice()`

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| calculators.ts | getPositionAmounts 추가 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| getPositionAmounts | ✅ | OK |

### 검증 통과: ✅

---

→ 다음: [Step 02: useUserPositions hook](step-02-user-positions-hook.md)
