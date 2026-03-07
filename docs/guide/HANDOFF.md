# Snowball Protocol — 인수인계 문서

> **작성일**: 2026-03-04
> **최종 업데이트**: 2026-03-04 (운영 가능 상태)
> **대상**: 다음 개발자
> **네트워크**: Creditcoin Testnet (Chain ID: 102031)
> **상태**: **운영 중** — 유동성 시딩 완료, Keeper 가동 가능

---

## 1. 프로젝트 개요

Snowball은 Creditcoin 위에서 작동하는 통합 DeFi 프로토콜입니다.

**핵심 플로우**: CTC 담보 → sbUSD 대출 → AI Agent 자동 관리 (청산 리스크 감소 + 수익 극대화)

### 프로토콜 스택

| 레이어 | 기술 | 역할 |
|--------|------|------|
| **Liquity V2** | CDP 엔진 | wCTC/lstCTC 담보 → sbUSD 발행 |
| **Morpho Blue** | 대출 프로토콜 | sbUSD/wCTC/lstCTC/USDC 시장 |
| **SnowballOracle** | 통합 오라클 | 단일 가격 소스 → 어댑터 패턴 |
| **InterestRouter** | 이자 분배기 | Liquity 이자 → 70% Morpho / 30% Treasury |
| **SnowballRouter** | 크로스 프로토콜 라우터 | 대출→공급/스왑 단일 트랜잭션 |
| **Yield Vault V2** | ERC-4626 수익 볼트 | 자동 전략 운영 (Morpho/StabilityPool/Leverage) |
| **SnowballKeeper** | 자동화 수확 | 등록된 전략 주기적 harvest |

---

## 2. 현재 운영 상태

### 유동성 현황 (2026-03-04 시딩 완료)

| 구성요소 | 상태 | 세부 |
|----------|------|------|
| wCTC Trove | **활성** | 100K wCTC 담보 → 9K sbUSD 발행 |
| lstCTC Trove | **활성** | 100K lstCTC 담보 → 8K sbUSD 발행 |
| Morpho wCTC/sbUSD | **활성** | 6K sbUSD 공급 (대출 유동성) |
| Morpho lstCTC/sbUSD | **활성** | 5K sbUSD 공급 |
| Morpho sbUSD/USDC | **활성** | 10K USDC 공급 |
| sv2SbUSD-SP | **활성** | 500 sbUSD (StabilityPool 전략) |
| sv2SbUSD-M | **활성** | 500 sbUSD (Morpho 전략) |
| sv2wCTC-Loop2 | **활성** | 5,000 wCTC (레버리지 전략, 2x) |
| Keeper | **배포 완료** | 6개 전략 등록, 4시간 간격 |
| Backend Oracle | **구현 완료** | wCTC/lstCTC/sbUSD 멀티에셋 |

### 알려진 이슈

| 항목 | 상태 | 설명 |
|------|------|------|
| sv2wCTC-M | **비작동** | StrategyWCTCMorpho가 `supply()` 호출 — loanToken(sbUSD)을 넣어야 하는데 wCTC를 넣으려 함. wCTC가 loanToken인 마켓이 필요 |
| sv2USDC-M | **0 잔액** | USDC가 Morpho에 직접 공급됨 (볼트 경유 아님) |
| sv2wCTC-Loop (v1) | **구버전** | 오라클 가격 변환 버그 있는 전략. 48h 타임락으로 업그레이드 불가 → sv2wCTC-Loop2로 교체 |

---

## 3. 저장소 구조

```
snowball/
├── packages/
│   ├── liquity/           # Liquity V2 포크 (CDP, sbUSD)
│   │   ├── contracts/src/ # 원본 컨트랙트 (Forge 빌드)
│   │   ├── contracts/interfaces/ # 간소화 인터페이스
│   │   └── test/foundry/  # Foundry 테스트
│   ├── morpho/            # Morpho Blue 포크 (Lending)
│   │   ├── src/morpho-blue/    # Morpho Blue 코어
│   │   ├── src/metamorpho/     # MetaMorpho 볼트
│   │   ├── src/morpho-blue-irm/ # Adaptive IRM
│   │   └── src/adapters/       # 오라클 어댑터
│   ├── integration/       # 통합 레이어
│   │   ├── src/oracle/    # SnowballOracle + 어댑터
│   │   ├── src/interest/  # SnowballInterestRouter
│   │   ├── src/router/    # SnowballRouter
│   │   └── scripts/       # deploy-all.ts, seed-liquidity.ts 등
│   ├── yield/             # 수익 볼트 + 전략
│   │   ├── src/SnowballYieldVaultV2.sol  # ERC-4626 볼트
│   │   ├── src/SnowballKeeper.sol        # 자동화 수확
│   │   ├── src/SnowballStrategyBase.sol  # 전략 베이스
│   │   └── src/strategies/               # 개별 전략들
│   ├── erc-8004/          # 에이전트 신원/평판 시스템
│   ├── aave-credit-import/ # Aave 크레딧 임포트
│   └── frontend/          # React 프론트엔드
├── backend/               # Python 백엔드
│   └── app/oracle/        # 오라클 자동화 서비스
├── deployments/creditcoin-testnet/  # 배포 주소 JSON
└── docs/                  # 문서
```

