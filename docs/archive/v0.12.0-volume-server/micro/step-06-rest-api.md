# Step 06: REST API (pools, protocol/stats, volumes)

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: ✅ (controller + query service 삭제)
- **선행 조건**: Step 04 (pool), Step 05 (volume)
- **DoD 커버**: F7, F8, F9, F13, E3, E3b, E7

---

## 1. 구현 내용 (design.md 기반)

### 도메인
- src/volume/domain/volume-query.port.ts — abstract: getHourlyVolumes(poolAddresses, since)

### 애플리케이션
- src/volume/application/volume-query.service.ts:
  - get24hVolumes(poolAddresses) — 24h 롤링 윈도우, hourly bucket 조회
  - computePoolVolume(hourlyVolumes, poolDef) — per-hour-bucket max(token0_usd, token1_usd) 합산
  - computeFees(volume, feeRate) — volume * feeRate
  - computeFeeApr(fees, tvl) — TVL=0이면 null, 아니면 (fees * 365) / tvl

### 인프라
- src/volume/infrastructure/sqlite-volume-query.adapter.ts — SELECT hourly_volume WHERE hour_bucket >= 24h전
- src/volume/infrastructure/pool-stats.controller.ts:
  - GET /api/pools → { data: [...], lastUpdated, count }
  - GET /api/protocol/stats → { data: { tvlUsd, volume24hUsd, fees24hUsd, totalPools }, lastUpdated }
  - GET /api/volumes → { data: [...], lastSyncBlock, count }

## 2. 완료 조건
- [ ] `curl http://localhost:3001/api/pools | jq '.count'` → 4
- [ ] /api/pools 각 항목에 poolAddress, name, tvlUsd, volume24hUsd, fees24hUsd, feeApr 필드 존재 (number 타입)
- [ ] /api/pools 응답에 lastUpdated (ISO 문자열), count (number) 존재
- [ ] `curl http://localhost:3001/api/protocol/stats | jq '.data.totalPools'` → 4
- [ ] /api/protocol/stats에 tvlUsd, volume24hUsd, fees24hUsd, totalPools, lastUpdated 존재
- [ ] `curl http://localhost:3001/api/volumes | jq '.count'` → 4
- [ ] /api/volumes에 lastSyncBlock, count 존재
- [ ] Swap event 없는 풀(TVL>0): volume24hUsd=0, feeApr=0
- [ ] TVL=0인 풀: feeApr=null
- [ ] Per-hour-bucket max 공식: 알려진 amount 삽입 → API 결과가 공식과 일치
- [ ] `cd apps/server && npx tsc --noEmit` 성공

## 3. 롤백 방법
- pool-stats.controller.ts, volume-query.service.ts, sqlite-volume-query.adapter.ts 삭제
- volume.module.ts에서 controller/provider 제거

---

## Scope

### 신규 생성 파일
```
apps/server/src/volume/
├── domain/
│   └── volume-query.port.ts              # abstract: getHourlyVolumes
├── application/
│   └── volume-query.service.ts           # 24h query, computePoolVolume, computeFees, computeFeeApr
└── infrastructure/
    ├── sqlite-volume-query.adapter.ts     # SELECT hourly_volume WHERE hour_bucket >= 24h전
    └── pool-stats.controller.ts           # GET /api/pools, /api/protocol/stats, /api/volumes
```

### 수정 대상 파일
```
apps/server/src/volume/volume.module.ts   # query adapter + controller 추가
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| pool | 직접 | PoolTvlStore에서 TVL 조회 |
| database | 직접 | DatabaseService 주입 |
| @snowball/core | 직접 | TOKEN_INFO(mockPriceUsd), pool definitions |

### Side Effect 위험
- pool-stats.controller가 volume.module에 속함 (pool 모듈과 분리하여 순환 의존 방지)

### 참고할 기존 패턴
- `HypurrQuant_FE/apps/server/src/volume/infrastructure/volume.controller.ts`
- `HypurrQuant_FE/apps/server/src/volume/application/volume-query.service.ts`

## FP/FN 검증

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| GET /api/pools | ✅ controller | OK |
| GET /api/protocol/stats | ✅ controller | OK |
| GET /api/volumes | ✅ controller | OK |
| 24h rolling query | ✅ query service | OK |
| Per-hour-bucket max | ✅ query service | OK |
| Fee/APR 계산 | ✅ query service | OK |
| TVL=0 → feeApr=null | ✅ query service | OK |
| lastUpdated, count 필드 | ✅ controller | OK |

### 검증 통과: ✅

---

→ 다음: [Step 07: 프론트엔드 연동](step-07-frontend-integration.md)
