# Snowball Protocol — AI Agent DeFi Platform on Creditcoin

## 한 줄 요약

**CTC 담보로 스테이블코인(sbUSD)을 빌리고, AI 에이전트가 포지션을 자동 관리하는 DeFi 프로토콜.**

---

## 1. 프로젝트 개요

Snowball은 Creditcoin Testnet 위에 구축된 **Liquity V2 Fork + AI Agent** 프로토콜입니다.

사용자는 wCTC 또는 lstCTC를 담보로 예치하고, sbUSD(스테이블코인)를 빌립니다.
AI 에이전트가 담보 비율(CR) 모니터링, 이자율 최적화, 자동 리밸런싱을 수행하여
청산 위험을 줄이고 수익을 극대화합니다.

### 왜 Snowball인가?

| 기존 DeFi 대출 | Snowball |
|---|---|
| 사용자가 24/7 포지션 모니터링 | AI 에이전트가 자동 모니터링 |
| 이자율 수동 설정 | 시장 평균 기반 동적 이자율 추천 |
| 청산 위험 자가 관리 | 자동 담보 추가로 청산 방지 |
| 리뎀션 리스크 무방비 | 이자율 자동 조정으로 리뎀션 방어 |

---

## 2. 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    사용자 (브라우저)                       │
│  React + Privy 인증 + wagmi/viem                         │
│  Landing | Borrow | Dashboard | Earn | Agent | Chat      │
└────────────┬──────────────────────────────┬──────────────┘
             │ 온체인 TX (지갑 서명)           │ REST API
             ▼                               ▼
┌────────────────────────┐    ┌──────────────────────────────┐
│  Creditcoin Testnet    │    │  Agent Consumer API          │
│  (Chain ID: 102031)    │    │  (Express.js + TypeScript)   │
│                        │    │                              │
│  ┌──────────────────┐  │    │  ├─ Position Monitor (30s)   │
│  │ BorrowerOps (×2) │  │    │  ├─ Auto-Rebalance Engine   │
│  │ TroveManager (×2)│  │    │  ├─ Interest Rate Optimizer │
│  │ StabilityPool(×2)│  │    │  ├─ Redemption Risk Detect  │
│  │ SmartAccount*     │  │◄───│  ├─ SSE Real-time Events    │
│  │ SmartAccountFact* │  │    │  └─ Swagger API Docs        │
│  │ ERC-8004 Registry │  │    │                              │
│  │ sbUSD Token       │  │    │  ┌─ A2A Protocol ───────┐   │
│  └──────────────────┘  │    │  │  CDP Provider Agent   │   │
│                        │    │  │  (Creditcoin 전용)     │   │
└────────────────────────┘    │  └───────────────────────┘   │
                              │                              │
                              │  ┌─ AI Chatbot ──────────┐   │
                              │  │  자연어 CDP 관리       │   │
                              │  └───────────────────────┘   │
                              └──────────────────────────────┘

