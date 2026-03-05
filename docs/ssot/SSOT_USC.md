# SSOT — Creditcoin USC (Universal Smart Contracts)

> Creditcoin의 크로스체인 오라클 인프라. 외부 체인 트랜잭션을 Creditcoin에서 검증하고 활용.
> Version: v1.0.0 | Status: Active
> Last updated: 2026-02-27
> Ref: https://docs.creditcoin.org/usc

---

## 1. USC란?

**Universal Smart Contract (USC)** = Creditcoin에 배포되어 **다른 블록체인의 데이터를 읽고 검증**할 수 있는 스마트 컨트랙트.

기존 크로스체인 솔루션(브릿지, 중앙화 오라클)과 달리 **암호학적 증명(Merkle + Continuity Proof)** 으로 검증하므로 신뢰 가정이 없다.

```
기존 모델:  Source Chain → 중앙화 오라클/브릿지 → Destination Chain
                            ↑ 단일 장애점 (해킹 리스크)

USC 모델:   Source Chain → Attestor 합의 → Prover 증명 생성 → Creditcoin 온체인 검증
                            ↑ 분산 합의          ↑ STARK 증명       ↑ Precompile 검증
```

### 핵심 특징

| 항목 | 값 |
|------|-----|
| 검증 방식 | 온체인 동기 검증 (한 트랜잭션 안에서 완료) |
| 검증 속도 | ~15초 (1블록) |
| 배치 지원 | 최대 10개 쿼리 (공유 continuity proof) |
| 증명 타입 | Merkle Proof (트랜잭션 포함 증명) + Continuity Proof (블록 연속성 증명) |
| 지원 체인 | Ethereum, (향후 Polygon, Solana, Bitcoin 등) |
| 제한사항 | 트랜잭션 성공/실패는 검증하지 않음 — 블록 포함 여부만 검증. 성공 여부는 receipt status로 별도 체크 필요 |

---

## 2. 아키텍처

### 2-1. 핵심 컴포넌트

```
┌─ Source Chain (예: Ethereum) ────────────────────────┐
│                                                       │
│  유저 트랜잭션 발생 (예: 토큰 전송, 대출 상환)         │
│                                                       │
└───────────────────────┬───────────────────────────────┘
                        │
                        ▼
┌─ Attestor Network ───────────────────────────────────┐
│                                                       │
│  소스 체인을 지속 모니터링                              │
│  블록 히스토리에 대한 암호학적 요약(Attestation) 생성    │
│  분산 합의 — 단일 Attestor가 조작 불가                  │
│                                                       │
└───────────────────────┬───────────────────────────────┘
                        │
                        ▼
┌─ Prover (Proof Generation API) ──────────────────────┐
│                                                       │
│  특정 트랜잭션에 대한 증명 생성:                        │
│    1. Merkle Proof — 트랜잭션이 블록에 포함됨            │
│    2. Continuity Proof — 블록이 Attestation 체인에 속함  │
│  STARK 증명으로 경쟁적 생성                             │
│                                                       │
└───────────────────────┬───────────────────────────────┘
                        │
                        ▼
┌─ Creditcoin (USC Contract) ──────────────────────────┐
│                                                       │
│  Native Query Verifier Precompile (0x0FD2)            │
│    → 증명을 동기적으로 검증 (같은 트랜잭션 내)          │
│    → 검증된 트랜잭션 데이터 추출                        │
│    → 비즈니스 로직 실행 (민팅, 상태 변경 등)            │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### 2-2. 온체인 컴포넌트

| 컴포넌트 | 주소/위치 | 역할 |
|----------|----------|------|
| **Native Query Verifier Precompile** | `0x0000000000000000000000000000000000000FD2` | 증명 검증 (Rust native 속도) |
| **ChainInfo Precompile** | 내장 | 지원 체인 목록, attestation 정보 |
| **USC Contract** | 유저 배포 | 증명 검증 + 비즈니스 로직 |

### 2-3. 오프체인 컴포넌트

| 컴포넌트 | 역할 |
|----------|------|
| **Attestor Network** | 소스 체인 상태 합의, attestation 체인 유지 |
| **Proof Generation API** | 트랜잭션 해시 → Merkle + Continuity Proof 생성 |
| **Offchain Worker** | 유저 대신 증명 요청 & USC 컨트랙트 호출 자동화 |

---

## 3. 테스트넷 정보

| 항목 | 값 |
|------|-----|
| 네트워크 | Creditcoin3 USC Testnet |
| RPC | `https://rpc.usc-testnet2.creditcoin.network` |
| Proof Generation API | `https://proof-gen-api.usc-testnet2.creditcoin.network` |
| Explorer | https://explorer.usc-testnet.creditcoin.network |
| Faucet | Discord에서 testnet 토큰 요청 |