---

## 4. 최신 배포 주소 (2026-03-04)

### 토큰

| 토큰 | 주소 |
|------|------|
| wCTC | `0xca69344e2917f026ef4a5ace5d7b122343fc8528` |
| lstCTC | `0xa768d376272f9216c8c4aa3063391bdafbcad4c2` |
| sbUSD | `0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5` |
| MockUSDC | `0x60e204104cfe1a93f630ea5ebc0a895cc80ebed9` |

### 통합 오라클

| 컨트랙트 | 주소 |
|----------|------|
| SnowballOracle | `0x7d491965d4f6db51762e226a438b2a1bd30c289e` |
| LiquityAdapter (wCTC) | `0xa4ab0c8f1536286d8d08b98d9c600c3771b9bbe8` |
| LiquityAdapter (lstCTC) | `0xd04b3b01d4d11d406946859b46fc4dbef9e91e75` |
| MorphoAdapter (wCTC) | `0x583484b577ab8b121f7231f54d64fd34363f2629` |
| MorphoAdapter (lstCTC) | `0x56c5412a27639db62391d2cc9f26549d4b3c001d` |
| MorphoAdapter (sbUSD) | `0x2983b5292d6b2e5b8c3013ecb74fd21f73e10596` |

### Liquity V2

| 컨트랙트 | wCTC Branch | lstCTC Branch |
|----------|-------------|---------------|
| AddressesRegistry | `0xb72e9cc79297439356c805b29c8b82566f19ca81` | `0x0bf00e8823db7debfcb6326cc13c41ecb8eb2a43` |
| BorrowerOperations | `0xa838b2f39ba9948c58c78ccfd0a68dbf47ff3f74` | `0x74b55804e08bf77dcc01aa1a7267fe3e996d49fd` |
| TroveManager | `0x2d25ae6834eea37a78006fbfaf034e9fec131caa` | `0xaf245ea69e255062f2e6f2a3e5b838fbb56d3f25` |
| StabilityPool | `0xee8c9d693dcc0b22a942d738f35ecd7c98eb583c` | `0x4776f441b102c40e092fc3ce2304433693783c8c` |
| ActivePool | `0x40d18ac73c89a056859fab8584c41803276d45b1` | `0xf1d7375fece5c42c44897be9a6ea98f1d72d3e94` |
| CollateralRegistry | `0x7bcf43cfd154fc97f06cb9c5dbf370b6c0164bbd` | (shared) |
| AgentVault | `0x257c42e37915438e6def4a59ef0f880bc536ce77` | (shared) |

### Morpho Blue

| 컨트랙트 | 주소 |
|----------|------|
| Morpho | `0x15acf5bc0e83cd097300810b1b3d5ae27520b832` |
| AdaptiveCurveIRM | `0x944c30109b57d5ae79b0f89beb111bece5b925e5` |
| MetaMorphoFactory | `0xa68762e40c5146cb54492cee1a9a7645243e7bb8` |

### Morpho 마켓

| 마켓 | LoanToken | Collateral | LLTV | Oracle |
|------|-----------|------------|------|--------|
| wCTC/sbUSD | sbUSD | wCTC | 77% | `0x583484...` |
| lstCTC/sbUSD | sbUSD | lstCTC | 80% | `0x56c541...` |
| sbUSD/USDC | USDC | sbUSD | 86% | `0x2983b5...` |

### Integration

| 컨트랙트 | 주소 |
|----------|------|
| InterestRouter | `0xee7b6be80864f362c44d0029dacecc94b3600204` |
| SnowballRouter | `0xd236a628d3cedee4a8e1da6936972ae77750725d` |

### Yield Vault V2

