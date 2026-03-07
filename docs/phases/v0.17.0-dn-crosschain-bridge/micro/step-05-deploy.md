# Step 05: Contract Deployment + Worker Config

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: 부분적 (컨트랙트 배포는 되돌릴 수 없으나 주소만 교체)
- **선행 조건**: Step 01 (contracts compiled), Step 02 (addresses placeholder)

---

## 1. 구현 내용 (design.md 기반)

### 5-1. DN Token v2 배포 (Sepolia)
- `forge create` 또는 배포 스크립트로 Sepolia에 배포
- 배포 후 주소 기록

### 5-2. DNBridgeUSC v2 배포 (USC Testnet)
- 새 DN Token v2 Sepolia 주소를 constructor에 전달
- USC Testnet에 배포
- operator 설정 (deployer = operator)

### 5-3. BridgeVault 배포 (CC Testnet)
- USDC 주소를 constructor에 전달
- CC Testnet에 배포

### 5-4. 주소 업데이트
- `packages/core/src/config/addresses.ts`: BRIDGE 섹션에 실제 주소
- `apps/usc-worker/src/config.mjs`: DN_TOKEN_SEPOLIA, DN_BRIDGE_USC, DN_TOKEN_DEPLOY_BLOCK

### 5-5. 배포 기록
- `deployments/creditcoin-testnet/` 또는 해당 체인 폴더에 배포 정보 기록

## 2. 완료 조건
- [ ] DN Token v2가 Sepolia에 배포됨 (주소 확인)
- [ ] DNBridgeUSC v2가 USC Testnet에 배포됨 (주소 확인)
- [ ] BridgeVault가 CC Testnet에 배포됨 (주소 확인)
- [ ] `packages/core/src/config/addresses.ts`에 3개 실제 주소 반영
- [ ] `apps/usc-worker/src/config.mjs`에 새 주소 + deploy block 반영
- [ ] 각 explorer에서 컨트랙트 코드 조회 가능

## 3. 롤백 방법
- 새 컨트랙트로 재배포 (블록체인 배포는 변경 불가, 주소만 교체)

---

## Scope

### 수정 대상 파일
```
packages/core/src/config/addresses.ts   # 수정 - BRIDGE 실제 주소
apps/usc-worker/src/config.mjs          # 수정 - 새 주소/블록
```

### 신규 생성 파일
```
scripts/deploy-dn-bridge.ts             # 신규 - 배포 스크립트
deployments/bridge-deploy.json          # 신규 - 배포 이력 기록
```

### Side Effect 위험
- USC Worker가 새 DN Token 주소를 바라봐야 함 → config 동시 업데이트
- 기존 DN Token(Sepolia)은 그대로 유지 (새 v2와 별개)

## FP/FN 검증

### False Positive (과잉)
없음

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| 배포 기록 | deployments/bridge-deploy.json 추가 | OK (수정됨) |

### 검증 통과: O

---

> 다음: [Step 06: E2E Test](step-06-e2e-test.md)
