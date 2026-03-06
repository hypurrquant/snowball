# DDD 4-Layer Structure Refactoring Plan

**Date**: 2026-03-06
**Scope**: `apps/web/src/` directory restructuring
**Type**: Pure structural refactoring (zero runtime behavior change)
**Risk Level**: Medium (broad file moves, but no logic changes)

---

## 1. Summary

`apps/web/src/`의 flat 구조를 DDD 4계층(`core/shared/domains/app`)으로 재구조화한다.
36개 파일을 이동하고, 약 120개의 import 경로를 갱신하며, tsconfig path alias를 교체한다.
목표는 React-free 경계를 명시적으로 분리하고, 도메인 모듈 간 결합도를 낮추며,
코드 탐색과 신규 기능 추가 시의 인지 부하를 줄이는 것이다.

---

## 2. Current State Analysis

### 2.1 File Inventory (36 files, excluding app/)

| Category | Files | React Dependency |
|----------|-------|-----------------|
| abis/ | 6 (dex, lend, liquity, options, yield, index) | None |
| config/ | 4 (addresses, chain, nav, wagmi) | nav.tsx, wagmi.ts only |
| hooks/ | 8 (useTokenBalance + domain hooks) | All "use client" |
| components/ | 17 (ui/11, layout/3, background/5, common/3, options/1, yield/2, providers) | All "use client" |
| lib/ | 2 (utils, lendMath) | None |

### 2.2 Dependency Graph (Simplified)

```
                    +-----------+
                    |   viem    |  (external)
                    +-----+-----+
                          |
              +-----------+-----------+
              |                       |
        config/addresses.ts     config/chain.ts        abis/*
        (TOKENS, DEX, LEND,    (creditcoinTestnet)    (pure ABI consts)
         LIQUITY, OPTIONS,           |
         YIELD, API_BASE)            |
              |                      |
              |              config/wagmi.ts ---------> wagmi (external)
              |                      |
              +----------+-----------+
                         |
                  providers.tsx -----> privy, react-query
                         |
              +----------+-----------+----------+
              |          |           |          |
         hooks/trade  hooks/defi  hooks/options  hooks/useTokenBalance
              |          |           |               |
         (useSwap,  (useLendMarkets, (useOptions,    |
          usePool,   useYieldVaults)  useOptionsPrice)|
          useAddLiq.)    |               |           |
              |     lib/lendMath    components/      |
              |          |         options/PriceChart |
              +----+-----+-----+-----+-----+--------+
                   |                 |
            components/yield/    components/common/  <--- shared UI
            (VaultCard,          (StatCard, TokenAmount,
             VaultActionDialog)   TokenSelector)
                   |                 |
            +------+-----------------+-----+
            |                              |
      components/ui/ (shadcn)    components/layout/ + background/
            |                              |
      lib/utils.ts (cn, format*)    config/nav.tsx
```

### 2.3 Import Frequency (Most-Imported Files)

| File | Import Count | Consumers |
|------|-------------|-----------|
| `@/lib/utils` | 22 | UI components, pages, shared components |
| `@/config/addresses` | 14 | hooks, pages |
| `@/abis` | 10 | hooks, pages |
| `@/components/ui/card` | 10 | pages |
| `@/components/ui/button` | 8 | pages, yield components |
| `@/hooks/useTokenBalance` | 6 | pages, common/TokenSelector, yield components |
| `@/components/common/StatCard` | 6 | pages |
| `@/components/ui/badge` | 6 | pages |

---

## 3. Identified Issues and Opportunities

### 3.1 Structural Issues

| # | Issue | Severity | Description |
|---|-------|----------|-------------|
| S1 | React-free 경계 불명확 | Major | `abis/`, `config/addresses.ts`, `lib/lendMath.ts`는 React-free이나 React 의존 파일과 같은 level에 혼재 |
| S2 | 도메인 교차 참조 | Minor | yield 컴포넌트가 `@/hooks/defi/useYieldVaults` 타입을 직접 import -- 같은 도메인이므로 문제는 아니나 경로가 관례를 벗어남 |
| S3 | config/ 혼재 | Major | React-free(`addresses.ts`, `chain.ts`)와 React-dependent(`wagmi.ts`, `nav.tsx`)가 같은 디렉토리에 존재 |
| S4 | lib/ 범위 불명확 | Minor | `lendMath.ts`(lend 도메인 전용)와 `utils.ts`(범용)가 같은 level |

### 3.2 Naming/Convention Issues

| # | Issue | Severity |
|---|-------|----------|
| N1 | `components/providers.tsx` -- 단수형 파일이 components/ 최상위에 위치 | Minor |
| N2 | `hooks/defi/useYieldVaults.ts` -- "defi"는 상위 그룹이지만 yield/lend 구분이 하위에서만 발생 | Minor |

### 3.3 Opportunities

