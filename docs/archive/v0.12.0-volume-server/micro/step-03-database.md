# Step 03: database 모듈 (SQLite 연결 + 마이그레이션)

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅ (database 모듈 삭제 + DB 파일 삭제)
- **선행 조건**: Step 02 (서버 스캐폴딩)
- **DoD 커버**: F4, N5

---

## 1. 구현 내용 (design.md 기반)

- src/database/database.module.ts — 글로벌 모듈
- src/database/database.service.ts — better-sqlite3 연결 + WAL 모드 + busy_timeout=5000
- src/database/migrations/ — 초기 마이그레이션
- 3개 테이블 생성:
  - `hourly_volume` (chain_id, pool_address, hour_bucket, volume_token0_raw, volume_token1_raw, swap_count, last_block, updated_at) PK(chain_id, pool_address, hour_bucket)
  - `volume_cursors` (chain_id PK, last_processed_block, last_processed_at)
  - `pool_tvl` (chain_id, pool_address, reserve0_raw, reserve1_raw, token0_price_usd, token1_price_usd, tvl_usd, updated_at) PK(chain_id, pool_address)
- data/ 디렉토리 + .gitignore (DB 파일 제외)

## 2. 완료 조건
- [ ] `src/database/database.module.ts`가 존재하고 @Global() + @Module() 데코레이터
- [ ] `src/database/database.service.ts`가 better-sqlite3로 연결
- [ ] 서버 기동 시 `apps/server/data/snowball.db` 파일 생성
- [ ] `sqlite3 apps/server/data/snowball.db ".tables"` 출력에 hourly_volume, volume_cursors, pool_tvl 포함
- [ ] `sqlite3 apps/server/data/snowball.db "PRAGMA journal_mode"` → wal
- [ ] `cd apps/server && npx tsc --noEmit` 성공

## 3. 롤백 방법
- src/database/ 삭제
- app.module.ts에서 DatabaseModule import 제거
- data/snowball.db 삭제

---

## Scope

### 신규 생성 파일
```
apps/server/
├── data/
│   └── .gitignore          # *.db, *.db-wal, *.db-shm
├── src/database/
│   ├── database.module.ts   # @Global() @Module()
│   └── database.service.ts  # better-sqlite3 연결, WAL, busy_timeout, 마이그레이션
```

### 수정 대상 파일
```
apps/server/src/app.module.ts   # DatabaseModule import 추가
apps/server/.gitignore           # data/*.db 제외 (또는 data/.gitignore)
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| better-sqlite3 | 직접 의존 | native addon, package.json에 추가 |
| @types/better-sqlite3 | 개발 의존 | TypeScript 타입 |

### Side Effect 위험
- better-sqlite3 native addon: M1/M2 Mac에서 prebuild-install 필요할 수 있음
- WAL 모드 설정 시 .db-wal, .db-shm 파일 생성 → .gitignore 필요

### 참고할 기존 패턴
- `HypurrQuant_FE/apps/server/src/database/` (MongoDB → SQLite로 교체)

## FP/FN 검증

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| 3개 테이블 DDL | ✅ database.service.ts 마이그레이션에 포함 | OK |
| WAL 모드 | ✅ database.service.ts에 포함 | OK |
| busy_timeout | ✅ database.service.ts에 포함 | OK |
| .gitignore | ✅ | OK |

### 검증 통과: ✅

---

→ 다음: [Step 04: pool 모듈](step-04-pool-tvl.md)
