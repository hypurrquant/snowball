# Frontend Tech Stack Upgrade Spec

> 현재 버전 → 최신 버전 비교 및 마이그레이션 가이드
> 작성일: 2026-02-25

---

## 버전 비교 요약

| 패키지 | 현재 버전 | 최신 버전 | Major 변경 | 위험도 |
|--------|----------|----------|-----------|-------|
| **next** | ^15.1.0 | **16.1.6** | YES | **HIGH** |
| **react** | ^19.0.0 | **19.2.4** | no | LOW |
| **react-dom** | ^19.0.0 | **19.2.4** | no | LOW |
| **@privy-io/react-auth** | ^2.4.0 | **3.14.1** | YES | **HIGH** |
| **@privy-io/wagmi** | ^1.0.0 | **4.0.2** | YES | **HIGH** |
| **wagmi** | ^2.14.0 | **3.5.0** | YES | **HIGH** |
| **viem** | ^2.21.0 | **2.46.3** | no | LOW |
| **@tanstack/react-query** | ^5.62.0 | **5.90.21** | no | LOW |
| **lightweight-charts** | ^4.2.0 | **5.1.0** | YES | **MEDIUM** |
| **recharts** | 2.15.4 | **3.7.0** | YES | **MEDIUM** |
| **lucide-react** | ^0.460.0 | **0.575.0** | no | LOW |
| **zustand** | ^5.0.0 | **5.0.11** | no | LOW |
| **tailwindcss** | ^4.0.0 | **4.2.1** | no | LOW |
| **@tailwindcss/postcss** | ^4.0.0 | **4.2.1** | no | LOW |
| **typescript** | ^5.7.0 | **5.9.3** | no | LOW |
| **eslint** | ^9.0.0 | **10.0.2** | YES | LOW |
| **eslint-config-next** | ^15.1.0 | **16.1.6** | YES | LOW |
| **sonner** | ^2.0.7 | **2.0.7** | - | NONE |
| **next-themes** | ^0.4.6 | **0.4.6** | - | NONE |
| **clsx** | ^2.1.0 | **2.1.1** | no | NONE |
| **tailwind-merge** | ^2.6.0 | **3.5.0** | YES | LOW |
| **class-variance-authority** | ^0.7.0 | **0.7.1** | no | NONE |
| **shadcn** | ^3.8.5 | **3.8.5** | - | NONE |
| **radix-ui** | ^1.4.3 | **1.4.3** | - | NONE |
| **@types/react** | ^19.0.0 | **19.2.14** | no | LOW |
| **@types/react-dom** | ^19.0.0 | **19.2.3** | no | LOW |
| **postcss** | ^8.4.0 | **8.5.6** | no | NONE |

---

## 업그레이드 티어

### Tier 1: 안전 (코드 변경 없음)
```
react, react-dom, viem, @tanstack/react-query, zustand,
lucide-react, tailwindcss, @tailwindcss/postcss, typescript,
clsx, class-variance-authority, postcss, @types/react, @types/react-dom
```

### Tier 2: 주의 (Minor 코드 변경 필요)
```
lightweight-charts (v4→v5), recharts (v2→v3), tailwind-merge (v2→v3),
eslint (v9→v10), eslint-config-next (v15→v16)
```

### Tier 3: 위험 (대규모 코드 변경 필요)
```
next (v15→v16), @privy-io/react-auth (v2→v3),
@privy-io/wagmi (v1→v4), wagmi (v2→v3)
```

---

## Tier 3 상세: Major Breaking Changes

### 1. Next.js 15 → 16

**출시일**: 2025-10-21 (v16.0), 2025-12-18 (v16.1)

#### Breaking Changes

| 항목 | 변경 내용 | 우리 코드 영향 |
|------|----------|-------------|
| Turbopack 기본 번들러 | `--turbopack` 플래그 불필요 | `package.json` scripts에서 `--turbopack` 제거 |
| `middleware.ts` → `proxy.ts` | 이름 변경 (deprecated) | 미사용 → 영향 없음 |
| Async Request APIs 강제 | `cookies()`, `headers()`, `params`, `searchParams` 모두 async | 미사용 (전부 client component) → 영향 없음 |
| `next lint` 제거 | ESLint CLI 직접 사용 | `"lint": "next lint"` → `"lint": "eslint ."` 변경 |
| `serverRuntimeConfig` 제거 | env 변수 사용 | 미사용 → 영향 없음 |
| Parallel routes `default.js` 필수 | 모든 parallel slot에 필요 | parallel routes 미사용 → 영향 없음 |
| React 19.2 | View Transitions, useEffectEvent, Activity | 선택적 사용 |
| `experimental.turbopack` 위치 | top-level `turbopack`으로 이동 | 미사용 → 영향 없음 |
| image 기본값 변경 | minimumCacheTTL, imageSizes, qualities | next/image 미사용시 영향 없음 |
| `isolatedDevBuild` | dev/build 별도 출력 디렉토리 | 자동 적용 |

