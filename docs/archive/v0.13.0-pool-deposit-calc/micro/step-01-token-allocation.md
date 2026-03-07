# Step 01: tokenAllocation.ts (Pure Math)

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅ (신규 파일 삭제)
- **선행 조건**: 없음

---

## 1. 구현 내용 (design.md 기반)

- `packages/core/src/dex/tokenAllocation.ts` 신규 생성
  - `calcCoefficients(currentTick, tickLower, tickUpper)` → `{ c0, c1, case: 'in-range' | 'below' | 'above' }`
  - `calcOtherTokenAmount(amount: Number, isToken0, coeff)` → paired amount (Number). 입출력 모두 human-readable Number. bigint↔Number 변환은 hook(useSmartDeposit) 책임
  - `calcMaxAmountsFromBalances(balance0: Number, balance1: Number, coeff)` → `{ amount0, amount1 }` (Number). 동일하게 human-readable Number. hook에서 formatUnits/parseTokenAmount로 변환
- `apps/web/src/core/dex/tokenAllocation.ts` shim 생성 (`export * from "@snowball/core/src/dex/tokenAllocation"`)
- `packages/core/src/dex/tokenAllocation.test.ts` 단위 테스트 (assert 기반, tsx로 실행)

## 2. 완료 조건
- [ ] `packages/core/src/dex/tokenAllocation.ts` 파일 존재
- [ ] `calcCoefficients` 3가지 case 정상 동작: in-range, below, above
- [ ] `calcOtherTokenAmount` 양방향 (token0→token1, token1→token0) 정상 동작
- [ ] `calcMaxAmountsFromBalances` 정상 동작 (L = min(balance0/c0, balance1/c1))
- [ ] `calcCoefficients(800000, ...)` 에서 isFinite 체크로 안전 처리
- [ ] `calcCoefficients(0, 600, 600)` (zero-width) → c0=0, c1=0
- [ ] `apps/web/src/core/dex/tokenAllocation.ts` shim 파일 존재
- [ ] 파일 내 `react`, `next` import 없음
- [ ] `npx tsx packages/core/src/dex/tokenAllocation.test.ts` 통과

## 3. 롤백 방법
- 3개 파일 삭제: `packages/core/src/dex/tokenAllocation.ts`, `apps/web/src/core/dex/tokenAllocation.ts`, `packages/core/src/dex/tokenAllocation.test.ts`
- 영향 범위: 없음 (신규 파일만)

---

## Scope

### 수정 대상 파일
없음

### 신규 생성 파일
```
packages/core/src/dex/
  └── tokenAllocation.ts       # 신규 - pure math (calcCoefficients, calcOtherTokenAmount, calcMaxAmountsFromBalances)
  └── tokenAllocation.test.ts  # 신규 - 단위 테스트

apps/web/src/core/dex/
  └── tokenAllocation.ts       # 신규 - re-export shim
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| `packages/core/src/dex/calculators.ts` | 참조만 | tickToSqrtPrice 등 기존 함수 참조 가능 (필요시) |

### Side Effect 위험
- 없음 (신규 파일만 추가, 기존 코드 미수정)

### 참고할 기존 패턴
- `apps/web/src/core/dex/calculators.ts`: re-export shim 패턴
- `/Users/mousebook/Documents/side-project/HypurrQuant_FE/apps/web/src/domains/mint/lib/tokenAllocation.ts`: 참조 구현

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| tokenAllocation.ts | calcCoefficients 등 3함수 | ✅ OK |
| tokenAllocation.test.ts | DoD N2 | ✅ OK |
| shim tokenAllocation.ts | design.md import 규칙 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| calcCoefficients | ✅ | OK |
| calcOtherTokenAmount | ✅ | OK |
| calcMaxAmountsFromBalances | ✅ | OK |
| shim re-export | ✅ | OK |
| 단위 테스트 | ✅ | OK |

### 검증 통과: ✅

---

→ 다음: [Step 02: useSmartDeposit Hook](step-02-use-smart-deposit.md)
