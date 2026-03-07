# 작업 티켓 - v0.18.0

## 전체 현황

| # | Step | 난이도 | 롤백 | Scope | FP/FN | 개발 | 완료일 |
|---|------|--------|------|-------|-------|------|--------|
| 01 | [SoT 드리프트 해결](step-01-sot-drift.md) | 🟡 | 가능 | 확인 | 확인 | 대기 | - |
| 02 | [환경변수 템플릿 + Quick Start](step-02-env-template.md) | 🟢 | 가능 | 확인 | 확인 | 대기 | - |
| 03 | [SQLite 영속화 + 2-Phase Write + DI](step-03-sqlite.md) | 🔴 | 가능 | 확인 | 확인 | 대기 | - |
| 04 | [Winston 로깅](step-04-winston.md) | 🟡 | 가능 | 확인 | 확인 | 대기 | - |
| 05 | [Timeout](step-05-timeout.md) | 🟢 | 가능 | 확인 | 확인 | 대기 | - |
| 06 | [Rate Limiting](step-06-rate-limit.md) | 🟡 | 가능 | 확인 | 확인 | 대기 | - |
| 07 | [E2E 테스트](step-07-e2e-test.md) | 🟠 | 가능 | 확인 | 확인 | 대기 | - |

## 의존성

```
Step 01 (SoT) → Step 02 (환경변수) → Step 03 (SQLite)
                                         ↓
                                    Step 04 (Winston)    [03과 독립, 병렬 가능]
                                    Step 05 (Timeout)    [독립, 병렬 가능]
                                    Step 06 (Rate Limit) [독립, 병렬 가능]
                                         ↓
                                    Step 07 (E2E 테스트)  [03~06 모두 완료 후]
```

---

## 커버리지 매트릭스

### PRD 목표 → 티켓

| PRD 목표 | 관련 티켓 | 커버 |
|----------|----------|------|
| 1. 실행 이력 영속화 | Step 03 | 확인 |
| 2. 구조화된 로깅 | Step 04 | 확인 |
| 3. API 보호 | Step 06 | 확인 |
| 4. 실행 안정성 | Step 05 | 확인 |
| 5. 회귀 방지 | Step 07 | 확인 |
| 6. 개발자 온보딩 | Step 02 | 확인 |
| 7. 컨트랙트 주소 SoT 확립 | Step 01 | 확인 |

### DoD → 티켓

| DoD 항목 | 관련 티켓 | 커버 |
|----------|----------|------|
| F1: agent_runs 테이블 생성 | Step 03 | 확인 |
| F2: pre-insert started 레코드 | Step 03 | 확인 |
| F3: terminal status 업데이트 | Step 03 | 확인 |
| F4: 서버 재시작 후 이력 조회 | Step 03 | 확인 |
| F5: user 필터 조회 | Step 03 | 확인 |
| F6: 단건 조회 200/404 | Step 03 | 확인 |
| F7: 로그 파일 생성 | Step 04 | 확인 |
| F8: 에러 로그 파일 | Step 04 | 확인 |
| F9: JSON 로그 포맷 | Step 04 | 확인 |
| F10: 기존 Logger 코드 무변경 | Step 04 | 확인 |
| F11: POST /agent/run 10/분 제한 | Step 06 | 확인 |
| F12: 기타 엔드포인트 60/분 제한 | Step 06 | 확인 |
| F13: Cron 내부 호출 무영향 | Step 06 | 확인 |
| F14: SDK timeout 60초 설정 | Step 05 | 확인 |
| F15: timeout 시 error 처리 | Step 05 | 확인 |
| F16: 9개 테스트 시나리오 존재 | Step 07 | 확인 |
| F17: 모든 테스트 통과 | Step 07 | 확인 |
| F18: AgentRuntime DI mock | Step 03 + 07 | 확인 |
| F19: 앱 .env.example | Step 02 | 확인 |
| F20: 루트 .env.example | Step 02 | 확인 |
| F21: Quick Start + 실제 구동 | Step 02 | 확인 |
| F22: 온체인 검증 canonical | Step 01 | 확인 |
| F23: addresses-102031.json 동기화 | Step 01 | 확인 |
| F24: config.ts 동기화 | Step 01 | 확인 |
| F25: SSOT_ERC8004.md 동기화 | Step 01 | 확인 |
| F26: deploy-history.md provenance | Step 01 | 확인 |
| N1: tsc 에러 0 | Step 03, 04, 05 (runtime tsc), 06 | 확인 |
| N2: agent-server 빌드 성공 | Step 03, 04, 06 (agent-server 코드 변경 step만) | 확인 |
| N3: data/, logs/ gitignore | Step 03, 04 | 확인 |
| N4: API 계약 무변경 | Step 03, 06 | 확인 |
| N5: runtime.run() 시그니처만 변경 | Step 03 | 확인 |
| E1: pre-insert DB 실패 → 500 + runtime 미호출 | Step 03 (코드), 07 (테스트) | 확인 |
| E2: terminal update 실패 → fallback | Step 03, 07 | 확인 |
| E3: crash recovery started→error | Step 03, 07 | 확인 |
| E4: GET에서 started→error 매핑 | Step 03, 07 | 확인 |
| E5: bigint 직렬화 | Step 03, 07 | 확인 |
| E6: 동시 실행 409 | Step 03, 07 | 확인 |
| E7: API key 누락 401 | Step 07 | 확인 |
| E8: 온체인 검증 실패 → 재배포 | Step 01 | 확인 |

### 설계 결정 → 티켓

| 설계 결정 | 관련 티켓 | 커버 |
|----------|----------|------|
| T1: SQLite + better-sqlite3 (WAL) | Step 03 | 확인 |
| T2: winston + nest-winston | Step 04 | 확인 |
| T3: @nestjs/throttler | Step 06 | 확인 |
| T4: SDK timeout 60초 | Step 05 | 확인 |
| T5: Jest + @nestjs/testing | Step 07 | 확인 |
| T6: 양쪽 .env.example | Step 02 | 확인 |
| T7: 온체인 검증 후 SoT 통일 | Step 01 | 확인 |
| 2-phase write | Step 03 | 확인 |
| runtime.run() runId 외부 주입 | Step 03 | 확인 |
| crash recovery | Step 03 | 확인 |
| DI 리팩토링 | Step 03 | 확인 |
