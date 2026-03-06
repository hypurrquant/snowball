# Step 01: TOKEN_INFO mockPriceUsd 추가

## 메타데이터
- **난이도**: 🟢 쉬움
- **롤백 가능**: ✅
- **선행 조건**: 없음

---

## 1. 구현 내용 (design.md 기반)

TOKEN_INFO의 타입을 확장하여 `mockPriceUsd` 필드를 추가한다.

- `Record<string, { symbol: string; name: string; decimals: number }>` → `Record<string, { symbol: string; name: string; decimals: number; mockPriceUsd: number }>`
- 각 토큰에 mock USD 가격 할당:
  - wCTC: 2.50
  - lstCTC: 2.60
  - sbUSD: 1.00
  - USDC: 1.00

## 2. 완료 조건
- [ ] TOKEN_INFO 타입에 `mockPriceUsd: number` 필드 존재
- [ ] 4개 토큰 모두 mockPriceUsd 값 할당
- [ ] `npx tsc --noEmit` 기존 에러(PriceChart.tsx:99) 외 신규 에러 0
- [ ] TOKEN_INFO를 import하는 7개 파일 모두 빌드 에러 없음

## 3. 롤백 방법
- `git checkout -- apps/web/src/core/config/addresses.ts`
- 영향 범위: addresses.ts 1개 파일

---

## Scope

### 수정 대상 파일
```
apps/web/src/core/config/addresses.ts  # 수정 - TOKEN_INFO 타입 확장 + mockPriceUsd 값 추가
```

### 신규 생성 파일
없음

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| swap/page.tsx | 간접 영향 | TOKEN_INFO import — 기존 필드만 사용, 영향 없음 |
| TokenSelector.tsx | 간접 영향 | TOKEN_INFO import — 기존 필드만 사용, 영향 없음 |
| PriceChart.tsx | 간접 영향 | TOKEN_INFO import — 기존 필드만 사용, 영향 없음 |
| pool/[pair]/page.tsx | 간접 영향 | TOKEN_INFO import — 이후 Step에서 mockPriceUsd 사용 |
| useTokenBalance.ts | 간접 영향 | TOKEN_INFO import — 기존 필드만 사용, 영향 없음 |
| pool/add/page.tsx | 간접 영향 | TOKEN_INFO import — 기존 필드만 사용, 영향 없음 |

### Side Effect 위험
- 없음. 필드 추가만으로 기존 코드에 영향 없음 (TypeScript 구조적 타이핑)

### 참고할 기존 패턴
- `apps/web/src/core/config/addresses.ts`: 현재 TOKEN_INFO 구조

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| addresses.ts | mockPriceUsd 추가 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| TOKEN_INFO 타입 확장 | ✅ addresses.ts | OK |
| mockPriceUsd 값 할당 | ✅ addresses.ts | OK |

### 검증 체크리스트
- [x] Scope의 모든 파일이 구현 내용과 연결됨
- [x] 구현 내용의 모든 항목이 Scope에 반영됨
- [x] 불필요한 파일(FP)이 제거됨
- [x] 누락된 파일(FN)이 추가됨

### 검증 통과: ✅

---

→ 다음: [Step 02: PriceRangeSelector 확장](step-02-price-range-selector.md)