* SmartAccount: 다음 단계 구현 예정 (아래 섹션 6 참조)
```

---

## 3. 핵심 메커니즘

### 3.1 CDP (Collateralized Debt Position)

| 항목 | Branch 0 (wCTC) | Branch 1 (lstCTC) |
|------|---|---|
| 담보 토큰 | wCTC (Wrapped CTC) | lstCTC (Liquid Staked CTC) |
| 최소 담보 비율 (MCR) | 110% | 120% |
| 위기 담보 비율 (CCR) | 150% | 160% |
| 최소 대출 | 200 sbUSD | 200 sbUSD |
| 이자율 범위 | 0.5% ~ 25% APR | 0.5% ~ 25% APR |

**동작 흐름:**
1. 사용자가 wCTC/lstCTC를 담보로 예치
2. 담보 가치 대비 일정 비율의 sbUSD를 빌림
3. 이자율은 사용자가 설정 (시장 평균 대비 낮으면 리뎀션 위험)
4. CR이 MCR 아래로 떨어지면 청산

### 3.2 Stability Pool (안정성 풀)

- sbUSD를 예치하면 청산 시 담보 토큰을 할인가에 획득
- sbUSD 이자 수익 분배

### 3.3 리뎀션 (Redemption)

- sbUSD 보유자가 sbUSD를 담보(wCTC/lstCTC)로 교환 가능
- 이자율이 가장 낮은 trove부터 순서대로 리뎀션됨
- → 이자율이 시장 평균보다 낮으면 리뎀션 리스크 높음

---

## 4. 기술 스택

### 4.1 스마트 컨트랙트
| 항목 | 스펙 |
|------|------|
| 언어 | Solidity 0.8.24 |
| 프레임워크 | Hardhat |
| 라이브러리 | OpenZeppelin 5.4.0 |
| 배포 도구 | Viem (nonce 충돌 방지) |
| 네트워크 | Creditcoin Testnet (102031) |

### 4.2 프론트엔드
| 항목 | 스펙 |
|------|------|
| 프레임워크 | React 18 + TypeScript |
| 빌드 | Vite 5 |
| 스타일링 | TailwindCSS (다크 테마) |
| 인증 | Privy (이메일/Google/지갑) |
| Web3 | wagmi v2 + viem |
| 상태관리 | @tanstack/react-query |
| 라우팅 | React Router v6 |

### 4.3 백엔드
| 항목 | 스펙 |
|------|------|
| 런타임 | Node.js + TypeScript |
| 프레임워크 | Express.js |
| 블록체인 | Viem (공유 패키지) |
| 로깅 | Pino (구조화 JSON) |
| API 문서 | Swagger/OpenAPI |
| 실시간 | Server-Sent Events (SSE) |

### 4.4 모노레포 구조
```
snowball/
├── packages/
│   ├── contracts-liquity/   # Liquity V2 포크 컨트랙트 (Solidity)
│   ├── contracts-8004/      # ERC-8004 에이전트 레지스트리
│   ├── shared/              # 공유 ABI, 타입, 상수
│   ├── frontend/            # React 프론트엔드
│   ├── agent-consumer/      # 에이전트 백엔드 API
│   ├── agent-cdp-provider/  # CDP Provider (A2A 프로토콜)
│   └── agent-chatbot/       # AI 챗봇
├── deployments/             # 배포된 주소 JSON
└── pnpm-workspace.yaml
```

---

## 5. 현재 구현 상태

### 5.1 스마트 컨트랙트 (Creditcoin Testnet 배포 완료)

| 컨트랙트 | 상태 | 설명 |
|----------|------|------|
| BorrowerOperations (×2) | ✅ 배포됨 | wCTC/lstCTC 각각의 대출 진입점 |
| TroveManager (×2) | ✅ 배포됨 | Trove 상태 관리, 청산, 리뎀션 |
| StabilityPool (×2) | ✅ 배포됨 | sbUSD 예치 및 청산 수익 분배 |
| sbUSD Token | ✅ 배포됨 | 프로토콜 스테이블코인 |
| wCTC / lstCTC Mocks | ✅ 배포됨 | 테스트넷 담보 토큰 |
| MockPriceFeed (×2) | ✅ 배포됨 | 가격 오라클 (테스트용) |
| CollateralRegistry | ✅ 배포됨 | 크로스 브랜치 리뎀션 라우팅 |
| TroveNFT (×2) | ✅ 배포됨 | Trove 소유권 NFT |
| SortedTroves (×2) | ✅ 배포됨 | 이자율 기준 정렬 목록 |
| ERC-8004 Registries (×3) | ✅ 배포됨 | 에이전트 신원/평판/검증 |

### 5.2 프론트엔드 (빌드 완료)

| 페이지 | 상태 | 기능 |
|--------|------|------|
| Landing | ✅ | 프로토콜 소개, 로그인 유도 |
| Borrow | ✅ | 담보 타입 선택, 금액 입력, 이자율 설정, 포지션 생성 |
| Dashboard | ✅ | 포지션 목록, CR 게이지, 조정/종료 모달 |
| Earn | ✅ | Stability Pool 예치/출금/보상 |
| Stats | ✅ | 프로토콜 통계, TVL, 브랜치별 현황 |
| Agent | ✅ | 에이전트 활성화, 설정, 평판(ERC-8004), 활동 로그 |
| Chat | ✅ | AI 챗봇으로 자연어 CDP 관리 |

### 5.3 백엔드 (빌드 완료)

| 기능 | 상태 | 설명 |
|------|------|------|
| Position Monitor | ✅ | 30초 주기로 모든 등록 포지션 CR 체크 |
| Auto-Rebalance | ✅ | CR 위험 시 자동 담보 추가 로직 |
| Interest Rate Optimizer | ✅ | 시장 평균 대비 리뎀션 리스크 감지 → 이자율 조정 |
| SSE Events | ✅ | 실시간 모니터링 이벤트 스트리밍 |
| Agent API | ✅ | 추천/실행/설정/이자율 조정 엔드포인트 |
| A2A Protocol | ✅ | CDP Provider 에이전트와 통신 |
| Swagger Docs | ✅ | `/api/docs`에서 전체 API 문서 확인 |
| Privy 인증 연동 | ✅ | 로그인/임베디드 지갑/서버 월렛 |

### 5.4 배포된 컨트랙트 주소 (주요)

```
wCTC Token:           0x495644a75e54e33d75b5809841d1fed2c1a9b56e
lstCTC Token:         0xfe83ecb4752128f85acee4b605d537b8ed5c04e9
sbUSD Token:          0x46dbeb7edbc082df2754759a9645fcd5da3636c4

