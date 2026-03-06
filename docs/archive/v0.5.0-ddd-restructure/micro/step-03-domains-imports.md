# Step 03: domains/ 이동 + import 일괄 갱신

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: ✅ (git revert)
- **선행 조건**: Step 02

---

## 1. 구현 내용 (design.md 기반)
- domains/ 이동: trade hooks(3) + defi/lend(2) + defi/yield(3) + options(3) = 11파일 `git mv`
- 전체 import 경로 일괄 갱신 (~140개 import 문)
- `config/wagmi.ts` 내 relative import `./chain` → `@/core/config/chain` 수정

## 2. 완료 조건
- [ ] `ls apps/web/src/domains/trade/hooks/*.ts | wc -l` = 3
- [ ] `find apps/web/src/domains/defi/lend -name '*.ts' | wc -l` = 2
- [ ] `find apps/web/src/domains/defi/yield \( -name '*.ts' -o -name '*.tsx' \) | wc -l` = 3
- [ ] `find apps/web/src/domains/options \( -name '*.ts' -o -name '*.tsx' \) | wc -l` = 3
- [ ] 잔여 old-style import 0건: `grep -rn "from ['\"]@/abis\|from ['\"]@/config/\|from ['\"]@/components/\|from ['\"]@/hooks/\|from ['\"]@/lib/" apps/web/src/ | wc -l` = 0
- [ ] `cd apps/web && npx tsc --noEmit` 통과
- [ ] `cd apps/web && npx next build` 통과

## 3. 롤백 방법
- `git revert HEAD` (단일 커밋이므로 revert 1회로 복원)

---

## Scope

### 이동 파일 (11파일)
| 현재 | 목표 |
|------|------|
| `hooks/trade/useSwap.ts` | `domains/trade/hooks/useSwap.ts` |
| `hooks/trade/usePool.ts` | `domains/trade/hooks/usePool.ts` |
| `hooks/trade/useAddLiquidity.ts` | `domains/trade/hooks/useAddLiquidity.ts` |
| `hooks/defi/useLendMarkets.ts` | `domains/defi/lend/hooks/useLendMarkets.ts` |
| `hooks/defi/useYieldVaults.ts` | `domains/defi/yield/hooks/useYieldVaults.ts` |
| `components/yield/VaultCard.tsx` | `domains/defi/yield/components/VaultCard.tsx` |
| `components/yield/VaultActionDialog.tsx` | `domains/defi/yield/components/VaultActionDialog.tsx` |
| `hooks/options/useOptions.ts` | `domains/options/hooks/useOptions.ts` |
| `hooks/options/useOptionsPrice.ts` | `domains/options/hooks/useOptionsPrice.ts` |
| `components/options/PriceChart.tsx` | `domains/options/components/PriceChart.tsx` |
| `lib/lendMath.ts` | `domains/defi/lend/lib/lendMath.ts` |

### Import 갱신 대상 (주요 치환 규칙)
| 현재 import | 목표 import | 출현 횟수 |
|-------------|-------------|-----------|
| `@/lib/utils` | `@/shared/lib/utils` | 29 |
| `@/config/addresses` | `@/core/config/addresses` | 17 |
| `@/components/ui/card` | `@/shared/components/ui/card` | 13 |
| `@/components/ui/button` | `@/shared/components/ui/button` | 11 |
| `@/abis` | `@/core/abis` | 11 |
| `@/components/ui/badge` | `@/shared/components/ui/badge` | 9 |
| `@/hooks/useTokenBalance` | `@/shared/hooks/useTokenBalance` | 7 |
| `@/components/ui/input` | `@/shared/components/ui/input` | 7 |
| `@/components/common/StatCard` | `@/shared/components/common/StatCard` | 7 |
| (기타 24개 패턴) | (각각 1-3회) | ~30 |

### Side Effect 위험
- `sed` 오탐: `@/components/` → `@/shared/components/` 치환 시 yield/options 컴포넌트도 shared로 잘못 치환 가능 → 도메인 전용은 별도 규칙으로 먼저 치환
- 치환 순서: 도메인 전용 패턴 먼저 → 공통 패턴 후 (longest match first)

## FP/FN 검증
- FP: 없음 — 모든 이동 대상이 design.md와 일치
- FN: `wagmi.ts` 내 `./chain` relative import — Step 02에서 이동했으므로 여기서 반드시 갱신
- 검증 통과: ✅ (FN 반영 완료)

---

→ 다음: [Step 04: Cleanup + 검증](step-04-cleanup-verify.md)
