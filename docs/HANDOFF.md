# Snowball Protocol — 인수인계 문서

> **작성일**: 2026-03-04
> **대상**: 다음 개발자
> **네트워크**: Creditcoin Testnet (Chain ID: 102031)

---

## 1. 프로젝트 개요

Snowball은 Creditcoin 위에서 작동하는 통합 DeFi 프로토콜입니다.

**핵심 플로우**: CTC 담보 → sbUSD 대출 → AI Agent 자동 관리 (청산 리스크 감소 + 수익 극대화)

### 프로토콜 스택

| 레이어 | 기술 | 역할 |
|--------|------|------|
| **Liquity V2** | CDP 엔진 | wCTC/lstCTC 담보 → sbUSD 발행 |
| **Morpho Blue** | 대출 프로토콜 | sbUSD/wCTC/lstCTC 시장 |
| **Algebra V4** | DEX | 토큰 스왑, 유동성 풀 |
| **SnowballOracle** | 통합 오라클 | 단일 가격 소스 → 어댑터 패턴 |
| **InterestRouter** | 이자 분배기 | Liquity 이자 → 70% Morpho / 30% Treasury |
| **SnowballRouter** | 크로스 프로토콜 라우터 | 대출→공급/스왑 단일 트랜잭션 |

---

## 2. 저장소 구조

```
snowball/
├── packages/
│   ├── liquity/           # Liquity V2 포크 (CDP, sbUSD)
│   │   ├── contracts/src/ # 원본 컨트랙트 (Forge 빌드)
│   │   ├── contracts/interfaces/ # 간소화 인터페이스 (타 패키지 참조용)
│   │   └── scripts/       # 배포 스크립트 (개별 + deploy-all에서 통합)
│   ├── morpho/            # Morpho Blue 포크 (Lending)
│   │   ├── src/morpho-blue/    # Morpho Blue 코어
│   │   ├── src/metamorpho/     # MetaMorpho 볼트
│   │   ├── src/morpho-blue-irm/ # Adaptive IRM
│   │   └── src/adapters/       # 오라클 어댑터
│   ├── integration/       # 통합 레이어 (오라클, 라우터, 이자분배)
│   │   ├── src/oracle/    # SnowballOracle + 어댑터
│   │   ├── src/interest/  # SnowballInterestRouter
│   │   ├── src/router/    # SnowballRouter
│   │   └── scripts/       # deploy-viem.ts, deploy-all.ts
│   ├── yield/             # 수익 볼트 전략
│   ├── oracle/            # BTC Mock Oracle (레거시)
│   ├── erc-8004/          # 에이전트 신원/평판 시스템
│   ├── aave-credit-import/ # Aave 크레딧 임포트
│   └── frontend/          # React 프론트엔드
├── deployments/creditcoin-testnet/  # 배포 주소 JSON
├── docs/                  # 문서
│   ├── SSOT_*.md          # Single Source of Truth (프로토콜별)
│   ├── INDEX.md           # 문서 인덱스
│   ├── PROJECT_OVERVIEW.md # 아키텍처 개요
│   ├── PROTOCOL_INTEGRATION_REPORT.md # 통합 분석 보고서
│   └── legacy/            # 아카이브 문서
└── .env                   # 환경변수 (DEPLOYER_PRIVATE_KEY)
```

---

## 3. 최신 배포 주소 (2026-03-04)

### 통합 오라클

| 컨트랙트 | 주소 |
|----------|------|
| SnowballOracle | `0x581668e3c2174a60840cdf98517c43e5b526ec53` |
| LiquityAdapter (wCTC) | `0x297bffc0cdf7d5c066346ae00d995b8cbad4db07` |
| LiquityAdapter (lstCTC) | `0x549bfe594f0a5fa1eb69d472c66ff0a0763aebf2` |
| MorphoAdapter (wCTC) | `0xdaf918ed52a4050210d47319fa2f1c6a8eb0dc0c` |
| MorphoAdapter (lstCTC) | `0x0c0034aed8da86e5b7d8f8874e6add60abf22acb` |
| MorphoAdapter (sbUSD) | `0xcbe23912139d21f4901f2bda4d921a8b95507e6e` |

### 토큰

