# Step 02: core/ + shared/ 파일 이동

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅ (git revert)
- **선행 조건**: Step 01

---

## 1. 구현 내용 (design.md 기반)
- core/ 이동: abis/ (6파일) + config/addresses.ts + config/chain.ts = 8파일
- shared/ 이동: components/ui/ (11파일) + layout/ (3) + background/ (5) + common/ (3) + providers.tsx + config/wagmi.ts + config/nav.tsx + hooks/useTokenBalance.ts + lib/utils.ts = 27파일
- 총 35파일 `git mv`

## 2. 완료 조건
- [ ] `ls apps/web/src/core/abis/*.ts | wc -l` = 6
- [ ] `ls apps/web/src/core/config/*.ts | wc -l` = 2
- [ ] `find apps/web/src/shared \( -name '*.ts' -o -name '*.tsx' \) | wc -l` = 27
- [ ] `test -f apps/web/src/shared/providers.tsx && echo OK`
- [ ] `abis/` 빈 디렉토리: `find apps/web/src/abis -name '*.ts' 2>/dev/null | wc -l` = 0
- [ ] `config/` 빈 디렉토리: `find apps/web/src/config -name '*.ts' -o -name '*.tsx' 2>/dev/null | wc -l` = 0

## 3. 롤백 방법
- `git revert HEAD` (단일 커밋이므로 revert 1회로 복원)

---

## Scope

### 이동 파일 (35파일)

#### core/ (8파일)
| 현재 | 목표 |
|------|------|
| `abis/dex.ts` | `core/abis/dex.ts` |
| `abis/lend.ts` | `core/abis/lend.ts` |
| `abis/liquity.ts` | `core/abis/liquity.ts` |
| `abis/options.ts` | `core/abis/options.ts` |
| `abis/yield.ts` | `core/abis/yield.ts` |
| `abis/index.ts` | `core/abis/index.ts` |
| `config/addresses.ts` | `core/config/addresses.ts` |
| `config/chain.ts` | `core/config/chain.ts` |

#### shared/ (27파일)
| 현재 | 목표 |
|------|------|
| `components/ui/*` (11) | `shared/components/ui/*` |
| `components/layout/*` (3) | `shared/components/layout/*` |
| `components/background/*` (5) | `shared/components/background/*` |
| `components/common/*` (3) | `shared/components/common/*` |
| `components/providers.tsx` | `shared/providers.tsx` |
| `config/wagmi.ts` | `shared/config/wagmi.ts` |
| `config/nav.tsx` | `shared/config/nav.tsx` |
| `hooks/useTokenBalance.ts` | `shared/hooks/useTokenBalance.ts` |
| `lib/utils.ts` | `shared/lib/utils.ts` |

### Side Effect 위험
- `config/wagmi.ts`가 `./chain`을 relative import → 이동 후 `@/core/config/chain`으로 변경 필요 (Step 03에서 처리)
- 이 Step 완료 직후 tsc는 실패할 수 있음 (import 경로 미갱신) — Step 03에서 해결

## FP/FN 검증
- FP: 없음 — design.md의 매핑 테이블과 1:1 대응
- FN: 없음 — `find apps/web/src \( -name '*.ts' -o -name '*.tsx' \) | wc -l`로 이동 전후 총 파일 수 동일 확인
- 검증 통과: ✅

---

→ 다음: [Step 03: domains/ 이동 + import 일괄 갱신](step-03-domains-imports.md)