#### 필요 작업

```diff
# package.json
- "dev": "next dev --turbopack",
+ "dev": "next dev",
- "lint": "next lint"
+ "lint": "eslint ."

# dependencies
- "next": "^15.1.0",
+ "next": "^16.1.0",
- "eslint-config-next": "^15.1.0",
+ "eslint-config-next": "^16.1.0",

# next.config.ts — 변경 불필요 (현재 설정 호환)
```

```diff
# Dockerfile — Node 22 권장 (선택)
- FROM node:20-alpine AS base
+ FROM node:22-alpine AS base
```

#### 평가: **LOW RISK** — 우리 코드가 전부 client component라 거의 영향 없음

---

### 2. wagmi 2 → 3

**출시일**: wagmi 3.5.0 (latest)

#### Breaking Changes

| 항목 | 변경 내용 | 우리 코드 영향 |
|------|----------|-------------|
| `useAccount` → `useConnection` | Hook 이름 변경 | **12곳** 수정 필요 |
| `useAccountEffect` → `useConnectionEffect` | Hook 이름 변경 | 미사용 → 영향 없음 |
| `useSwitchAccount` → `useSwitchConnection` | Hook 이름 변경 | 미사용 → 영향 없음 |
| mutate 함수 이름 통일 | 커스텀 이름 → `mutate`/`mutateAsync` | `useWriteContract` 사용처 확인 필요 |
| Connector 의존성 분리 | optional peer deps | 수동 설치 필요 |
| TypeScript ≥ 5.7.3 | 최소 버전 상향 | 현재 ^5.7.0 → 호환 |
| `useConnect().connectors` 제거 | `useConnectors()` 사용 | Privy 통합이라 직접 사용 안함 |

#### 영향받는 파일 및 변경

```typescript
// BEFORE (wagmi v2)
import { useAccount, useBalance } from "wagmi";
const { address, isConnected } = useAccount();

// AFTER (wagmi v3)
import { useConnection, useBalance } from "wagmi";
const { address, isConnected } = useConnection();
```

**영향받는 파일 목록:**
- `src/components/layout/Header.tsx` — useAccount
- `src/components/common/TokenSelector.tsx` — useAccount
- `src/app/(trade)/swap/page.tsx` — useAccount
- `src/app/(defi)/borrow/page.tsx` — useAccount
- `src/app/(defi)/earn/page.tsx` — useAccount
- `src/app/(more)/dashboard/page.tsx` — useAccount
- `src/app/(more)/agent/page.tsx` — useAccount
- `src/app/(options)/options/page.tsx` — useAccount
- `src/hooks/trade/useSwap.ts` — useAccount
- `src/hooks/options/useOptions.ts` — useAccount

**wagmi config 변경:**
```typescript
// BEFORE (wagmi v2)
import { http, createConfig, createStorage, cookieStorage } from "wagmi";

// AFTER (wagmi v3) — 동일, 호환됨
// createConfig API 변경 없음
```

#### 주의: `@privy-io/wagmi` 호환성

`@privy-io/wagmi@4.0.2`의 peer dependency:
```json
{
  "wagmi": ">=2",      // wagmi v2 AND v3 모두 지원
  "viem": "^2.46.1",
  "@privy-io/react-auth": "^3"
}
```

**wagmi v3 + privy 조합 가능하지만 `@privy-io/react-auth` v3가 필수.**

---

### 3. @privy-io/react-auth 2 → 3

#### Breaking Changes

| 항목 | 변경 내용 | 우리 코드 영향 |
|------|----------|-------------|
| `useSolanaWallets` 제거 | `useWallets`, `useCreateWallet`, `useExportWallet` 사용 | Solana 미사용 → 영향 없음 |
| `solanaClusters` config 제거 | `config.solana.rpcs` 사용 | 미사용 → 영향 없음 |
| `createOnLogin` 위치 변경 | embedded wallet config 변경 가능 | **확인 필요** |
| `fundWallet` 인터페이스 변경 | 함수 시그니처 변경 | 미사용 → 영향 없음 |
| `suggestedAddress` 제거 | `description` 사용 | 미사용 → 영향 없음 |
| `detected_wallets` 제거 | walletList 옵션 변경 | 미사용 → 영향 없음 |
| `verifiedAt` 제거 | linked accounts 필드 | 미사용 → 영향 없음 |

#### 필요 작업

