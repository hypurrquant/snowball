# Step 01: 설정 확장 + morphoMath 승격

## 메타데이터
- **난이도**: 🟢 쉬움
- **롤백 가능**: ✅
- **선행 조건**: 없음

---

## 1. 구현 내용 (design.md 기반)

### TD-1: morphoMath.ts shared/lib 승격
- `apps/web/src/domains/defi/morpho/lib/morphoMath.ts` → `apps/web/src/shared/lib/morphoMath.ts` 이동
- 기존 import 경로 수정: `useMorphoMarkets.ts`, `useMorphoPosition.ts` 등

### TD-2: YIELD 설정에 strategyType + morphoMarketId 추가
- `packages/core/src/config/addresses.ts`의 YIELD 섹션에 `strategyType`, `morphoMarketId` 필드 추가
- 4개 볼트 각각에 올바른 값 설정

## 2. 완료 조건
- [ ] `apps/web/src/shared/lib/morphoMath.ts` 파일이 존재
- [ ] `apps/web/src/domains/defi/morpho/lib/morphoMath.ts` 파일이 삭제됨
- [ ] `grep -rn "morphoMath" apps/web/src/` → 모든 import가 `@/shared/lib/morphoMath` 경로
- [ ] addresses.ts YIELD 4개 볼트에 `strategyType` 필드 존재 (stabilityPool 1개, morpho 3개)
- [ ] Morpho 3개 볼트에 `morphoMarketId` 필드 존재, wCTC = `0xdb8d70912f854011992e1314b9c0837bf14e7314dccb160584e3b7d24d20f6bd`
- [ ] `npx tsc --noEmit` 통과

## 3. 롤백 방법
- `git revert` — 파일 이동과 설정 추가만이므로 안전하게 되돌릴 수 있음

---

## Scope

### 수정 대상 파일
```
apps/web/src/domains/defi/morpho/hooks/useMorphoMarkets.ts    # import 경로 변경
apps/web/src/domains/defi/morpho/hooks/useMorphoPosition.ts   # import 경로 변경 (calculateHealthFactor 등 사용 시)
packages/core/src/config/addresses.ts                          # YIELD 설정 확장
```

### 신규/이동 파일
```
apps/web/src/shared/lib/morphoMath.ts                          # 이동 (domains/defi/morpho/lib/ → shared/lib/)
```

### 삭제 파일
```
apps/web/src/domains/defi/morpho/lib/morphoMath.ts             # 삭제 (이동 완료 후)
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| useMorphoMarkets.ts | import 경로 변경 | `../lib/morphoMath` → `@/shared/lib/morphoMath` |
| useMorphoPosition.ts | import 경로 변경 | 동일 |
| addresses.ts | 필드 추가 | YIELD.vaults 타입 확장 (as const 유지) |

### Side Effect 위험
- morphoMath import를 사용하는 파일을 모두 찾아 수정해야 함. `grep`으로 전수 확인.

### 참고할 기존 패턴
- `apps/web/src/shared/lib/utils.ts`: shared/lib에 유틸 함수를 두는 기존 패턴

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| useMorphoMarkets.ts | TD-1 import 경로 변경 | ✅ OK |
| useMorphoPosition.ts | TD-1 import 경로 변경 | ✅ OK |
| addresses.ts | TD-2 설정 확장 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| morphoMath 이동 | ✅ | OK |
| 기존 import 수정 | ✅ | OK |
| addresses.ts 수정 | ✅ | OK |

### 검증 통과: ✅

---

→ 다음: [Step 02: useYieldVaultAPY 훅](step-02-apy-hook.md)
