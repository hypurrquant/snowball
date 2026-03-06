# Step 13: FE BFF 프록시 (Next.js API routes)

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅ (파일 삭제)
- **선행 조건**: Step 09 (NestJS 서버 — 프록시 대상)
- **DoD 매핑**: F37, F38

---

## 1. 구현 내용 (design.md 기반)

- `apps/web/src/app/api/agent/run/route.ts` — POST 프록시
  - 브라우저 요청을 받아 `API_KEY`를 서버사이드에서 주입
  - `AGENT_SERVER_URL` (환경변수) + `/agent/run`으로 프록시
  - `X-API-Key` 헤더 추가
  - NestJS 응답을 그대로 반환
- `apps/web/src/app/api/agent/runs/route.ts` — GET 프록시
  - `?user=0x...&limit=20` 쿼리 파라미터 전달
  - `API_KEY` 서버사이드 주입 + 프록시

## 2. 완료 조건

- [ ] `apps/web/src/app/api/agent/run/route.ts` 존재
- [ ] `POST /api/agent/run` → NestJS `POST /agent/run`으로 프록시 성공 (F37)
- [ ] `apps/web/src/app/api/agent/runs/route.ts` 존재
- [ ] `GET /api/agent/runs?user=0x...` → NestJS `GET /agent/runs`으로 프록시 성공 (F38)
- [ ] 브라우저 네트워크 탭에 `API_KEY` 미노출
- [ ] `tsc --noEmit` 통과

## 3. 롤백 방법
- `apps/web/src/app/api/agent/` 디렉토리 삭제

---

## Scope

### 신규 생성 파일
```
apps/web/src/app/api/agent/
├── run/route.ts          # 신규 — POST 프록시
└── runs/route.ts         # 신규 — GET 프록시
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| 환경변수 API_KEY | 서버사이드 | X-API-Key 헤더 주입 |
| 환경변수 AGENT_SERVER_URL | 서버사이드 | NestJS 서버 주소 |

### 참고할 기존 패턴
- Next.js App Router API routes (export function POST/GET)
- 기존 프로젝트에 API route 없음 → 신규 패턴 도입

### Side Effect 위험
- `apps/web/.env`에 `API_KEY`, `AGENT_SERVER_URL` 추가 필요

## FP/FN 검증

### 검증 체크리스트
- [x] run/route.ts — F37 POST 프록시
- [x] runs/route.ts — F38 GET 프록시
- [x] API_KEY 브라우저 미노출

### 검증 통과: ✅

---

> 다음: [Step 14: FE 위임 셋업 페이지](step-14-fe-delegation-page.md)
