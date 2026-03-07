# Step 06: E2E Test (배포 검증 + 파이프라인 테스트)

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: O (스크립트 삭제)
- **선행 조건**: Step 05 (배포 완료)

---

## 1. 구현 내용

### 6-1. E2E 시뮬레이션 스크립트 (`scripts/simulate-dn-bridge.ts`)
defi-simulation 스킬 패턴 활용:
- deployer 계정으로 3개 체인에서 전체 파이프라인 실행
- Step A: CC Testnet에서 USDC approve + BridgeVault.deposit
- Step B: Sepolia에서 DN Token v2 mint + bridgeBurn
- 각 단계 TX hash + receipt 로깅
- 최종: 3개 체인 잔액 출력

### 6-2. 컨트랙트 기본 동작 검증
- DN Token v2: mint → balanceOf 확인
- BridgeVault: deposit → Deposited 이벤트 확인
- DN Token v2: bridgeBurn → BridgeBurn 이벤트 확인 + balanceOf 감소

### 6-3. USC Worker 연동 검증 (수동)
- USC Worker 실행 (`cd apps/usc-worker && node src/index.mjs`)
- bridgeBurn 이벤트 감지 → attestation → proof → processBridgeMint 로그 확인
- USC Testnet에서 DN Token balanceOf 증가 확인

## 2. 완료 조건
- [ ] `scripts/simulate-dn-bridge.ts` 실행 시 CC Testnet deposit + Sepolia mint/burn TX 성공
- [ ] 각 TX의 receipt.status === 1 (success)
- [ ] BridgeVault의 USDC 잔액이 deposit amount만큼 증가
- [ ] Sepolia DN Token v2에서 mint → burn 후 사용자 balanceOf === 0
- [ ] USC Worker 로그에서 BridgeBurn 감지 + processBridgeMint 성공 확인 (수동)

## 3. 롤백 방법
- `rm scripts/simulate-dn-bridge.ts`

---

## Scope

### 신규 생성 파일
```
scripts/simulate-dn-bridge.ts          # 신규 - E2E 시뮬레이션
```

### 참고할 기존 패턴
- `scripts/simulate-dex-liquidity.ts`: viem 기반 시뮬레이션 패턴
- `packages/usc-bridge/scripts/bridge-e2e.mjs`: 기존 E2E 스크립트
- `scripts/simulation-accounts.json`: 페르소나 계정

## FP/FN 검증

### False Positive (과잉)
없음

### False Negative (누락)
없음

### 검증 통과: O

---
