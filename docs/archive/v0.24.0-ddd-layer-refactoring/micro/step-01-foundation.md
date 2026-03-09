# Step 01: Foundation Hygiene (Sprint 1)

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅ (re-export + 파일 삭제 복구)
- **선행 조건**: 없음

---

## 1. 구현 내용 (design.md 기반)

### 1-1. packages/core에 sortTokens 추가
- `shared/lib/utils.ts`에서 `sortTokens` 함수를 `packages/core/src/utils.ts`로 복사
- `packages/core/src/index.ts`에서 export
- `scripts/deploy/deploy-uniswap-v3.ts`의 로컬 `sortTokens` 제거 → `@snowball/core` import

### 1-2. packages/core에 parseTokenAmount 추가
- `shared/lib/utils.ts`에서 `parseTokenAmount` 함수를 `packages/core/src/utils.ts`로 복사
- `packages/core/src/index.ts`에서 export

### 1-3. formatUsdCompact 통합
- `shared/lib/utils.ts`에 `formatUsdCompact` 통합

### 1-4. deep import 제거
- `apps/web/src/domains/`, `shared/`, `app/` 내 `@snowball/core/src/...` deep import를 `@snowball/core` public import로 교체
- 대상 4개 파일:
  - `domains/trade/hooks/useUserPositions.ts` — `@snowball/core/src/dex/calculators` → `@snowball/core`
  - `domains/trade/hooks/useProtocolStats.ts` — `@snowball/core/src/volume/types` → `@snowball/core`
  - `domains/trade/hooks/usePoolList.ts` — `@snowball/core/src/volume/types` → `@snowball/core`
  - `domains/defi/liquity/hooks/useTroveDelegationStatus.ts` — `@snowball/core/src/config/addresses` → `@snowball/core`

### 1-5. needsApproval 순수 함수 추출
- `shared/hooks/useTokenApproval.ts`에서 ERC20 approval 판정 순수 로직을 `packages/core/src/utils.ts`로 추출
- `packages/core/src/index.ts`에서 export

### 1-6. TxStep 타입 이동 + TokenAmount 삭제
- `shared/types/tx.ts` → `apps/web/src/core/types/tx.ts`로 이동
- 원래 위치에 re-export 남김
- `shared/components/common/TokenAmount.tsx` 삭제 (사용처 없음)

## 2. 완료 조건
- [ ] `grep -r "export function sortTokens" packages/core/src/` — 1건
- [ ] `grep -r "export function parseTokenAmount" packages/core/src/` — 1건
- [ ] `grep -r "export function needsApproval" packages/core/src/` — 1건
- [ ] `grep "function sortTokens" scripts/deploy/deploy-uniswap-v3.ts` — 0건
- [ ] `grep "@snowball/core" scripts/deploy/deploy-uniswap-v3.ts` — 1건 이상
- [ ] `grep -r "@snowball/core/src/" apps/web/src/domains/ apps/web/src/shared/ apps/web/src/app/` — 0건
- [ ] `grep -c "TxStep\|TxPhase\|TxStepType\|TxStepStatus" apps/web/src/core/types/tx.ts` — 4건 이상
- [ ] `grep "export.*from.*core/types/tx" apps/web/src/shared/types/tx.ts` — 1건
- [ ] `ls apps/web/src/shared/components/common/TokenAmount.tsx` — 파일 없음
- [ ] `cd apps/web && npx next build` — exit code 0
- [ ] `cd apps/server && npx tsc --noEmit` — exit code 0
- [ ] `npx tsx -e "import { sortTokens } from '@snowball/core'; console.log(typeof sortTokens)"` — "function" 출력 (E6)
- [ ] `git diff -- "apps/web/src/core/abis/" "apps/web/src/core/config/" "apps/web/src/core/dex/"` — 변경 0건 (N6)

## 3. 롤백 방법
- `git revert` 가능. packages/core 추가분 제거, re-export 복구, TokenAmount.tsx 복구
- 영향 범위: packages/core, apps/web (import 경로만), scripts

---

## Scope

### 수정 대상 파일
```
packages/core/src/
├── utils.ts              # 수정 - sortTokens, parseTokenAmount, needsApproval 추가
└── index.ts              # 수정 - export 추가

apps/web/src/
├── shared/types/tx.ts                    # 수정 - re-export로 변경
├── shared/lib/utils.ts                   # 수정 - formatUsdCompact 통합
├── shared/hooks/useTokenApproval.ts      # 수정 - needsApproval import로 교체
├── shared/components/common/TokenAmount.tsx  # 삭제
├── domains/trade/hooks/useUserPositions.ts         # 수정 - deep import 교체
├── domains/trade/hooks/useProtocolStats.ts         # 수정 - deep import 교체
├── domains/trade/hooks/usePoolList.ts              # 수정 - deep import 교체
└── domains/defi/liquity/hooks/useTroveDelegationStatus.ts  # 수정 - deep import 교체

scripts/deploy/
└── deploy-uniswap-v3.ts  # 수정 - sortTokens를 @snowball/core에서 import
```

### 신규 생성 파일
```
apps/web/src/core/types/
└── tx.ts                 # 신규 - TxStep 등 타입 (shared에서 이동)
```

### Side Effect 위험
- packages/core 변경 → apps/server 빌드 확인 필수 (N2)
- sortTokens 함수 시그니처가 scripts 버전과 동일해야 함
- `getPositionAmounts`, `ProtocolStatsResponse`, `PoolStatsResponse`, `ERC8004`가 `@snowball/core` public export에 포함되어있어야 함

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| packages/core/src/utils.ts | 1-1, 1-2, 1-5 | ✅ OK |
| packages/core/src/index.ts | 1-1, 1-2, 1-5 export | ✅ OK |
| shared/types/tx.ts | 1-6 re-export | ✅ OK |
| shared/lib/utils.ts | 1-3 formatUsdCompact | ✅ OK |
| shared/hooks/useTokenApproval.ts | 1-5 needsApproval | ✅ OK |
| TokenAmount.tsx | 1-6 삭제 | ✅ OK |
| deploy-uniswap-v3.ts | 1-1 sortTokens 교체 | ✅ OK |
| core/types/tx.ts | 1-6 이동 대상 | ✅ OK |
| useUserPositions.ts | 1-4 deep import 교체 | ✅ OK |
| useProtocolStats.ts | 1-4 deep import 교체 | ✅ OK |
| usePoolList.ts | 1-4 deep import 교체 | ✅ OK |
| useTroveDelegationStatus.ts | 1-4 deep import 교체 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| sortTokens → core | ✅ | OK |
| parseTokenAmount → core | ✅ | OK |
| needsApproval → core | ✅ | OK |
| deep import 교체 (4개 파일) | ✅ | OK |
| TxStep 이동 | ✅ | OK |
| TokenAmount 삭제 | ✅ | OK |
| formatUsdCompact 통합 | ✅ | OK |

### 검증 통과: ✅

---

> 다음: [Step 02: Bridge](step-02-bridge.md)