- **Core layer 격리**: React-free 파일을 `core/`로 격리하면 향후 Node.js 서버, CLI 도구, 유닛 테스트에서 직접 import 가능
- **도메인 모듈 응집도 향상**: yield의 hook과 component가 같은 디렉토리에 있으면 feature 단위 작업이 용이
- **Import path가 아키텍처 의도를 전달**: `@/domains/trade/hooks/useSwap` vs `@/hooks/trade/useSwap` -- 전자가 계층 위치를 명시

---

## 4. Target Structure

```
src/
  core/                          # React-free layer
    abis/
      dex.ts
      lend.ts
      liquity.ts
      options.ts
      yield.ts
      index.ts
    config/
      addresses.ts
      chain.ts

  shared/                        # Cross-domain, React-dependent
    components/
      ui/                        # shadcn (11 files)
        badge.tsx
        button.tsx
        card.tsx
        chart.tsx
        dialog.tsx
        input.tsx
        progress.tsx
        skeleton.tsx
        sonner.tsx
        tabs.tsx
        tooltip.tsx
      layout/
        Header.tsx
        MobileNav.tsx
        Sidebar.tsx
      background/
        AuroraBackground.tsx
        SnowballAnimation.tsx
        SnowGround.tsx
        SnowParticles.tsx
        snowTerrain.ts
      common/
        StatCard.tsx
        TokenAmount.tsx
        TokenSelector.tsx
    hooks/
      useTokenBalance.ts
    lib/
      utils.ts
    config/
      wagmi.ts
      nav.tsx
    providers.tsx

  domains/
    trade/
      hooks/
        useSwap.ts
        usePool.ts
        useAddLiquidity.ts
    defi/
      lend/
        hooks/
          useLendMarkets.ts
        lib/
          lendMath.ts
      yield/
        hooks/
          useYieldVaults.ts
        components/
          VaultCard.tsx
          VaultActionDialog.tsx
      borrow/                    # (empty - future domain logic)
    options/
      hooks/
        useOptions.ts
        useOptionsPrice.ts
      components/
        PriceChart.tsx

  app/                           # Next.js App Router (unchanged structure)
    layout.tsx
    page.tsx
    globals.css
    (defi)/
    (trade)/
    (options)/
    (more)/
```

---

## 5. File Movement Mapping (Complete)

### 5.1 core/ (8 files)

| # | Current Path | Target Path |
|---|-------------|-------------|
| 1 | `abis/dex.ts` | `core/abis/dex.ts` |
| 2 | `abis/lend.ts` | `core/abis/lend.ts` |
| 3 | `abis/liquity.ts` | `core/abis/liquity.ts` |
| 4 | `abis/options.ts` | `core/abis/options.ts` |
| 5 | `abis/yield.ts` | `core/abis/yield.ts` |
| 6 | `abis/index.ts` | `core/abis/index.ts` |
| 7 | `config/addresses.ts` | `core/config/addresses.ts` |
| 8 | `config/chain.ts` | `core/config/chain.ts` |

### 5.2 shared/ (25 files)

| # | Current Path | Target Path |
|---|-------------|-------------|
| 9 | `components/ui/badge.tsx` | `shared/components/ui/badge.tsx` |
| 10 | `components/ui/button.tsx` | `shared/components/ui/button.tsx` |
| 11 | `components/ui/card.tsx` | `shared/components/ui/card.tsx` |
| 12 | `components/ui/chart.tsx` | `shared/components/ui/chart.tsx` |
| 13 | `components/ui/dialog.tsx` | `shared/components/ui/dialog.tsx` |
| 14 | `components/ui/input.tsx` | `shared/components/ui/input.tsx` |
| 15 | `components/ui/progress.tsx` | `shared/components/ui/progress.tsx` |
| 16 | `components/ui/skeleton.tsx` | `shared/components/ui/skeleton.tsx` |
| 17 | `components/ui/sonner.tsx` | `shared/components/ui/sonner.tsx` |
| 18 | `components/ui/tabs.tsx` | `shared/components/ui/tabs.tsx` |
| 19 | `components/ui/tooltip.tsx` | `shared/components/ui/tooltip.tsx` |
| 20 | `components/layout/Header.tsx` | `shared/components/layout/Header.tsx` |
| 21 | `components/layout/MobileNav.tsx` | `shared/components/layout/MobileNav.tsx` |
| 22 | `components/layout/Sidebar.tsx` | `shared/components/layout/Sidebar.tsx` |
| 23 | `components/background/AuroraBackground.tsx` | `shared/components/background/AuroraBackground.tsx` |
| 24 | `components/background/SnowballAnimation.tsx` | `shared/components/background/SnowballAnimation.tsx` |
| 25 | `components/background/SnowGround.tsx` | `shared/components/background/SnowGround.tsx` |
| 26 | `components/background/SnowParticles.tsx` | `shared/components/background/SnowParticles.tsx` |
| 27 | `components/background/snowTerrain.ts` | `shared/components/background/snowTerrain.ts` |
| 28 | `components/common/StatCard.tsx` | `shared/components/common/StatCard.tsx` |
| 29 | `components/common/TokenAmount.tsx` | `shared/components/common/TokenAmount.tsx` |
| 30 | `components/common/TokenSelector.tsx` | `shared/components/common/TokenSelector.tsx` |
| 31 | `hooks/useTokenBalance.ts` | `shared/hooks/useTokenBalance.ts` |
| 32 | `lib/utils.ts` | `shared/lib/utils.ts` |
| 33 | `components/providers.tsx` | `shared/providers.tsx` |
| 34 | `config/wagmi.ts` | `shared/config/wagmi.ts` |
| 35 | `config/nav.tsx` | `shared/config/nav.tsx` |

