# 코드 품질 개선 - v0.2.1

## 범위
`apps/web/src` 내 프론트엔드 코드만 대상. 백엔드, 컨트랙트, 모노레포 설정은 변경하지 않음.

## 문제 정의

### 현상
apps/web 코드 리뷰에서 5가지 구조적 문제가 식별됨:

1. **useYieldVaults 오프셋 계산 취약** (`src/hooks/defi/useYieldVaults.ts:41-55`) — `address` 유무에 따라 `callsPerVault`이 6/7로 바뀌고, 수동 인덱스 오프셋으로 결과 매핑. 콜 하나 추가하면 전체 매핑이 깨짐
2. **useOptionsPrice WebSocket 재연결 없음** (`src/hooks/options/useOptionsPrice.ts:27-59`) — `ws.onerror` 시 1회 폴링 후 중단, 빈 catch 3곳에서 에러 삼킴. 가격 피드 영구 중단 가능
3. **Sidebar/MobileNav 네비게이션 중복** (`src/components/layout/Sidebar.tsx`, `src/components/layout/MobileNav.tsx`) — 동일한 네비 구조를 두 컴포넌트에서 별도 배열로 관리. MobileNav에 Yield 항목 누락 (기능 접근 불가)
4. **force-dynamic 루트 레이아웃** (`src/app/layout.tsx:7`) — 전체 앱에 `force-dynamic` 적용. 코드 확인 결과 `cookies()`/`headers()` 등 서버 전용 API를 사용하는 곳 없음. Privy/Wagmi는 전부 `"use client"` 컴포넌트에서 동작하므로 SSR 강제가 불필요. 정적 가능한 홈페이지까지 SSR됨
5. **색상 하드코딩 불일치** (다수 파일) — CSS 변수(`text-text-secondary`)와 hex 리터럴(`text-[#8B8D97]`)이 혼재. 테마 변경 시 일괄 수정 불가

### 원인
- 빠른 프로토타이핑 과정에서 구조적 정리 없이 기능 추가가 누적됨
- 네비게이션 컴포넌트를 독립적으로 작성하면서 공유 상수 미추출
- Tailwind 커스텀 테마 정의 후 일부 컴포넌트만 적용, 나머지는 하드코딩 유지
- force-dynamic은 초기 개발 시 SSR 관련 에러 회피용으로 추가된 것으로 추정되나, 현재 모든 인터랙티브 컴포넌트가 `"use client"`로 선언되어 있어 불필요

### 영향
- **useYieldVaults**: 새 vault 필드 추가 시 사일런트 데이터 오매핑 → 사용자에게 잘못된 수치 표시
- **WebSocket**: 네트워크 불안정 시 Options 페이지 가격 피드 영구 중단 → 핵심 UX 파손
- **네비 중복**: 모바일 사용자가 Yield 기능 접근 불가 + 네비 변경 시 불일치 발생
- **force-dynamic**: 정적 페이지 캐싱 불가, 서버 부하 증가
- **색상 불일치**: 디자인 토큰 변경 시 수십 곳 수동 수정 필요

### 목표
- 5가지 구조적 문제를 모두 수정하여 유지보수성과 안정성 향상
- 새 기능 추가 없이 기존 코드의 구조만 개선

### 비목표 (Out of Scope)
- 새 DeFi 기능 추가 (IRM 연동, EIP-712 서명 등)
- 디자인 변경 (색상 값 자체는 유지, 관리 방식만 변경)
- 새 테스트 작성
- ABI 변경 또는 컨트랙트 연동 수정

## 검증 계획
- `tsc --noEmit` — 타입 에러 없음 확인
- `next build` — 빌드 성공 확인
- `eslint .` — 린트 통과 확인
- 시각적 회귀는 빌드 성공 + 기존 CSS 변수 값 유지로 보장

## 제약사항
- 기존 UI/UX 동작이 변경되지 않아야 함 (시각적 회귀 없음)
- testnet 데모 상태이므로 프로덕션 수준의 에러 핸들링은 불필요
- 외부 라이브러리 추가 최소화 (reconnecting-websocket 등 검토 가능)
