# 설계 - v0.17.0

## 변경 규모
**규모**: 일반 기능
**근거**: 신규 도메인(bridge) 추가, 3개+ 컴포넌트 수정(wagmi config, chain 정의, AutoChainSwitch), 새 컨트랙트 배포(DNToken v2, BridgeVault, DNBridgeUSC v2), 새 페이지/훅 다수

---

## 문제 요약
USC Bridge Worker PoC는 있지만 사용자 흐름이 없다. USDC vault deposit → DN mint(Sepolia) → bridgeBurn → USC mint의 E2E 파이프라인을 단일 페이지에서 프로그레스 UI + 3체인 대시보드로 제공해야 한다.

> 상세: [README.md](README.md) 참조

## 접근법

**FE 주도 멀티체인 파이프라인**: 서버 오케스트레이터 없이, 프론트엔드가 사용자를 3개 체인에 걸친 TX 서명으로 안내하고, USC Worker가 마지막 단계를 자동 처리한다.

핵심 전략:
1. wagmi config에 Sepolia + USC Testnet 추가 → 멀티체인 지원
2. 기존 TxPipelineModal 패턴을 확장 → 멀티체인 + 자동 대기 단계 지원
3. 3개 체인의 잔액/상태를 독립 RPC로 폴링 → 대시보드 표시
4. 재진입 복구는 사용자 주소 기준 온체인 이벤트 재조회로 해결

## 대안 검토

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: 서버 오케스트레이터 | 사용자 서명 1회, 나머지 자동 | 서버 복잡도 증가, 키 관리 부담 | ❌ |
| B: FE 주도 파이프라인 | 서버 불필요, 사용자가 모든 TX 직접 확인, 투명성 | 서명 4회 + 체인 스위치 필요 | ✅ |
| C: iframe 멀티체인 | 체인별 별도 UI | UX 파편화, 상태 동기화 어려움 | ❌ |

**선택 이유**: B는 기존 인프라(TxPipelineModal, useChainWriteContract, USC Worker)를 최대 활용하며, 서버 없이 데모 가능. 사용자가 각 단계를 직접 확인하므로 투명성이 높다.

## 기술 결정

### 1. DN Token v2 (Sepolia 재배포)
현재 DNToken에 public mint가 없으므로, `mint()` 함수를 추가하여 재배포한다.

```solidity
function mint(address to, uint256 amount) external {
    totalSupply += amount;
    balanceOf[to] += amount;
    emit Transfer(address(0), to, amount);
}
```

테스트넷 전용이므로 제한 없는 public mint 채택.

### 2. DNBridgeUSC v2 (On-chain 검증 추가, USC Testnet 재배포)
현재 DNBridgeUSC는 operator가 넘긴 recipient/amount를 검증 없이 mint한다. v2에서는 `encodedTransaction`에서 burn 데이터를 디코딩하여 온체인에서 검증한다.

변경 사항:
- `EvmV1Decoder` 라이브러리 도입 (SimpleMinterUSC 참조)
- `processBridgeMint`에서 encodedTransaction 디코딩 → burn recipient/amount 추출
- 추출된 값과 제출된 recipient/amount 일치 여부 온체인 검증
- `onlyOperator` 유지 (griefing 방지)

```solidity
function processBridgeMint(
    uint64 blockHeight,
    bytes calldata encodedTransaction,
    MerkleProof calldata merkleProof,
    ContinuityProof calldata continuityProof,
    address recipient,
    uint256 amount
) external onlyOperator returns (bool) {
    // 1. Replay protection (기존)
    // 2. Proof verification via Precompile 0x0FD2 (기존)
    // 3. NEW: Decode encodedTransaction → verify receipt status
    EvmV1Decoder.ReceiptFields memory receipt = EvmV1Decoder.decodeReceiptFields(encodedTransaction);
    require(receipt.receiptStatus == 1, "DNBridge: tx did not succeed");
    // 4. NEW: Extract BridgeBurn event → verify from == recipient, amount matches
    // 5. Mint (기존)
}
```

**보안 모델**: USC proof verification(trustless) + burn 데이터 on-chain 검증(trustless) + operator submission(trusted relay). Operator는 증명을 제출하는 릴레이어 역할만 하고, mint 파라미터는 온체인에서 검증된다.

### 3. BridgeVault (CC Testnet 신규 배포)
USDC를 lock하고 이벤트를 발생시키는 최소 컨트랙트. Wormhole 시뮬레이션 역할.

```solidity
contract BridgeVault {
    IERC20 public usdc;
    event Deposited(address indexed user, uint256 amount, uint64 destinationChainKey);

    function deposit(uint256 amount, uint64 destinationChainKey) external {
        usdc.transferFrom(msg.sender, address(this), amount);
        emit Deposited(msg.sender, amount, destinationChainKey);
    }
}
```

