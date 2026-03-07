# 전체 프로토콜 재배포 - v0.12.0

## 문제 정의

### 현상

Liquity 프로토콜이 **자체 mock 토큰**으로 배포되어 있어 DEX/Morpho 생태계와 완전히 단절됨.

| 항목 | Liquity 토큰 | DEX/Morpho 토큰 |
|------|-------------|-----------------|
| wCTC | `0x8f7f60A0...` (price $0.20) | `0xdb5c8e9d...` (price $5.00) |
| sbUSD | Liquity 자체 민팅 | `0x5772f9...` |
| owner | `0xf00F6c...` (원 개발자) | `0xf00F6c...` (원 개발자) |

추가 문제:
- 모든 토큰의 `mint` / `setBranchAddresses` 권한이 원 개발자(`0xf00F6c...`)에게만 있음
- 시뮬레이션 계정 deployer(`0xE550Af...`)가 토큰 민팅 불가
- Liquity의 ETH_GAS_COMPENSATION이 200 CTC로 테스트넷에서 과도하게 높음
- DEX 풀 4개 중 1개만 유동성 보유, 나머지 빈 상태

### 원인

- 원 개발자가 Liquity를 독립적으로 배포하면서 별도 mock 토큰 생성
- DEX/Morpho는 다른 배포 세션에서 별도 토큰으로 배포
- 토큰 간 통합 없이 각 프로토콜이 독립적으로 운영

### 영향

- **DeFi 플로우 불가**: CTC → wCTC → Liquity Trove → sbUSD → Morpho Supply 흐름이 끊김
- **시뮬레이션 불가**: defi-simulation 스킬로 Liquity 테스트 불가 (토큰 불일치)
- **프론트엔드 불일치**: addresses.ts의 Liquity 주소가 실제 작동하는 컨트랙트와 다름
- **데모 불가**: 투자자/사용자에게 통합 DeFi 데모를 보여줄 수 없음

### 목표

1. **통합 토큰 시스템**: 모든 프로토콜이 동일한 wCTC/lstCTC/sbUSD/USDC 사용
2. **완전한 DeFi 플로우**: Liquity → Morpho → DEX 간 자유로운 토큰 이동
3. **시뮬레이션 가능**: deployer 계정이 토큰 민팅 권한 보유
4. **합리적 파라미터**: 테스트넷에 적합한 가스 보상 (0.2 CTC)

### 비목표 (Out of Scope)

- Options 모듈 (MVP 제외)
- Yield Vaults 재배포 (토큰만 교체하면 재연결 가능)
- DEX 코어 컨트랙트 재배포 (Factory, Router 등 재사용)
- Morpho 코어 컨트랙트 재배포 (SnowballLend, IRM 재사용)
- 프론트엔드 기능 추가 (주소 교체만)

## 배포 범위

### 새로 배포할 컨트랙트

| 카테고리 | 컨트랙트 | 비고 |
|---------|---------|------|
| **토큰** | MockWCTC, MockLstCTC, SbUSDToken, MockUSDC | 4개 새 토큰, deployer가 owner |
| **오라클** | MockPriceFeed × 2 | wCTC/lstCTC 가격 피드 |
| **Liquity Core** | AddressesRegistry × 2, BorrowerOperations × 2, TroveManager × 2, StabilityPool × 2, ActivePool × 2, DefaultPool × 2, GasPool × 2, CollSurplusPool × 2, SortedTroves × 2, TroveNFT × 2 | wCTC + lstCTC 두 branch |
| **Liquity Shared** | CollateralRegistry, HintHelpers, MultiTroveGetter, RedemptionHelper, DebtInFrontHelper, MockInterestRouter | 공유 컨트랙트 |
| **Liquity Extra** | AgentVault | ERC-8004 연동 |

### 새로 생성할 풀/마켓 (기존 코어 컨트랙트 재사용)