| 토큰 | 주소 |
|------|------|
| wCTC | `0xfe5cfe04d195d769a71fde671202762f3359ca6e` |
| lstCTC | `0x76cfc24e19791c4bc0edda3ecf33dc8b3bf37d11` |
| sbUSD | `0x29eb846b7249b411d89806fcfdcdbf3a58e8f236` |
| MockUSDC | `0x1f76a2c43f4420b6e61b6b83c7ffd9360cef92d3` |

### Liquity V2

| 컨트랙트 | wCTC Branch | lstCTC Branch |
|----------|-------------|---------------|
| BorrowerOperations | `0xf513b271f4a42e8663ebbaf155815a6077cb7fb7` | `0x2f57d2396fb3f2f0f4bd4fe4a497e10d587ae65f` |
| TroveManager | `0x2cb86ade3d0d0de0d4a7eeb52028ffdaf4ddd468` | `0xef756e28c0c8e8e7dd277bb418598aa6c2bb920d` |
| StabilityPool | `0x418dbaa7efe71e315e5d77625d6afcc3c98f21f5` | `0xb77e5dee8daf876457b3e4abf65278c0975c7340` |
| ActivePool | `0x7348d410bd7185236599fb7dffb96c0fab64c750` | `0xb291f805f165a203f879ef5f82c8d56ce3282a49` |
| CollateralRegistry | `0x579f603c5915b2f386cdec03f38f31bc7e241065` | (shared) |

### Morpho Blue

| 컨트랙트 | 주소 |
|----------|------|
| Morpho | `0xd68a8b2a77a23f33072dc61780322be7e6314168` |
| AdaptiveCurveIRM | `0x7f636314430469864df322a47327d8bed418dac1` |

### Integration

| 컨트랙트 | 주소 |
|----------|------|
| InterestRouter | `0x9525f5deccdd9d4db922a8acba08ac57cdb279a6` |
| SnowballRouter | `0x03334ded84b44525601dd2c11a7b4cc6354bad22` |

> 전체 주소: `deployments/creditcoin-testnet/{integration,liquity,morpho}.json`

---

## 4. 핵심 아키텍처 결정 사항

### 통합 오라클 패턴

```
SnowballOracle (단일 가격 소스)
    ├── OPERATOR_ROLE → 가격 업데이트
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

### InterestRouter 분배

```
Liquity ActivePool → sbUSD 이자 mint → InterestRouter
    ├── 70% → Morpho (morphoTarget)
    └── 30% → Treasury
    └── 최소 100 sbUSD 이상일 때 분배 실행
```

---

## 5. SSOT 문서 목록

| 문서 | 경로 | 내용 |
|------|------|------|
| **SSOT_LIQUITY** | `docs/SSOT_LIQUITY.md` | Liquity V2 주소, 토큰, 브랜치, 수학 공식 |
| **SSOT_MORPHO** | `docs/SSOT_MORPHO.md` | Morpho Blue 주소, 마켓, 오라클, ABI |
| **SSOT_ALGEBRA** | `docs/SSOT_ALGEBRA.md` | Algebra V4 DEX 주소, 풀 |
| **SSOT_ERC8004** | `docs/SSOT_ERC8004.md` | ERC-8004 에이전트 ID/평판 시스템 |
| **SSOT_USC** | `docs/SSOT_USC.md` | USC 크로스체인 오라클, 브릿지 PoC |
| **PROJECT_OVERVIEW** | `docs/PROJECT_OVERVIEW.md` | 전체 아키텍처, 기술 스택 |
| **OPERATIONS** | `docs/OPERATIONS.md` | 운영 플로우, 배포, 모니터링 |
| **PROTOCOL_INTEGRATION_REPORT** | `docs/PROTOCOL_INTEGRATION_REPORT.md` | 통합 분석, 4단계 로드맵 |
| **DEPLOY_ADDRESSES_UPDATE** | `docs/DEPLOY_ADDRESSES_UPDATE.md` | DEX/Yield Vault 주소, 테스트 결과 |

---

## 6. 빌드 & 배포 방법

### 빌드

```bash
# Integration (Oracle, Router, InterestRouter)
cd packages/integration && forge build

# Liquity V2
cd packages/liquity && forge build

