# 설계 - v0.12.0

## 변경 규모
**규모**: 일반 기능
**근거**: 새 모듈/패키지 다수 추가 (apps/server, packages/core), 내부 API 신규, 데이터 스키마 신규

---

## 문제 요약
Pool 리스트의 TVL/Volume/Fees/APR이 하드코딩 mock. Swap event 수집 + TVL 계산을 위한 백엔드 서버 필요.

> 상세: [README.md](README.md) 참조

## 접근법

HypurrQuant_FE의 NestJS 서버(Hexagonal Architecture)를 참조하되, Snowball 규모에 맞게 단순화:
- NestJS 유지 (재사용 극대화)
- MongoDB → SQLite (Docker 불필요)
- Messaging/Redis/ChainSync → @Cron + in-memory lock (단일 체인, 단일 인스턴스)
- packages/core 공유 패키지 (web re-export로 최소 변경)

## 대안 검토

### 프레임워크

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: NestJS | HypurrQuant 코드 최대 재사용, DI/모듈 구조 | 보일러플레이트 많음 | ✅ |
| B: Hono/Fastify | 경량, 빠른 시작 | HQ 구조 재사용 불가, DI 재구현 | ❌ |
| C: Next.js API Routes | 서버 별도 없음 | Cron 지원 어려움, 관심사 분리 불가 | ❌ |

**선택 이유**: HypurrQuant의 포트/어댑터 패턴을 그대로 가져오면 Store 레이어만 교체하면 됨. 개발 속도 최적.

### DB

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: MongoDB | HQ 1:1 재사용 | 로컬 Docker 필요 | ❌ |
| B: SQLite + better-sqlite3 | Docker 불필요, 단일 파일, 설정 최소 | Mongoose 어댑터 재작성 | ✅ |
| C: JSON/인메모리 | 가장 간단 | 재시작 시 데이터 유실, 커서 없음 | ❌ |

**선택 이유**: 풀 4개, 테스트넷 규모에 SQLite가 최적. WAL 모드로 read/write 병행 가능.

## 기술 결정

1. **NestJS 10.x** + `@nestjs/schedule` (Cron)
2. **better-sqlite3** (동기 API, WAL 모드, busy_timeout=5000)
3. **@snowball/core** (packages/core) — ABI, addresses, calculators 공유
4. **Hexagonal Architecture** — domain(ports) / application(services) / infrastructure(adapters, controllers)
5. **@Cron + in-memory lock** (messaging/redis 불필요)
6. **Swap event ABI** — UniswapV3 통일 (`Swap(address,address,int256,int256,uint160,uint128,int24)`)

---

## 범위 / 비범위

**범위(In Scope)**:
- `packages/core` 생성 + web re-export
- `apps/server` NestJS 스캐폴딩
- database 모듈 (SQLite 연결, 마이그레이션)
- pool 모듈 (정적 풀 + TVL Cron)
- volume 모듈 (수집 + 쿼리 + pool-stats API)
- health 모듈
- 프론트 연동 (usePoolList, useProtocolStats → API + mock fallback)

**비범위(Out of Scope)**:
- 멀티체인 지원
- 외부 가격 오라클
- Messaging/Redis 인프라
- Docker 배포
- Morpho/Liquity 통계
- apps/web/src/core 대규모 리팩토링

## 아키텍처 개요

```
pnpm-workspace.yaml
├── packages/core (@snowball/core)     ← 신규
│   └── abis, config, dex, volume, lib
├── apps/web (기존)
│   └── src/core/* → @snowball/core re-export
└── apps/server                        ← 신규
    └── src/
        ├── main.ts, app.module.ts
        ├── database/  (SQLite)
        ├── pool/      (정적 풀 + TVL)
        ├── volume/    (수집 + 쿼리 + stats API)
        └── health/
```

### 모듈 의존성
```
health → (독립)
database → (독립)
pool → database, @snowball/core
volume → pool, database, @snowball/core
```

## 데이터 흐름

```
┌─ Cron (1분) — Volume Sync ─────────────────────────┐
│  @Cron → VolumeSyncService.sync()                   │
│  → in-memory lock 확인                               │
│  → getCursor(102031)                                 │
│  → while (fromBlock <= latestBlock):                 │
│      getLogs(poolAddresses[], fromBlock, toBlock)     │
│      → aggregate to hourly buckets                   │
│      → upsert hourly_volume + setCursor (트랜잭션)    │
│  → cleanup expired (48h 이전)                        │
└─────────────────────────────────────────────────────┘

┌─ Cron (5분) — TVL Sync ────────────────────────────┐
│  @Cron → PoolTvlService.syncAll()                   │
│  → for each pool:                                    │
│      balanceOf(pool, token0), balanceOf(pool, token1) │
│      → tvlUsd = amounts * mockPriceUsd              │
│      → upsert pool_tvl                              │
└─────────────────────────────────────────────────────┘

┌─ REST API ──────────────────────────────────────────┐
│  GET /api/pools         → pool list + TVL + vol/fees/apr │
│  GET /api/protocol/stats → 프로토콜 합계            │
│  GET /api/volumes       → 풀별 volume 상세          │
│  GET /api/health        → 서버 상태                 │
└─────────────────────────────────────────────────────┘
```

## API/인터페이스 계약

