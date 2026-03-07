# Nginx Reverse Proxy - v0.21.0

## 문제 정의

### 현상
- 각 백엔드 서비스가 개별 포트를 외부에 직접 노출 (server:3001, agent-server:3002)
- 프론트엔드가 서비스별로 다른 URL/포트를 알아야 함
- Next.js API Route가 API Key 주입용 프록시로 존재 (불필요한 레이어)
- `.env`에 포트 번호가 하드코딩되어 서비스 추가마다 포트 충돌 관리 필요
- Docker Compose에서 각 서비스가 호스트 포트를 직접 매핑

### 원인
- 리버스 프록시 없이 서비스별 직접 포트 노출 구조
- API Key 보호를 위해 Next.js 서버사이드 프록시를 임시 방편으로 도입
- 서비스 간 라우팅을 담당하는 인프라 계층 부재

### 영향
- 서비스 추가 시 포트 충돌 관리 비용 증가
- 프론트엔드에 서비스별 포트/URL 설정 산재
- 테스트 서버 배포 시 포트 관리 복잡

### 목표
1. **nginx로 단일 진입점 (포트 80)** 제공 — 모든 FE→BE 요청이 80번 포트로 통일
2. **경로 기반 라우팅** — `/api/server/*`, `/api/agent-server/*`로 서비스 구분
3. **Next.js API Route 프록시 제거** — 불필요한 프록시 레이어 삭제
4. **API Key guard 제거** — 인증 레이어 불필요
5. **`.env` 포트 하드코딩 제거** — Docker 내부 통신은 서비스명으로, 외부 노출은 nginx만

### 비목표 (Out of Scope)
- SSL/TLS 설정 (추후 별도)
- 프론트엔드 Docker화 (현재 수동 실행 유지)
- claude-proxy 관련 변경 (Docker 외부, agent-server가 host.docker.internal로 직접 호출)
- usc-worker 관련 변경 (포트 미사용, HTTP 서빙 없음)
- 로드밸런싱, 캐싱 등 고급 nginx 기능

## 제약사항
- claude-proxy는 호스트 머신에서 직접 실행 (Docker 외부) — nginx 라우팅 대상 아님
- 기존 Docker Compose 서비스 (server, agent-server, usc-worker) 구조 유지
- 프론트엔드는 현재 수동 실행 (`pnpm dev`) — nginx가 upstream으로 프록시

## 현재 → 목표 구조

### Before
```
브라우저 → :3000 (Next.js)
             ├── /api/agent/run  → API Key 주입 → :3002/agent/run
             └── /api/agent/runs → API Key 주입 → :3002/agent/runs
         → :3001 (server, 직접 노출)
         → :3002 (agent-server, 직접 노출)
```

### After
```
브라우저 → :80 (nginx)
             ├── /api/server/*        → server:3001/api/*
             ├── /api/agent-server/*  → agent-server:3002/api/*
             └── /*                   → frontend:3000
```