Branch 0 (wCTC):
  BorrowerOperations: 0x5015ccbf8f2335d09d8c903ffe80d129c1864acd
  TroveManager:       0xd98da26fe3a9ed01de9169da87c8bdba8cf87229
  StabilityPool:      0x017b8dccd19786d045afe268dbd3ab711747f907

Branch 1 (lstCTC):
  BorrowerOperations: 0xe1f8941341fc0281fdd8aedd92c1b5b6211fb1d4
  TroveManager:       0xcdf5d1950488d49e4f09fc616a276055a5229a67
  StabilityPool:      0xb686bd4a7fafd04bb4b7899ce3abc2ebb63af45a

ERC-8004:
  IdentityRegistry:   0x993C9150f074435BA79033300834FcE06897de9B
  ReputationRegistry: 0x3E5E194e39b777F568c9a261f46a5DCC43840726
  ValidationRegistry: 0x84b9B2121187155C1c85bA6EA34e35c981BbA023

CollateralRegistry:   0xb368984a9ff400a1adb7c5aaa11df5cc57c0cf62
```

---

## 6. 다음 단계: SmartAccount 기반 에이전트 위임 실행

### 6.1 현재 한계

현재 에이전트는 포지션을 모니터링하고 추천은 할 수 있지만, **실제 트랜잭션을 사용자 대신 실행하지 못합니다.**

이유: BorrowerOperations는 `troveNFT.ownerOf(troveId) == msg.sender`를 체크하는데, 에이전트의 admin 지갑은 trove owner가 아닙니다.

### 6.2 해결책: SmartAccount 패턴

사용자별 SmartAccount 컨트랙트를 배포하고, 이 SmartAccount가 trove의 owner가 됩니다.
에이전트가 `SmartAccount.execute()`를 호출하면, SmartAccount가 BorrowerOperations를 호출하므로
`msg.sender = SmartAccount = trove owner`가 되어 권한 체크를 통과합니다.

```
사용자 지갑 (MetaMask/Rabby/Privy)
    │
    ├── 일반 사용: 직접 BorrowerOperations 호출 (기존대로)
    │
    └── 에이전트 사용:
        │
        ├── 1. SmartAccountFactory.createAccount(myAddress)
        │      → 사용자 전용 SmartAccount 컨트랙트 생성 (CREATE2, 주소 예측 가능)
        │
        ├── 2. wCTC/lstCTC를 SmartAccount로 이체
        │
        ├── 3. SmartAccount.addAgent(에이전트지갑주소)
        │      → 에이전트에 실행 권한 부여
        │
        │   ┌─────────────────────────────────────────┐
        │   │ SmartAccount (= trove owner)             │
        │   │                                          │
        │   │  사용자: execute(BO, openTrove...)       │
        │   │  에이전트: execute(BO, adjustRate...)     │
        │   │           execute(BO, addColl...)         │
        │   │                                          │
        │   │  msg.sender = SmartAccount               │
        │   │  → onlyTroveOwner 체크 통과 ✅            │
        │   └─────────────────────────────────────────┘
        │
        ├── SmartAccount.removeAgent(에이전트) → 즉시 권한 해제
        └── SmartAccount.withdrawERC20(token, to, amt) → 자산 회수
```

### 6.3 SmartAccount 설계

```solidity
contract SmartAccount {
    address public immutable owner;           // 생성자에서 설정, 변경 불가
    mapping(address => bool) public authorized;  // 에이전트 권한

    function addAgent(address agent) external onlyOwner;
    function removeAgent(address agent) external onlyOwner;
    function execute(address target, bytes calldata data) external onlyAuthorized returns (bytes memory);
    function executeBatch(address[] targets, bytes[] datas) external onlyAuthorized;
    function withdrawETH(address to, uint256 amount) external onlyOwner;
    function withdrawERC20(address token, address to, uint256 amount) external onlyOwner;
}