---

## 4. USC 동작 플로우 (5단계)

```
1. RECEIVE   — 오프체인 워커가 증명 + 인코딩된 트랜잭션 데이터를 USC에 전달
2. REPLAY    — 리플레이 방지: txKey(chainKey + blockHeight + txIndex) 중복 체크
3. VERIFY    — Precompile(0x0FD2)로 Merkle + Continuity Proof 동기 검증
4. EXTRACT   — 검증된 바이트에서 트랜잭션/이벤트 데이터 디코딩
5. EXECUTE   — 비즈니스 로직 실행 (민팅, 상태 변경, 크로스체인 정산 등)
```

모든 과정이 **단일 트랜잭션** 안에서 동기적으로 완료됨.

---

## 5. 핵심 인터페이스

### 5-1. Native Query Verifier

```solidity
interface INativeQueryVerifier {
    struct MerkleProofEntry {
        bytes32 hash;
        bool isLeft;
    }
    struct MerkleProof {
        bytes32 root;
        MerkleProofEntry[] siblings;
    }
    struct ContinuityProof {
        bytes32 lowerEndpointDigest;
        bytes32[] roots;
    }

    function verifyAndEmit(
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        MerkleProof calldata merkleProof,
        ContinuityProof calldata continuityProof
    ) external returns (bool);  // NOT view — precompile emits events
}
```

### 5-2. Verifier 접근 헬퍼

```solidity
library NativeQueryVerifierLib {
    address constant PRECOMPILE_ADDRESS = 0x0000000000000000000000000000000000000FD2;

    function getVerifier() internal pure returns (INativeQueryVerifier) {
        return INativeQueryVerifier(PRECOMPILE_ADDRESS);
    }
}
```

### 5-3. USC 컨트랙트 패턴

```solidity
contract MyUSC {
    INativeQueryVerifier public immutable VERIFIER;
    mapping(bytes32 => bool) public processedQueries;  // 리플레이 방지

    constructor() {
        VERIFIER = NativeQueryVerifierLib.getVerifier();
    }

    function processFromQuery(
        uint64 chainKey,
        uint64 blockHeight,
        bytes calldata encodedTransaction,
        bytes32 merkleRoot,
        INativeQueryVerifier.MerkleProofEntry[] calldata siblings,
        bytes32 lowerEndpointDigest,
        bytes32[] calldata continuityRoots
    ) external returns (bool) {
        // 1. txKey 생성 & 리플레이 체크
        uint256 txIndex = _calculateTransactionIndex(siblings);
        bytes32 txKey = keccak256(abi.encodePacked(chainKey, blockHeight, txIndex));
        require(!processedQueries[txKey], "Already processed");

        // 2. 증명 검증
        bool verified = VERIFIER.verifyAndEmit(
            chainKey, blockHeight, encodedTransaction,
            INativeQueryVerifier.MerkleProof(merkleRoot, siblings),
            INativeQueryVerifier.ContinuityProof(lowerEndpointDigest, continuityRoots)
        );
        require(verified, "Verification failed");

        // 3. 리플레이 마킹
        processedQueries[txKey] = true;

        // 4. 트랜잭션 데이터 추출 & 비즈니스 로직
        // ... EvmV1Decoder로 receipt, logs, fields 추출
        // ... 비즈니스 로직 실행

        return true;
    }
}
```

---

## 6. SDK

### 설치

```bash
npm install @gluwa/cc-next-query-builder
```

### 핵심 모듈

