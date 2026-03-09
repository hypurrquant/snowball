# Snowball Protocol — Claude Code 지침

## 프로젝트 개요

DeFi 프로토콜 프론트엔드 (Next.js + wagmi + viem). Creditcoin 테스트넷(chainId: 102031) 배포.

## 아키텍처

- **DDD 4계층**: `core/` → `shared/` → `domains/` → `app/`
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
- CreditcoinOracle의 `price()`는 **1e36 스케일** 반환 (Morpho Blue 표준)
- 현재 테스트넷 가격: wCTC=$5 (5e36), lstCTC=$5.20 (5.2e36), sbUSD=$1 (1e36)
- `useMorphoPosition.ts`의 `ORACLE_SCALE = 10n ** 36n`
- 배포 이력: `docs/guide/deploy-history.md`

### 컨트랙트 배포 상태 (Creditcoin Testnet)
- SnowballLend, AdaptiveCurveIRM, Oracle 3개 모두 배포 완료
- `borrowRateView` 온체인 호출 가능 (유동성 없으면 rate=0 → fallback 근사치 사용)

## 커밋 컨벤션

- 한글 커밋 메시지 사용
- 예: `feat: v0.8.0 Pool New Position 기본 UI`

## 현재 페이즈

- 없음 (v0.24.0 완료)

## Scripts 구조

```
scripts/
├── simulation-accounts.json     # 8 페르소나 + deployer 계정 (공유)
├── morpho-deploy-result.json    # Morpho 배포 결과
├── deploy/                      # 컨트랙트 배포 스크립트
│   └── README.md                # 각 스크립트 상세 설명
└── sim/                         # 시뮬레이션 + 테스트 스크립트
    └── README.md                # 각 스크립트 상세 설명
```

### 실행 방법

```bash
NODE_PATH=apps/web/node_modules npx tsx scripts/deploy/<script>.ts
NODE_PATH=apps/web/node_modules npx tsx scripts/sim/<script>.ts
```

`NODE_PATH`는 필수 — viem 등 의존성이 `apps/web/node_modules`에 있음.

### 새 스크립트 추가 규칙

1. **배포 스크립트** → `scripts/deploy/`에 생성, `deploy-<대상>.ts` 네이밍
2. **시뮬레이션/테스트** → `scripts/sim/`에 생성, `simulate-<프로토콜>-<액션>.ts` 또는 `test-<대상>.ts` 네이밍
3. **계정 참조**: `import accounts from "../simulation-accounts.json"` (한 단계 위)
4. **파일 경로**: `__dirname` 기반 상대 경로 사용 시 `scripts/deploy/` 또는 `scripts/sim/`에서 시작하므로 `../../`로 프로젝트 루트 접근
5. **README 업데이트**: 스크립트 추가 시 해당 디렉토리의 `README.md` 테이블에 파일명, 설명, Phase 추가
6. **배포 결과**: 배포 주소는 `docs/guide/deploy-history.md`에 기록, 배포 JSON은 `deployments/`에 저장
7. **테스트 결과**: E2E 스크립트는 파일 상단 주석에 TX hash, 소요시간, 결과 기록

### 유동성 제한 (시뮬레이션)

한 번의 액션에 각 토큰 보유량의 **최대 5%**까지만 사용.

## 문서 구조

- `docs/phases/` — 페이즈별 PRD, 설계, DoD, 티켓
- `docs/report/` — 분석 리포트
- `docs/guide/` — 가이드 문서
