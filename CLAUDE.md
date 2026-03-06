# Snowball Protocol — Claude Code 지침

## 프로젝트 개요

DeFi 프로토콜 프론트엔드 (Next.js + wagmi + viem). Creditcoin 테스트넷(chainId: 102031) 배포.

## 아키텍처

- **DDD 4계층**: `core/` → `domains/` → `shared/` → `app/`
- 모노레포: `apps/web/` (프론트엔드), `apps/server/` (NestJS API), `packages/core/` (공유), `packages/` (컨트랙트)
- 주소 설정: `packages/core/src/config/addresses.ts` (원본), `apps/web/src/core/config/addresses.ts` (re-export)
- ABI: `packages/core/src/abis/` (원본), `apps/web/src/core/abis/` (re-export)

## MVP 스코프

### 포함 프로토콜
- **DEX (Uniswap V3)**: Swap, Pool, LP 관리
- **Liquity (Borrow/Earn)**: Trove, Stability Pool
- **Morpho (Lend)**: 대출 마켓
- **Yield Vaults (Beefy fork)**: 자동 복리 볼트
- **ERC-8004 (Agent)**: 온체인 AI 에이전트

### !! OPTIONS 모듈은 MVP에서 제외 !!

> **Options(바이너리 옵션) 관련 코드는 이번 MVP 범위 밖이다.**
> - `apps/web/src/app/(options)/`, `domains/options/`, `core/abis/options.ts` 등 기존 코드는 삭제하지 않되 **수정/개선하지 않는다**
> - `addresses.ts`의 `OPTIONS` 설정도 건드리지 않는다
> - 새 기능 개발, 버그 수정, 리팩토링 시 Options 관련 파일은 무시한다
> - ABI 감사에서 Options 관련 CRITICAL 이슈(16건 중 5건)도 수정 대상이 아니다

## 온체인 참고사항

### Oracle 스케일링
- MockOracle의 `price()`는 **18 decimals** 반환 (Morpho 본가 스펙은 36 decimals이지만 이 프로젝트는 18)
- 현재 테스트넷 가격: wCTC=$5, lstCTC=$5, sbUSD=$1 (고정값)
- `useMorphoPosition.ts`의 `ORACLE_SCALE = 10n ** 18n` — oracle 컨트랙트 변경 시 같이 수정 필요

### 컨트랙트 배포 상태 (Creditcoin Testnet)
- SnowballLend, AdaptiveCurveIRM, Oracle 3개 모두 배포 완료
- `borrowRateView` 온체인 호출 가능 (유동성 없으면 rate=0 → fallback 근사치 사용)

## 커밋 컨벤션

- 한글 커밋 메시지 사용
- 예: `feat: v0.8.0 Pool New Position 기본 UI`

## 현재 페이즈

- **버전**: v0.13.1
- **기능**: Liquity Borrow UX 복원 + 온체인 데이터 연동
- **상태**: 완료
- **문서**: [docs/phases/v0.13.1-liquity-borrow-ux/](docs/phases/v0.13.1-liquity-borrow-ux/)
- **시작일**: 2026-03-07

## 문서 구조

- `docs/phases/` — 페이즈별 PRD, 설계, DoD, 티켓
- `docs/report/` — 분석 리포트
- `docs/guide/` — 가이드 문서
