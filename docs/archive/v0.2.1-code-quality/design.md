# 설계 - v0.2.1

## 변경 규모
**규모**: 일반 기능
**근거**: 5개 영역, 10+ 파일 수정, 새 파일(nav.tsx) 추가

---

## 문제 요약
apps/web에서 5가지 구조적 문제(취약한 오프셋 계산, WS 재연결 부재, 네비 중복, force-dynamic, 색상 하드코딩)를 수정하여 유지보수성 향상.

> 상세: [README.md](README.md) 참조

## 접근법

각 문제를 독립적으로 수정. 순서는 의존성과 리스크 기준:
1. force-dynamic 제거 (1줄, 가장 단순)
2. 네비 공유 상수 추출 (구조 변경, 기능 무관)
3. useYieldVaults 네임드 매핑 (로직 변경, 동작 동일)
4. useOptionsPrice WS 재연결 (동작 변경, UX 개선)
5. 색상 토큰 통일 (다수 파일, 시각적 동일)

## 대안 검토

### 1. force-dynamic 제거

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: 루트에서 제거, 필요한 페이지에 개별 적용 | 정적 페이지 캐싱 가능 | 개별 페이지 검토 필요 | ✅ |
| B: 루트 유지 (전 페이지 동적 유지) | 변경 없음, 안전 | 정적 캐싱 불가, 서버 부하 | ❌ |

**선택 이유**: 코드 확인 결과 서버 전용 API(cookies/headers) 사용 없음. 모든 인터랙션이 "use client" 컴포넌트. 루트 force-dynamic은 불필요하며 하위 세그먼트에서 개별 오버라이드도 불가하므로 제거가 유일한 해결책.

### 2. 네비 중복 해소

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: 공유 상수 파일 (nav.tsx) | 단순, 즉시 적용 | 아이콘 크기 차이 처리 필요 | ✅ |
| B: 공유 NavList 컴포넌트 | 렌더링까지 통일 | 오버엔지니어링 | ❌ |

**선택 이유**: A로 데이터만 공유하고, 렌더링은 각 컴포넌트가 담당. 아이콘은 `iconClassName` prop을 받아 크기 분리.

### 3. useYieldVaults 오프셋

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: vault별 useReadContracts 분리 | 매핑 명확 | vault 수만큼 multicall 발생, 배치 효율 저하 | ❌ |
| B: flatMap 유지 + 네임드 인덱스 맵 빌드 | 배치 효율 유지, 매핑 안전 | 약간의 복잡도 추가 | ✅ |
| C: contracts 배열과 결과를 vault별 구조체로 래핑 | 가장 깔끔 | 커스텀 유틸 필요 | ❌ |

**선택 이유**: B는 기존 단일 useReadContracts 호출을 유지하면서, 빌드 시 각 결과의 이름을 기록해 오프셋 계산을 제거. 최소 변경.

**비범위 결정**: `useLendMarkets`도 동일한 오프셋 패턴이지만, 현재 마켓 수가 3개로 고정되어 있고 동적 확장 가능성이 낮아 이번 범위에서 제외. 향후 마켓 추가 시 같은 패턴 적용 가능.

### 4. WebSocket 재연결

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: reconnecting-websocket 라이브러리 | 검증된 구현, 코드 최소 | 외부 의존 추가 | ❌ |
| B: 직접 구현 (backoff + polling fallback) | 의존 없음, 제어 가능 | 코드량 증가 | ✅ |

**선택 이유**: 데모 단계에서 외부 의존 추가보다 간단한 직접 구현이 적절. 3회 재시도 + 폴링 폴백 수준.

### 5. 색상 토큰 통일

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: hex를 기존 CSS 변수 클래스로 전부 치환 | 완전한 토큰화 | 146곳 변경, 누락 리스크 | ✅ |
| B: 핵심 색상만 치환, 나머지 유지 | 변경 최소화 | 불일치 잔존 | ❌ |

**선택 이유**: 이미 globals.css에 모든 토큰이 정의되어 있음. 1:1 매핑 테이블로 기계적 치환 가능.

## 기술 결정

### useYieldVaults 네임드 인덱스 맵
```ts
// contracts 빌드 시 인덱스를 기록하는 구조
type FieldKey = "tvl" | "totalSupply" | "pricePerShare" | "userShares" | "lastHarvest" | "paused" | "withdrawFee";
const indices: Record<number, Partial<Record<FieldKey, number>>> = {};
// vault별로 contracts push 할 때 indices[vaultIdx][field] = contracts.length 기록
// 결과 매핑: data?.[indices[i].tvl!]?.result
```