### GET /api/pools
```json
{
  "data": [{
    "poolAddress": "0x...",
    "name": "wCTC / USDC",
    "token0": "0x3e31...",
    "token1": "0xdb5c...",
    "fee": 3000,
    "tvlUsd": 1200000,
    "volume24hUsd": 210000,
    "fees24hUsd": 630,
    "feeApr": 0.184,
    "swapCount24h": 123
  }],
  "lastUpdated": "2026-03-06T12:00:00Z",
  "count": 4
}
```

### GET /api/protocol/stats
```json
{
  "data": {
    "tvlUsd": 2450000,
    "volume24hUsd": 384000,
    "fees24hUsd": 1152,
    "totalPools": 4
  },
  "lastUpdated": "2026-03-06T12:00:00Z"
}
```

### GET /api/volumes
```json
{
  "data": [{
    "poolAddress": "0x...",
    "volume24hUsd": 210000,
    "fees24hUsd": 630,
    "feeApr": 0.184,
    "swapCount24h": 123
  }],
  "lastSyncBlock": { "102031": 12345678 },
  "count": 4
}
```

## 데이터 모델/스키마

### SQLite Tables

```sql
-- hourly_volume: Swap event 시간별 집계
CREATE TABLE hourly_volume (
  chain_id INTEGER NOT NULL,
  pool_address TEXT NOT NULL,
  hour_bucket TEXT NOT NULL,       -- "YYYYMMDDHH" (UTC)
  volume_token0_raw TEXT NOT NULL DEFAULT '0',
  volume_token1_raw TEXT NOT NULL DEFAULT '0',
  swap_count INTEGER NOT NULL DEFAULT 0,
  last_block INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (chain_id, pool_address, hour_bucket)
);

-- volume_cursors: 체인별 수집 진행 상태
CREATE TABLE volume_cursors (
  chain_id INTEGER PRIMARY KEY,
  last_processed_block INTEGER NOT NULL,
  last_processed_at TEXT NOT NULL
);

-- pool_tvl: 풀별 TVL 캐시
CREATE TABLE pool_tvl (
  chain_id INTEGER NOT NULL,
  pool_address TEXT NOT NULL,
  reserve0_raw TEXT NOT NULL DEFAULT '0',
  reserve1_raw TEXT NOT NULL DEFAULT '0',
  token0_price_usd REAL,
  token1_price_usd REAL,
  tvl_usd REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (chain_id, pool_address)
);
```

## 테스트 전략

- **Smoke test**: 서버 기동 → `GET /api/health` 200
- **TVL 검증**: Cron 수동 트리거 → pool_tvl에 4개 풀 데이터 확인
- **Volume 검증**: sync 수동 트리거 → hourly_volume에 데이터 생성 확인
- **API 검증**: curl로 /api/pools, /api/protocol/stats 응답 확인
- **프론트 연동**: NEXT_PUBLIC_API_URL 설정 후 /pool 페이지에서 실데이터 표시 확인
- **Mock fallback**: 환경변수 미설정 시 기존 mock 데이터 표시 확인

## 실패/에러 처리

| 실패 시나리오 | 대응 |
|-------------|------|
| getLogs 범위 초과 | block range 반으로 분할 재시도 |
| RPC rate limit (429) | delayBetweenCallsMs 증가 + exponential backoff |
| SQLite busy | WAL 모드 + busy_timeout=5000ms |
| Cron 중복 실행 | in-memory isSyncing flag |
| 테스트넷 리셋 | latestBlock < cursor → DB 전체 초기화 |
| 서버 미실행 | 프론트 mock fallback |

## 설계 결정 보충

### Volume USD 계산
Per-hour-bucket max 방식: 시간 버킷별로 `max(sum(|amount0|) * price0, sum(|amount1|) * price1)` 계산 후 24h 합산. Per-swap max가 아님 (HypurrQuant 동일 방식).

### API 응답 포맷
서버는 **raw 숫자를 top-level 필드로 반환**. 포맷된 문자열(`$1.2M`, `18.4%`)은 **프론트에서 생성**.

### API 필드 네이밍
camelCase 통일: `feeApr` (대문자 APR 아님)

## 생략 섹션

- **성능/스케일**: N/A — 테스트넷 저트래픽, 풀 4개, 스케일링 불필요
- **롤아웃/롤백 계획**: N/A — 로컬 개발 전용, 프로덕션 배포 없음
- **관측성**: N/A — 테스트넷이라 NestJS Logger만으로 충분
- **보안/권한**: N/A — 퍼블릭 읽기 전용 API, 인증 불필요
- **Ownership Boundary / Contract Reference / Dependency Map**: N/A — 단일 개발자, 서비스 경계 없음
- **운영 Runbook**: N/A — 온콜/운영팀 없음

## 리스크/오픈 이슈

| 리스크 | 영향 | 대응 |
|--------|------|------|
| Creditcoin RPC getLogs 범위 제한 미확인 | cold start 실패 가능 | maxBlocksPerCall=2000 + 자동 분할 |
| Cold start 24h vs 48h | 초기 24h 버퍼 비어있음 | 24h 수집으로 충분 (버퍼는 cleanup 안전장치) |
| better-sqlite3 native addon 빌드 | M1/M2 Mac에서 이슈 가능 | prebuild-install 사용 |
