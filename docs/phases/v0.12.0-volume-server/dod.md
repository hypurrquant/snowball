# DoD (Definition of Done) - v0.12.0

## 기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| F1 | `packages/core` 패키지가 존재하고 `@snowball/core`로 apps/web, apps/server에서 import 가능 | `pnpm install` 성공 + `cd apps/server && npx tsc --noEmit` + `cd apps/web && npx tsc --noEmit` 양쪽 성공 |
| F2 | `apps/web/src/core/*`가 `@snowball/core` re-export로 전환됨 | `pnpm --filter web build` 성공 + /pool 페이지 렌더링 정상 (에러 없음) |
| F3 | `apps/server`가 NestJS 서버로 기동되고 `GET /api/health` 200 반환 | `curl http://localhost:3001/api/health` → 200 |
| F4 | SQLite DB 파일이 생성되고 3개 테이블(hourly_volume, volume_cursors, pool_tvl) 존재 | 서버 기동 후 `sqlite3 apps/server/data/snowball.db ".tables"` 출력에 3개 테이블 포함 |
| F5 | TVL Cron이 4개 풀의 balanceOf를 조회하여 pool_tvl에 저장 | 서버 기동 후 `sqlite3 apps/server/data/snowball.db "SELECT count(*) FROM pool_tvl"` → 4 |
| F6 | Volume Cron이 Swap event를 수집하여 hourly_volume에 저장 | `scripts/simulate-swap.ts` 실행 후 `sqlite3 apps/server/data/snowball.db "SELECT count(*) FROM hourly_volume WHERE swap_count > 0"` → 1 이상 |
| F7 | `GET /api/pools` 가 4개 풀의 tvlUsd, volume24hUsd, fees24hUsd, feeApr, lastUpdated, count를 반환 | `curl http://localhost:3001/api/pools \| jq '.count'` → 4, 각 항목의 tvlUsd/volume24hUsd/fees24hUsd가 number 타입 |
| F8 | `GET /api/protocol/stats`가 tvlUsd, volume24hUsd, fees24hUsd, totalPools, lastUpdated를 반환 | `curl http://localhost:3001/api/protocol/stats \| jq '.data.totalPools'` → 4 |
| F9 | `GET /api/volumes`가 풀별 volume 상세 + lastSyncBlock + count를 반환 | `curl http://localhost:3001/api/volumes \| jq '.count'` → 4 |
| F10 | `usePoolList` hook이 `NEXT_PUBLIC_API_URL` 설정 시 서버 API에서 데이터 fetch | `NEXT_PUBLIC_API_URL=http://localhost:3001` 설정 후 브라우저에서 /pool 페이지 → 실데이터 표시 |
| F11 | `usePoolList` hook이 `NEXT_PUBLIC_API_URL` 미설정 시 기존 mock 데이터 반환 | env 미설정 후 /pool 페이지 → mock 데이터 표시, 콘솔 에러 없음 |
| F12 | `useProtocolStats` hook이 서버 API 연동/mock fallback 동작 | F10, F11과 동일 방식 확인 |
| F13 | 24h 롤링 윈도우: volume24hUsd가 현재 시각 기준 24시간 내 데이터만 합산 | 25시간 전 bucket과 1시간 전 bucket 데이터 삽입 후 API 응답에 24h 내 bucket만 반영 확인 |
| F14 | 48h 보존 + cleanup: 48시간 초과 hourly_volume 레코드가 삭제됨 | 49시간 전 bucket 삽입 → sync 실행 → 해당 레코드 삭제 확인 |
| F15 | Cold start: 서버 최초 실행 시 24시간치(~14,400 블록) 역추적 수집 | 빈 DB로 서버 시작 → 서버 로그에 `"Cold start: syncing from block X"` 출력 (X ≈ latestBlock - 14400) |

## 비기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| N1 | apps/server TypeScript 컴파일 에러 0 | `cd apps/server && npx tsc --noEmit` exit code 0 |
| N2 | apps/web 빌드 성공 (re-export 전환 후) | `pnpm --filter web build` exit code 0 |
| N3 | pnpm install 워크스페이스 전체 성공 | `pnpm install` exit code 0 |
| N4 | 서버가 3001 포트에서 기동 | 서버 시작 로그에 "Listening on port 3001" 출력 |
| N5 | SQLite WAL 모드 활성화 | `sqlite3 apps/server/data/snowball.db "PRAGMA journal_mode"` → wal |

## 엣지케이스

| # | 시나리오 | 기대 동작 | 검증 방법 |
|---|---------|----------|----------|
| E1 | 서버 재시작 후 volume 수집 | cursor부터 이어서 수집 (최대 1 chunk/2000블록 중복 허용 — PRD 합의) | 서버 재시작 전후 `SELECT last_processed_block FROM volume_cursors` 비교 + 서버 로그에 `"Syncing from block X"` 출력 확인 (X >= prevCursor - 2000) |
| E2 | getLogs 범위 초과 에러 | block range 반으로 분할 재시도 | 환경변수 `MAX_BLOCKS_PER_CALL=10`으로 서버 시작 → 로그에 분할 재시도 메시지 확인 |
| E3 | Swap event 없는 풀 (TVL > 0) | volume=0, fees=0, feeApr=0 (null 아님) | 활동 없는 풀의 `GET /api/pools` 응답에서 volume24hUsd=0, feeApr=0 확인 |
| E3b | TVL=0인 풀 | feeApr=null (PRD: TVL=0이면 null) | TVL 0인 풀의 `GET /api/pools` 응답에서 feeApr=null 확인 |
| E4 | 테스트넷 리셋 (latestBlock < cursor) | DB 초기화 후 cold start | `UPDATE volume_cursors SET last_processed_block=999999999` → sync 실행 → DB 초기화 + 정상 수집 로그 확인 |
| E5 | 서버 미실행 상태에서 프론트 접속 | mock fallback 데이터 표시, 에러 없음 | 서버 미실행 + `NEXT_PUBLIC_API_URL` 설정 상태에서 /pool 페이지 로드 → mock 표시, 콘솔 에러 없음 |
| E6 | Cron 중복 실행 (이전 sync 미완료) | in-memory lock으로 스킵 | 로그에서 "already syncing" 또는 "skipped" 메시지 확인 |
| E7 | Per-hour-bucket max 공식 검증 | volume USD = sum(hourly max(token0_usd, token1_usd)) | 알려진 amount의 Swap 2건을 같은 hour bucket에 삽입 → API volume이 per-hour-bucket max 공식 결과와 일치 확인 |
