# Step 01: Smart Contracts (Solidity)

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: O (파일 삭제/복원)
- **선행 조건**: 없음

---

## 1. 구현 내용 (design.md 기반)

### 1-1. DN Token v2 (`src/DNToken.sol` 수정)
- `mint(address to, uint256 amount) external` 함수 추가 (public, 제한 없음)
- 기존 bridgeBurn, transfer, approve 유지

### 1-2. BridgeVault (`src/BridgeVault.sol` 신규)
- USDC를 lock하는 최소 컨트랙트
- `deposit(uint256 amount, uint64 destinationChainKey) external`
- `Deposited(address indexed user, uint256 amount, uint64 destinationChainKey)` 이벤트

### 1-3. EvmV1Decoder 벤더링 (`src/EvmV1Decoder.sol` 신규)
- gluwa/usc-testnet-bridge-examples에서 가져오기
- Solc 0.8.24 호환성 확인

### 1-4. DNBridgeUSC v2 (`src/DNBridgeUSC.sol` 수정)
- EvmV1Decoder import
- `processBridgeMint`에서 encodedTransaction 디코딩 → burn from/amount 검증
- require(decoded recipient == submitted recipient)
- require(decoded amount == submitted amount)

### 1-5. Forge Tests (`test/` 디렉토리 신규)
- DNToken v2: mint 성공, bridgeBurn 성공
- BridgeVault: deposit 성공, Deposited 이벤트 확인
- DNBridgeUSC v2: 변조된 recipient/amount → revert (F4)
- DNBridgeUSC v2: 동일 txKey 중복 호출 → 두 번째 revert (E9)

## 2. 완료 조건
- [ ] DNToken.sol에 `mint(address, uint256)` public 함수 존재
- [ ] BridgeVault.sol이 `deposit` + `Deposited` 이벤트 구현
- [ ] EvmV1Decoder.sol이 `packages/usc-bridge/src/`에 존재
- [ ] DNBridgeUSC.sol이 encodedTransaction 디코딩 + recipient/amount 검증 로직 포함
- [ ] `forge build` 성공 (컴파일 에러 0)
- [ ] `forge test` 통과 — DNToken mint/burn, BridgeVault deposit, DNBridgeUSC revert(변조), DNBridgeUSC replay revert

## 3. 롤백 방법
- `git checkout -- packages/usc-bridge/` 로 원복

---

## Scope

### 수정 대상 파일
```
packages/usc-bridge/
├── src/DNToken.sol          # 수정 - mint() 추가
└── src/DNBridgeUSC.sol      # 수정 - EvmV1Decoder 검증 추가
```

### 신규 생성 파일
```
packages/usc-bridge/
├── src/BridgeVault.sol      # 신규 - USDC vault
├── src/EvmV1Decoder.sol     # 신규 - 벤더링
├── test/DNTokenV2.t.sol     # 신규 - 토큰 테스트
├── test/BridgeVault.t.sol   # 신규 - vault 테스트
└── test/DNBridgeUSCV2.t.sol # 신규 - 변조 revert + replay 테스트
```

### Side Effect 위험
- DNBridgeUSC.sol 변경 시 기존 E2E 스크립트(`scripts/bridge-e2e.mjs`) 호환성 → 새 배포 후 주소 변경으로 자동 해결

### 참고할 기존 패턴
- `src/DNToken.sol`: 기존 ERC20 구현 패턴
- `src/DNBridgeUSC.sol`: processBridgeMint 구조
- gluwa SimpleMinterUSC: EvmV1Decoder 사용 패턴

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| DNToken.sol | mint() 추가 | OK |
| DNBridgeUSC.sol | EvmV1Decoder 검증 추가 | OK |
| BridgeVault.sol | 신규 vault | OK |
| EvmV1Decoder.sol | 벤더링 | OK |
| DNTokenV2.t.sol | forge test | OK |
| BridgeVault.t.sol | forge test | OK |
| DNBridgeUSCV2.t.sol | F4/E9 검증 | OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| mint() 추가 | DNToken.sol | OK |
| EvmV1Decoder 검증 | DNBridgeUSC.sol + EvmV1Decoder.sol | OK |
| BridgeVault | BridgeVault.sol | OK |
| forge test (F4/E9 포함) | 3개 test 파일 | OK |

### 검증 통과: O

---

> 다음: [Step 02: Core Infrastructure](step-02-core-infra.md)