### 5.3 domains/ (9 files)

| # | Current Path | Target Path |
|---|-------------|-------------|
| 36 | `hooks/trade/useSwap.ts` | `domains/trade/hooks/useSwap.ts` |
| 37 | `hooks/trade/usePool.ts` | `domains/trade/hooks/usePool.ts` |
| 38 | `hooks/trade/useAddLiquidity.ts` | `domains/trade/hooks/useAddLiquidity.ts` |
| 39 | `hooks/defi/useLendMarkets.ts` | `domains/defi/lend/hooks/useLendMarkets.ts` |
| 40 | `lib/lendMath.ts` | `domains/defi/lend/lib/lendMath.ts` |
| 41 | `hooks/defi/useYieldVaults.ts` | `domains/defi/yield/hooks/useYieldVaults.ts` |
| 42 | `components/yield/VaultCard.tsx` | `domains/defi/yield/components/VaultCard.tsx` |
| 43 | `components/yield/VaultActionDialog.tsx` | `domains/defi/yield/components/VaultActionDialog.tsx` |
| 44 | `hooks/options/useOptions.ts` | `domains/options/hooks/useOptions.ts` |
| 45 | `hooks/options/useOptionsPrice.ts` | `domains/options/hooks/useOptionsPrice.ts` |
| 46 | `components/options/PriceChart.tsx` | `domains/options/components/PriceChart.tsx` |

### 5.4 app/ (0 moves -- import paths only)

16 page/layout files remain in place. Only their `import` statements change.

---

## 6. Import Path Update Strategy

### 6.1 Substitution Rules

모든 `@/` import를 다음 규칙으로 일괄 치환한다.

```
@/abis           -->  @/core/abis
@/config/addresses  -->  @/core/config/addresses
@/config/chain      -->  @/core/config/chain

@/lib/utils         -->  @/shared/lib/utils
@/lib/lendMath      -->  @/domains/defi/lend/lib/lendMath
@/config/wagmi      -->  @/shared/config/wagmi
@/config/nav        -->  @/shared/config/nav
@/hooks/useTokenBalance  -->  @/shared/hooks/useTokenBalance

@/components/ui/        -->  @/shared/components/ui/
@/components/layout/    -->  @/shared/components/layout/
@/components/background/  -->  @/shared/components/background/
@/components/common/    -->  @/shared/components/common/
@/components/providers  -->  @/shared/providers

@/hooks/trade/          -->  @/domains/trade/hooks/
@/hooks/defi/useLendMarkets  -->  @/domains/defi/lend/hooks/useLendMarkets
@/hooks/defi/useYieldVaults  -->  @/domains/defi/yield/hooks/useYieldVaults
@/hooks/options/        -->  @/domains/options/hooks/

@/components/yield/     -->  @/domains/defi/yield/components/
@/components/options/   -->  @/domains/options/components/
```

### 6.2 Per-File Import Update Count

