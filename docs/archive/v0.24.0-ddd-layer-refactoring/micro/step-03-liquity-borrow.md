# Step 03: Liquity + Borrow Page Slimming (Sprint 3)

## 메타데이터
- **난이도**: 🔴 어려움
- **롤백 가능**: ✅ (파일 이동/추출 복구)
- **선행 조건**: Step 01 (constants 패턴 확립)

---

## 1. 구현 내용 (design.md 기반)

### 3-1. Liquity 상수 추출 → `liquity/lib/constants.ts`
- `BRANCH_INDEX`, `ETH_GAS_COMPENSATION`, `MIN_DEBT`, `MIN_INTEREST_RATE`, `MAX_INTEREST_RATE`
- `useTroveActions.ts`, `borrow/page.tsx`에서 인라인 정의 제거 → import

### 3-2. Position preview 순수 계산 → `liquityMath.ts` 확장
- `computePositionPreview()` 함수 추가 (CR/fee/maxBorrow/liquidationPrice)
- `usePositionPreview.ts` → thin wrapper (crColor만 hook에 유지)

### 3-3. Market rate stats 순수 계산 → `liquityMath.ts` 확장
- `computeRateStats(rates: number[])` 함수 추가 (정렬/평균/중앙값)
- `useMarketRateStats.ts` → thin wrapper

### 3-4. TroveDelegation UI 컴포넌트 추출
- `borrow/page.tsx`에서 delegation UI ~200줄을 `TroveDelegation.tsx`로 추출
- Props-only: `useVaultPermission` (agent domain)은 app layer에서 호출, props로 전달
- `useTroveDelegationStatus`, `useTroveDelegate` (liquity domain)는 내부 호출 가능

### 3-5. useOpenTrovePipeline hook 생성
- `borrow/page.tsx`의 `handleOpenTrove`, txSteps, txPhase, showTxModal 캡슐화
- `validateOpenTrove()` 순수 함수를 `liquityMath.ts`에 추가 (3-6)

### 3-6. Validation 로직 추출
- `borrow/page.tsx`의 `errors`, `canOpen`, `getButtonText()` → `validateOpenTrove()` in `liquityMath.ts`
- `handleHalf`, `handleMax`, `handleSafe` quick-fill → `useOpenTrovePipeline` 또는 lib 함수

## 2. 완료 조건
- [ ] `grep -c "export" apps/web/src/domains/defi/liquity/lib/constants.ts` ≥ 3 (ETH_GAS_COMPENSATION, BRANCH_INDEX, MIN_DEBT 등)
- [ ] `grep "export function computePositionPreview" apps/web/src/domains/defi/liquity/lib/liquityMath.ts` — 1건
- [ ] `grep "export function computeRateStats" apps/web/src/domains/defi/liquity/lib/liquityMath.ts` — 1건
- [ ] `grep -c "useVaultPermission\|useAgentList" apps/web/src/domains/defi/liquity/components/TroveDelegation.tsx` — 0건
- [ ] `grep "export.*function useOpenTrovePipeline\|handleOpenTrove" apps/web/src/domains/defi/liquity/hooks/useOpenTrovePipeline.ts` — 1건 이상 (hook 존재 + handleOpenTrove export)
- [ ] `grep -c "const handleOpenTrove\|const errors\|const canOpen\|const handleHalf\|const handleMax\|const handleSafe" apps/web/src/app/\(defi\)/liquity/borrow/page.tsx` — 0건
- [ ] `grep -rn "200000000000000000n" apps/web/src/domains/defi/liquity/hooks/` — 0건
- [ ] `grep -l "from.*lib/" apps/web/src/domains/defi/liquity/hooks/usePositionPreview.ts apps/web/src/domains/defi/liquity/hooks/useMarketRateStats.ts` — 2개 파일 모두 매칭
- [ ] `cd apps/web && npx next build` — exit code 0
- [ ] Borrow 페이지 수동 QA: delegate/undelegate 플로우 실행 확인 (E4), approve→openTrove tx 시퀀스 실행 확인 (E5), 수치 표시 정상 확인 (N3)

## 3. 롤백 방법
- `git revert` 가능. 새 파일 삭제, page/hook 원복
- 영향 범위: liquity 도메인 + borrow page

---

## Scope

### 수정 대상 파일
```
apps/web/src/domains/defi/liquity/
├── hooks/useTroveActions.ts      # 수정 - 상수를 constants import로 교체
├── hooks/usePositionPreview.ts   # 수정 - thin wrapper로 축소
├── hooks/useMarketRateStats.ts   # 수정 - thin wrapper로 축소
└── lib/liquityMath.ts            # 수정 - computePositionPreview, computeRateStats, validateOpenTrove 추가

apps/web/src/app/(defi)/liquity/borrow/
└── page.tsx                      # 수정 - delegation UI/handleOpenTrove/validation/quick-fill 제거, hook/component import
```

### 신규 생성 파일
```
apps/web/src/domains/defi/liquity/
├── lib/constants.ts              # 신규 - BRANCH_INDEX, ETH_GAS_COMPENSATION 등
├── hooks/useOpenTrovePipeline.ts # 신규 - tx pipeline 캡슐화
└── components/TroveDelegation.tsx # 신규 - delegation UI (props-only)
```

### 의존성 순서
```
3-1 (constants) → 3-2 (preview, constants 참조) → 3-6 (validation, preview 타입 필요) → 3-4 (delegation) → 3-5 (pipeline)
3-3 (rate stats) — 독립
```

### Side Effect 위험
- `borrow/page.tsx` 748줄 → ~400줄: 대폭 축소로 상태 흐름 변경 위험 → useOpenTrovePipeline이 모든 tx 상태 캡슐화
- TroveDelegation props 과다 가능 → 내부에서 liquity domain hook 직접 호출로 완화
- crColor 같은 UI 값 → hook에 남기고 순수 계산만 lib으로

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| useTroveActions.ts | 3-1 상수 교체 | ✅ OK |
| usePositionPreview.ts | 3-2 thin wrapper | ✅ OK |
| useMarketRateStats.ts | 3-3 thin wrapper | ✅ OK |
| liquityMath.ts | 3-2, 3-3, 3-6 함수 추가 | ✅ OK |
| borrow/page.tsx | 3-4, 3-5, 3-6 로직 제거 | ✅ OK |
| constants.ts | 3-1 상수 파일 | ✅ OK |
| useOpenTrovePipeline.ts | 3-5 pipeline | ✅ OK |
| TroveDelegation.tsx | 3-4 UI 컴포넌트 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| 상수 추출 | ✅ | OK |
| preview 계산 추출 | ✅ | OK |
| rate stats 추출 | ✅ | OK |
| delegation UI 분리 | ✅ | OK |
| tx pipeline 추출 | ✅ | OK |
| validation 추출 | ✅ | OK |

### 검증 통과: ✅

---

> 다음: [Step 04: Trade + Pool](step-04-trade-pool.md)