| 볼트 | Vault 주소 | Strategy 주소 | Want | 프로토콜 |
|------|------------|---------------|------|----------|
| sv2SbUSD-SP | `0xbb5e80...` | `0xc1d613...` | sbUSD | Liquity StabilityPool |
| sv2SbUSD-M | `0x2bd032...` | `0x50f03d...` | sbUSD | Morpho Blue |
| sv2USDC-M | `0x19ebca...` | `0x058d9f...` | USDC | Morpho Blue |
| sv2wCTC-M | `0xa5b67e...` | `0xa1fd01...` | wCTC | Morpho Blue (비작동) |
| sv2wCTC-Loop2 | `0x622420...` | `0xcbebc3...` | wCTC | Morpho Leverage v2 |

### Keeper

| 항목 | 값 |
|------|---|
| 주소 | `0x957c3733fd5420ff7e431fe527d061e14b718de1` |
| harvest 간격 | 14,400초 (4시간) |
| 등록 전략 수 | 6개 |

> 전체 주소: `deployments/creditcoin-testnet/{integration,liquity,morpho,yield}.json`

---

## 5. 핵심 아키텍처 결정 사항

### 통합 오라클 패턴

```
SnowballOracle (단일 가격 소스)
    ├── OPERATOR_ROLE → 가격 업데이트 (멀티에셋: wCTC, lstCTC, sbUSD)
    ├── LiquityPriceFeedAdapter → IPriceFeed 인터페이스
    │   └── fetchPrice() → (price, oracleFailure)
    │   └── 스테일 시 lastGoodPrice 캐시 반환
    └── MorphoOracleAdapter → IOracle 인터페이스
        └── price() → 1e36 스케일
        └── 스테일 시 revert (strict)
```

### Liquity V2 배포 패턴

원본 Liquity V2는 **nonce 기반 주소 선계산** 패턴을 사용합니다:
1. AddressesRegistry 배포 (7 param constructor)
2. `setAddresses(AddressVars)` 호출 — 선계산된 주소로 18-field struct 전달
3. 컨트랙트를 정확한 nonce 순서로 배포 (생성자에서 registry 읽기)
4. `setAddresses`는 ownership을 포기하므로 **1회만 호출 가능**

> `deploy-all.ts`가 이 패턴을 정확히 구현합니다. `viem.getContractAddress()`로 주소 선계산.

### Liquity Gas Compensation

**중요**: `ETH_GAS_COMPENSATION = 0.2 ether`는 **항상 WETH(=wCTC)**로 지불됩니다.
lstCTC 브랜치에서 트로브를 열 때도 wCTC가 gasPool로 전송됩니다.
→ lstCTC BO에 대해서도 반드시 wCTC approve가 필요합니다.

```solidity
// BorrowerOperations.sol:376
WETH.transferFrom(msg.sender, gasPoolAddress, ETH_GAS_COMPENSATION);
```

### InterestRouter 분배

```
Liquity ActivePool → sbUSD 이자 mint → InterestRouter
    ├── 70% → Morpho (morphoTarget)
    └── 30% → Treasury
    └── 최소 100 sbUSD 이상일 때 분배 실행
```

### Yield Vault V2 아키텍처

```
SnowballYieldVaultV2 (ERC-4626)
    ├── deposit(assets, receiver) → strategy._deposit()
    ├── withdraw(assets, receiver, owner) → strategy._withdraw()
    ├── setStrategy() → 전략 없을 때만 (최초 설정)
    ├── proposeStrat() + upgradeStrat() → 48시간 타임락
    └── retireStrat() → 기존 전략 자금 회수

SnowballKeeper
    ├── harvestAll() → 등록된 모든 전략 harvest
    ├── harvest(strategy) → 단일 전략 harvest
    ├── harvestInterval → 4시간 (너무 잦은 수확 방지)
    └── onlyKeeper 접근제어 (봇 EOA 설정)
```

### StrategyWCTCLoop (레버리지 전략)

```
wCTC 입금 → Morpho 담보 공급 → sbUSD 대출 → sbUSD 공급 (이자 수익)
수익 = (공급 APY × 레버리지) - (대출 APY × (레버리지-1))
기본 2x, 최대 4x, 안전 마진 5% (LLTV 기준)
```

**오라클 가격 변환 (수정 완료)**:
```solidity
// 담보 단위를 대출 토큰 가치로 변환 (1e36 스케일)
uint256 oraclePrice = IOracle(collateralMarket.oracle).price();
uint256 collValueInLoan = (uint256(collateral) * oraclePrice) / 1e36;
```

