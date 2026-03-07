# Step 02: nginx 설정 + Docker Compose

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅ (nginx 서비스 제거 + ports 복원)
- **선행 조건**: Step 01 (agent-server global prefix)

---

## 1. 구현 내용 (design.md 기반)
- `nginx/nginx.conf` 파일 생성 (3개 location 블록)
- `docker-compose.yml`에 nginx 서비스 추가 (port 80)
- server, agent-server의 호스트 포트 매핑 제거
- agent-server에서 `API_KEY` 환경변수 제거

## 2. 완료 조건
- [ ] `docker compose up` 후 nginx 컨테이너 기동됨
- [ ] `curl localhost/api/agent/status` → 200 (agent-server 라우팅)
- [ ] `curl localhost/api/pools` → 200 (server 라우팅)
- [ ] `curl localhost` → HTML (프론트엔드 라우팅)
- [ ] `curl localhost:3001` → Connection refused (직접 접근 차단)
- [ ] `curl localhost:3002` → Connection refused (직접 접근 차단)
- [ ] `docker compose ps`에서 80만 외부 노출

## 3. 롤백 방법
- `nginx/nginx.conf` 삭제 + docker-compose.yml에서 nginx 서비스 제거 + ports 복원
- 영향 범위: Docker 인프라만

---

## Scope

### 신규 생성 파일
```
nginx/
└── nginx.conf                       # 신규 - 리버스 프록시 설정
```

### 수정 대상 파일
```
docker-compose.yml                   # 수정 - nginx 추가, ports 제거, API_KEY 제거
```

## FP/FN 검증

### 검증 체크리스트
- [x] Scope의 모든 파일이 구현 내용과 연결됨
- [x] 구현 내용의 모든 항목이 Scope에 반영됨
- [x] 검증 통과: ✅

---

→ 다음: [Step 03: 프론트엔드 정리](step-03-frontend-cleanup.md)