contract SmartAccountFactory {
    function createAccount(address owner) external returns (address);        // CREATE2 배포
    function getAccountAddress(address owner) view returns (address);       // 배포 전 주소 예측
    function hasAccount(address owner) view returns (bool);
}
```

### 6.4 에이전트 자동 실행 시나리오

| 시나리오 | 트리거 | 에이전트 동작 |
|----------|--------|---------------|
| **이자율 최적화** | 사용자 이자율 < 시장 평균 × 70% | SmartAccount.execute(BO, adjustTroveInterestRate) |
| **CR 리밸런싱** | CR < minCR × 1.1 (위험 수준) | SmartAccount.execute(BO, addColl) — SmartAccount 내 담보 사용 |
| **긴급 청산 방지** | CR < MCR × 1.05 | 즉시 담보 추가 또는 부채 상환 |
| **포지션 생성** | 사용자 요청 (챗봇/UI) | SmartAccount.executeBatch([approve, openTrove]) |

### 6.5 구현 범위

| 파일 | 유형 | 설명 |
|------|------|------|
| `SmartAccount.sol` | 신규 | 사용자별 스마트 계정 (execute, batch, withdraw) |
| `SmartAccountFactory.sol` | 신규 | CREATE2 팩토리 (결정적 주소) |
| `ISmartAccount.sol` | 신규 | 인터페이스 |
| `ISmartAccountFactory.sol` | 신규 | 인터페이스 |
| `deploy-viem.ts` | 수정 | Factory 배포 추가 |
| `useSmartAccount.ts` | 신규 | 프론트엔드 훅 (생성/에이전트 관리) |
| `AgentActivation.tsx` | 수정 | 3-step 활성화 위저드 |
| `PermissionStatus.tsx` | 수정 | SmartAccount 상태 표시 |
| `monitor.ts` | 수정 | SmartAccount 경유 실행 |
| 총 | **4 신규 + 6 수정** | |

---

## 7. ERC-8004 에이전트 시스템

Snowball은 [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) 표준을 구현하여 에이전트의 신원, 평판, 검증을 온체인으로 관리합니다.

### IdentityRegistry
- 에이전트 등록: 이름, 타입, 엔드포인트, 소유자 주소
- `getAgentInfo(agentId)` → 에이전트 상세 정보 조회
- `getOwnerAgents(address)` → 특정 소유자의 에이전트 목록

### ReputationRegistry
- 에이전트 평점 (1~5), 리뷰 수, 성공률
- `rate(agentId, score)` → 평점 부여
- `getReputation(agentId)` → 평판 조회

### ValidationRegistry
- 에이전트 자격 검증 (validator → agent)
- `validate(agentId, expiresAt)` → 자격 부여
- `isValid(agentId)` → 유효성 확인

---

## 8. API 엔드포인트 요약

### Agent API (`/api/agent/`)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/recommend` | 전략 기반 CDP 추천 (이자율, 대출량, APY) |
| POST | `/execute` | CDP 작업 실행 (openTrove, adjustTrove, closeTrove) |
| POST | `/adjust-rate` | 이자율 조정 |
| POST | `/settings` | 에이전트 설정 저장 + 모니터 등록 |
| POST | `/close` | Trove 닫기 |
| GET | `/server-wallet` | 사용자 에이전트 등록 상태 조회 |
| POST | `/server-wallet` | 에이전트 등록 (전략 선택) |
| DELETE | `/server-wallet` | 에이전트 비활성화 |

### Protocol API (`/api/protocol/`)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/markets` | 브랜치별 시장 데이터 (TVL, CR, 이자율) |
| GET | `/price/:branch` | 담보 가격 조회 |
| GET | `/stats` | 프로토콜 전체 통계 |

### User API (`/api/user/`)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/positions/:address` | 사용자 포지션 목록 |
| GET | `/balance/:address` | 사용자 토큰 잔액 |

### Stability Pool API (`/api/sp/`)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/deposit` | SP 예치 |
| POST | `/withdraw` | SP 출금 |
| GET | `/deposits/:address` | 사용자 SP 예치 현황 |

### Events API (`/api/events/`)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/stream` | SSE 실시간 모니터링 이벤트 |
| GET | `/history` | 이벤트 히스토리 |

---

## 9. 실행 방법

### 환경 설정
```bash
# .env 파일 생성
cp .env.example .env

# 필수 환경변수:
# ADMIN_PRIVATE_KEY=0x...           (에이전트 백엔드 지갑 PK)
# VITE_PRIVY_APP_ID=...             (Privy 앱 ID)
```

### 빌드 & 실행
```bash
# 의존성 설치
pnpm install

# 공유 패키지 빌드
pnpm --filter @snowball/shared build

# 프론트엔드 개발 서버
pnpm --filter @snowball/frontend dev

# 백엔드 개발 서버
pnpm --filter @snowball/agent-consumer dev

# CDP Provider
pnpm --filter @snowball/agent-cdp-provider dev

# 컨트랙트 컴파일
cd packages/contracts-liquity && npx hardhat compile
```

---

## 10. 리포지토리

- **GitHub**: https://github.com/hypurrquant/snowball
- **네트워크**: Creditcoin Testnet (Chain ID: 102031)
- **Explorer**: https://creditcoin-testnet.blockscout.com
