# Snowball Protocol — Claude Code 지침

## 프로젝트 개요

DeFi 프로토콜 프론트엔드 (Next.js + wagmi + viem). Creditcoin 테스트넷(chainId: 102031) 배포.

## 아키텍처

- **DDD 4계층**: `core/` → `domains/` → `shared/` → `app/`
- 모노레포: `apps/web/` (프론트엔드), `packages/` (컨트랙트)
- 주소 설정: `apps/web/src/core/config/addresses.ts`
- ABI: `apps/web/src/core/abis/`

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

## 커밋 컨벤션

- 한글 커밋 메시지 사용
- 예: `feat: v0.8.0 Pool New Position 기본 UI`

## 현재 페이즈

- **버전**: v0.10.0
- **기능**: Agent (ERC-8004) 프론트엔드 구현
- **상태**: Step 1 - PRD
- **문서**: [docs/phases/v0.10.0-agent-erc8004/](docs/phases/v0.10.0-agent-erc8004/)
- **Codex Session ID**: `/Users/mousebook/Documents/side-project/snowball/docs/phases/v0.10.0-agent-erc8004`
- **시작일**: 2026-03-06

## 문서 구조

- `docs/phases/` — 페이즈별 PRD, 설계, DoD, 티켓
- `docs/report/` — 분석 리포트
- `docs/guide/` — 가이드 문서