### WebSocket 재연결
- `onclose` 이벤트에서 exponential backoff (1s, 2s, 4s)
- 3회 실패 시 polling fallback (10초 간격)
- `useRef`로 타이머/retry count 관리, cleanup에서 정리
- 빈 `catch {}` → `console.warn`으로 교체

### 네비 공유 상수
- `src/config/nav.tsx`에 `NAV_GROUPS` 정의 (JSX 아이콘 포함이므로 .tsx)
- 아이콘은 컴포넌트 함수로 정의, className을 인자로 받음
- Sidebar: groups 그대로 사용
- MobileNav: `NAV_GROUPS.flatMap(g => g.items)`로 flat 렌더링

### 색상 매핑 테이블
globals.css에 정의된 CSS 변수와 Tailwind 유틸리티 클래스 매핑:

| Hex | Tailwind 토큰명 | 실제 클래스 예시 |
|-----|----------------------|------|
| `#60a5fa` | `ice-400` | `text-ice-400`, `bg-ice-400` |
| `#3b82f6` | `ice-500` | `text-ice-500`, `border-ice-500` |
| `#93c5fd` | `ice-300` | `text-ice-300` |
| `#8B8D97` | `text-secondary` | `text-text-secondary` |
| `#4A4B57` | `text-tertiary` | `text-text-tertiary` |
| `#F5F5F7` | `text-primary` | `text-text-primary` |
| `#1C1D30` | `bg-input` | `bg-bg-input` |
| `#141525` | `bg-card` | `bg-bg-card` |
| `#1F2037` | `border` | `border-border` |
| `#22c55e` | `success` | `text-success`, `bg-success` |
| `#eab308` | `warning` | `text-warning` |
| `#ef4444` | `danger` | `text-danger` |
| `#0d1117` | `bg-secondary` | `bg-bg-secondary` |
| `#1a2035` | `bg-hover` | `bg-bg-hover` |

> 참고: `text-[#8B8D97]` → `text-text-secondary`, `bg-[#141525]` → `bg-bg-card` 형태로 치환. globals.css의 실제 토큰명을 기준으로 검증 후 적용.

---

## 아키텍처 개요

변경은 5개 독립 영역에 걸쳐 있으며 상호 의존성 없음:

```
src/app/layout.tsx              ← (1) force-dynamic 제거
src/config/nav.tsx              ← (2) 새 파일: 공유 네비 상수
src/components/layout/
  ├── Sidebar.tsx               ← (2) nav.tsx import로 교체
  └── MobileNav.tsx             ← (2) nav.tsx import로 교체
src/hooks/defi/useYieldVaults.ts ← (3) 인덱스 맵 리팩토링
src/hooks/options/useOptionsPrice.ts ← (4) WS 재연결 추가
src/app/**/*.tsx                ← (5) 색상 토큰 치환 (10+ 파일)
src/components/**/*.tsx         ← (5) 색상 토큰 치환
```

이슈 간 의존 관계: 없음 (5개 이슈는 서로 독립적으로 수행 가능, 순서는 리스크 최소화 목적). 단, 이슈 2(네비)에서 생성하는 nav.tsx는 Sidebar/MobileNav가 import하게 됨.

## 범위 / 비범위
- **범위**: apps/web/src 내 5가지 구조 개선
- **비범위**: 새 기능, ABI 변경, 테스트 작성, 디자인 변경, useLendMarkets 오프셋 (마켓 3개 고정, 향후 별도 처리)

## 가정/제약
- useLendMarkets 비범위 근거: `LEND.markets` 배열이 `src/config/addresses.ts`에 3개로 하드코딩되어 있으며, 동적 확장 계획 없음. 마켓 추가 시 동일한 네임드 매핑 패턴 적용 가능.
- testnet 데모 단계이므로 프로덕션 수준의 에러 핸들링/보안 제약은 적용하지 않음

## 데이터 흐름
N/A: 데이터 흐름 변경 없음. 기존 RPC/WS 연동 구조 유지

## API/인터페이스 계약
N/A: API 변경 없음

## 데이터 모델/스키마
N/A: 스키마 변경 없음

## 테스트 전략
- `tsc --noEmit` — 타입 체크
- `next build` — 빌드 성공
- `eslint .` — 린트 통과
- 새 테스트 작성 없음 (데모 단계)
- 스모크 체크: Sidebar/MobileNav, Yield 페이지, Options 페이지를 수동 확인 대상으로 지정

## 리스크/오픈 이슈
- 색상 치환 시 opacity 변형(`from-[#60a5fa]/20` 등 gradient)은 CSS 변수로 직접 치환 불가 → Tailwind의 `from-ice-400/20` 형태로 변환
- force-dynamic 제거 후 hydration mismatch 가능성 → `next build` 성공으로 1차 검증