# Morpho Blue
cd packages/morpho && forge build
```

### 전체 재배포

```bash
# .env에 DEPLOYER_PRIVATE_KEY 필요
cd packages/integration
npx tsx scripts/deploy-all.ts
```

이 스크립트가 **모든 컨트랙트를 올바른 의존성 순서로** 배포합니다:
1. 토큰 → 2. 오라클 → 3. 어댑터 → 4. Morpho → 5. InterestRouter → 6. Liquity → 7. Router

### 개별 배포 (Integration만)

```bash
# 기존 liquity.json + morpho.json 필요
npx tsx scripts/deploy-viem.ts
```

---

## 7. 남은 작업 (미완료)

### 단기 (이번 배포 후속)

| 항목 | 상태 | 설명 |
|------|------|------|
| MetaMorphoFactory | 미배포 | 가스 추정 실패 — 컨트랙트 크기 최적화 또는 가스 리밋 증가 필요 |
| AgentVault | 미배포 | 컴파일 아티팩트 없음 — contracts/src에 소스 코드 확인 필요 |
| 토큰 Faucet | 미동작 | MockWCTC.faucet() 가스 한도 조정 필요 |
| 오라클 운영 자동화 | 미구현 | OPERATOR_ROLE로 주기적 가격 업데이트 Bot 필요 |

### 중기 (PROTOCOL_INTEGRATION_REPORT 참조)

| 항목 | 상태 | 설명 |
|------|------|------|
| Yield Vault ERC-4626 업그레이드 | 설계 완료 | 현재 Beefy V7 → 표준 ERC-4626 전환 |
| SmartAccount 에이전트 위임 | 설계 완료 | 에이전트가 직접 트랜잭션 실행 (4 신규 + 6 수정) |
| ERC-8004 크레딧 시스템 구현 | 설계 완료 | 평판 기반 대출 조건 개선 |
| Yield 루프 | 미설계 | Ethena-Pendle-Aave 패턴 적용 |

### 장기

| 항목 | 설명 |
|------|------|
| SNOW 토큰 + veSNOW 거버넌스 | Buyback & Burn + Utility 모델 (DESIGN_TOKENOMICS_V2.md) |
| Flash Loan 청산 | 외부 유동성 활용 청산 |
| 크로스체인 USC 통합 | 브릿지 PoC 기반 프로덕션 구현 |

---

## 8. 환경 설정

### 필수 환경변수 (`.env`)

```
DEPLOYER_PRIVATE_KEY=0x...    # 배포자 프라이빗 키
OPERATOR_ADDRESS=0x...         # 오라클 가격 업데이트 권한 (선택)
TREASURY_ADDRESS=0x...         # 이자 분배 수신자 (선택, 기본=deployer)
```

### 의존성

- **Node.js**: v18+ (v25 경고 있지만 동작)
- **Forge/Foundry**: Solidity 0.8.24, EVM cancun
- **pnpm**: 워크스페이스 관리

### RPC

```
Creditcoin Testnet: https://rpc.cc3-testnet.creditcoin.network
Explorer: https://creditcoin-testnet.blockscout.com
Chain ID: 102031
```

---

## 9. 주의사항

1. **AddressesRegistry는 1회용**: `setAddresses()` 호출 후 ownership 포기됨. 수정 불가, 재배포만 가능.
2. **nonce 순서 엄격**: Liquity 배포 시 컨트랙트 배포 순서가 선계산된 주소와 정확히 일치해야 함.
3. **MetadataNFT**: 현재 `address(0)` 설정. TroveNFT.tokenURI() 호출 시 revert. 필요하면 MockMetadataNFT 배포 후 재배포.
4. **오라클 스테일니스**: maxPriceAge=120초. 운영 환경에서는 자동 업데이트 봇 필수.
5. **MockOracle vs SnowballOracle**: 이전 배포는 MockOracle 사용. 이번 배포부터 통합 SnowballOracle 사용.

---

## 10. 빠른 시작 (새 개발자)

```bash
# 1. 저장소 클론 & 의존성 설치
git clone <repo> && cd snowball
pnpm install

# 2. .env 설정
cp .env.example .env
# DEPLOYER_PRIVATE_KEY 설정

# 3. 빌드
cd packages/integration && forge build
cd packages/liquity && forge build
cd packages/morpho && forge build

# 4. 테스트
cd packages/integration && forge test -vvv
cd packages/liquity && forge test -vvv

# 5. 배포 (선택)
cd packages/integration && npx tsx scripts/deploy-all.ts

# 6. 문서 읽기 순서
# docs/PROJECT_OVERVIEW.md → docs/PROTOCOL_INTEGRATION_REPORT.md → docs/SSOT_*.md
```