```typescript
// providers.tsx — embeddedWallets config 확인
// v2
embeddedWallets: {
  ethereum: {
    createOnLogin: "users-without-wallets",
  },
}

// v3 — createOnLogin이 제거되었을 수 있음.
// 공식 문서 확인 후 대체 설정 적용 필요
```

#### 평가: **MEDIUM RISK** — Solana 미사용, EVM 전용이라 영향 제한적. 단, PrivyProvider config 변경 확인 필수.

---

### 4. @privy-io/wagmi 1 → 4

`@privy-io/wagmi@4.0.2` peer deps:
```json
{
  "wagmi": ">=2",
  "viem": "^2.46.1",
  "react": ">=18",
  "@privy-io/react-auth": "^3"
}
```

현재 `@privy-io/wagmi@1.0.0`에서 `4.0.2`로의 직접 업그레이드.
wagmi v2 당시에도 `@privy-io/wagmi@2.x`를 써야 했으므로, **현재 설정이 이미 구버전.**

#### 필요 작업

```diff
# package.json
- "@privy-io/wagmi": "^1.0.0",
+ "@privy-io/wagmi": "^4.0.0",
```

Provider에서 `createConfig`를 `@privy-io/wagmi`에서 import해야 할 수 있음:
```typescript
// 확인 필요: Privy 공식 가이드 기준
import { createConfig } from "@privy-io/wagmi";
// vs
import { createConfig } from "wagmi";
```

---

## Tier 2 상세: Medium Breaking Changes

### 5. lightweight-charts 4 → 5

**출시일**: v5.0.0+ (latest 5.1.0)

#### Breaking Changes

| 항목 | v4 | v5 |
|------|----|----|
| Series 생성 | `chart.addCandlestickSeries(opts)` | `chart.addSeries(CandlestickSeries, opts)` |
| Import | `import { createChart } from "lightweight-charts"` | `import { createChart, CandlestickSeries } from "lightweight-charts"` |
| Watermarks | `createChart(el, { watermark: {...} })` | `createTextWatermark(pane, { lines: [...] })` |
| Markers | `series.setMarkers([...])` | `createSeriesMarkers(series, [...])` |
| CJS 지원 | 있음 | 제거됨 (ESM only, ES2020) |
| Bundle | ~42kB | ~35kB (-16%) |

#### 우리 코드 변경 (`PriceChart.tsx`)

```diff
- import { createChart, type IChartApi, ColorType } from "lightweight-charts";
+ import { createChart, CandlestickSeries, type IChartApi, ColorType } from "lightweight-charts";

- const candlestickSeries = chart.addCandlestickSeries({
+ const candlestickSeries = chart.addSeries(CandlestickSeries, {
    upColor: "#22c55e",
    downColor: "#ef4444",
    borderDownColor: "#ef4444",
    borderUpColor: "#22c55e",
    wickDownColor: "#ef4444",
    wickUpColor: "#22c55e",
  });
```

#### 평가: **LOW RISK** — 변경 1개 파일, 2줄

---

### 6. recharts 2 → 3

#### Breaking Changes (주요)

| 항목 | 변경 |
|------|------|
| React ≥ 16.8 | 강제 |
| Node ≥ 18 | 강제 |
| TypeScript 5.x | 강제 |
| ES6 target | ES5 지원 제거 |
| `accessibilityLayer` | 기본 `true` |
| `margin` 타입 | top/right/bottom/left 모두 필수 |
| `Customized` component | 내부 state props 제거 |
| 다중 YAxis | yAxisId 알파벳순 렌더 |
| `alwaysShow` prop 제거 | Reference 컴포넌트에서 |
| `isFront` prop 제거 | Reference 컴포넌트에서 |
| CartesianGrid | x/yAxisId 매칭 필요 |
| Tooltip content type | `TooltipContentProps` 변경 |

#### 영향 분석

현재 recharts는 `analytics` 페이지에서만 사용. 해당 페이지의 차트 코드 확인 후 적용.

#### 평가: **LOW-MEDIUM RISK** — 사용처 적음, 기본 API만 사용중이라 호환될 가능성 높음

---

### 7. tailwind-merge 2 → 3

Minor API 변경. `twMerge` 함수 시그니처는 동일. 내부 conflict resolution 로직 개선.
`cn()` 유틸리티 함수 변경 불필요.

#### 평가: **NONE** — 코드 변경 없음

---

### 8. ESLint 9 → 10 + eslint-config-next 15 → 16

- ESLint v10은 legacy `.eslintrc` 형식 지원 제거
- Flat config 필수
- `next lint` CLI 제거 → ESLint CLI 직접 사용

#### 필요 작업

