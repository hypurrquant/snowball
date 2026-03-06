# Volume 수집 서버 - v0.12.0

## 문제 정의

### 현상
- Pool 리스트 페이지(`/pool`)의 TVL, Volume 24h, Fees 24h, APR이 모두 하드코딩된 mock 데이터
- `usePoolList.ts`가 `MOCK_POOLS` 상수를 반환하며, `useProtocolStats.ts`도 고정값 반환
- 실제 온체인 활동(스왑, 유동성 공급)이 반영되지 않아 프로토콜 상태 파악 불가

### 원인
- 백엔드 서버가 없음 — 모노레포에 `apps/web`(프론트)만 존재
- Swap event 수집, 시계열 집계, TVL 계산 등 서버 사이드 작업을 수행할 인프라 부재
- 프론트에서 직접 `getLogs`로 24시간치 Swap event를 조회하는 것은 비현실적 (수천 블록 스캔)

### 영향
- **사용자**: 풀 선택 시 정확한 수익률/유동성 정보를 볼 수 없음
- **시뮬레이션**: 8개 페르소나 계정의 활동 결과가 UI에 반영되지 않음
- **데모**: 프로토콜 데모 시 "모든 숫자가 가짜"라는 인상을 줌

### 목표
1. **NestJS 백엔드 서버** (`apps/server`) 구축
2. **packages/core** 공유 패키지 생성 (web + server 공통 로직)
3. **Swap event 수집** — Cron 기반 getLogs로 hourly bucket 집계
4. **TVL 계산** — balanceOf(pool) 기반 주기적 갱신
5. **REST API 제공** — `/api/pools`, `/api/protocol/stats`, `/api/volumes`
6. **프론트 연동** — usePoolList, useProtocolStats를 API 기반으로 전환 (mock fallback 유지)

### 비목표 (Out of Scope)
- **멀티체인 지원** — Creditcoin Testnet(102031) 단일 체인만 대상
- **외부 가격 오라클 연동** — TOKEN_INFO.mockPriceUsd(고정값) 사용
- **Messaging 인프라** (SQS/Kafka/Redis) — 단순 @Cron 직접 호출
- **Docker/컨테이너 배포** — 로컬 개발 환경 우선
- **Morpho/Liquity 프로토콜 통계** — DEX(Uniswap V3) 풀만 대상
- **실시간 WebSocket 스트리밍** — REST API polling 방식
- **apps/web/src/core 대규모 리팩토링** — re-export로 최소 변경

## 메트릭 & 시간 윈도우 정의

### 메트릭 공식 (모두 USD 기준)
- **TVL** = `(balanceOf(pool, token0) / 10^18 * token0PriceUsd) + (balanceOf(pool, token1) / 10^18 * token1PriceUsd)`
- **Volume 24h** = `sum over hourly buckets of max(sumHourly(|amount0|) / 10^18 * token0PriceUsd, sumHourly(|amount1|) / 10^18 * token1PriceUsd)` (per-hour-bucket max, not per-swap max — HypurrQuant 동일 방식)
- **Fees 24h** = `Volume24h * poolFeeRate` (fee=3000 → 0.3% → `volume * 3000 / 1_000_000`)
- **Fee APR** = `(Fees24h * 365) / TVL` (TVL=0이면 null)

### 시간 윈도우
- **24h 롤링 윈도우**: 현재 시각 기준 24시간 전 ~ 현재
- **Hourly bucket 경계**: UTC 기준 (YYYYMMDDHH 형식)
- **Bucket 보존 기간**: 48시간 (24h 윈도우 + 24h 버퍼), 이후 cleanup
- **Cold start**: 서버 최초 실행 시 24시간치(~14,400 블록) 역추적 수집

### 데이터 정합성
- **Reorg 처리**: v0.12.0에서는 미처리 (테스트넷 6초 블록, reorg 극히 드묾)
- **중복 집계**: 서버 crash 시 최대 1 chunk(2000 블록, ~3.3시간) 중복 가능 — 허용 범위
- **테스트넷 리셋**: `latestBlock < cursor.lastProcessedBlock`이면 전체 DB 초기화
- **USDC decimals**: 이 프로젝트의 USDC는 커스텀 배포이며 18 decimals (표준 6이 아님)

## 제약사항

### 기술적 제약
- **체인**: Creditcoin Testnet (chainId: 102031), 블록타임 ~6초
- **RPC**: `https://rpc.cc3-testnet.creditcoin.network` (getLogs 범위 제한 미확인)
- **풀**: 4개 (wCTC/USDC, wCTC/sbUSD, sbUSD/USDC, lstCTC/wCTC), 모두 Uniswap V3 fee=3000
- **토큰**: 전부 18 decimals, 고정 가격 (wCTC=$5, lstCTC=$5, sbUSD=$1, USDC=$1)
- **DB**: SQLite(better-sqlite3) — Docker 없이 로컬에서 바로 실행 가능해야 함

### 참조 프로젝트
- **HypurrQuant_FE** (`/Users/mousebook/Documents/side-project/HypurrQuant_FE`)
  - `apps/server/` — NestJS + MongoDB + Hexagonal Architecture
  - `packages/core/` (@hq/core) — React-free 공유 패키지
  - 특히 `apps/server/src/volume/` 모듈이 핵심 참조 대상
  - Volume 수집 패턴: getLogs → hourly bucket 집계 → cursor 기반 증분 수집 → query-time USD 변환

### 설계 원칙
- HypurrQuant의 Hexagonal Architecture(포트/어댑터) 패턴 유지
- Store 레이어만 MongoDB → SQLite로 교체, 도메인/애플리케이션 로직 최대 재사용
- 서버가 없어도 프론트가 mock fallback으로 정상 동작해야 함

## 사전 토론 요약

Codex와 12 라운드 토론(discuss session /snowball/13)에서 합의한 핵심 결정:

| 항목 | 결정 |
|------|------|
| 프레임워크 | NestJS (HypurrQuant 재사용 극대화) |
| DB | SQLite + better-sqlite3 |
| 공유 패키지 | `packages/core` (@snowball/core) 생성, web은 re-export |
| Messaging | 불필요, @Cron + in-memory lock |
| 수집 주기 | 1분 (환경변수 조절 가능) |
| 블록 범위 | maxBlocksPerCall=2000 + 자동 분할 |
| 저장 방식 | Hourly bucket (raw token amounts) |
| USD 변환 | Query-time (TOKEN_INFO.mockPriceUsd) |
| TVL | 서버 Cron(5분) + balanceOf → pool_tvl 캐시 |
| 프론트 연동 | React Query + env 분기 (NEXT_PUBLIC_API_URL) |
