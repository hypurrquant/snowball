# Step 05: Morpho + Yield + Agent (Sprint 5)

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: ✅ (파일 이동/추출 복구)
- **선행 조건**: Step 01 (deep import 정리 완료)

---

## 1. 구현 내용 (design.md 기반)

### 5-1. morphoMath.ts 이동: shared → morpho/lib
- `shared/lib/morphoMath.ts` → `domains/defi/morpho/lib/morphoMath.ts`
- 원래 위치에 re-export 남김
- 7개 함수: `toAssetsDown`, `toSharesDown`, `borrowRateToAPR`, `utilization`, `supplyAPY`, `calculateHealthFactor`, `calculateLiquidationPrice`

### 5-2. Morpho 매직 넘버 상수화
- `ORACLE_SCALE`, `FALLBACK_BORROW_APR_MULTIPLIER`, `MarketTuple`, `ParamsTuple`
- `morpho/lib/constants.ts` 생성
- 소비처 교체:
  - `hooks/useMorphoMarkets.ts` — `FALLBACK_BORROW_APR_MULTIPLIER` (util * 0.08)
  - `hooks/useMorphoPosition.ts` — `ORACLE_SCALE` (10n ** 36n)

### 5-3. Yield vault mapper 추출
- `useYieldVaults.ts`에서 `buildVaultReadPlan`, `mapVaultResults` 추출 → `yield/lib/vaultMapper.ts`
- `VaultData` 타입 → `yield/types.ts`

### 5-4. Yield 상수 추출
- `STRATEGY_FEE_MULTIPLIER`, `morphoVaults` 필터링 → `yield/lib/constants.ts`
- `useYieldVaultAPY.ts`에서 import

### 5-5. Agent 상수/타입 추출
- `KNOWN_TOKENS`, `GENERAL_TAG`, `PERMISSION_EXPIRY_SECONDS`, `AGENT_RATE_BOUNDS`
- `agent/lib/constants.ts` 생성
- 소비처 교체:
  - `hooks/useVaultPermission.ts` — `KNOWN_TOKENS`
  - `hooks/useAgentProfile.ts` — `GENERAL_TAG`
  - `hooks/useSubmitReview.ts` — `GENERAL_TAG`
  - `components/PermissionForm.tsx` — `PERMISSION_EXPIRY_SECONDS`, token lists
  - `components/DelegationSetupWizard.tsx` — rate bounds, expiry

### 5-6. Agent result mapper 추출
- `useAgentList.ts`, `useMyAgents.ts` 공통 매핑 → `agent/lib/agentMapper.ts`
- `mapAgentResults` 함수

## 2. 완료 조건
- [ ] `grep "toAssetsDown\|toSharesDown\|borrowRateToAPR\|utilization\|supplyAPY\|calculateHealthFactor\|calculateLiquidationPrice" apps/web/src/domains/defi/morpho/lib/morphoMath.ts` — 7건
- [ ] `grep "export.*from" apps/web/src/shared/lib/morphoMath.ts` — re-export 패턴 1건
- [ ] `grep -c "export" apps/web/src/domains/defi/morpho/lib/constants.ts` ≥ 2
- [ ] `grep -l "from.*lib/constants" apps/web/src/domains/defi/morpho/hooks/useMorphoMarkets.ts apps/web/src/domains/defi/morpho/hooks/useMorphoPosition.ts` — 2개 파일 모두 매칭 (소비처 교체 확인)
- [ ] `grep "export function buildVaultReadPlan\|export function mapVaultResults" apps/web/src/domains/defi/yield/lib/vaultMapper.ts` — 2건
- [ ] `grep -c "export" apps/web/src/domains/defi/yield/lib/constants.ts` ≥ 1
- [ ] `grep -c "export" apps/web/src/domains/agent/lib/constants.ts` ≥ 3
- [ ] `grep -l "from.*lib/constants" apps/web/src/domains/agent/hooks/useVaultPermission.ts apps/web/src/domains/agent/hooks/useAgentProfile.ts apps/web/src/domains/agent/hooks/useSubmitReview.ts apps/web/src/domains/agent/components/PermissionForm.tsx apps/web/src/domains/agent/components/DelegationSetupWizard.tsx` — 5개 파일 모두 매칭 (소비처 교체 확인)
- [ ] `grep -l "from.*lib/constants" apps/web/src/domains/defi/yield/hooks/useYieldVaultAPY.ts` — 매칭 (yield 상수 소비처 확인)
- [ ] `grep "export function mapAgentResults" apps/web/src/domains/agent/lib/agentMapper.ts` — 1건
- [ ] `grep -l "from.*lib/" apps/web/src/domains/defi/yield/hooks/useYieldVaults.ts apps/web/src/domains/agent/hooks/useAgentList.ts apps/web/src/domains/agent/hooks/useMyAgents.ts` — 3개 파일 모두 매칭
- [ ] `cd apps/web && npx next build` — exit code 0
- [ ] Lend, Yield, Agent 페이지 수동 접속 → 정상 렌더링 + 수치 표시 확인 (N3, E3)
- [ ] `git diff -- "apps/web/src/app/(options)/" "apps/web/src/domains/options/"` — 변경 0건 (N4)
- [ ] `git diff -- "apps/web/src/core/abis/" "apps/web/src/core/config/" "apps/web/src/core/dex/"` — 변경 0건 (N6)

