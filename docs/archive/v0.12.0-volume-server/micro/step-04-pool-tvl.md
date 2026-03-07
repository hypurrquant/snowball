# Step 04: pool 모듈 (정적 풀 + TVL Cron)

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: ✅ (pool 모듈 삭제)
- **선행 조건**: Step 01 (packages/core), Step 03 (database)
- **DoD 커버**: F5

---

## 1. 구현 내용 (design.md 기반)

- src/pool/domain/pool.types.ts — PoolDefinition, PoolTvl 타입
- src/pool/domain/pool-tvl.port.ts — TVL fetcher 포트 (abstract: getTokenBalance)
- src/pool/domain/pool-tvl-store.port.ts — TVL store 포트 (abstract: upsert, getAll)
- src/pool/application/pool-tvl.service.ts — @Cron(5분) syncAll(), in-memory lock
  - 4개 풀 순회: balanceOf(pool, token0) + balanceOf(pool, token1)
  - tvlUsd = amounts * mockPriceUsd (TOKEN_INFO from @snowball/core)
  - upsert pool_tvl
- src/pool/infrastructure/rpc-pool-tvl.adapter.ts — viem publicClient.readContract(balanceOf)
- src/pool/infrastructure/sqlite-pool-tvl-store.adapter.ts — SQLite upsert
- src/pool/pool.module.ts — 모듈 wiring

## 2. 완료 조건
- [ ] pool 모듈이 app.module.ts에 import됨
- [ ] 서버 기동 후 5분 내 pool_tvl 테이블에 4행 존재
- [ ] `sqlite3 apps/server/data/snowball.db "SELECT count(*) FROM pool_tvl"` → 4
- [ ] 각 행의 tvl_usd > 0 (풀에 유동성이 있는 경우)
- [ ] PoolTvl 타입에 tvl_usd: number 정의 (feeApr null 처리는 Step 06에서 구현)
- [ ] `cd apps/server && npx tsc --noEmit` 성공

## 3. 롤백 방법
- src/pool/ 삭제
- app.module.ts에서 PoolModule import 제거
- pool_tvl 테이블 데이터 삭제 (테이블 자체는 migration에서 관리)

---

## Scope

### 신규 생성 파일
```
apps/server/src/pool/
├── domain/
│   ├── pool.types.ts            # PoolDefinition, PoolTvl
│   ├── pool-tvl.port.ts         # abstract TVL fetcher
│   └── pool-tvl-store.port.ts   # abstract TVL store
├── application/
│   └── pool-tvl.service.ts      # @Cron(5분), syncAll(), in-memory lock
├── infrastructure/
│   ├── rpc-pool-tvl.adapter.ts       # viem balanceOf
│   └── sqlite-pool-tvl-store.adapter.ts  # SQLite upsert pool_tvl
└── pool.module.ts
```

### 수정 대상 파일
```
apps/server/src/app.module.ts   # PoolModule import 추가
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| @snowball/core | 직접 | TOKEN_INFO(mockPriceUsd), TOKENS, DEX_POOLS |
| database | 직접 | DatabaseService 주입 |
| @nestjs/schedule | 직접 | @Cron 데코레이터 |
| viem | 직접 | publicClient.readContract(balanceOf) |

### Side Effect 위험
- RPC 호출 (balanceOf × 2 × 4풀 = 8 calls per 5분) — rate limit 가능성 낮음

### 참고할 기존 패턴
- `HypurrQuant_FE/apps/server/src/pool/` — Hexagonal 패턴

## FP/FN 검증

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| TVL Cron | ✅ pool-tvl.service.ts | OK |
| in-memory lock | ✅ service에 포함 | OK |
| balanceOf RPC | ✅ rpc adapter | OK |
| SQLite upsert | ✅ store adapter | OK |
| 풀 정의 (4개) | ✅ @snowball/core pools.ts에서 import | OK |

### 검증 통과: ✅

---

→ 다음: [Step 05: volume 수집 모듈](step-05-volume-sync.md)
