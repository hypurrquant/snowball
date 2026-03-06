# 설계 - v0.5.0

## 변경 규모
**규모**: 일반 기능
**근거**: 46개 파일 이동 (core 8 + shared 27 + domains 11), 새 디렉토리 구조 도입, ~120개 import 경로 변경. 단, 외부 API/DB 변경 없음, 런타임 동작 변경 없음.
**수치 산출**: shared 27 = ui(11) + layout(3) + background(5) + common(3) + providers(1) + config(2) + hooks(1) + lib(1)

---

## 문제 요약
`apps/web/src/`가 평면적 구조로 공통/도메인 코드가 혼재하여 탐색 비용이 높고, 의존성 방향이 불명확하며, 신규 기능 추가 시 위치 기준이 없음.

> 상세: [README.md](README.md) 참조

## 접근법
DDD 4계층(core/shared/domains/app) 구조로 재배치:
1. **core/**: React-free 코드 (ABI, 주소, 체인 설정) — 최내부, 의존성 없음
2. **shared/**: React 포함 공통 코드 (UI, layout, background, providers, 공통 hooks, utils) — core만 import
3. **domains/**: 도메인별 비즈니스 로직 (hooks + components 코로케이션) — core + shared만 import
4. **app/**: Next.js 페이지/라우팅 — 모든 계층 import 가능 (기존 구조 유지)

작업은 v0.5.0 내에서 2단계로 실행:
- **작업 단계 A**: core/ + shared/ 추출 (35개 파일 이동: core 8 + shared 27)
- **작업 단계 B**: domains/ 구분 (11개 파일 이동) + 전체 import 경로 업데이트

## 대안 검토

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: DDD 4계층 | React-free 경계 명시, 의존성 방향 명확, 도메인 코로케이션 | 파일 이동 규모 큼(46개) | ✅ |
| B: Feature-Slice Design | 기능 단위 완전 격리 | 규모 대비 과도, 독립 entity model 부족 | ❌ |
| C: Flat Domains Only | 간단, 이동 적음 | core/shared 미구분, React-free 경계 없음 | ❌ |
| D: ESLint Boundaries Only | 코드 이동 없이 규칙만 | 물리적 구조 미변경, 탐색 경험 개선 없음 | ❌ |

**선택 이유**: 코드베이스 규모(~60파일)에 DDD 4계층이 적합. React-free 경계(core)가 명시되어 ABI/config 재사용성 확보. Feature-Slice는 과도하고, Flat Domains는 공통/도메인 구분이 안 됨.

## 기술 결정

### 파일 이동 전략
- `git mv`로 이동하여 git history 보존
- leaf(도메인 전용) → shared → core 순서로 이동 (import 깨짐 최소화)

### tsconfig path alias

```jsonc
{
  "compilerOptions": {
    "paths": {
      "@/core/*": ["./src/core/*"],
      "@/shared/*": ["./src/shared/*"],
      "@/domains/*": ["./src/domains/*"],
      "@/app/*": ["./src/app/*"]
    }
  }
}
```

- 기존 `"@/*": ["./src/*"]`는 마이그레이션 중 유지, 완료 후 제거하여 계층 경계 강제
- shadcn `components.json`의 aliases도 `@/shared/components/ui`로 업데이트

### import 경로 치환 규칙 (주요)

| 현재 import | 목표 import |
|-------------|-------------|
| `@/abis` / `@/abis/*` | `@/core/abis` / `@/core/abis/*` |
| `@/config/addresses` | `@/core/config/addresses` |
| `@/config/chain` | `@/core/config/chain` |
| `@/config/wagmi` | `@/shared/config/wagmi` |
| `@/config/nav` | `@/shared/config/nav` |
| `@/components/ui/*` | `@/shared/components/ui/*` |
| `@/components/layout/*` | `@/shared/components/layout/*` |
| `@/components/background/*` | `@/shared/components/background/*` |
| `@/components/common/*` | `@/shared/components/common/*` |
| `@/components/providers` | `@/shared/providers` |
| `@/lib/utils` | `@/shared/lib/utils` |
| `@/hooks/useTokenBalance` | `@/shared/hooks/useTokenBalance` |
| `@/hooks/trade/*` | `@/domains/trade/hooks/*` |
| `@/hooks/defi/useYieldVaults` | `@/domains/defi/yield/hooks/useYieldVaults` |
| `@/hooks/defi/useLendMarkets` | `@/domains/defi/lend/hooks/useLendMarkets` |
| `@/hooks/options/*` | `@/domains/options/hooks/*` |
| `@/components/yield/*` | `@/domains/defi/yield/components/*` |
| `@/components/options/*` | `@/domains/options/components/*` |
| `@/lib/lendMath` | `@/domains/defi/lend/lib/lendMath` |

### 파일 이동 매핑

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
| `components/ui/*` (11파일) | `shared/components/ui/*` |
| `components/layout/Header.tsx` | `shared/components/layout/Header.tsx` |
| `components/layout/MobileNav.tsx` | `shared/components/layout/MobileNav.tsx` |
| `components/layout/Sidebar.tsx` | `shared/components/layout/Sidebar.tsx` |
| `components/background/*` (5파일) | `shared/components/background/*` |
| `components/common/*` (3파일) | `shared/components/common/*` |
| `components/providers.tsx` | `shared/providers.tsx` |
| `config/wagmi.ts` | `shared/config/wagmi.ts` |
| `config/nav.tsx` | `shared/config/nav.tsx` |
| `hooks/useTokenBalance.ts` | `shared/hooks/useTokenBalance.ts` |
| `lib/utils.ts` | `shared/lib/utils.ts` |

#### domains/ (11파일)
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

### 의존성 방향 규칙
```
app/ → domains/ → shared/ → core/
        ↘ shared/ ↗
```
- cross-domain import 금지 (trade → options 등)
- core/는 외부 패키지(`viem`)만 import

---

## 범위 / 비범위
- **범위**: 파일 이동 46개 (core 8 + shared 27 + domains 11), import 경로 치환 ~120개, tsconfig alias, components.json
- **비범위**: 기능 변경, 코드 수정(import 경로 외), barrel export, AST 검증 스크립트, `app/` 라우트 구조 변경

## 아키텍처 개요

```
src/
├── core/                    ← Layer 0: React-free
│   ├── abis/                  ABI 정의 (6파일)
│   └── config/                addresses.ts, chain.ts
├── shared/                  ← Layer 1: React 공통
│   ├── components/
│   │   ├── ui/                shadcn components (11파일)
│   │   ├── layout/            Header, MobileNav, Sidebar
│   │   ├── background/        Aurora, Snow, SnowGround, Snowball, terrain
│   │   └── common/            StatCard, TokenAmount, TokenSelector
│   ├── hooks/                 useTokenBalance
│   ├── lib/                   utils.ts
│   ├── providers.tsx           Providers 컴포넌트
│   └── config/                wagmi.ts, nav.tsx
├── domains/                 ← Layer 2: 도메인 비즈니스 로직
│   ├── trade/
│   │   └── hooks/             useSwap, usePool, useAddLiquidity
│   ├── defi/
│   │   ├── lend/
│   │   │   ├── hooks/         useLendMarkets
│   │   │   └── lib/           lendMath.ts
│   │   └── yield/
│   │       ├── hooks/         useYieldVaults
│   │       └── components/    VaultCard, VaultActionDialog
│   └── options/
│       ├── hooks/             useOptions, useOptionsPrice
│       └── components/        PriceChart
└── app/                     ← Layer 3: Next.js 라우팅 (변경 없음)
    ├── layout.tsx
    ├── page.tsx
    ├── (trade)/
    ├── (defi)/
    ├── (options)/
    └── (more)/
```

## 테스트 전략
- **tsc --noEmit**: 전체 타입 체크 — import 경로 오류 검출
- **next build**: 전체 빌드 — 런타임 의존성 검증
- **grep 검증**: 잔여 old-style import(`@/abis`, `@/config/`, `@/components/`, `@/hooks/`, `@/lib/`) 0건 확인
- **수동 검증 불필요**: 순수 구조 이동이므로 런타임 동작 변경 없음

## 가정/제약
- Next.js App Router의 `app/` 디렉토리는 프레임워크 제약으로 이동 불가 — DDD app 계층으로 그대로 사용
- macOS 파일시스템은 case-insensitive — 파일명 대소문자 변경 없이 이동 (providers.tsx → shared/providers.tsx로 파일명 유지)
- `"use client"` directive는 파일 단위이므로 barrel export 생성 시 주의 필요 — 이번 Phase에서 barrel 미생성으로 회피
- 기존 `@/*` alias는 마이그레이션 완료 시점까지 유지하여 점진적 전환 지원

N/A: 데이터 흐름 — 데이터 흐름 변경 없음
N/A: API/인터페이스 계약 — API 변경 없음
N/A: 데이터 모델/스키마 — 스키마 변경 없음
N/A: 실패/에러 처리 — 에러 처리 변경 없음
N/A: 성능/스케일 — 성능 영향 없음

## 리스크/오픈 이슈

| 리스크 | 영향 | 완화 방법 |
|--------|------|----------|
| sed 일괄 치환 시 오탐/미탐 | 빌드 실패 | tsc + grep 잔여 검증으로 전수 확인 |
| `@/*` 제거 후 누락 import | 빌드 실패 | 제거 전 full grep, tsc 통과 확인 후 제거 |
| shadcn CLI 경로 불일치 | 향후 shadcn add 실패 | components.json aliases 업데이트 |
| relative import 깨짐 (`./chain` 등) | 빌드 실패 | 파일 내 relative import 수동 확인 |
| 롤백 필요 시 | - | single commit이므로 git revert 1회로 복원 |
