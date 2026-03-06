# 설계 - v0.11.1

## 변경 규모
**규모**: 서비스 경계
**근거**: 외부 API 3개 연동 (Sepolia RPC, USC RPC, Proof API) → 가이드 기준 "서비스 경계" 자동 승격

---

## 문제 요약
기존 USC Bridge PoC는 수동 1회성 스크립트. 이를 Sepolia BridgeBurn 이벤트를 실시간 감지 → 자동 attestation 대기 → proof 생성 → USC mint 하는 상시 워커 서버로 자동화.

> 상세: [README.md](README.md) 참조

## 접근법
- 기존 `bridge-e2e.mjs`의 5단계 플로우를 그대로 서버 루프로 전환
- Node.js + ethers.js 단일 프로세스 (기존 PoC와 동일 스택)
- 이벤트 폴링 → 큐잉 → 순차 처리 구조

## 대안 검토

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: WebSocket 이벤트 구독 | 실시간 감지 | Sepolia RPC 웹소켓 불안정, 재연결 복잡 | ❌ |
| B: 블록 폴링 + getLogs | 안정적, 놓친 블록 catch-up 용이 | 폴링 딜레이 (15~30초) | ✅ |
| C: The Graph 서브그래프 | 이벤트 인덱싱 자동화 | Sepolia 서브그래프 배포/유지 비용, 오버엔지니어링 | ❌ |

**선택 이유**: B는 기존 bridge-e2e.mjs가 이미 사용하는 패턴이고, 놓친 블록에 대한 catch-up이 자연스럽다. PoC 수준에서 WebSocket 안정성 관리는 불필요.

## 기술 결정

### 이벤트 감지: BridgeBurn을 트리거, Transfer에서 데이터 추출
- **트리거 이벤트**: `BridgeBurn(address indexed from, uint256 amount, uint64 destinationChainKey)` — 워커가 이 이벤트로 burn TX를 감지
- **데이터 추출**: `BridgeBurn` 이벤트에서 `from`, `amount` 추출. 동일 TX의 `Transfer(from, address(1), amount)` 로그와 교차 검증하여 일관성 확인
- **교차 검증**: mint 제출 전 같은 TX receipt에서 `Transfer(from, to=address(1), amount)` 로그의 `from`, `amount`, `to==address(1)` 모두 BridgeBurn의 `from`, `amount`와 일치하는지 확인. 불일치 시 해당 이벤트 스킵 + 경고 로그
- **근거**: `BridgeBurn`은 bridge 전용 시그니처로 필터링이 명확. `Transfer(to=address(1))`는 DN Token이 실제 burn proof로 사용하는 이벤트(DNToken.sol L50). 둘의 교차 검증으로 신뢰도 확보

### 스택
- **런타임**: Node.js (ESM)
- **이더리움 클라이언트**: ethers.js v6 (기존 PoC와 동일)
- **설정 관리**: dotenv (.env 파일)
- **로깅**: console.log (프로덕션 로거는 비범위)

### 프로세스 구조
싱글 프로세스, 이벤트 루프 기반. 멀티스레딩/클러스터링은 비범위.

---

## 가정/제약
- Proof Generation API(`proof-gen-api.usc-testnet2.creditcoin.network`)가 가동 중이어야 함
- USC Attestor 네트워크가 Sepolia 블록을 지속적으로 증명해야 함
- Worker 실행 환경에 `DEPLOYER_PRIVATE_KEY`(operator 권한 키)가 설정되어야 함
- Sepolia 무료 RPC(`1rpc.io/sepolia`)의 레이트리밋이 폴링 빈도(30초)에 충분해야 함
- DNBridgeUSC 컨트랙트 ABI가 현재 버전 그대로 유지됨

## 범위 / 비범위
- **범위(In Scope)**: apps/usc-worker 패키지 생성, 이벤트 폴링, attestation 대기, proof 생성, mint 호출, 메모리 기반 상태 관리
- **비범위(Out of Scope)**: 신규 컨트랙트, 프론트엔드, DB 영속성, 프로덕션 인프라

## 아키텍처 개요

```
apps/usc-worker/
├── package.json
├── .env.example
└── src/
    ├── index.mjs          # 엔트리포인트: 초기화 + 메인 루프 시작
    ├── config.mjs          # 환경변수 로드 + 상수
    ├── poller.mjs          # Sepolia 블록 폴링 + BridgeBurn 이벤트 감지
    ├── attestation.mjs     # ChainInfo precompile로 attestation 높이 확인
    ├── proof.mjs           # Proof Generation API 호출
    └── bridge.mjs          # DNBridgeUSC.processBridgeMint() 호출
```

