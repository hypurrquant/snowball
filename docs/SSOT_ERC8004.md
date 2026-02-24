# SSOT — Snowball ERC-8004 Agent System

> Single Source of Truth for agent identity, reputation, and validation contracts.
> Creditcoin Testnet deployment.

---

## Network

| Key | Value |
|-----|-------|
| Name | Creditcoin Testnet |
| Chain ID | `102031` |
| RPC | `https://rpc.cc3-testnet.creditcoin.network` |
| Explorer | `https://creditcoin-testnet.blockscout.com` |
| Native Token | CTC (tCTC on testnet, 18 decimals) |

---

## Core Contracts

| 컨트랙트 | 주소 | 역할 |
|----------|------|------|
| **IdentityRegistry** | `0x993C9150f074435BA79033300834FcE06897de9B` | Agent 등록 (ERC-721 NFT) |
| **ReputationRegistry** | `0x3E5E194e39b777F568c9a261f46a5DCC43840726` | Agent 평판 추적 |
| **ValidationRegistry** | `0x84b9B2121187155C1c85bA6EA34e35c981BbA023` | Agent 인증/검증 |

---

## 연관 컨트랙트

| 컨트랙트 | 주소 | 역할 |
|----------|------|------|
| **AgentVault** | `0xb944c1fdc2bd1232d490dd03ab5129ab15ccbc40` | Agent 권한 관리 + 자산 보관 (Liquity 패키지) |

---

## Build & Compile

| Key | Value |
|-----|-------|
| Solidity | `0.8.24` |
| EVM Target | `shanghai` |
| Optimizer | enabled, 200 runs |
| OpenZeppelin | v5.0.0 |
| Build Tool | Hardhat |

---

## Architecture

```
IdentityRegistry (ERC-721)
    ↓ identityRegistry address
    ├─→ ReputationRegistry
    └─→ ValidationRegistry

AgentVault (별도 패키지, Liquity 쪽)
    └─→ User ↔ Agent 권한 위임 & 자산 보관
```

Agent는 ERC-721 NFT로 표현. 각 Agent는 Identity, Reputation, Validation 3계층 관리.

---

## IdentityRegistry

Agent를 NFT로 등록. 토큰명: **Snowball Agent Identity (sAGENT)**

### 데이터 구조

```solidity
struct AgentInfo {
    string name;           // Agent 이름
    string agentType;      // "cdp-provider", "consumer", "chatbot"
    address endpoint;      // A2A 엔드포인트 주소
    uint256 registeredAt;  // 등록 타임스탬프
    bool isActive;         // 활성 상태
}
```

### 함수

```solidity
// 쓰기
function registerAgent(string name, string agentType, address endpoint, string tokenURI)
    returns (uint256 agentId)
function deactivateAgent(uint256 agentId)    // owner only
function activateAgent(uint256 agentId)      // owner only

// 읽기
function getAgentInfo(uint256 agentId) view returns (AgentInfo)
function getOwnerAgents(address owner) view returns (uint256[])
function totalAgents() view returns (uint256)
function ownerOf(uint256 agentId) view returns (address)  // ERC-721
function tokenURI(uint256 agentId) view returns (string)  // ERC-721
```

### 이벤트

```solidity
event AgentRegistered(uint256 indexed agentId, address indexed owner, string name, string agentType)
event AgentDeactivated(uint256 indexed agentId)
event AgentActivated(uint256 indexed agentId)
```

---

## ReputationRegistry

Agent 성과 점수, 리뷰, 상호작용 지표 추적.

### 데이터 구조

```solidity
struct ReputationData {
    uint64 totalInteractions;
    uint64 successfulInteractions;
    int128 reputationScore;    // 1e2 스케일 (예: 480 = 4.80점)
    uint8 decimals;            // 항상 2
}

struct Review {
    address reviewer;
    uint256 agentId;
    int128 score;              // 100~500 (1.00~5.00)
    string comment;
    uint256 timestamp;
}
```

### 함수