---

## 6. 배포 & 운영 스크립트

### 전체 재배포

```bash
cd packages/integration
npx tsx scripts/deploy-all.ts
```

모든 컨트랙트를 의존성 순서로 배포:
토큰 → 오라클 → 어댑터 → Morpho → InterestRouter → Liquity → Router → MetaMorpho → Yield V2 → Keeper → AgentVault

### 유동성 시딩

```bash
# 1차 시딩 (트로브 + Morpho 공급 + Vault 예치)
npx tsx scripts/seed-liquidity.ts

# 2차 시딩 (lstCTC 트로브 + 추가 Morpho)
npx tsx scripts/seed-round2.ts
```

### 개별 배포

```bash
# Loop 볼트 v2 (레버리지 전략)
npx tsx scripts/deploy-loop-v2.ts

# Integration만 (기존 liquity.json + morpho.json 필요)
npx tsx scripts/deploy-viem.ts
```

### 빌드

```bash
cd packages/integration && forge build
cd packages/liquity && forge build
cd packages/morpho && forge build
cd packages/yield && forge build   # 25/25 tests pass
```

---

## 7. 백엔드 서비스

### 오라클 자동화 (`backend/app/oracle/`)

멀티에셋 가격 푸시: wCTC, lstCTC, sbUSD를 SnowballOracle에 업데이트.

```bash
cd backend && python -m uvicorn app.main:app --reload
```

**필수 환경변수** (`.env`):
```
ORACLE_ADDRESS=0x7d491965d4f6db51762e226a438b2a1bd30c289e
WCTC_ADDRESS=0xdb5c8e9d0827c474342bea03e0e35a60d621afea
LSTCTC_ADDRESS=0x47ad69498520edb2e1e9464fedf5309504e26207
SBUSD_ADDRESS=0xa3f694307f500fe5cb7b6fb8e758e43f96ffb027
CTC_PRICE_OVERRIDE=0.20          # 테스트넷용 고정 가격 (0이면 실시간)
LSTCTC_PREMIUM=1.05              # lstCTC = wCTC × 1.05
```

### Keeper 수확 (`backend/app/keeper/`)

등록된 전략에 대해 주기적으로 `harvestAll()` 호출.

```
KEEPER_ADDRESS=0x957c3733fd5420ff7e431fe527d061e14b718de1
KEEPER_INTERVAL=14400            # 4시간
```

---

## 8. 환경 설정

### 필수 환경변수 (`.env`)

```
DEPLOYER_PRIVATE_KEY=0x...       # 배포자 프라이빗 키
OPERATOR_ADDRESS=0x...            # 오라클 가격 업데이트 권한
TREASURY_ADDRESS=0x...            # 이자 분배 수신자 (기본=deployer)
```

### 의존성

- **Node.js**: v18+
- **Forge/Foundry**: Solidity 0.8.24, EVM cancun
- **pnpm**: 워크스페이스 관리
- **Python**: 3.11+ (백엔드)

### RPC

```
Creditcoin Testnet: https://rpc.cc3-testnet.creditcoin.network
Explorer: https://creditcoin-testnet.blockscout.com
Chain ID: 102031
```

---

## 9. 완료된 작업

### 단기 (모두 완료)

| 항목 | 상태 | 설명 |
|------|------|------|
| MetaMorphoFactory | **배포 완료** | gas 30M으로 해결 → `0xa68762...` |
| AgentVault | **배포 완료** | contracts/src/로 이동 후 컴파일 → `0x257c42...` |
| 토큰 Faucet | **수정 완료** | 100K × 10회 루프 (1M 토큰 획득) |
| 오라클 운영 자동화 | **구현 완료** | 멀티에셋 push_prices() (wCTC, lstCTC, sbUSD) |

### 중기 (모두 완료)

| 항목 | 상태 | 설명 |
|------|------|------|
| Yield Vault V2 | **배포 완료** | ERC-4626 기반, 6개 볼트 배포 |
| SnowballKeeper | **배포 완료** | 6개 전략 등록, 4시간 간격 |
| Yield Loop 전략 | **배포 완료** | StrategyWCTCLoop v2 (오라클 가격 변환 수정) |
| 유동성 시딩 | **완료** | 트로브 2개 + Morpho 3마켓 + Vault 3개 |

---

## 10. 남은 작업

### 단기

