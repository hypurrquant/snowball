# DoD (Definition of Done) - v0.2.1

> 모든 검증 명령어는 `apps/web/` 디렉토리 기준. `cd apps/web && <명령어>` 형태로 실행.

## 기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| F1 | `src/app/layout.tsx`에서 `export const dynamic = "force-dynamic"` 행이 제거됨 | `grep "force-dynamic" src/app/layout.tsx` → 결과 없음 |
| F2 | `src/config/nav.tsx` 파일이 존재하고 `NAV_GROUPS` 상수를 export | `grep "export.*NAV_GROUPS" src/config/nav.tsx` → 매치 |
| F3 | `Sidebar.tsx`와 `MobileNav.tsx`가 `src/config/nav.tsx`의 `NAV_GROUPS`를 import하여 사용. 각 컴포넌트 내부에 하드코딩된 네비 배열 없음 | `grep "NAV_GROUPS\|MOBILE_NAV" src/components/layout/Sidebar.tsx src/components/layout/MobileNav.tsx` → NAV_GROUPS만 존재 |
| F4 | MobileNav에서 Yield 항목이 렌더링됨 (Sidebar와 동일한 네비 항목 보유) | `grep -i "yield" src/config/nav.tsx` → NAV_GROUPS 내 Yield 항목 존재 확인 |
| F5 | `useYieldVaults.ts`에서 수동 오프셋 계산(`callsPerVault`, `offset + N`) 제거되고 네임드 인덱스 맵(`indices` 또는 `indexMap` 등 Record 타입)으로 교체됨 | (a) `grep "callsPerVault\|offset +" src/hooks/defi/useYieldVaults.ts` → 결과 없음, (b) `grep "indices\|indexMap\|Record<" src/hooks/defi/useYieldVaults.ts` → 매치 |
| F6 | `useOptionsPrice.ts`에서 WS 연결 실패 시 자동 재연결: 최대 3회, backoff 간격 1s→2s→4s (exponential) | `grep -E "retryCount\|MAX_RETRIES\|[124].*000\|Math.pow\|2 \*\*" src/hooks/options/useOptionsPrice.ts` → retry count 관리 + backoff 계산 로직 매치 |
| F7 | `useOptionsPrice.ts`에서 WS 재연결 3회 실패 시 polling fallback: 10초 간격 REST 호출로 전환 | `grep -E "setInterval\|pollingInterval\|10.?000\|fallback\|polling" src/hooks/options/useOptionsPrice.ts` → polling 전환 로직 매치 |
| F8 | `useOptionsPrice.ts`의 빈 `catch {}` 블록이 `console.warn`으로 교체됨 | `grep "catch {}" src/hooks/options/useOptionsPrice.ts` → 결과 없음 |
| F9 | hex 하드코딩(`text-[#`, `bg-[#`, `border-[#`, `ring-[#`)이 Tailwind 토큰 클래스로 치환됨 | `grep -rE "text-\[#\|bg-\[#\|border-\[#\|ring-\[#" src/` → 결과 없음 (gradient `from-/to-/via-`는 E2에서 별도 검증) |

## 비기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| N1 | TypeScript strict 모드 에러 0 | `npx tsc --noEmit` 성공 (exit code 0) |
| N2 | 린트 통과 | `npx eslint .` 성공 |
| N3 | 빌드 성공 | `npx next build` 성공 |
| N4 | 기존 UI/UX 동작 동일 (시각적 회귀 없음) | (a) `git diff src/app/globals.css`에서 CSS 변수 **값** 변경 라인 없음 (변수 참조 추가/삭제는 허용), (b) `npx next build` 성공, (c) hydration 경고 없음은 스모크 체크로 확인 |

## 엣지케이스

| # | 시나리오 | 기대 동작 | 검증 방법 |
|---|---------|----------|----------|
| E1 | force-dynamic 제거 후 특정 페이지에서 동적 데이터 필요 발견 | 해당 페이지에 `export const dynamic = "force-dynamic"` 개별 추가 | `npx next build` 성공 확인 |
| E2 | 색상 치환에서 opacity 변형 (`from-[#60a5fa]/20` 등 gradient) | Tailwind 토큰 형태 (`from-ice-400/20`)로 변환 | `grep -rE "from-\[#\|to-\[#\|via-\[#" src/` → 결과 없음 |
| E3 | WS 서버가 완전히 다운된 상태 | 3회 재시도(1s→2s→4s) 후 10초 간격 polling fallback으로 전환, 가격 데이터 계속 업데이트 | F6+F7 검증으로 커버 (코드에 retry→polling 전환 로직 존재) |
| E4 | useYieldVaults에서 address가 undefined (미연결 상태) | userShares 관련 콜 스킵, 나머지 필드 정상 매핑 | 코드에 address 조건부 분기 존재 확인 (`grep "address" src/hooks/defi/useYieldVaults.ts` → 조건부 처리 로직 매치) |

## PRD 목표 ↔ DoD 커버리지

| PRD 목표 | DoD 항목 | 커버 |
|----------|---------|------|
| useYieldVaults 오프셋 수정 | F5, E4 | ✅ |
| useOptionsPrice WS 재연결 | F6, F7, F8, E3 | ✅ |
| Sidebar/MobileNav 네비 통일 | F2, F3, F4 | ✅ |
| force-dynamic 제거 | F1, E1 | ✅ |
| 색상 하드코딩 통일 | F9, E2 | ✅ |

## 설계 결정 ↔ DoD 반영

| 설계 결정 | DoD 항목 | 커버 |
|----------|---------|------|
| 네임드 인덱스 맵 (useYieldVaults) | F5 (Record 타입 존재 확인) | ✅ |
| exponential backoff 3회 (1s/2s/4s) + 10s polling fallback (WS) | F6, F7 (구체 값 검증) | ✅ |
| 공유 상수 nav.tsx | F2, F3, F4 | ✅ |
| hex → Tailwind 토큰 전량 치환 (text/bg/border/ring + gradient) | F9, E2 | ✅ |
| force-dynamic 루트 제거 | F1 | ✅ |
| 빈 catch → console.warn | F8 | ✅ |
