# 작업 티켓 - v0.21.0

## 전체 현황

| # | Step | 난이도 | 롤백 | Scope | FP/FN | 개발 | 완료일 |
|---|------|--------|------|-------|-------|------|--------|
| 01 | agent-server 정규화 | 🟡 | ✅ | ✅ | ✅ | ✅ | 2026-03-07 |
| 02 | nginx 설정 + Docker Compose | 🟡 | ✅ | ✅ | ✅ | ✅ | 2026-03-07 |
| 03 | 프론트엔드 정리 | 🟢 | ✅ | ✅ | ✅ | ✅ | 2026-03-07 |

## 의존성

```
01 → 02 → 03
```

## 커버리지 매트릭스

### PRD 목표 → 티켓

| PRD 목표 | 관련 티켓 | 커버 |
|----------|----------|------|
| 1. nginx 단일 진입점 (포트 80) | Step 02 | ✅ |
| 2. 경로 기반 라우팅 | Step 01, 02 | ✅ |
| 3. Next.js API Route 프록시 제거 | Step 03 | ✅ |
| 4. API Key guard 제거 | Step 01 | ✅ |
| 5. .env 포트 하드코딩 제거 | Step 02, 03 | ✅ |

### DoD → 티켓

| DoD 항목 | 관련 티켓 | 커버 |
|----------|----------|------|
| F1: nginx 포트 80 기동 | Step 02 | ✅ |
| F2: /api/agent/* → agent-server | Step 01, 02 | ✅ |
| F3: /api/* → server | Step 02 | ✅ |
| F4: /* → 프론트엔드 | Step 02 | ✅ |
| F5: agent-server setGlobalPrefix | Step 01 | ✅ |
| F6: health 엔드포인트 | Step 01 | ✅ |
| F7: API Key guard 제거 | Step 01 | ✅ |
| F8: Next.js API Route 삭제 | Step 03 | ✅ |
| F9: Pool 목록 nginx 경유 | Step 02, 03 | ✅ |
| F10: Agent 실행 nginx 경유 | Step 02, 03 | ✅ |
| F11: 호스트 포트 매핑 제거 | Step 02 | ✅ |
| N1-N5: 비기능 조건 | Step 01, 03 | ✅ |
| E1-E4: 엣지케이스 | Step 02 | ✅ |

### 설계 결정 → 티켓

| 설계 결정 | 관련 티켓 | 커버 |
|----------|----------|------|
| agent-server setGlobalPrefix | Step 01 | ✅ |
| nginx longest prefix 라우팅 | Step 02 | ✅ |
| Health controller 추가 | Step 01 | ✅ |
| 프론트엔드 상대경로 전환 | Step 03 | ✅ |
| Docker 포트 매핑 제거 | Step 02 | ✅ |

## Step 상세
- [Step 01: agent-server 정규화](step-01-agent-server-normalize.md)
- [Step 02: nginx 설정 + Docker Compose](step-02-nginx-config.md)
- [Step 03: 프론트엔드 정리](step-03-frontend-cleanup.md)