| 모듈 | 역할 |
|------|------|
| **ChainInfoProvider** | 지원 체인 조회, attestation 바운드 확인 |
| **ProverAPIProofGenerator** | Proof Generation API 서버에 증명 요청 |
| **PrecompileBlockProver** | 온체인 증명 검증 (single / batch) |
| **QueryBuilder** | 트랜잭션에서 데이터 추출, ABI 디코딩 |

### 사용 예시

```typescript
import { proofGenerator, queryBuilder } from '@gluwa/cc-next-query-builder';

// 1. 소스 체인 블록이 attest될 때까지 대기
await chainInfo.waitUntilHeightAttested(chainKey, blockHeight);

// 2. 증명 생성 요청
const apiProvider = new proofGenerator.api.ProverAPIProofGenerator(
    chainKey,
    'https://proof-gen-api.usc-testnet2.creditcoin.network'
);
const proof = await apiProvider.generateProof(txHash);

// 3. 온체인 검증
const prover = new PrecompileBlockProver(creditcoinProvider);
const verified = await prover.verifySingle(proof);

// 4. 쿼리 빌드 & USC 컨트랙트 호출
const builder = queryBuilder.QueryBuilder.createFromTransaction(tx, receipt, version);
// ... USC 컨트랙트에 제출
```

---

## 7. Snowball에서의 활용 방안

### 7-1. 크로스체인 대출 검증

```
유저가 Ethereum에서 대출 상환
    ↓
Attestor가 Ethereum 블록 합의
    ↓
Prover가 상환 트랜잭션 증명 생성
    ↓
Creditcoin USC가 증명 검증
    ↓
Snowball Morpho에서 담보 해제 / 신용 점수 반영
```

**활용**: 멀티체인 렌딩. Ethereum에서 상환하면 Creditcoin에서 자동으로 담보 해제.

### 7-2. 크로스체인 수수료 수집 (Assistance Fund)

```
다른 체인에 Snowball 프로토콜 확장 시:
    Ethereum Snowball DEX의 수수료 발생
    ↓
    USC로 수수료 발생 트랜잭션 검증
    ↓
    Creditcoin AssistanceFund에서 바이백 실행
```

**활용**: 멀티체인 배포 시 수수료를 하나의 체인에서 통합 관리.

### 7-3. 크로스체인 신용 히스토리 (ERC-8004)

```
유저의 Ethereum/Polygon/Solana 활동
    ↓
    USC로 각 체인 활동 검증
    ↓
    ERC-8004 에이전트 레퓨테이션에 반영
```

**활용**: 크로스체인 크레딧 어그리게이션. 다른 체인의 대출 상환, LP 제공, 거래 히스토리를 Creditcoin에서 통합 신용 점수로 변환.

### 7-4. Trustless 브릿지 (토큰 이동)

```
유저가 Ethereum에서 SNOW burn
    ↓
    USC로 burn 트랜잭션 검증
    ↓
    Creditcoin에서 SNOW mint
```

**활용**: SNOW 토큰 멀티체인 지원 시 신뢰 없는 브릿지. 중앙화 브릿지 없이 burn-and-mint.

### 7-5. 크로스체인 옵션 정산

```
BTC 가격을 Ethereum Chainlink에서 읽기
    ↓
    USC로 가격 데이터 검증
    ↓
    Creditcoin Options에서 정산
```

**활용**: 외부 체인의 검증된 가격 피드를 Snowball Options에서 사용. 현재 MockOracle 대체 가능.

---

## 8. PoC 검증 결과 — DN Token Bridge (2026-02-28)

### 개요

Sepolia에서 DN 토큰을 burn → USC 증명 → Creditcoin USC Testnet에서 mint하는 E2E 브릿지를 구현하고 검증 완료.

### 배포 컨트랙트

| 컨트랙트 | 체인 | 주소 |
|----------|------|------|
| DNToken (ERC20 + bridgeBurn) | Sepolia | `0xE964cb9cc1C8DA4847C24E3960aDa2F8Ff12C380` |
| DNBridgeUSC (검증 + mint) | USC Testnet | `0x23E741a87ad9567Dff27eb34FaABa1444154D458` |

### E2E 플로우 결과