```solidity
// 쓰기
function submitReview(uint256 agentId, int128 score, string comment, string tag)
function recordInteraction(uint256 agentId, string tag, bool success)  // onlyOwner

// 읽기
function getSummary(uint256 agentId, address[] clients, string tag1, string tag2)
    view returns (uint64 count, int128 summaryValue, uint8 decimals)
function getReviews(uint256 agentId) view returns (Review[])
function getReputation(uint256 agentId, string tag)
    view returns (ReputationData)
function getSuccessRate(uint256 agentId, string tag) view returns (uint256)
```

### 이벤트

```solidity
event ReputationUpdated(uint256 indexed agentId, string tag, int128 newScore)
event ReviewSubmitted(uint256 indexed agentId, address indexed reviewer, int128 score)
```

---

## ValidationRegistry

Agent 인증 상태 및 자격 관리.

### 데이터 구조

```solidity
enum ValidationStatus {
    Unvalidated,  // 0 — 미검증
    Pending,      // 1 — 검증 대기
    Validated,    // 2 — 검증 완료
    Suspended,    // 3 — 일시 정지
    Revoked       // 4 — 취소됨
}

struct Validation {
    ValidationStatus status;
    address validator;
    uint256 validatedAt;
    uint256 expiresAt;
    string certificationURI;  // IPFS/Arweave 링크
}
```

### 함수

```solidity
// 관리자
function addValidator(address validator)      // onlyOwner
function removeValidator(address validator)   // onlyOwner

// 검증자
function validateAgent(uint256 agentId, uint256 validityPeriod, string certificationURI)
function suspendAgent(uint256 agentId)        // onlyValidator
function revokeAgent(uint256 agentId)         // onlyValidator

// 읽기
function isValidated(uint256 agentId) view returns (bool)
function getValidation(uint256 agentId) view returns (Validation)
```

### 이벤트

```solidity
event AgentValidated(uint256 indexed agentId, address indexed validator, uint256 expiresAt)
event AgentSuspended(uint256 indexed agentId, address indexed validator)
event AgentRevoked(uint256 indexed agentId, address indexed validator)
event ValidatorAdded(address indexed validator)
event ValidatorRemoved(address indexed validator)
```

---

## AgentVault (Liquity 패키지)

사용자 자산 보관 + Agent에게 제한적 권한 위임.

### 함수

```solidity
// 자산 관리
function deposit(address token, uint256 amount)
function withdraw(address token, uint256 amount)
function getBalance(address user, address token) view returns (uint256)

// 권한 관리
function grantPermission(address agent, address[] targets, bytes4[] functions, uint256 cap, uint256 expiry)
function revokePermission(address agent)
function getPermission(address user, address agent) view returns (Permission)

// Agent 실행
function executeOnBehalf(address user, address target, bytes data) returns (bytes)
function approveFromVault(address user, address token, address spender, uint256 amount)
function transferFromVault(address user, address token, address to, uint256 amount)
```

---

## 초기 등록 Agent

| Agent ID | 이름 | 타입 | 기능 |
|----------|------|------|------|
| 1 | Snowball CDP Provider | `cdp-provider` | Trove 관리, SP 운영, 청산 보호 |
| 2 | Snowball Consumer Agent | `consumer` | 전략 추천, 포지션 모니터링, 자동 리밸런싱 |

---

## ABIs

소스: `packages/shared/src/abis/erc8004.ts`

```typescript
import {
  IdentityRegistryABI,
  ReputationRegistryABI,
  AgentVaultABI,
  ValidationRegistryABI,
} from '@snowball/shared/abis';
```

---

## Deploy Order (재배포 시)

```
1. IdentityRegistry()
2. ReputationRegistry(identityRegistry)
3. ValidationRegistry(identityRegistry)
4. (선택) registerAgent × N → 초기 Agent 등록
5. (선택) validateAgent × N → 초기 Agent 인증
```

> AgentVault는 Liquity 패키지에서 별도 배포.

---

## 빠른 복사용 (TypeScript)

```typescript
const IDENTITY_REGISTRY   = "0x993C9150f074435BA79033300834FcE06897de9B";
const REPUTATION_REGISTRY = "0x3E5E194e39b777F568c9a261f46a5DCC43840726";
const VALIDATION_REGISTRY = "0x84b9B2121187155C1c85bA6EA34e35c981BbA023";
const AGENT_VAULT         = "0xb944c1fdc2bd1232d490dd03ab5129ab15ccbc40";
```

---

## License

MIT