## 3. 롤백 방법
- `git revert` 가능. morphoMath re-export 복구, 새 lib 파일 삭제
- 영향 범위: morpho, yield, agent 도메인

---

## Scope

### 수정 대상 파일
```
apps/web/src/shared/lib/
└── morphoMath.ts                       # 수정 - re-export로 변경

apps/web/src/domains/defi/morpho/
├── hooks/useMorphoMarkets.ts           # 수정 - import 경로 변경 + FALLBACK 상수 import
└── hooks/useMorphoPosition.ts          # 수정 - import 경로 변경 + ORACLE_SCALE 상수 import

apps/web/src/domains/defi/yield/
├── hooks/useYieldVaults.ts             # 수정 - mapper 추출, lib import
└── hooks/useYieldVaultAPY.ts           # 수정 - constants import

apps/web/src/domains/agent/
├── hooks/useAgentList.ts               # 수정 - mapper 추출
├── hooks/useMyAgents.ts               # 수정 - mapper 추출
├── hooks/useVaultPermission.ts         # 수정 - KNOWN_TOKENS constants import
├── hooks/useAgentProfile.ts            # 수정 - GENERAL_TAG constants import
├── hooks/useSubmitReview.ts            # 수정 - GENERAL_TAG constants import
├── components/PermissionForm.tsx       # 수정 - PERMISSION_EXPIRY_SECONDS constants import
└── components/DelegationSetupWizard.tsx # 수정 - rate bounds, expiry constants import

apps/web/src/app/(defi)/morpho/borrow/
└── page.tsx                            # 수정 - import 경로 변경
```

### 신규 생성 파일
```
apps/web/src/domains/defi/morpho/lib/
├── morphoMath.ts                   # 이동 - shared에서 이동
└── constants.ts                    # 신규 - ORACLE_SCALE 등

apps/web/src/domains/defi/yield/
├── lib/vaultMapper.ts              # 신규 - vault read plan/mapping
├── lib/constants.ts                # 신규 - STRATEGY_FEE_MULTIPLIER
└── types.ts                        # 신규 - VaultData 타입

apps/web/src/domains/agent/lib/
├── constants.ts                    # 신규 - KNOWN_TOKENS, PERMISSION_EXPIRY_SECONDS 등
└── agentMapper.ts                  # 신규 - result mapper
```

### 의존성 순서
```
5-1 (morphoMath 이동) — 먼저 실행 (import 영향 넓음)
5-2~5-6 — 모두 독립적 (5-1 이후)
```

### Side Effect 위험
- morphoMath 이동 후 yield에서 morpho/lib import = cross-domain 의존성 → 허용 (정당한 의존)
- VaultData 타입 이동 시 기존 import 깨짐 → 빌드로 확인
- Agent mapper 통합 시 타입 차이 → 제네릭으로 대응

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| shared/lib/morphoMath.ts | 5-1 re-export | ✅ OK |
| useMorphoMarkets.ts | 5-1 import + 5-2 상수 | ✅ OK |
| useMorphoPosition.ts | 5-1 import + 5-2 상수 | ✅ OK |
| useYieldVaults.ts | 5-3 mapper 추출 | ✅ OK |
| useYieldVaultAPY.ts | 5-4 constants | ✅ OK |
| useAgentList.ts | 5-6 mapper 추출 | ✅ OK |
| useMyAgents.ts | 5-6 mapper 추출 | ✅ OK |
| useVaultPermission.ts | 5-5 constants | ✅ OK |
| useAgentProfile.ts | 5-5 constants | ✅ OK |
| useSubmitReview.ts | 5-5 constants | ✅ OK |
| PermissionForm.tsx | 5-5 constants | ✅ OK |
| DelegationSetupWizard.tsx | 5-5 constants | ✅ OK |
| morpho/borrow/page.tsx | 5-1 import 변경 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| morphoMath 이동 + re-export | ✅ | OK |
| morpho constants + 소비처 교체 | ✅ | OK |
| yield vault mapper | ✅ | OK |
| yield constants | ✅ | OK |
| agent constants + 소비처 교체 (5개 파일) | ✅ | OK |
| agent mapper | ✅ | OK |

### 검증 통과: ✅

---

> 완료 후: 전체 빌드 확인 + 수동 QA
