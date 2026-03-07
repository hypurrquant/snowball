# 작업 티켓 - v0.12.0 Volume 수집 서버

## 전체 현황

| # | Step | 난이도 | 롤백 | Scope | FP/FN | 개발 | 완료일 |
|---|------|--------|------|-------|-------|------|--------|
| 01 | packages/core 생성 + web re-export | 🟠 중간 | ✅ | ✅ | ✅ | ⏳ | - |
| 02 | NestJS 서버 스캐폴딩 + health | 🟡 보통 | ✅ | ✅ | ✅ | ⏳ | - |
| 03 | database 모듈 (SQLite) | 🟡 보통 | ✅ | ✅ | ✅ | ⏳ | - |
| 04 | pool 모듈 (정적 풀 + TVL Cron) | 🟠 중간 | ✅ | ✅ | ✅ | ⏳ | - |
| 05 | volume 수집 모듈 | 🔴 어려움 | ✅ | ✅ | ✅ | ⏳ | - |
| 06 | REST API (pools/stats/volumes) | 🟠 중간 | ✅ | ✅ | ✅ | ⏳ | - |
| 07 | 프론트엔드 연동 (API + mock fallback) | 🟡 보통 | ✅ | ✅ | ✅ | ⏳ | - |

## 의존성

```
01 (packages/core)
 ├── 02 (서버 스캐폴딩)
 │    └── 03 (database)
 │         ├── 04 (pool + TVL)
 │         └── 05 (volume sync)
 │              └── 06 (REST API) ← 04도 필요
 │                   └── 07 (프론트 연동)
```

## 커버리지 매트릭스

### PRD 목표 → 티켓

| PRD 목표 | 관련 티켓 | 커버 |
|----------|----------|------|
| 1. NestJS 백엔드 서버 구축 | Step 02, 03 | ✅ |
| 2. packages/core 공유 패키지 생성 | Step 01 | ✅ |
| 3. Swap event 수집 (Cron + hourly bucket) | Step 05 | ✅ |
| 4. TVL 계산 (balanceOf + Cron) | Step 04 | ✅ |
| 5. REST API 제공 | Step 06 | ✅ |
| 6. 프론트 연동 (API + mock fallback) | Step 07 | ✅ |

### DoD → 티켓

| DoD 항목 | 관련 티켓 | 커버 |
|----------|----------|------|
| F1: packages/core import 가능 | Step 01 | ✅ |
| F2: web re-export 전환 | Step 01 | ✅ |
| F3: server health 200 | Step 02 | ✅ |
| F4: SQLite 3개 테이블 | Step 03 | ✅ |
| F5: TVL Cron → pool_tvl | Step 04 | ✅ |
| F6: Volume Cron → hourly_volume | Step 05 | ✅ |
| F7: GET /api/pools | Step 06 | ✅ |
| F8: GET /api/protocol/stats | Step 06 | ✅ |
| F9: GET /api/volumes | Step 06 | ✅ |
| F10: usePoolList API fetch | Step 07 | ✅ |
| F11: usePoolList mock fallback | Step 07 | ✅ |
| F12: useProtocolStats 연동 | Step 07 | ✅ |
| F13: 24h 롤링 윈도우 | Step 06 | ✅ |
| F14: 48h cleanup | Step 05 | ✅ |
| F15: Cold start 24h 역추적 | Step 05 | ✅ |
| N1: server tsc --noEmit | Step 02~06 (각 Step에서 확인) | ✅ |
| N2: web build 성공 | Step 01, 07 | ✅ |
| N3: pnpm install 성공 | Step 01, 02 | ✅ |
| N4: port 3001 | Step 02 | ✅ |
| N5: WAL 모드 | Step 03 | ✅ |
| E1: 서버 재시작 cursor 이어서 | Step 05 | ✅ |
| E2: getLogs 분할 재시도 | Step 05 | ✅ |
| E3: 빈 풀 volume=0 | Step 06 | ✅ |
| E3b: TVL=0 feeApr=null | Step 06 | ✅ |
| E4: 테스트넷 리셋 | Step 05 | ✅ |
| E5: 서버 미실행 mock fallback | Step 07 | ✅ |
| E6: Cron 중복 실행 스킵 | Step 05 | ✅ |
| E7: per-hour-bucket max 공식 | Step 06 | ✅ |

### 설계 결정 → 티켓

| 설계 결정 | 관련 티켓 | 커버 |
|----------|----------|------|
| NestJS 10.x | Step 02 | ✅ |
| better-sqlite3 + WAL | Step 03 | ✅ |
| @snowball/core 공유 패키지 | Step 01 | ✅ |
| Hexagonal Architecture | Step 04, 05, 06 | ✅ |
| @Cron + in-memory lock | Step 04, 05 | ✅ |
| Swap event ABI (UniV3) | Step 05 | ✅ |
| Per-hour-bucket max | Step 06 | ✅ |
| Query-time USD 변환 | Step 06 | ✅ |
| API raw numbers only | Step 06 | ✅ |
| React Query + env 분기 | Step 07 | ✅ |

**커버리지: 100% — 누락 없음**

## Step 상세

- [Step 01: packages/core 생성 + web re-export](step-01-packages-core.md)
- [Step 02: NestJS 서버 스캐폴딩 + health](step-02-server-scaffold.md)
- [Step 03: database 모듈 (SQLite)](step-03-database.md)
- [Step 04: pool 모듈 (정적 풀 + TVL Cron)](step-04-pool-tvl.md)
- [Step 05: volume 수집 모듈](step-05-volume-sync.md)
- [Step 06: REST API (pools/stats/volumes)](step-06-rest-api.md)
- [Step 07: 프론트엔드 연동](step-07-frontend-integration.md)