### 4. 멀티체인 wagmi 설정
```typescript
// packages/core/src/config/chain.ts에 추가
export const sepoliaTestnet = defineChain({ id: 11155111, ... });
export const uscTestnet = defineChain({ id: 102036, ... });

// wagmi.ts
chains: [creditcoinTestnet, sepoliaTestnet, uscTestnet],
transports: {
  [creditcoinTestnet.id]: http(),
  [sepoliaTestnet.id]: http("https://1rpc.io/sepolia"),
  [uscTestnet.id]: http("https://rpc.usc-testnet2.creditcoin.network"),
},
```

### 5. AutoChainSwitch 비활성화
Bridge 페이지에서는 멀티체인이 필요하므로, 자동 체인 전환을 조건부로 적용한다. 라우트 기반 분기: `/bridge` 경로에서는 AutoChainSwitch 무시.

### 6. 재진입 복구 전략
**사용자 주소 기준 온체인 이벤트 재조회** (local storage 불필요).
- CC Testnet: `Deposited(user, ...)` 이벤트 필터링 → deposit 완료 여부
- Sepolia: `Transfer(0x0, user, ...)` 이벤트 필터링 → mint 완료 여부
- Sepolia: `BridgeBurn(user, ...)` 이벤트 필터링 → burn 완료 여부
- USC Testnet: `Transfer(0x0, user, ...)` 이벤트 필터링 → USC mint 완료 여부

> BURN_ADDRESS balanceOf는 다른 사용자의 burn과 섞이므로 사용하지 않는다. 반드시 사용자 주소 기준 이벤트 조회로 판정한다.

---

## 범위 / 비범위

**범위(In Scope)**:
- DN Token v2 컨트랙트 (public mint 추가) + 배포
- DNBridgeUSC v2 컨트랙트 (on-chain burn 검증 추가) + 배포
- BridgeVault 컨트랙트 + 배포
- wagmi 멀티체인 설정 (Sepolia, USC Testnet)
- useChainWriteContract 확장
- Bridge 도메인 (hooks + components)
- `/bridge` 페이지 (Pipeline Progress + 3-Chain Dashboard)
- USC Worker config 업데이트 (새 주소 반영)

**비범위(Out of Scope)**:
- Wormhole 실제 통합
- 기존 도메인(trade, defi, agent) 수정
- Options 관련 코드
- USC Worker 핵심 로직 변경 (config/주소만 업데이트)
- CI/CD, 프로덕션 배포

## 가정/제약
- USC Testnet Attestor Network가 정상 동작 중 (Sepolia 블록 증명 ~4-5분)
- Proof Generation API (`https://proof-gen-api.usc-testnet2.creditcoin.network`) 가용
- USC Worker는 별도 터미널에서 `node src/index.mjs`로 수동 실행
- 사용자는 MetaMask 등 지갑에 3개 체인을 모두 추가해야 함
- Sepolia ETH faucet으로 가스비 확보 필요

## 아키텍처 개요

### 도메인 구조
```
domains/bridge/
├── components/
│   ├── BridgePipelinePage.tsx    ← /bridge 페이지 메인 컴포넌트
│   ├── PipelineProgress.tsx      ← 단계별 파이프라인 시각화
│   └── ChainDashboard.tsx        ← 3체인 잔액 대시보드
├── hooks/
│   ├── useBridgePipeline.ts      ← 파이프라인 상태 관리 (steps, phase)
│   ├── useMultiChainBalances.ts  ← 3체인 잔액 실시간 조회
│   └── useBridgeActions.ts       ← deposit/mint/burn TX 실행
└── lib/
    └── bridgeConfig.ts           ← 브릿지 컨트랙트 주소/ABI
```

### 컴포넌트 관계
```
/bridge 페이지
├── PipelineProgress
│   ├── Step 1: USDC Approve (CC Testnet)           [서명]
│   ├── Step 2: USDC Vault Deposit (CC Testnet)     [서명]
│   ├── Step 3: DN Mint (Sepolia)                   [서명, 체인스위치]
│   ├── Step 4: DN BridgeBurn (Sepolia)             [서명]
│   ├── Step 5: Attestation Wait (자동, ~4-5분)
│   └── Step 6: USC Mint (자동, Worker)
└── ChainDashboard
    ├── CC Testnet: USDC 잔액
    ├── Sepolia: DN 잔액
    └── USC Testnet: DN 잔액
```

**사용자 서명 4회, 체인 스위치 1회, 자동 처리 2건**

## API/인터페이스 계약

### useChainWriteContract 확장
```typescript
// 현재: creditcoinTestnet 고정
export function useChainWriteContract(): { writeContractAsync, ... }

// v0.17.0: targetChainId 파라미터 추가
export function useChainWriteContract(targetChainId?: number): { writeContractAsync, ... }
// targetChainId 미지정 시 기존 동작(creditcoinTestnet) 유지 → 하위 호환
```

### TxStep 체인 메타데이터 확장
```typescript
// 현재: shared/types/tx.ts
export type TxStepType = "approve" | "mint" | "openTrove" | "adjustTrove" | "adjustRate";

// v0.17.0: 브릿지 타입 + 체인 정보 추가
export type TxStepType = "approve" | "mint" | "openTrove" | "adjustTrove" | "adjustRate"
  | "vaultDeposit" | "bridgeBurn" | "attestWait" | "uscMint";

export interface TxStep {
  id: string;
  type: TxStepType;
  label: string;
  status: TxStepStatus;
  txHash?: `0x${string}`;
  error?: string;
  chainId?: number;       // NEW: 이 step이 실행되는 체인
}
```

