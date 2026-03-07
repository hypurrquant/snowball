# Step 01: agent-server 정규화

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅ (git revert)
- **선행 조건**: 없음

---

## 1. 구현 내용 (design.md 기반)
- `apps/agent-server/src/main.ts`에 `app.setGlobalPrefix("api")` 추가
- Health controller 생성 (`GET /api/health`)
- `app.module.ts`에 HealthController 등록
- `@UseGuards(ApiKeyGuard)` 제거 (agent.controller.ts)
- `api-key.guard.ts` 파일 삭제
- `.env.example`에서 `API_KEY` 항목 제거

## 2. 완료 조건
- [ ] agent-server 기동 후 `curl localhost:3002/api/agent/status` → 200
- [ ] `curl localhost:3002/api/health` → 200
- [ ] `curl localhost:3002/api/agent/status` (X-API-Key 헤더 없이) → 200
- [ ] `grep -r 'ApiKeyGuard' apps/agent-server/src/` → 결과 없음
- [ ] `npx tsc --noEmit` 에러 0

## 3. 롤백 방법
- `git revert` 1커밋
- 영향 범위: agent-server만 (프론트엔드 미영향)

---

## Scope

### 수정 대상 파일
```
apps/agent-server/src/
├── main.ts                          # 수정 - setGlobalPrefix("api") 추가
├── app.module.ts                    # 수정 - HealthController import
├── agent/agent.controller.ts        # 수정 - @UseGuards(ApiKeyGuard) 제거
└── .env.example                     # 수정 - API_KEY 제거
```

### 신규 생성 파일
```
apps/agent-server/src/
└── health/health.controller.ts      # 신규 - GET /health 엔드포인트
```

### 삭제 파일
```
apps/agent-server/src/
└── common/guards/api-key.guard.ts   # 삭제
```

## FP/FN 검증

### 검증 체크리스트
- [x] Scope의 모든 파일이 구현 내용과 연결됨
- [x] 구현 내용의 모든 항목이 Scope에 반영됨
- [x] 검증 통과: ✅

---

→ 다음: [Step 02: nginx 설정](step-02-nginx-config.md)