### 컴포넌트 흐름

```
[index.mjs] 메인 루프 (30초 간격)
    │
    ├─ 1. [poller.mjs] Sepolia getLogs(BridgeBurn) — lastProcessedBlock ~ latest
    │      └─ 새 이벤트 발견 시 큐에 추가
    │
    ├─ 2. 큐에서 이벤트 하나씩 처리:
    │      │
    │      ├─ 2a. [attestation.mjs] USC ChainInfo에서 latestAttestation 확인
    │      │      └─ attested >= burnBlock + 1 될 때까지 폴링 대기
    │      │
    │      ├─ 2b. [proof.mjs] Proof API로 머클/연속성 증명 획득
    │      │      └─ GET /api/v1/proof-by-tx/{chainKey}/{txHash}
    │      │
    │      └─ 2c. [bridge.mjs] DNBridgeUSC.processBridgeMint() 호출
    │             └─ 성공 시 로그, 실패(이미 처리됨) 시 스킵
    │
    └─ 3. 블록 내 모든 이벤트 성공 시에만 lastProcessedBlock 전진
           └─ 하나라도 실패 시 해당 블록에서 멈춤 → 다음 루프에서 재시도
```

## 데이터 흐름

```
Sepolia                    Worker (apps/usc-worker)           USC Testnet
───────                    ────────────────────────           ───────────
User calls
bridgeBurn(100, 1)
  │
  ├─ BridgeBurn event
  │   emitted
  │
  │                        poller.mjs: getLogs() 감지
  │                        ├─ from: 0xUser
  │                        ├─ amount: 100 DN
  │                        ├─ txHash: 0xABC...
  │                        └─ blockNumber: 12345
  │
  │                        attestation.mjs: 대기
  │                        └─ poll until attested >= 12346
  │
  │                        proof.mjs: API 호출
  │                        └─ GET /proof-by-tx/1/0xABC
  │                        └─ return { merkleProof, continuityProof, txBytes }
  │
  │                                                          bridge.mjs:
  │                                                          processBridgeMint(
  │                                                            blockHeight,
  │                                                            txBytes,
  │                                                            merkleProof,
  │                                                            continuityProof,
  │                                                            recipient,
  │                                                            amount
  │                                                          )
  │                                                            │
  │                                                            ├─ Precompile 검증
  │                                                            ├─ processedTxKeys 체크
  │                                                            └─ _mint(recipient, amount)
```

## API/인터페이스 계약

### Sepolia RPC (소비)
```
eth_getLogs({
  address: DN_TOKEN_SEPOLIA,
  topics: [BridgeBurn event signature],
  fromBlock, toBlock
})
eth_getTransactionReceipt(txHash)
```

### Proof Generation API (소비)
```
GET /api/v1/proof-by-tx/{chainKey}/{txHash}
→ { chainKey, headerNumber, txIndex, txBytes, merkleProof, continuityProof }
```

### USC ChainInfo Precompile (소비)
```solidity
// 0x0000000000000000000000000000000000000fd3
function get_latest_attestation_height_and_hash(uint64 chainKey)
  view returns (uint64 height, bytes32 hash, bool exists, bool finalized)
```

### DNBridgeUSC (소비)
```solidity
// 0x23E741a87ad9567Dff27eb34FaABa1444154D458
function processBridgeMint(
  uint64 blockHeight,
  bytes calldata encodedTransaction,
  MerkleProof calldata merkleProof,
  ContinuityProof calldata continuityProof,
  address recipient,
  uint256 amount
) external onlyOperator returns (bool)
```

## 데이터 모델/스키마
N/A: 메모리 상태만 사용, 영속 저장소 없음. 런타임 상태는 `lastProcessedBlock: number`와 `retryCount: Map<number, number>` 두 변수.

## 테스트 전략
- **E2E 수동 테스트**: Worker 실행 → Sepolia에서 bridgeBurn 호출 → USC에서 mint 확인
- **단위 테스트**: 비범위 (PoC 수준)
- **검증 방법**: USC 블록 익스플로러에서 BridgeMint 이벤트 + balanceOf 확인

---

## 실패/에러 처리

### 블록 포인터 전진 규칙
**핵심 원칙: 블록 N의 모든 이벤트가 성공적으로 처리(mint 완료 또는 already-processed 확인)되어야 lastProcessedBlock을 N+1로 전진**