```diff
# package.json scripts
- "lint": "next lint",
+ "lint": "eslint .",
```

`eslint.config.mjs` (Flat Config) 생성 필요:
```javascript
import { dirname } from "path";
import { fileURLToPath } from "url";
import nextPlugin from "@next/eslint-plugin-next";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default [
  ...nextPlugin.flatConfig,
  {
    // custom rules
  },
];
```

---

## 업그레이드 순서 (의존성 기반)

```
Step 1: Tier 1 안전 패키지 일괄 업그레이드
        → react, react-dom, viem, @tanstack/react-query, zustand,
          lucide-react, tailwindcss, typescript, clsx, postcss, @types/*
        → pnpm install && pnpm build 테스트

Step 2: tailwind-merge v3
        → pnpm add tailwind-merge@latest
        → cn() 동작 확인

Step 3: Next.js 16 + eslint-config-next 16 + ESLint 10
        → package.json scripts 수정
        → eslint flat config 생성
        → pnpm build 테스트

Step 4: @privy-io/react-auth v3 + @privy-io/wagmi v4
        → PrivyProvider config 변경 확인
        → embeddedWallets.createOnLogin 대체 확인
        → pnpm build 테스트

Step 5: wagmi v3 (Privy v3 완료 후)
        → useAccount → useConnection 전역 치환 (12곳)
        → wagmi config 호환성 확인
        → pnpm build 테스트

Step 6: lightweight-charts v5
        → PriceChart.tsx 수정 (2줄)
        → pnpm build 테스트

Step 7: recharts v3
        → analytics 페이지 차트 컴포넌트 확인/수정
        → pnpm build 테스트
```

---

## 최종 Target package.json

```json
{
  "name": "@snowball/frontend",
  "version": "0.3.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint ."
  },
  "dependencies": {
    "@privy-io/react-auth": "^3.14.0",
    "@privy-io/wagmi": "^4.0.0",
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-dropdown-menu": "^2.1.0",
    "@radix-ui/react-progress": "^1.1.0",
    "@radix-ui/react-select": "^2.1.0",
    "@radix-ui/react-separator": "^1.1.0",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-tooltip": "^1.1.0",
    "@tanstack/react-query": "^5.90.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lightweight-charts": "^5.1.0",
    "lucide-react": "^0.575.0",
    "next": "^16.1.0",
    "next-themes": "^0.4.6",
    "radix-ui": "^1.4.3",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "recharts": "^3.7.0",
    "sonner": "^2.0.7",
    "tailwind-merge": "^3.5.0",
    "viem": "^2.46.0",
    "wagmi": "^3.5.0",
    "zustand": "^5.0.11"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.2.0",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "eslint": "^10.0.0",
    "eslint-config-next": "^16.1.0",
    "postcss": "^8.5.0",
    "shadcn": "^3.8.5",
    "tailwindcss": "^4.2.0",
    "tw-animate-css": "^1.4.0",
    "typescript": "^5.9.0"
  }
}
```

---

## Dockerfile 변경

```diff
- FROM node:20-alpine AS base
+ FROM node:22-alpine AS base
```

Node 22가 LTS (2024-10-29~). Next.js 16 최소 요구 Node 20.9+이므로 Node 22 권장.

---

## 체크리스트

- [ ] Step 1: Tier 1 안전 패키지 업그레이드
- [ ] Step 2: tailwind-merge v3
- [ ] Step 3: Next.js 16 + ESLint 10
- [ ] Step 4: @privy-io/react-auth v3 + @privy-io/wagmi v4
- [ ] Step 5: wagmi v3 (`useAccount` → `useConnection` 전역 치환)
- [ ] Step 6: lightweight-charts v5 (PriceChart.tsx)
- [ ] Step 7: recharts v3 (analytics 차트)
- [ ] Step 8: Dockerfile Node 22
- [ ] Step 9: 전체 빌드 테스트 (`pnpm build`)
- [ ] Step 10: 로컬 동작 테스트 (Privy 로그인, Swap, Lend, Options)

---

## 참고 문서

- [Next.js 16 Blog](https://nextjs.org/blog/next-16)
- [Next.js 15→16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [wagmi v2→v3 Migration](https://wagmi.sh/react/guides/migrate-from-v2-to-v3)
- [Privy Changelog](https://docs.privy.io/reference/sdk/react-auth/changelog)
- [Privy wagmi Integration](https://docs.privy.io/guide/react/wallets/usage/wagmi)
- [lightweight-charts v4→v5 Migration](https://tradingview.github.io/lightweight-charts/docs/migrations/from-v4-to-v5)
- [recharts v3 Migration Guide](https://github.com/recharts/recharts/wiki/3.0-migration-guide)
