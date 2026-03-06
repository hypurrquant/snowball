# Step 03: Attestation + Proof + Bridge 파이프라인

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: ✅
- **선행 조건**: Step 02

---

## 1. 구현 내용 (design.md 기반)
- `src/attestation.mjs`: ChainInfo precompile(0x0FD3)로 attestation 높이 확인 + 대기 루프
- `src/proof.mjs`: Proof API 호출 (`GET /api/v1/proof-by-tx/{chainKey}/{txHash}`) + 3회 재시도 (exponential backoff)
- `src/bridge.mjs`: DNBridgeUSC.processBridgeMint() 호출 + already-processed revert 정상 처리
- `src/index.mjs` 업데이트: 이벤트 큐 처리 → attestation → proof → bridge 파이프라인 연결
- 블록 포인터 전진 규칙: 블록 내 모든 이벤트 성공 시에만 전진
- retryCount 관리: MAX_RETRY(10) 초과 시 스킵 + 경고 로그 + 복구 안내

## 2. 완료 조건
- [ ] attestation 대기 로그 "Waiting for attestation" + 현재/필요 높이 출력
- [ ] Proof API 호출 성공 시 "Proof generated" + merkle siblings 수 + continuity roots 수 로그
- [ ] Proof API 실패 시 3회 재시도 로그
- [ ] processBridgeMint 호출 성공 시 mint TX hash 로그
- [ ] already-processed revert 시 "Already processed, skipping" 로그 + 성공 간주
- [ ] 블록 내 모든 이벤트 성공 시에만 lastProcessedBlock 전진
- [ ] MAX_RETRY(10) 초과 시 해당 블록 스킵 + 경고 + 복구 안내 로그
- [ ] E2E: Sepolia bridgeBurn → Worker 자동 감지 → USC에서 mint 완료

## 3. 롤백 방법
- `src/attestation.mjs`, `src/proof.mjs`, `src/bridge.mjs` 삭제
- `src/index.mjs`와 `src/config.mjs`를 Step 02 상태로 복원

---

## Scope

### 신규 생성 파일
```
apps/usc-worker/src/attestation.mjs
apps/usc-worker/src/proof.mjs
apps/usc-worker/src/bridge.mjs
```

### 수정 대상 파일
```
apps/usc-worker/src/index.mjs    # 파이프라인 연결 + 블록 포인터 규칙 + retryCount
apps/usc-worker/src/config.mjs   # Proof API URL, ChainInfo 주소, ABI, MAX_RETRY 상수
```

### Side Effect 위험
- USC Testnet에 실제 트랜잭션 발생 (processBridgeMint 호출)
- DEPLOYER_PRIVATE_KEY의 tCTC 잔고 소모 (gas fee)

### 참고할 기존 패턴
- `packages/usc-bridge/scripts/bridge-e2e.mjs` L61~94: attestation 대기 + proof 생성
- `packages/usc-bridge/scripts/bridge-e2e.mjs` L224~258: processBridgeMint 호출

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| attestation.mjs | attestation 대기 | ✅ OK |
| proof.mjs | Proof API 호출 | ✅ OK |
| bridge.mjs | mint 호출 | ✅ OK |
| index.mjs 수정 | 파이프라인 연결 | ✅ OK |
| config.mjs 수정 | 상수 추가 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| attestation 대기 | ✅ attestation.mjs | OK |
| proof 생성 + 재시도 | ✅ proof.mjs | OK |
| mint 호출 + revert 처리 | ✅ bridge.mjs | OK |
| 블록 포인터 규칙 | ✅ index.mjs | OK |
| retryCount/MAX_RETRY | ✅ index.mjs + config.mjs | OK |

### 검증 통과: ✅
