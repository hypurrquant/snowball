# Last Task Summary — 2026-03-01

## USC Bridge PoC + DN Token DeFi 생태계 통합

### 목표

1. Creditcoin USC를 활용한 크로스체인 Burn & Mint 브릿지 PoC 구현
2. 브릿지된 DN 토큰을 Snowball DeFi(DEX, Lend)에 통합
3. ERC-8004 기반 신용 시스템 설계 논의

---

### 1. USC Bridge PoC — E2E 검증 완료

Sepolia에서 DN 토큰 burn → USC 증명 → Creditcoin USC Testnet에서 mint하는 전체 파이프라인 구현 및 검증.

#### 배포 컨트랙트

| 컨트랙트 | 체인 | 주소 |
|----------|------|------|
| DNToken (ERC20 + bridgeBurn) | Sepolia | `0xE964cb9cc1C8DA4847C24E3960aDa2F8Ff12C380` |
| DNBridgeUSC (검증 + mint) | USC Testnet | `0x23E741a87ad9567Dff27eb34FaABa1444154D458` |

#### E2E 플로우 결과

| Step | 설명 | 소요 시간 |
|------|------|----------|
| 1. Burn | Sepolia에서 100 DN burn (transfer to address(1)) | ~15s |
| 2. Attestation | USC Attestor가 Sepolia 블록 합의 | ~97s |
| 3. Proof | Proof API에서 Merkle + Continuity Proof 생성 | ~2s |
| 4. Verify | Precompile(0x0FD2)로 온체인 검증 | ~3s |
| 5. Mint | DNBridgeUSC에서 DN 토큰 mint | ~5s |

#### 핵심 발견

- `verifyAndEmit`은 `view`가 아님 — Precompile이 이벤트를 발생시키므로 non-static 호출 필요
- Attestation 지연 ~4분 — Sepolia 블록이 USC에 attested되기까지
- 이미 attest된 블록은 ~5초 — Proof 생성(~2s) + 온체인 검증(~3s)
- Burn 패턴: `transfer(sender, address(1), amount)` (not `_burn`) → Transfer event가 USC proof에 포함

#### 신규 파일

| 파일 | 설명 |
|------|------|
| `packages/usc-bridge/src/DNToken.sol` | Sepolia ERC20 (burn-to-bridge) |
| `packages/usc-bridge/src/DNBridgeUSC.sol` | USC 검증 + mint (INativeQueryVerifier 인터페이스) |
| `packages/usc-bridge/scripts/bridge-e2e.mjs` | E2E 테스트 스크립트 |
| `packages/usc-bridge/package.json` | 패키지 설정 (ethers, dotenv) |
| `packages/usc-bridge/foundry.toml` | Foundry 빌드 설정 |
| `deployments/creditcoin-testnet/usc-bridge.json` | 배포 주소 기록 |

---

### 2. DN Token DEX 풀 — Algebra V4

Creditcoin Testnet에 DN 토큰을 배포하고 Snowball DEX(Algebra)에서 wCTC와 거래 가능하도록 풀 생성.

| 항목 | 값 |
|------|-----|
| DN Token (cc3-testnet) | `0xCc2C598356011fb0a32734B138b1Fa363BbC7Cec` |
| DN/wCTC Pool | `0xb32f8487d54bE5D2C8Eb3766a5639c113aC8FABb` |
| 초기 유동성 | 1,000 wCTC + 1,000 DN |
| 테스트 스왑 | 10 wCTC → 9.85 DN (1.5% slippage) |
| Fee | Dynamic 0.05%~1% |

---

### 3. DN Token Morpho 담보 대출

DN 토큰을 SnowballLend(Morpho Blue fork)에서 담보로 사용하여 sbUSD 대출.

| 항목 | 값 |
|------|-----|
| DN Oracle | `0xcd240E13ec3c33fE73d0c5C3196F9d9179008965` (1:1 sbUSD) |
| Market ID | `0x2e41beddb531dab95695661b4473e1bc49454763eb6b1d7dedcbf847dbc76da2` |
| LLTV | 80% |
| 테스트 | 100 DN 담보 → 50 sbUSD 대출 성공 |

---

### 4. Docs 정리

| 작업 | 내용 |
|------|------|
| Legacy 이동 | DESIGN_TOKENOMICS, FRONTEND_*, v0.1.0/ → `docs/legacy/` |
| SSOT_USC.md | USC 아키텍처, SDK, PoC 결과, Snowball 활용 방안 |
| INDEX.md | 새 문서 등록, 날짜 업데이트 |
| OPERATIONS.md | 운영 상태 업데이트 |
| morpho.json | DN/sbUSD 마켓 추가 |
| usc-bridge.json | DN Token, DEX 풀 정보 추가 |

---

### 5. USC 아키텍처 정리

- **현재 테스트넷**: cc3-testnet(102031)과 usc-testnet(102036)은 별개 체인
- **Mainnet 계획**: USC precompile이 Creditcoin mainnet에 통합 → 하나의 체인에서 DEX + Lend + Bridge 전부 동작
- **현재 PoC 의미**: Mainnet 통합 시 즉시 사용 가능한 프로토타입

---

### 6. ERC-8004 신용 시스템 — 설계 논의

#### 핵심 설계 원칙

- **Additive 모델**: 신용은 필수가 아닌 옵션. 없어도 기본 대출 가능, 있으면 더 좋은 조건
- **1회성 Import**: USC 외부 이력 검증은 한 번만 → ERC-8004에 영구 기록, 이후 USC 불필요
- **종속성 제거**: USC에 종속되지 않는 구조

#### 계획된 구조

```
신용 축적 (Input):
  Snowball 활동 → recordInteraction(agentId, tag, success)
  USC 외부 이력 → 1회 검증 후 보너스 점수

ERC-8004 ReputationRegistry:
  Agent ID (NFT) → 태그별 성공률, 점수 추적

신용 소비 (Output):
  Lend → 신용 좋으면 LLTV 상향 (80% → 85%) / 금리 할인
```

#### 미구현 — 다음 세션에서 진행

---

### 커밋 로그

```
5344249 docs: organize legacy docs, add SSOT_USC with PoC results
1720593 feat: add USC bridge package — DN Token burn-and-mint PoC
38946bb feat: add yield vault frontend, deployment configs, and onchain test scripts
fa21450 feat: add DN token to Snowball ecosystem — DEX pool + Morpho collateral
```

### 전체 플로우 (검증 완료)

```
Ethereum(Sepolia) DN burn
    ↓ USC 증명
Creditcoin DN mint
    ↓
Snowball DEX: DN/wCTC 거래 ✅
    ↓
Snowball Lend: DN 담보 대출 ✅
    ↓ (다음)
ERC-8004: 활동 기반 신용 시스템
```
