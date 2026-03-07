# Step 05: volume 수집 모듈 (getLogs + hourly bucket + cursor)

## 메타데이터
- **난이도**: 🔴 어려움
- **롤백 가능**: ✅ (volume 모듈 삭제 + DB 데이터 삭제)
- **선행 조건**: Step 03 (database), Step 04 (pool — 풀 정의 참조)
- **DoD 커버**: F6, F14, F15, E1, E2, E4, E6

---

## 1. 구현 내용 (design.md 기반)

### 도메인
- src/volume/domain/volume.types.ts — SwapLogEntry, HourlyVolume, VolumeCursor 타입
- src/volume/domain/volume-collector.port.ts — abstract: fetchSwapLogs, getLatestBlockNumber, getBlockTimestamps
- src/volume/domain/volume-store.port.ts — abstract: upsertHourlyVolume, getCursor, setCursor, cleanup

### 애플리케이션
- src/volume/application/volume-sync.service.ts:
  - @Cron(1분) sync()
  - in-memory isSyncing lock
  - Cold start: cursor 없으면 latestBlock - 14400에서 시작
  - Chunked getLogs (maxBlocksPerCall=2000, 환경변수 오버라이드)
  - getLogs 실패 시 range 반으로 분할 재시도
  - Swap event → hourly bucket 집계 (YYYYMMDDHH UTC)
  - 트랜잭션: upsert hourly_volume + setCursor
  - 48h 초과 레코드 cleanup
  - 테스트넷 리셋 감지 (latestBlock < cursor → DB 초기화)
  - 로그: "Syncing from block X", "Cold start: syncing from block X", "already syncing"

### 인프라
- src/volume/infrastructure/rpc-volume-collector.adapter.ts — viem getLogs, getBlockNumber, getBlock
- src/volume/infrastructure/sqlite-volume-store.adapter.ts — SQLite upsert, cursor CRUD, cleanup
- src/volume/volume.module.ts

## 2. 완료 조건
- [ ] volume 모듈이 app.module.ts에 import됨
- [ ] 서버 기동 후 1분 내 volume sync 실행 (로그 확인)
- [ ] 빈 DB로 시작 시 로그에 "Cold start: syncing from block X" 출력 (X ≈ latestBlock - 14400)
- [ ] 스왑 시뮬레이션 후 hourly_volume에 데이터 존재 (`SELECT count(*) FROM hourly_volume WHERE swap_count > 0` → 1+)
- [ ] 서버 재시작 후 로그에 "Syncing from block X" (X >= prevCursor - 2000)
- [ ] `MAX_BLOCKS_PER_CALL=10` 환경변수로 서버 시작 → 분할 재시도 로그 확인
- [ ] 49시간 전 bucket 삽입 → sync 실행 → 해당 레코드 삭제 확인
- [ ] Cron 중복 실행 시 "already syncing" 로그
- [ ] cursor를 999999999로 설정 → sync → DB 초기화 + 정상 수집 로그
- [ ] `cd apps/server && npx tsc --noEmit` 성공

## 3. 롤백 방법
- src/volume/ 삭제
- app.module.ts에서 VolumeModule import 제거
- hourly_volume, volume_cursors 테이블 데이터 삭제

---

## Scope

### 신규 생성 파일
```
apps/server/src/volume/
├── domain/
│   ├── volume.types.ts              # SwapLogEntry, HourlyVolume, VolumeCursor
│   ├── volume-collector.port.ts     # abstract: fetchSwapLogs, getLatestBlockNumber
│   └── volume-store.port.ts         # abstract: upsert, getCursor, setCursor, cleanup
├── application/
│   └── volume-sync.service.ts       # @Cron(1분), sync(), cold start, chunking, cleanup
├── infrastructure/
│   ├── rpc-volume-collector.adapter.ts    # viem getLogs(Swap event)
│   └── sqlite-volume-store.adapter.ts     # SQLite hourly_volume/cursor CRUD
└── volume.module.ts
```

### 수정 대상 파일
```
apps/server/src/app.module.ts   # VolumeModule import 추가
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| @snowball/core | 직접 | SWAP_EVENT_ABI, pool addresses |
| database | 직접 | DatabaseService 주입 |
| pool | 간접 | 풀 주소 목록 참조 |
| @nestjs/schedule | 직접 | @Cron 데코레이터 |
| viem | 직접 | getLogs, getBlockNumber |

### Side Effect 위험
- getLogs 범위 초과 시 RPC 에러 → 자동 분할 재시도로 대응
- Cold start 시 14400 블록 스캔 → 시간 소요 (수분)
- 테스트넷 리셋 시 DB 초기화 → 의도적 동작

### 참고할 기존 패턴
- `HypurrQuant_FE/apps/server/src/volume/` — 전체 구조
- `HypurrQuant_FE/packages/core/dex/pool/pipeline/fetchers/volumeFetcher.ts` — SWAP_EVENT_ABI, getLogs

## FP/FN 검증

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| Cron sync | ✅ volume-sync.service.ts | OK |
| Cold start | ✅ service에 포함 | OK |
| Chunked getLogs | ✅ service + adapter | OK |
| Hourly bucket 집계 | ✅ service에 포함 | OK |
| Cursor CRUD | ✅ store adapter | OK |
| 48h cleanup | ✅ service에 포함 | OK |
| 테스트넷 리셋 감지 | ✅ service에 포함 | OK |
| In-memory lock | ✅ service에 포함 | OK |
| 분할 재시도 | ✅ service에 포함 | OK |

### 검증 통과: ✅

---

→ 다음: [Step 06: REST API](step-06-rest-api.md)