| 항목 | 설명 |
|------|------|
| sv2wCTC-M 수정 | wCTC가 loanToken인 마켓 생성 또는 supplyCollateral 전략으로 변경 |
| sv2wCTC-Loop (v1) 정리 | 48시간 후 proposeStrat → upgradeStrat 또는 자금 0이면 방치 |
| Keeper EOA 설정 | Keeper 컨트랙트에 봇 EOA를 keeper로 등록 (`setKeeper(bot, true)`) |
| 프론트엔드 볼트 연동 | Vault V2 주소 + ABI를 frontend에 연결 |

### 중기

| 항목 | 설명 |
|------|------|
| ERC-8004 크레딧 시스템 | 평판 기반 대출 조건 개선 |
| AgentVault 통합 | 에이전트가 Keeper 경유로 전략 실행 |
| Algebra DEX 복구 | 레거시 DEX 코드 정리 후 재통합 (현재 삭제됨) |

### 장기

| 항목 | 설명 |
|------|------|
| SNOW 토큰 + veSNOW 거버넌스 | Buyback & Burn + Utility 모델 |
| Flash Loan 청산 | 외부 유동성 활용 청산 |
| 크로스체인 USC 통합 | 브릿지 PoC 기반 프로덕션 구현 |
| 메인넷 마이그레이션 | Creditcoin Mainnet 배포 + 실가격 오라클 연동 |

---

## 11. 주의사항

1. **AddressesRegistry는 1회용**: `setAddresses()` 호출 후 ownership 포기됨. 수정 불가, 재배포만 가능.
2. **nonce 순서 엄격**: Liquity 배포 시 컨트랙트 배포 순서가 선계산된 주소와 정확히 일치해야 함.
3. **Gas Compensation = wCTC**: lstCTC 브랜치에서도 gas compensation(200 wCTC)은 WETH(=wCTC)로 지불. 별도 approve 필요.
4. **오라클 스테일니스**: maxPriceAge=120초. 트로브 열기/Morpho 조작 직전에 반드시 가격 갱신.
5. **Vault 전략 변경 타임락**: `proposeStrat()` → 48시간 대기 → `upgradeStrat()`. 긴급 시 새 Vault 배포.
6. **Morpho supply() vs supplyCollateral()**: `supply()`는 loanToken 예치, `supplyCollateral()`은 담보 예치. 혼동 주의.
7. **오라클 1e36 스케일**: MorphoAdapter의 `price()`는 1e36 기준. 담보→대출 가치 변환 시 `/ 1e36`.

---

## 12. 빠른 시작 (새 개발자)

```bash
# 1. 저장소 클론 & 의존성 설치
git clone <repo> && cd snowball
pnpm install

# 2. .env 설정
cp .env.example .env
# DEPLOYER_PRIVATE_KEY 설정 + 오라클/토큰 주소 추가

# 3. 빌드
cd packages/integration && forge build
cd packages/liquity && forge build
cd packages/morpho && forge build
cd packages/yield && forge build

# 4. 테스트
cd packages/yield && forge test -vvv   # 25 tests

# 5. 배포 (선택 — 현재 배포가 이미 운영 중)
cd packages/integration && npx tsx scripts/deploy-all.ts

# 6. 유동성 시딩
npx tsx scripts/seed-liquidity.ts
npx tsx scripts/seed-round2.ts
npx tsx scripts/deploy-loop-v2.ts

# 7. 문서 읽기 순서
# docs/PROJECT_OVERVIEW.md → HANDOFF.md → OPERATIONS.md → SSOT_*.md
```

---

## 13. SSOT 문서 목록

| 문서 | 경로 | 내용 |
|------|------|------|
| **SSOT_LIQUITY** | `docs/SSOT_LIQUITY.md` | Liquity V2 주소, 토큰, 브랜치, 수학 공식 |
| **SSOT_MORPHO** | `docs/SSOT_MORPHO.md` | Morpho Blue 주소, 마켓, 오라클, ABI |
| **SSOT_ERC8004** | `docs/SSOT_ERC8004.md` | ERC-8004 에이전트 ID/평판 시스템 |
| **SSOT_USC** | `docs/SSOT_USC.md` | USC 크로스체인 오라클, 브릿지 PoC |
| **PROJECT_OVERVIEW** | `docs/PROJECT_OVERVIEW.md` | 전체 아키텍처, 기술 스택 |
| **OPERATIONS** | `docs/OPERATIONS.md` | 운영 플로우, 배포, 모니터링 |
| **PROTOCOL_INTEGRATION_REPORT** | `docs/PROTOCOL_INTEGRATION_REPORT.md` | 통합 분석, 4단계 로드맵 |
