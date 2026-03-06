# Step 05: 통합 검증

## 메타데이터
- **난이도**: 🟢 쉬움
- **롤백 가능**: N/A (검증만 수행)
- **선행 조건**: Step 01, 02, 03, 04 완료

---

## 1. 구현 내용 (design.md 기반)

검증 전용 Step. 코드 변경 없음.

### 검증 항목

| # | 검증 | 명령어 |
|---|------|--------|
| V1 | yield.ts 무변경 확인 | `git diff apps/web/src/abis/yield.ts` 결과 없음 |
| V2 | abis/index.ts export 구조 유지 | 5개 파일 re-export 확인 |
| V3 | TypeScript 컴파일 | `pnpm --filter @snowball/web exec tsc --noEmit` |
| V4 | Next.js 빌드 | `pnpm --filter @snowball/web build` |
| V5 | Dead import 0건 | `ActivePoolABI`, `OptionsVaultABI`(useOptions), `AdaptiveCurveIRMABI` Grep |

## 2. 완료 조건

- [ ] `git diff apps/web/src/abis/yield.ts` 출력 없음 (N3)
- [ ] `abis/index.ts`가 dex, options, lend, liquity, yield 5개 re-export (N4)
- [ ] `pnpm --filter @snowball/web exec tsc --noEmit` 성공 (exit 0) (N1)
- [ ] `pnpm --filter @snowball/web build` 성공 (exit 0) (N2)
- [ ] `ActivePoolABI` import가 `borrow/page.tsx`에 없음 (F10)
- [ ] `AdaptiveCurveIRMABI` import가 `useLendMarkets.ts`에 없음 (F10)
- [ ] `OptionsVaultABI` import가 `useOptions.ts`에 없음 (F10)

## 3. 롤백 방법
- N/A (검증만 수행, 코드 변경 없음)
- 빌드 실패 시: Step 01~04에서 원인 파일을 특정하여 수정

---

## Scope

### 수정 대상 파일
없음 (검증만 수행)

### 검증 대상 파일
```
apps/web/src/
├── abis/yield.ts               # 무변경 확인
├── abis/index.ts               # export 구조 확인
├── abis/liquity.ts             # tsc 대상
├── abis/lend.ts                # tsc 대상
├── abis/options.ts             # tsc 대상
├── abis/dex.ts                 # tsc 대상
├── app/(defi)/borrow/page.tsx  # dead import 확인
├── hooks/defi/useLendMarkets.ts # dead import 확인
└── hooks/options/useOptions.ts  # dead import 확인
```

### Side Effect 위험
- 없음 (읽기 전용 검증)

## FP/FN 검증

### 검증 전용 Step이므로 N/A

### 검증 통과: ✅

---

→ 완료: Phase v0.3.0 개발 종료
