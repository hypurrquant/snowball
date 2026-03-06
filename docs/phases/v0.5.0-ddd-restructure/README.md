# DDD 4계층 구조 리팩토링 - v0.5.0

## 문제 정의

### 현상
- `apps/web/src/` 하위에 `abis/`, `app/`, `components/`, `config/`, `hooks/`, `lib/` 6개 디렉토리가 평면적으로 존재
- 도메인별 코드(trade, defi, options)가 `hooks/trade/`, `hooks/defi/`, `hooks/options/`, `components/options/`, `components/yield/` 등으로 분산
- 공통 기능(UI, layout, background, utils)과 도메인 기능이 같은 `components/` 아래 혼재
- React-free 코드(`abis/`, `config/addresses.ts`, `config/chain.ts`)와 React 의존 코드(`config/wagmi.ts`, `config/nav.tsx`)가 같은 `config/` 디렉토리에 혼재

### 원인
- 초기 개발 시 기능 우선 구현으로 구조 설계 없이 파일 추가
- Next.js 기본 구조(`app/`, `components/`, `lib/`)를 그대로 사용
- 도메인 간 경계 정의 없이 hook/component 단위로 분류

### 영향
- **탐색 비용 증가**: 특정 도메인(예: yield) 관련 코드를 찾으려면 `hooks/defi/`, `components/yield/`, `app/(defi)/yield/` 3곳을 봐야 함
- **의존성 방향 불명확**: 어떤 코드가 공통이고 어떤 코드가 도메인 전용인지 구조적으로 구분 불가
- **신규 기능 추가 시 위치 모호**: 새 hook/component를 어디에 놓아야 할지 기준 없음
- **React-free 로직의 재사용 제약**: ABI, 주소, 체인 설정 등 순수 데이터가 React 의존 코드와 섞여 있어 테스트/재사용 어려움

### 목표

이번 v0.5.0 Phase 내에서 2단계로 나누어 진행한다 (모두 이번 Phase 범위):

- **작업 단계 A**: `shared/` 추출 + 경량 `core/` 분리
  - 공통 UI, layout, background, providers, 공통 hooks, utils를 `shared/`로 이동
  - React-free 코드(`abis/`, `config/addresses.ts`, `config/chain.ts`)를 `core/`로 이동
- **작업 단계 B**: `domains/` 구분
  - 도메인별(trade, defi/lend, defi/yield, defi/borrow, options) components+hooks 코로케이션
- 모든 기존 import 경로를 `@/core/...`, `@/shared/...`, `@/domains/...`로 업데이트
- `tsc --noEmit` 통과, `next build` 통과, 기능 변경 없음 (순수 구조 리팩토링)

#### `(more)` 라우트 그룹 처리
`app/(more)/` 하위 페이지(dashboard, analytics, agent, chat)는 현재 도메인 전용 hooks/components가 없고 페이지 자체에 인라인된 로직만 존재한다. 따라서:
- `domains/`로 분리하지 **않음** — 추출할 도메인 로직이 없음
- `app/(more)/` 라우트 그룹에 그대로 유지
- 향후 도메인 로직이 추가되면 그때 `domains/`로 분리

#### shared vs domain 판단 기준
- **shared**: 2개 이상 도메인에서 재사용되는 코드 (UI, layout, utils, useTokenBalance 등)
- **domain**: 단일 도메인 전용 코드 (useSwap은 trade 전용, VaultCard는 yield 전용 등)

#### Next.js `app/` 디렉토리와 DDD 계층의 관계
- Next.js의 `app/` 디렉토리 = DDD의 **app 계층** (라우팅 진입점)
- `app/` 내 페이지는 `shared/`와 `domains/`에서 컴포넌트/훅을 import하여 조합
- `app/` 자체의 파일 구조(route group 등)는 변경하지 않음

### 비목표 (Out of Scope)
- core 계층의 깊은 추출 (도메인 순수 로직 분리, repository 패턴 등) — 현재 기능 깊이가 충분하지 않음
- 도메인 내부 세부 구조화 (components/hooks/store/lib/types 분리) — 파일 수가 적어 불필요
- barrel export (`index.ts`) 생성 — 불필요한 복잡성
- AST 기반 의존성 검증 스크립트 — 규모 대비 과도
- 기능 변경, 버그 수정, 새 기능 추가
- `docs/idea/TODO-web-quality.md`에 정리된 코드 품질 이슈 수정
- `app/(more)/` 페이지의 도메인 분리 — 현재 추출할 로직 없음

## 제약사항
- Next.js App Router의 `app/` 디렉토리 구조는 프레임워크 제약으로 변경 불가
- `"use client"` 경계 유지 — barrel file에 `"use client"` 금지
- 순수 리팩토링 — 런타임 동작 변경 없음
- ~60개 파일, ~6,000줄 규모 — 1회 세션에서 완료 가능한 규모
- CLAUDE.md 파일은 프로젝트에 존재하지 않음 — "현재 페이즈" 업데이트 대상 없음 (예외)