| Step | 설명 | 결과 | 소요 시간 |
|------|------|------|----------|
| 1. Burn | Sepolia에서 100 DN burn (`transfer(address(1))`) | `0x38e870...` block 10348346 | ~15s |
| 2. Attestation | USC Attestor가 Sepolia 블록 합의 | latest: 10348410 | ~97s (대기) |
| 3. Proof | Proof API에서 Merkle + Continuity Proof 생성 | 8 siblings, 5 roots | ~2s |
| 4. Verify | Precompile(0x0FD2)로 온체인 검증 (staticcall) | VALID | ~3s |
| 5. Mint | DNBridgeUSC에서 DN 토큰 mint | `0x04dc38...` block 250282 | ~5s |

### 핵심 발견

1. **`verifyAndEmit`은 `view`가 아님** — Precompile이 이벤트를 발생시키므로 non-static 호출 필요
2. **Attestation 지연 ~4분** — Sepolia 블록이 USC에 attested되기까지 약 4분 소요
3. **이미 attest된 블록은 ~5초** — Proof 생성(~2s) + 온체인 검증(~3s)
4. **Replay protection** — `txKey = keccak256(chainKey, blockHeight, txIndex)`로 중복 mint 방지
5. **Burn 패턴** — `transfer(sender, address(1), amount)` (not `_burn`) → Transfer event가 USC proof에 포함됨

### 코드 위치

```
packages/usc-bridge/
├── src/
│   ├── DNToken.sol          # Sepolia ERC20 (burn-to-bridge)
│   └── DNBridgeUSC.sol      # USC 검증 + mint
├── scripts/
│   └── bridge-e2e.mjs       # E2E 테스트 스크립트
└── package.json
```

---

## 9. 설계 패턴

### Combined 패턴 (단순한 경우)

하나의 컨트랙트에 USC 검증 + 비즈니스 로직 통합.

```solidity
contract SnowballBridgeUSC is ERC20 {
    // 증명 검증 + 토큰 민팅을 하나의 컨트랙트에서
}
```

### Separated 패턴 (복잡한 경우)

USC 검증 컨트랙트와 비즈니스 로직 컨트랙트를 분리.

```
USCVerifier (증명 검증만) → 검증 결과를 비즈니스 컨트랙트에 전달
                             ↓
                        MorphoLend (대출 로직)
                        AssistanceFund (수수료 수집)
                        ERC8004Registry (신용 기록)
```

---

## 10. 참고 자료

| 리소스 | URL |
|--------|-----|
| USC 공식 문서 | https://docs.creditcoin.org/usc |
| Query Builder SDK | https://github.com/gluwa/cc-next-query-builder |
| Bridge 예제 | https://github.com/gluwa/ccnext-testnet-bridge-examples |
| USC Testnet Explorer | https://explorer.usc-testnet.creditcoin.network |
| Proof Generation API | `https://proof-gen-api.usc-testnet2.creditcoin.network` |
| USC Testnet RPC | `https://rpc.usc-testnet2.creditcoin.network` |

---

## 11. 용어 정리

| 용어 | 설명 |
|------|------|
| **USC** | Universal Smart Contract. Creditcoin에서 외부 체인 데이터를 검증하는 컨트랙트 |
| **Attestor** | 소스 체인을 모니터링하고 블록 히스토리에 대한 암호학적 합의를 생성하는 노드 |
| **Prover** | Attestation 기반으로 특정 트랜잭션의 Merkle + Continuity Proof를 생성하는 노드 |
| **Merkle Proof** | 특정 트랜잭션이 특정 블록에 포함되어 있음을 증명 |
| **Continuity Proof** | 특정 블록이 Attestor가 확인한 소스 체인에 속함을 증명 |
| **Native Query Verifier** | Creditcoin 내장 프리컴파일 (0x0FD2). 증명을 네이티브 속도로 검증 |
| **Offchain Worker** | 유저 대신 증명 요청 & USC 호출을 자동화하는 오프체인 봇 |
| **chainKey** | 소스 체인 식별자 (uint64) |
| **txKey** | 트랜잭션 유일 식별자 = keccak256(chainKey + blockHeight + txIndex) |