### 체인별 Explorer URL 매핑
```typescript
// packages/core/src/config/chain.ts
export const CHAIN_EXPLORERS: Record<number, string> = {
  102031: "https://creditcoin-testnet.blockscout.com",
  11155111: "https://sepolia.etherscan.io",
  102036: "https://explorer.usc-testnet2.creditcoin.network",
};
```

TxStepItem에서 `step.chainId`로 올바른 explorer 선택:
```typescript
const explorerUrl = step.chainId ? CHAIN_EXPLORERS[step.chainId] : EXPLORER_URL;
const txLink = `${explorerUrl}/tx/${step.txHash}`;
```

### 재진입 이벤트 조회 기준
```typescript
// 각 단계의 완료 판정: 사용자 주소 기준 이벤트 필터
const depositEvents = await ccClient.getLogs({
  address: BRIDGE_VAULT, event: "Deposited", args: { user: address }
});
const mintEvents = await sepoliaClient.getLogs({
  address: DN_TOKEN, event: "Transfer", args: { from: zeroAddress, to: address }
});
const burnEvents = await sepoliaClient.getLogs({
  address: DN_TOKEN, event: "BridgeBurn", args: { from: address }
});
const uscMintEvents = await uscClient.getLogs({
  address: DN_BRIDGE_USC, event: "Transfer", args: { from: zeroAddress, to: address }
});
```

## 데이터 흐름

```
사용자 → [CC Testnet]
  1. approve(USDC, BridgeVault, amount)                    [서명 1]
  2. BridgeVault.deposit(amount, chainKey=1)                [서명 2]
     → Deposited(user, amount, 1) 이벤트

사용자 → [Sepolia] (체인 스위치)
  3. DNToken.mint(user, amount)                             [서명 3]
     → Transfer(0x0, user, amount)
  4. DNToken.bridgeBurn(amount, chainKey=1)                 [서명 4]
     → BridgeBurn(user, amount, 1) + Transfer(user, 0x01, amount)

USC Worker → [자동]
  5. poller: BridgeBurn 감지 (Sepolia)
  6. attestation: 블록 증명 대기 (~4-5분)
  7. proof: Merkle + Continuity proof 생성
  8. bridge: DNBridgeUSC.processBridgeMint() (USC Testnet)
     → on-chain: encodedTransaction 디코딩 → burn from/amount 검증
     → Transfer(0x0, user, amount)

FE 폴링 → [USC Testnet]
  9. Transfer(0x0, user, ...) 이벤트 감지 → Pipeline 완료 표시
```

## 테스트 전략

- **컨트랙트**: forge test로 DNToken v2 mint/burn, BridgeVault deposit, DNBridgeUSC v2 burn 검증
- **E2E**: 배포 후 수동 테스트 — deposit → mint → burn → USC Worker 자동 mint 확인
- **FE**: 각 단계 TX 성공/실패 시 UI 상태 전환 확인
- **재진입**: 중간 이탈 후 페이지 재방문 시 현재 단계 자동 감지 확인

## 실패/에러 처리

| 실패 케이스 | FE 대응 |
|------------|---------|
| USDC approve/deposit TX 실패 | 에러 표시 + 재시도 버튼 |
| 체인 스위치 거부 | "Sepolia로 전환해주세요" 안내 |
| DN mint/burn TX 실패 | 에러 표시 + 재시도 버튼 |
| USC Worker 미실행 | "Attestation 대기 중..." 상태 유지, 타임아웃 후 안내 |
| Attestation 10분+ 지연 | "네트워크 지연" 안내, 수동 확인 링크 제공 |
| 페이지 이탈 후 재진입 | 사용자 주소 기준 이벤트 재조회로 현재 단계 복구 |

## 리스크/오픈 이슈

1. **USC Testnet 불안정**: Attestor Network 다운 시 전체 파이프라인 중단. FE에서 상태 안내만 가능.
2. **Sepolia 가스비**: 사용자가 Sepolia ETH를 별도 확보해야 함. Faucet 안내 필요.
3. **3체인 지갑 설정**: MetaMask에 3개 체인 추가가 필요. addChain 자동화 검토.
4. **컨트랙트 배포 순서**: DN Token v2(Sepolia) → DNBridgeUSC v2(USC, 새 DN주소 참조) → BridgeVault(CC) → Worker config 업데이트.
5. **EvmV1Decoder 의존성**: DNBridgeUSC v2에서 사용. 출처: [github.com/gluwa/usc-testnet-bridge-examples/contracts/sol/EvmV1Decoder.sol](https://github.com/gluwa/usc-testnet-bridge-examples/blob/main/contracts/sol/EvmV1Decoder.sol). 이 파일을 `packages/usc-bridge/src/EvmV1Decoder.sol`로 vendor하여 사용. Solc 0.8.24 호환성 확인 필요.