| 카테고리 | 항목 | 비고 |
|---------|------|------|
| **DEX 풀** | wCTC/USDC, lstCTC/USDC, wCTC/sbUSD, sbUSD/USDC, lstCTC/wCTC | 5개 풀, 초기 유동성 포함 |
| **Morpho 마켓** | wCTC/sbUSD, lstCTC/sbUSD, sbUSD/USDC | 3개 마켓, 새 오라클 연결 |

### 재사용하는 기존 컨트랙트

| 카테고리 | 컨트랙트 | 주소 |
|---------|---------|------|
| DEX | Factory, SwapRouter, PositionManager, QuoterV2 | 기존 주소 유지 |
| Morpho | SnowballLend, AdaptiveCurveIRM | 기존 주소 유지 |
| Multicall | Multicall3 | 기존 주소 유지 |

## 배포 파라미터 (확인 필요)

### 토큰 가격 (Oracle)

| 토큰 | 가격 | 비고 |
|------|------|------|
| wCTC | $5.00 | 현재 Morpho Oracle 값 |
| lstCTC | $5.20 | 스테이킹 프리미엄 반영 |
| sbUSD | $1.00 | 스테이블코인 |
| USDC | $1.00 | 스테이블코인 |

### Liquity 파라미터

| 파라미터 | wCTC Branch | lstCTC Branch | 비고 |
|---------|-------------|---------------|------|
| MCR | 110% (1.1e18) | 120% (1.2e18) | 기존과 동일 |
| CCR | 150% (1.5e18) | 160% (1.6e18) | 기존과 동일 |
| ETH_GAS_COMPENSATION | **0.2 CTC** | **0.2 CTC** | 200 → 0.2 (소스 수정) |
| MIN_DEBT | **200 sbUSD** | **200 sbUSD** | 변경 여부 확인 필요 |

### Morpho 마켓 파라미터

| 마켓 | Loan | Collateral | LLTV | Oracle |
|------|------|------------|------|--------|
| wCTC/sbUSD | sbUSD | wCTC | 77% | 새 wCTC oracle |
| lstCTC/sbUSD | sbUSD | lstCTC | 77% | 새 lstCTC oracle |
| sbUSD/USDC | USDC | sbUSD | 90% | 새 sbUSD oracle |

### DEX 풀 파라미터

| 풀 | Fee Tier | 초기 가격 | 초기 유동성 |
|----|----------|----------|------------|
| wCTC/USDC | 3000 (0.3%) | 1 wCTC = 5 USDC | TBD |
| lstCTC/USDC | 3000 (0.3%) | 1 lstCTC = 5.2 USDC | TBD |
| wCTC/sbUSD | 3000 (0.3%) | 1 wCTC = 5 sbUSD | TBD |
| sbUSD/USDC | 500 (0.05%) | 1 sbUSD = 1 USDC | TBD |
| lstCTC/wCTC | 3000 (0.3%) | 1 lstCTC = 1.04 wCTC | TBD |

### 토큰 민팅량

| 토큰 | 총 민팅 | Deployer 보유 | 시뮬레이션 계정당 | 비고 |
|------|---------|-------------|----------------|------|
| wCTC | 10,000,000 | 2,000,000 | 1,000,000 | 8개 계정 분배 |
| lstCTC | 10,000,000 | 2,000,000 | 1,000,000 | 8개 계정 분배 |
| USDC | 10,000,000 | 2,000,000 | 1,000,000 | 8개 계정 분배 |
| sbUSD | 0 | 0 | 0 | Liquity에서만 민팅 |

## 소스 코드 수정 (배포 전)

### Constants.sol 수정

```solidity
// packages/liquity/contracts/src/Dependencies/Constants.sol
// Line 13: 200 ether → 0.2 ether
uint256 constant ETH_GAS_COMPENSATION = 0.2 ether;
```

## 제약사항

- Creditcoin Testnet은 블록 생성 속도가 느려 배포에 시간 소요
- 배포 후 addresses.ts, contracts.md 등 설정 파일 전면 교체 필요
- Morpho 마켓 생성 시 createMarket은 누구나 호출 가능 (기존 SnowballLend 재사용)
- DEX 풀 생성도 Factory.createPool로 누구나 가능 (기존 Factory 재사용)
