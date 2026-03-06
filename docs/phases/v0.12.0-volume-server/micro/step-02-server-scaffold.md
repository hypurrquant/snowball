# Step 02: NestJS 서버 스캐폴딩 + health 모듈

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅ (apps/server 삭제)
- **선행 조건**: Step 01 (packages/core)
- **DoD 커버**: F3, N1, N3, N4

---

## 1. 구현 내용 (design.md 기반)

- `apps/server/` 디렉토리 생성
- package.json (NestJS 10.x, @nestjs/schedule, better-sqlite3, viem, @snowball/core)
- tsconfig.json
- nest-cli.json
- src/main.ts — NestJS bootstrap (port 3001, globalPrefix 'api', CORS)
- src/app.module.ts — 루트 모듈
- src/health/health.module.ts
- src/health/health.controller.ts — GET /api/health → 200

## 2. 완료 조건
- [ ] `apps/server/package.json` 존재, NestJS 의존성 포함
- [ ] `pnpm install` 워크스페이스 전체 성공
- [ ] `cd apps/server && npx tsc --noEmit` 컴파일 에러 0
- [ ] `pnpm --filter server start:dev`로 서버 기동
- [ ] 서버 시작 로그에 "Listening on port 3001" 출력
- [ ] `curl http://localhost:3001/api/health` → 200 + JSON 응답

## 3. 롤백 방법
- `rm -rf apps/server`
- pnpm-workspace.yaml에서 apps/server 제거 (이미 apps/* 패턴이면 불필요)

---

## Scope

### 신규 생성 파일
```
apps/server/
├── package.json           # NestJS 10.x, @nestjs/schedule, better-sqlite3, viem, @snowball/core
├── tsconfig.json
├── tsconfig.build.json
├── nest-cli.json
├── .env.example           # PORT, RPC_URL, MAX_BLOCKS_PER_CALL 등
├── src/
│   ├── main.ts            # bootstrap, port 3001, globalPrefix 'api', CORS
│   ├── app.module.ts      # root module
│   └── health/
│       ├── health.module.ts
│       └── health.controller.ts  # GET /api/health
```

### 수정 대상 파일
- 없음 (pnpm-workspace.yaml의 apps/* 패턴이 이미 포함)

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| @snowball/core | 직접 의존 | Step 01에서 생성 |
| NestJS 10.x | 신규 의존성 | @nestjs/core, @nestjs/common, @nestjs/platform-express |

### Side Effect 위험
- pnpm install 시 NestJS 의존성 트리 추가 → lock file 변경
- apps/* glob이 apps/server도 자동 포함하는지 확인

### 참고할 기존 패턴
- `HypurrQuant_FE/apps/server/src/main.ts`
- `HypurrQuant_FE/apps/server/src/health/`

## FP/FN 검증

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| main.ts bootstrap | ✅ | OK |
| health controller | ✅ | OK |
| CORS 설정 | ✅ main.ts에 포함 | OK |
| package.json scripts | ✅ | OK |

### 검증 통과: ✅

---

→ 다음: [Step 03: database 모듈](step-03-database.md)
