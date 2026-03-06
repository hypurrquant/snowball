# 작업 티켓 - v0.11.1

## 전체 현황

| # | Step | 난이도 | 롤백 | Scope | FP/FN | 개발 | 완료일 |
|---|------|--------|------|-------|-------|------|--------|
| 01 | 패키지 스캐폴딩 | 🟢 | ✅ | ✅ | ✅ | ⏳ | - |
| 02 | 이벤트 폴러 | 🟡 | ✅ | ✅ | ✅ | ⏳ | - |
| 03 | Attestation + Proof + Bridge 파이프라인 | 🟠 | ✅ | ✅ | ✅ | ⏳ | - |

## 의존성

```
01 → 02 → 03
```

## 커버리지 매트릭스

### PRD 목표 → 티켓

| PRD 목표 | 관련 티켓 | 커버 |
|----------|----------|------|
| 1. BridgeBurn 이벤트 실시간 감지 | Step 02 | ✅ |
| 2. 자동 attestation → proof → mint 파이프라인 | Step 03 | ✅ |
| 3. apps/usc-worker 독립 Node.js 서버 | Step 01 (스캐폴드) + Step 02 (서버 루프) | ✅ |
| 4. 온체인 중복방지 + 메모리 블록 추적 | Step 02 (lastProcessedBlock), Step 03 (processedTxKeys) | ✅ |

### DoD → 티켓

| DoD 항목 | 관련 티켓 | 커버 |
|----------|----------|------|
| F1: 패키지 실행 가능 | Step 01 (stub) + Step 02 (서버 루프) | ✅ |
| F2: BridgeBurn 감지 | Step 02 | ✅ |
| F3: attestation 조회/대기 | Step 03 | ✅ |
| F4: Proof API 증명 획득 | Step 03 | ✅ |
| F5: processBridgeMint 자동 호출 | Step 03 | ✅ |
| F6: 교차 검증 (from/amount/to) | Step 02 | ✅ |
| F7: 중복 TX 처리 | Step 03 | ✅ |
| F8: START_BLOCK 환경변수 | Step 02 | ✅ |
| F9: START_BLOCK 기본값 | Step 02 | ✅ |
| F10: 블록 포인터 전진 규칙 | Step 03 | ✅ |
| N1: .env.example | Step 01 | ✅ |
| N2: start 스크립트 | Step 01 | ✅ |
| N3: 기존 코드 무수정 | 전체 (신규 파일만) | ✅ |
| E1: RPC 불응답 | Step 02 | ✅ |
| E2: Proof API 에러 | Step 03 | ✅ |
| E3: already processed | Step 03 | ✅ |
| E4: Worker 재시작 | Step 02 (START_BLOCK) + Step 03 (already-processed 스킵) | ✅ |
| E5: 이벤트 없음 | Step 02 | ✅ |
| E6: MAX_RETRY 초과 | Step 03 | ✅ |
| E7: 교차 검증 실패 | Step 02 | ✅ |

### 설계 결정 → 티켓

| 설계 결정 | 관련 티켓 | 커버 |
|----------|----------|------|
| 블록 폴링 + getLogs | Step 02 | ✅ |
| BridgeBurn 트리거 + Transfer 교차검증 | Step 02 | ✅ |
| ethers.js v6 + Node.js ESM | Step 01 | ✅ |
| 싱글 프로세스 이벤트 루프 | Step 01, 02 | ✅ |
| 블록 포인터 전진 규칙 | Step 03 | ✅ |
| MAX_RETRY + 스킵 + 복구 안내 | Step 03 | ✅ |
| Proof API 3회 재시도 | Step 03 | ✅ |

## Step 상세
- [Step 01: 패키지 스캐폴딩](step-01-scaffold.md)
- [Step 02: 이벤트 폴러](step-02-poller.md)
- [Step 03: Attestation + Proof + Bridge 파이프라인](step-03-pipeline.md)