| File | Updates Required |
|------|-----------------|
| **shared/components/ui/*.tsx** (10 files) | 1 each (`@/lib/utils` -> `@/shared/lib/utils`) |
| **shared/components/layout/Header.tsx** | 3 (`@/lib/utils`, `@/components/providers`) |
| **shared/components/layout/MobileNav.tsx** | 2 (`@/lib/utils`, `@/config/nav`) |
| **shared/components/layout/Sidebar.tsx** | 2 (`@/lib/utils`, `@/config/nav`) |
| **shared/components/common/StatCard.tsx** | 1 (`@/lib/utils`) |
| **shared/components/common/TokenAmount.tsx** | 1 (`@/lib/utils`) |
| **shared/components/common/TokenSelector.tsx** | 5 (`@/hooks/useTokenBalance`, `@/components/ui/*`, `@/config/addresses`, `@/lib/utils`) |
| **shared/providers.tsx** | 2 (`@/config/wagmi`, `@/config/chain`) |
| **shared/config/wagmi.ts** | 1 (`./chain` -> `@/core/config/chain`) |
| **domains/trade/hooks/useSwap.ts** | 2 (`@/abis`, `@/config/addresses`) |
| **domains/trade/hooks/usePool.ts** | 3 (`@/abis`, `@/config/addresses`, `@/lib/utils`) |
| **domains/trade/hooks/useAddLiquidity.ts** | 2 (`@/abis`, `@/config/addresses`) |
| **domains/defi/lend/hooks/useLendMarkets.ts** | 3 (`@/abis`, `@/config/addresses`, `@/lib/lendMath`) |
| **domains/defi/yield/hooks/useYieldVaults.ts** | 2 (`@/config/addresses`, `@/abis`) |
| **domains/defi/yield/components/VaultCard.tsx** | 4 (`@/hooks/defi/useYieldVaults`, `@/lib/utils`, `@/components/ui/*`) |
| **domains/defi/yield/components/VaultActionDialog.tsx** | 7 (`@/components/ui/*`, `@/hooks/defi/useYieldVaults`, `@/abis`, `@/lib/utils`, `@/hooks/useTokenBalance`) |
| **domains/options/hooks/useOptions.ts** | 2 (`@/abis`, `@/config/addresses`) |
| **domains/options/hooks/useOptionsPrice.ts** | 1 (`@/config/addresses`) |
| **app/layout.tsx** | 5 |
| **app/(trade)/swap/page.tsx** | 7 |
| **app/(trade)/pool/page.tsx** | 5 |
| **app/(trade)/pool/add/page.tsx** | 7 |
| **app/(defi)/lend/page.tsx** | 5 |
| **app/(defi)/borrow/page.tsx** | 8 |
| **app/(defi)/earn/page.tsx** | 6 |
| **app/(defi)/yield/page.tsx** | 4 |
| **app/(options)/options/page.tsx** | 9 |
| **app/(options)/options/history/page.tsx** | 4 |
| **app/(more)/dashboard/page.tsx** | 6 |
| **app/(more)/analytics/page.tsx** | 2 |
| **app/(more)/agent/page.tsx** | 3 |
| **app/(more)/chat/page.tsx** | 4 |
| **Total** | **~120 import statements** |

### 6.3 Domain 내부 Import -- Relative vs Alias

도메인 내부 참조(예: `VaultCard.tsx`에서 `useYieldVaults.ts`)는 **relative import** 사용을 권장한다.

```typescript
// domains/defi/yield/components/VaultCard.tsx
import { VaultData } from "../hooks/useYieldVaults";     // relative (same domain)
import { formatTokenAmount } from "@/shared/lib/utils";   // alias (cross-layer)
import { Button } from "@/shared/components/ui/button";   // alias (cross-layer)
```

이유:
- 같은 도메인 내 파일 이동 시 alias 변경 불필요
- Import path 자체가 "이 의존성은 내부/외부인가"를 명시
- 도메인 경계를 넘는 import만 alias를 사용하므로 아키텍처 위반 감지 용이

---

## 7. tsconfig.json Path Alias Configuration

### 7.1 New Configuration

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

### 7.2 Migration Path

| Phase | `@/*` alias | New aliases | Purpose |
|-------|-------------|-------------|---------|
| Phase 1 (작업 중) | KEEP | ADD | 마이그레이션 안전망 -- 새 alias 추가만, 기존 유지 |
| Phase 2 (검증 후) | REMOVE | KEEP | 기존 `@/*` fallback 제거로 아키텍처 경계 강제 |

`@/*`를 유지하면 old-style import가 빌드를 통과하므로, 검증 완료 후 반드시 제거한다.

### 7.3 shadcn components.json Update

```json
{
  "aliases": {
    "components": "@/shared/components",
    "utils": "@/shared/lib/utils",
    "ui": "@/shared/components/ui",
    "lib": "@/shared/lib",
    "hooks": "@/shared/hooks"
  }
}
```

이 변경은 `npx shadcn add <component>` 실행 시 새 UI 컴포넌트가 올바른 경로에 생성되도록 한다.

---

## 8. Execution Plan (Step-by-Step)

### Phase 1: Preparation (estimated: 5 min)

| Step | Action | Command/Detail | Verification |
|------|--------|----------------|-------------|
| 1.1 | Git branch 생성 | `git checkout -b refactor/ddd-layer-structure` | branch 확인 |
| 1.2 | 현재 빌드 상태 확인 | `pnpm build` | exit 0 |
| 1.3 | tsconfig.json에 새 alias 추가 (기존 `@/*` 유지) | 위 7.1 + `"@/*": ["./src/*"]` 병행 | tsc --noEmit |

### Phase 2: Directory Creation (estimated: 2 min)

| Step | Action |
|------|--------|
| 2.1 | `mkdir -p src/{core/{abis,config},shared/{components/{ui,layout,background,common},hooks,lib,config},domains/{trade/hooks,defi/{lend/{hooks,lib},yield/{hooks,components},borrow},options/{hooks,components}}}` |

### Phase 3: File Moves via git mv (estimated: 10 min)

**순서가 중요하다.** 의존성의 leaf 노드(의존 당하는 파일)부터 이동한다.

#### Step 3.1: core/ 이동 (다른 모든 파일이 의존)
```bash
# abis
git mv src/abis/dex.ts src/core/abis/dex.ts
git mv src/abis/lend.ts src/core/abis/lend.ts
git mv src/abis/liquity.ts src/core/abis/liquity.ts
git mv src/abis/options.ts src/core/abis/options.ts
git mv src/abis/yield.ts src/core/abis/yield.ts
git mv src/abis/index.ts src/core/abis/index.ts

# config (React-free only)
git mv src/config/addresses.ts src/core/config/addresses.ts
git mv src/config/chain.ts src/core/config/chain.ts
```

#### Step 3.2: shared/ 이동 (domains와 app이 의존)
```bash
# lib
git mv src/lib/utils.ts src/shared/lib/utils.ts

# hooks
git mv src/hooks/useTokenBalance.ts src/shared/hooks/useTokenBalance.ts

# config (React-dependent)
git mv src/config/wagmi.ts src/shared/config/wagmi.ts
git mv src/config/nav.tsx src/shared/config/nav.tsx

# providers
git mv src/components/providers.tsx src/shared/providers.tsx

# UI components (11 files)
git mv src/components/ui/badge.tsx src/shared/components/ui/badge.tsx
git mv src/components/ui/button.tsx src/shared/components/ui/button.tsx
git mv src/components/ui/card.tsx src/shared/components/ui/card.tsx
git mv src/components/ui/chart.tsx src/shared/components/ui/chart.tsx
git mv src/components/ui/dialog.tsx src/shared/components/ui/dialog.tsx
git mv src/components/ui/input.tsx src/shared/components/ui/input.tsx
git mv src/components/ui/progress.tsx src/shared/components/ui/progress.tsx
git mv src/components/ui/skeleton.tsx src/shared/components/ui/skeleton.tsx
git mv src/components/ui/sonner.tsx src/shared/components/ui/sonner.tsx
git mv src/components/ui/tabs.tsx src/shared/components/ui/tabs.tsx
git mv src/components/ui/tooltip.tsx src/shared/components/ui/tooltip.tsx

# Layout components
git mv src/components/layout/Header.tsx src/shared/components/layout/Header.tsx
git mv src/components/layout/MobileNav.tsx src/shared/components/layout/MobileNav.tsx
git mv src/components/layout/Sidebar.tsx src/shared/components/layout/Sidebar.tsx

# Background components
git mv src/components/background/AuroraBackground.tsx src/shared/components/background/AuroraBackground.tsx
git mv src/components/background/SnowballAnimation.tsx src/shared/components/background/SnowballAnimation.tsx
git mv src/components/background/SnowGround.tsx src/shared/components/background/SnowGround.tsx
git mv src/components/background/SnowParticles.tsx src/shared/components/background/SnowParticles.tsx
git mv src/components/background/snowTerrain.ts src/shared/components/background/snowTerrain.ts

# Common components
git mv src/components/common/StatCard.tsx src/shared/components/common/StatCard.tsx
git mv src/components/common/TokenAmount.tsx src/shared/components/common/TokenAmount.tsx
git mv src/components/common/TokenSelector.tsx src/shared/components/common/TokenSelector.tsx
```

#### Step 3.3: domains/ 이동
```bash
# trade
git mv src/hooks/trade/useSwap.ts src/domains/trade/hooks/useSwap.ts
git mv src/hooks/trade/usePool.ts src/domains/trade/hooks/usePool.ts
git mv src/hooks/trade/useAddLiquidity.ts src/domains/trade/hooks/useAddLiquidity.ts

# defi/lend
git mv src/hooks/defi/useLendMarkets.ts src/domains/defi/lend/hooks/useLendMarkets.ts
git mv src/lib/lendMath.ts src/domains/defi/lend/lib/lendMath.ts

# defi/yield
git mv src/hooks/defi/useYieldVaults.ts src/domains/defi/yield/hooks/useYieldVaults.ts
git mv src/components/yield/VaultCard.tsx src/domains/defi/yield/components/VaultCard.tsx
git mv src/components/yield/VaultActionDialog.tsx src/domains/defi/yield/components/VaultActionDialog.tsx

# options
git mv src/hooks/options/useOptions.ts src/domains/options/hooks/useOptions.ts
git mv src/hooks/options/useOptionsPrice.ts src/domains/options/hooks/useOptionsPrice.ts
git mv src/components/options/PriceChart.tsx src/domains/options/components/PriceChart.tsx
```

#### Step 3.4: Empty directory cleanup
```bash
rmdir src/abis src/config src/hooks/trade src/hooks/defi src/hooks/options src/hooks src/components/yield src/components/options src/components/common src/components/background src/components/layout src/components/ui src/components src/lib
```
Note: `rmdir`는 디렉토리가 비어있을 때만 성공한다. 잔여 파일이 있으면 실패하므로 안전하다.

### Phase 4: Import Path Updates (estimated: 15 min)

일괄 치환 스크립트를 실행한다. `sed` 또는 IDE의 Find & Replace를 사용한다.

**치환 순서가 중요하다** -- 더 구체적인 경로를 먼저 치환해야 부분 매칭을 방지한다.

```bash
# Working directory: apps/web/

# 1. Domain-specific imports (most specific first)
find src -type f \( -name '*.ts' -o -name '*.tsx' \) -exec sed -i '' \
  's|from "@/hooks/defi/useLendMarkets"|from "@/domains/defi/lend/hooks/useLendMarkets"|g' {} +

find src -type f \( -name '*.ts' -o -name '*.tsx' \) -exec sed -i '' \
  's|from "@/hooks/defi/useYieldVaults"|from "@/domains/defi/yield/hooks/useYieldVaults"|g' {} +

find src -type f \( -name '*.ts' -o -name '*.tsx' \) -exec sed -i '' \
  's|from "@/lib/lendMath"|from "@/domains/defi/lend/lib/lendMath"|g' {} +

find src -type f \( -name '*.ts' -o -name '*.tsx' \) -exec sed -i '' \
  's|from "@/hooks/trade/|from "@/domains/trade/hooks/|g' {} +

find src -type f \( -name '*.ts' -o -name '*.tsx' \) -exec sed -i '' \
  's|from "@/hooks/options/|from "@/domains/options/hooks/|g' {} +

find src -type f \( -name '*.ts' -o -name '*.tsx' \) -exec sed -i '' \
  's|from "@/components/yield/|from "@/domains/defi/yield/components/|g' {} +

find src -type f \( -name '*.ts' -o -name '*.tsx' \) -exec sed -i '' \
  's|from "@/components/options/|from "@/domains/options/components/|g' {} +

# 2. Core imports
find src -type f \( -name '*.ts' -o -name '*.tsx' \) -exec sed -i '' \
  's|from "@/abis"|from "@/core/abis"|g' {} +

find src -type f \( -name '*.ts' -o -name '*.tsx' \) -exec sed -i '' \
  's|from "@/config/addresses"|from "@/core/config/addresses"|g' {} +

find src -type f \( -name '*.ts' -o -name '*.tsx' \) -exec sed -i '' \
  's|from "@/config/chain"|from "@/core/config/chain"|g' {} +

# 3. Shared imports
find src -type f \( -name '*.ts' -o -name '*.tsx' \) -exec sed -i '' \
  's|from "@/lib/utils"|from "@/shared/lib/utils"|g' {} +

find src -type f \( -name '*.ts' -o -name '*.tsx' \) -exec sed -i '' \
  's|from "@/hooks/useTokenBalance"|from "@/shared/hooks/useTokenBalance"|g' {} +

find src -type f \( -name '*.ts' -o -name '*.tsx' \) -exec sed -i '' \
  's|from "@/config/wagmi"|from "@/shared/config/wagmi"|g' {} +

find src -type f \( -name '*.ts' -o -name '*.tsx' \) -exec sed -i '' \
  's|from "@/config/nav"|from "@/shared/config/nav"|g' {} +

find src -type f \( -name '*.ts' -o -name '*.tsx' \) -exec sed -i '' \
  's|from "@/components/providers"|from "@/shared/providers"|g' {} +

find src -type f \( -name '*.ts' -o -name '*.tsx' \) -exec sed -i '' \
  's|from "@/components/ui/|from "@/shared/components/ui/|g' {} +

find src -type f \( -name '*.ts' -o -name '*.tsx' \) -exec sed -i '' \
  's|from "@/components/layout/|from "@/shared/components/layout/|g' {} +

find src -type f \( -name '*.ts' -o -name '*.tsx' \) -exec sed -i '' \
  's|from "@/components/background/|from "@/shared/components/background/|g' {} +

find src -type f \( -name '*.ts' -o -name '*.tsx' \) -exec sed -i '' \
  's|from "@/components/common/|from "@/shared/components/common/|g' {} +
```

#### 4.1 Special Case: shared/config/wagmi.ts

이 파일은 현재 **relative import**(`"./chain"`)를 사용한다.
`chain.ts`가 `core/config/`로 이동하므로 absolute alias로 변경해야 한다.

```typescript
// Before (src/config/wagmi.ts)
import { creditcoinTestnet } from "./chain";

// After (src/shared/config/wagmi.ts)
import { creditcoinTestnet } from "@/core/config/chain";
```

#### 4.2 Special Case: Domain Internal References

`VaultCard.tsx`와 `VaultActionDialog.tsx`는 같은 도메인 내의 `useYieldVaults`를 import한다.
일괄 치환 후 결과를 검증하고, 필요시 relative import로 수동 변환한다.

```typescript
// After sed: @/domains/defi/yield/hooks/useYieldVaults (OK, 이미 치환됨)
// Optional refinement (relative):
import { VaultData } from "../hooks/useYieldVaults";
```

### Phase 5: Configuration Updates (estimated: 5 min)

| Step | File | Change |
|------|------|--------|
| 5.1 | `tsconfig.json` | `@/*` alias 제거 (Phase 2 of 7.2) |
| 5.2 | `components.json` | shadcn aliases 업데이트 (Section 7.3) |

### Phase 6: Verification (estimated: 10 min)

| Step | Command | Expected |
|------|---------|----------|
| 6.1 | `npx tsc --noEmit` | exit 0 (type check pass) |
| 6.2 | `pnpm build` | exit 0 (Next.js build pass) |
| 6.3 | `pnpm dev` -> 각 라우트 수동 확인 | 모든 페이지 정상 렌더링 |
| 6.4 | `pnpm test:e2e` (if configured) | All tests pass |
| 6.5 | Stale import grep | `grep -r 'from "@/abis"' src/` -> 0 results |
| 6.6 | Stale import grep | `grep -r 'from "@/config/' src/` -> 0 results |
| 6.7 | Stale import grep | `grep -r 'from "@/lib/' src/` -> 0 results |
| 6.8 | Stale import grep | `grep -r 'from "@/hooks/' src/` -> 0 results |
| 6.9 | Stale import grep | `grep -r 'from "@/components/' src/` -> 0 results |

### Phase 7: Commit (estimated: 2 min)

```bash
git add -A
git commit -m "refactor: DDD 4-layer structure (core/shared/domains/app)

- core: React-free layer (abis, addresses, chain config)
- shared: cross-domain components, hooks, UI library
- domains: trade, defi/{lend,yield,borrow}, options
- app: unchanged (Next.js routes, import paths updated)
- tsconfig path aliases: @/core/*, @/shared/*, @/domains/*
- ~120 import paths updated
- shadcn components.json aliases updated"
```

---

## 9. Risk Assessment and Mitigation

### 9.1 Risk Matrix

| # | Risk | Probability | Impact | Mitigation |
|---|------|------------|--------|-----------|
| R1 | sed 치환 오류로 import 누락/중복 | Medium | High (빌드 실패) | `grep`으로 잔여 old-style import 검증; `tsc --noEmit`으로 타입 체크 |
| R2 | Relative import가 sed에 의해 잘못 변환됨 | Low | Medium | background 컴포넌트의 `./snowTerrain` 등 relative import는 sed 패턴 `"@/`에 매칭되지 않으므로 안전 |
| R3 | Next.js app/ 경로 인식 실패 | None | Critical | app/ 디렉토리 자체를 이동하지 않으므로 발생 불가 |
| R4 | shadcn CLI가 잘못된 경로에 파일 생성 | Medium | Low | `components.json` 업데이트로 해결. 미적용 시에도 수동 이동 가능 |
| R5 | E2E 테스트 경로 하드코딩 | Low | Medium | Playwright 테스트는 URL 라우트 기반이므로 file path 변경에 영향 없음 |
| R6 | `@/*` alias 제거 후 누락된 import 발견 | Medium | Medium | Phase 1에서 `@/*`를 유지한 채 작업하고, Phase 5에서 제거 전 full grep 검증 |
| R7 | Git history fragmentation | Low | Low | `git mv` 사용으로 rename tracking 보존. `git log --follow` 가능 |

### 9.2 Rollback Strategy

- **Before commit**: `git checkout .`으로 전체 작업 취소 가능
- **After commit**: `git revert <commit>` 1회로 완전 롤백 (single commit이므로)

---

## 10. Testing Strategy

### 10.1 Build-Time Verification

- `tsc --noEmit`: 타입 체크 (import resolution 포함)
- `next build`: 번들링 및 경로 resolution 검증

### 10.2 Runtime Verification

| Route | Verify |
|-------|--------|
| `/` | Hero section + feature cards 렌더링 |
| `/swap` | TokenSelector 동작, swap quote 정상 |
| `/pool` | Pool list 렌더링 |
| `/pool/add` | Token selector + add liquidity form |
| `/lend` | Market cards, StatCard 렌더링 |
| `/borrow` | Branch tabs, trove dialog |
| `/earn` | Stability pool deposit/withdraw form |
| `/yield` | VaultCard + VaultActionDialog |
| `/options` | PriceChart + order form |
| `/options/history` | History table |
| `/dashboard` | Balance cards + quick links |
| `/analytics` | Chart (recharts) |
| `/agent` | Agent status card |
| `/chat` | Chat interface |

### 10.3 Regression Markers

- "use client" 지시자가 모든 client component에 유지되는지 확인
- background 컴포넌트의 `snowTerrain` relative import가 깨지지 않았는지 확인
- `wagmi.ts`의 `creditcoinTestnet` import가 `@/core/config/chain`으로 올바르게 변경되었는지 확인

---

## 11. Alternative Approaches Evaluation

### 11.1 Comparison Table

| Criteria | DDD 4-Layer (Proposed) | Feature-Slice Design | Flat Domains | ESLint Boundaries Only |
|----------|----------------------|---------------------|-------------|----------------------|
| React-free 경계 분리 | **Explicit (core/)** | Partial (entities/) | No | Rule-based only |
| 도메인 응집도 | High | Very High | High | No change |
| 구현 복잡도 | Medium (36 file moves) | High (deeper nesting) | Low (fewer moves) | Very Low |
| 신규 도메인 추가 용이성 | `domains/<name>/` | `features/<name>/` | `src/<name>/` | N/A |
| 학습 곡선 | Low (4 layers) | Medium (6+ layers) | Very Low | None |
| 코드베이스 규모 적합성 | 적합 (36 files) | Over-engineering | 약간 부족 | 적합 |
| 빌드 규칙 강제력 | tsconfig aliases | tsconfig + lint | Weak | ESLint rules |

### 11.2 Recommendation

**DDD 4-Layer가 현재 코드베이스 규모와 팀 역량에 최적이다.**

- Feature-Slice Design은 `entities/` 레이어 추가로 오버엔지니어링이 된다. 현재 "entity"라 할 만한 독립 모델이 거의 없다 (대부분 on-chain 데이터 직접 fetch).
- Flat Domains는 core/shared 구분을 생략하므로, React-free 코드의 재사용성 이점을 잃는다.
- ESLint Boundaries Only는 물리적 구조 변경 없이 규칙만 추가하는 것으로, 코드 탐색 경험이 개선되지 않는다.

### 11.3 Proposed Enhancement

제안된 구조에 대한 한 가지 추가 권고사항:

**향후 도메인별 barrel file 추가를 고려한다** (선택사항, 현재 phase에서는 생략):

```typescript
// domains/trade/index.ts (optional, NO "use client")
export { useSwap } from "./hooks/useSwap";
export { usePool } from "./hooks/usePool";
export { useAddLiquidity } from "./hooks/useAddLiquidity";
```

단, **"use client" 금지 제약** 때문에 barrel file에서 "use client" 를 선언하면 안 된다.
위 barrel file은 re-export만 하므로 "use client"가 불필요하다 (각 개별 hook이 이미 "use client"를 선언).
그러나 Next.js App Router의 tree-shaking 특성상, barrel re-export가 번들 사이즈에 부정적 영향을 줄 수 있으므로 신중히 도입해야 한다.

---

## 12. Success Metrics

| Metric | Before | After | How to Verify |
|--------|--------|-------|--------------|
| React-free 파일 격리 | 불가 (mixed) | `core/` 디렉토리 존재 | `grep -r "react" src/core/` -> 0 results |
| Import path에서 계층 명시 | `@/abis` (ambiguous) | `@/core/abis` (explicit) | Path prefix로 layer 식별 |
| 도메인 파일 탐색 | 3개 디렉토리 산재 | 1개 디렉토리 (domains/trade) | `ls domains/trade/` |
| `next build` 성공 | Pass | Pass | CI pipeline |
| E2E 테스트 | Pass | Pass | `pnpm test:e2e` |
| 신규 도메인 추가 시간 | N/A | `mkdir domains/<name>/{hooks,components}` | Convention doc |

---

## 13. Estimated Effort

| Phase | Duration | Complexity |
|-------|----------|-----------|
| Phase 1: Preparation | 5 min | Low |
| Phase 2: Directory creation | 2 min | Low |
| Phase 3: File moves | 10 min | Low |
| Phase 4: Import path updates | 15 min | Medium |
| Phase 5: Configuration updates | 5 min | Low |
| Phase 6: Verification | 10 min | Medium |
| Phase 7: Commit + PR | 2 min | Low |
| **Total** | **~50 min** | **Medium** |

---

## 14. Dependency Rule (Post-Refactoring)

리팩토링 후 다음 의존성 규칙을 준수한다:

```
app/ ----> domains/ ----> shared/ ----> core/
              |               |
              +--------->-----+
              |
              +------------------------> core/
```

| From | Can Import |
|------|-----------|
| `core/` | External packages only (viem) |
| `shared/` | `core/`, external packages (wagmi, react, radix, etc.) |
| `domains/` | `core/`, `shared/`, same domain (relative), external packages |
| `app/` | `core/`, `shared/`, `domains/`, Next.js internals |

**Forbidden:**
- `core/` MUST NOT import from `shared/`, `domains/`, or `app/`
- `shared/` MUST NOT import from `domains/` or `app/`
- `domains/X` MUST NOT import from `domains/Y` (cross-domain prohibited)
- `app/` MUST NOT be imported by any other layer

---

*Plan authored on 2026-03-06. Execute on a dedicated branch with rollback capability.*
