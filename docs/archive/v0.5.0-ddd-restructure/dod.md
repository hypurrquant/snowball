# DoD (Definition of Done) - v0.5.0

## 기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| F1 | `src/core/` 디렉토리에 ABI(6파일) + config(2파일) = 8파일 존재 | `ls apps/web/src/core/abis/*.ts \| wc -l` = 6, `ls apps/web/src/core/config/*.ts \| wc -l` = 2 |
| F2 | `src/shared/` 디렉토리에 components/(ui, layout, background, common) + hooks + lib + providers.tsx + config = 27파일 존재 | `find apps/web/src/shared \( -name '*.ts' -o -name '*.tsx' \) \| wc -l` = 27 |
| F2a | `src/shared/providers.tsx` 파일 존재 (파일명 변경 없음) | `test -f apps/web/src/shared/providers.tsx && echo OK` |
| F3 | `src/domains/trade/hooks/`에 useSwap, usePool, useAddLiquidity 3파일 존재 | `ls apps/web/src/domains/trade/hooks/*.ts \| wc -l` = 3 |
| F4 | `src/domains/defi/lend/`에 hooks/useLendMarkets + lib/lendMath = 2파일 존재 | `find apps/web/src/domains/defi/lend -name '*.ts' \| wc -l` = 2 |
| F5 | `src/domains/defi/yield/`에 hooks/useYieldVaults + components/(VaultCard, VaultActionDialog) = 3파일 존재 | `find apps/web/src/domains/defi/yield \( -name '*.ts' -o -name '*.tsx' \) \| wc -l` = 3 |
| F6 | `src/domains/options/`에 hooks/(useOptions, useOptionsPrice) + components/PriceChart = 3파일 존재 | `find apps/web/src/domains/options \( -name '*.ts' -o -name '*.tsx' \) \| wc -l` = 3 |
| F7 | 기존 `src/abis/`, `src/config/`, `src/components/`, `src/hooks/`, `src/lib/` 디렉토리가 삭제됨 | `ls -d apps/web/src/{abis,config,components,hooks,lib} 2>&1 \| grep -c "No such"` = 5 |
| F8 | `src/app/` 디렉토리 구조가 변경 전과 동일 (파일 추가/삭제/이름변경 없음) | `git diff --name-status -- apps/web/src/app/ \| grep -E '^[ADR]' \| wc -l` = 0 |
| F9 | tsconfig.json에 `@/core/*`, `@/shared/*`, `@/domains/*`, `@/app/*` path alias 존재 (4개) | `grep -cE '@/(core\|shared\|domains\|app)/\*' apps/web/tsconfig.json` = 4 |
| F10 | 잔여 old-style import 0건 | `grep -rn "from ['\"]@/abis\|from ['\"]@/config/\|from ['\"]@/components/\|from ['\"]@/hooks/\|from ['\"]@/lib/" apps/web/src/ \| wc -l` = 0 |
| F11 | shadcn `components.json`의 ui alias가 `@/shared/components/ui`를 가리킴 | `grep 'ui' apps/web/components.json`에서 `@/shared/components/ui` 확인 |

## 비기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| N1 | TypeScript 에러 0 | `cd apps/web && npx tsc --noEmit` exit code 0 |
| N2 | ESLint 에러 0 | `cd apps/web && npx eslint .` exit code 0 |
| N3 | Next.js 빌드 성공 | `cd apps/web && npx next build` exit code 0 |
| N4 | 런타임 동작 변경 없음 — 순수 구조 이동 | `git diff --stat`에서 import 경로 외 코드 로직 변경 없음 (수동 확인) |
| N5 | git history 보존 — 이동된 파일의 히스토리 추적 가능 | `git log --follow --oneline -3 apps/web/src/shared/lib/utils.ts` 에서 이동 전 커밋 이력 확인 |

## 엣지케이스

| # | 시나리오 | 기대 동작 | 검증 방법 |
|---|---------|----------|----------|
| E1 | `core/` 내 파일이 React를 import | core에 React 의존성 없어야 함 | `grep -rn "from ['\"]react" apps/web/src/core/ \| wc -l` = 0 |
| E2 | `shared/` 내 파일이 `domains/`를 import | 의존성 방향 위반 없어야 함 | `grep -rn "from ['\"]@/domains" apps/web/src/shared/ \| wc -l` = 0 |
| E3 | `domains/` 내 파일이 다른 domain을 cross-import | cross-domain import 없어야 함 (defi/lend ↔ defi/yield도 금지) | 도메인별 검증 (`-h`로 파일경로 제거 후 import 내용만 필터): `grep -rhn "from ['\"]@/domains/" apps/web/src/domains/trade/ \| grep -v "@/domains/trade/" \| wc -l` = 0, `grep -rhn "from ['\"]@/domains/" apps/web/src/domains/defi/lend/ \| grep -v "@/domains/defi/lend/" \| wc -l` = 0, `grep -rhn "from ['\"]@/domains/" apps/web/src/domains/defi/yield/ \| grep -v "@/domains/defi/yield/" \| wc -l` = 0, `grep -rhn "from ['\"]@/domains/" apps/web/src/domains/options/ \| grep -v "@/domains/options/" \| wc -l` = 0 |
| E4 | `core/` 내 파일 간 relative import가 정상 동작 | `core/config/chain.ts`의 import 정상 | `cd apps/web && npx tsc --noEmit` 통과로 검증 |
| E5 | `@/*` 기존 alias 제거 후에도 빌드 정상 | 기존 `@/*` fallback 없이 빌드 통과 | tsconfig에서 `@/*` 제거 후 `cd apps/web && npx tsc --noEmit && npx next build` 통과 |

## PRD 목표 ↔ DoD 매핑

| PRD 목표 | DoD 항목 |
|----------|---------|
| DDD 4계층 재구성 | F1, F2, F3, F4, F5, F6, F7 |
| 작업 단계 A: core + shared 추출 | F1, F2, F2a |
| 작업 단계 B: domains 구분 | F3, F4, F5, F6 |
| import 경로 업데이트 | F9, F10, F11 |
| tsc/build 통과 | N1, N2, N3 |
| 기능 변경 없음 | N4 |
| (more) 라우트 유지 | F8 |

## 설계 결정 ↔ DoD 매핑

| 설계 결정 | DoD 항목 |
|----------|---------|
| git mv 파일 이동 (history 보존) | N5 |
| tsconfig path alias (4개: core, shared, domains, app) | F9 |
| import 치환 규칙 | F10 |
| shadcn components.json 업데이트 | F11 |
| 의존성 방향 규칙 (core←shared←domains←app) | E1, E2, E3 |
| @/* alias 제거 | E5 |
| providers.tsx 파일명 유지 | F2a |
