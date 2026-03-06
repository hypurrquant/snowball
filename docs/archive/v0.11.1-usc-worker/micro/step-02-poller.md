# Step 02: 이벤트 폴러

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅
- **선행 조건**: Step 01

---

## 1. 구현 내용 (design.md 기반)
- `src/poller.mjs`: Sepolia에서 BridgeBurn 이벤트를 블록 폴링으로 감지
  - `eth_getLogs`로 lastProcessedBlock ~ latest 범위 조회
  - BridgeBurn 이벤트 파싱 (from, amount, txHash, blockNumber)
  - 교차 검증: 같은 TX receipt에서 Transfer(to=address(1))의 from/amount/to 일치 확인
- `src/index.mjs` 업데이트: 메인 루프 (30초 간격) + poller 호출
- lastProcessedBlock 메모리 관리 + START_BLOCK/기본값(DN Token 배포 블록) 지원

## 2. 완료 조건
- [ ] Sepolia에서 BridgeBurn 이벤트 감지 시 로그에 "BridgeBurn detected" + from/amount/txHash 출력
- [ ] BridgeBurn과 Transfer(to=address(1))의 from/amount/to 교차 검증 → "Cross-validation passed" 로그
- [ ] 교차 검증 실패(from/amount/to 불일치) 시 "Cross-validation failed" 경고 로그 + 해당 이벤트 스킵
- [ ] START_BLOCK 환경변수 → 해당 블록부터 스캔
- [ ] START_BLOCK 미설정 → DN Token 배포 블록부터 스캔
- [ ] 30초 간격으로 폴링 루프 동작
- [ ] RPC 에러 시 에러 로그 + 다음 루프에서 재시도

## 3. 롤백 방법
- `src/poller.mjs` 삭제, `src/index.mjs`와 `src/config.mjs`를 Step 01 상태로 복원

---

## Scope

### 신규 생성 파일
```
apps/usc-worker/src/poller.mjs
```

### 수정 대상 파일
```
apps/usc-worker/src/index.mjs    # 메인 루프 추가
apps/usc-worker/src/config.mjs   # BridgeBurn 이벤트 시그니처, 기본 START_BLOCK 추가
```

### Side Effect 위험
없음

### 참고할 기존 패턴
- `packages/usc-bridge/scripts/bridge-e2e.mjs` L116~157: 기존 Sepolia TX 조회/파싱 패턴

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| poller.mjs | 이벤트 폴링 모듈 | ✅ OK |
| index.mjs 수정 | 메인 루프 | ✅ OK |
| config.mjs 수정 | 이벤트 시그니처/기본블록 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| BridgeBurn 감지 | ✅ poller.mjs | OK |
| 교차 검증 | ✅ poller.mjs | OK |
| 메인 루프 | ✅ index.mjs | OK |
| START_BLOCK 지원 | ✅ config.mjs | OK |

### 검증 통과: ✅

---

→ 다음: [Step 03: Attestation + Proof + Bridge](step-03-pipeline.md)