- 하나라도 실패 시 → 해당 블록에서 멈춤, 다음 폴링 루프에서 같은 블록부터 재시도
- "already processed" revert는 성공으로 간주 (온체인 중복 방지가 작동한 것)
- MAX_RETRY(10) 초과 시: 해당 블록을 스킵하고 경고 로그 출력. 복구 방법: `START_BLOCK=<실패 블록 번호>`로 워커를 재시작하여 해당 블록부터 재처리. 이미 처리된 이벤트는 온체인 processedTxKeys로 자동 스킵됨

| 실패 시나리오 | 대응 |
|-------------|------|
| Sepolia RPC 불응답 | 30초 후 재시도 (메인 루프) |
| Attestation 미도달 | 다음 루프에서 재확인 (블록 포인터 안 전진) |
| Proof API 에러 | 3회 재시도 (exponential backoff), 실패 시 블록 포인터 안 전진 |
| processBridgeMint revert (already processed) | 성공 처리 + 로그 |
| processBridgeMint revert (기타) | 블록 포인터 안 전진, 다음 루프에서 재시도 |
| 같은 블록 MAX_RETRY(10)회 실패 | 경고 로그, 해당 블록 스킵 + 수동 개입 알림 |
| Worker 재시작 | START_BLOCK 또는 0부터 스캔, 이미 처리된 건 온체인 중복방지로 자동 스킵 |

## 보안/권한
- `DEPLOYER_PRIVATE_KEY`: operator 권한을 가진 키. .env에서 로드, 절대 커밋하지 않음
- DNBridgeUSC의 `onlyOperator` modifier: owner 또는 operator만 processBridgeMint 호출 가능
- .env.example에는 placeholder만 포함

## 성능/스케일
N/A: PoC 수준. Sepolia 이벤트 빈도가 매우 낮아 성능 병목 없음.

## 롤아웃/롤백 계획
N/A: 새 서비스 추가. 기존 코드 변경 없음. 서버 중지만 하면 롤백 완료.

## 관측성
- console.log 기반 구조화 로깅: `[timestamp] [module] message`
- 주요 로그 포인트: 이벤트 감지, attestation 대기, proof 생성, mint 성공/실패
- 프로덕션 로거(winston 등)는 비범위

---

## Ownership Boundary

| 컴포넌트/서비스 | 책임 | 비고 |
|---------------|------|------|
| apps/usc-worker | 이번 Phase | 신규 생성 |
| packages/usc-bridge | 기존 (수정 안함) | PoC 컨트랙트/스크립트 |
| Proof Generation API | Creditcoin 팀 | 외부 서비스, 우리 통제 밖 |
| USC Attestor 네트워크 | Creditcoin 팀 | 외부 인프라 |
| Sepolia RPC | 공용 (1rpc.io) | 레이트리밋 가능성 |

## Contract Reference

| 계약 | 문서 위치 | 비고 |
|------|----------|------|
| USC 오프체인 워커 패턴 | `docs/creditcoin-usc-docs/.../오프체인-오라클-워커.md` | 설계 근거 |
| DNBridgeUSC ABI | `packages/usc-bridge/src/DNBridgeUSC.sol` | processBridgeMint 시그니처 |
| Proof API 엔드포인트 | `packages/usc-bridge/scripts/bridge-e2e.mjs` L85 | /api/v1/proof-by-tx/{chainKey}/{txHash} |

## Dependency Map

| 의존 대상 | 영향 방향 | 영향 범위 |
|----------|----------|----------|
| Sepolia RPC | Worker → Sepolia | 이벤트 폴링 불가 시 전체 중단 |
| USC Testnet RPC | Worker → USC | mint 호출 불가 시 블록 포인터 정지 |
| Proof Generation API | Worker → API | proof 불가 시 블록 포인터 정지 |
| DNBridgeUSC 컨트랙트 | Worker → USC 온체인 | 컨트랙트 변경 시 ABI 업데이트 필요 |
| ChainInfo Precompile | Worker → USC 온체인 | attestation 확인 불가 시 대기 |

---

## 리스크/오픈 이슈
- Proof API 가용성이 Creditcoin 팀에 의존 (외부 서비스)
- Sepolia 무료 RPC 레이트리밋 가능성 → 1rpc.io 외 대안 RPC 환경변수로 설정 가능하게
- Worker 재시작 시 과거 전체 블록 재스캔은 비효율적 → START_BLOCK 환경변수로 시작 블록 지정 가능하게
