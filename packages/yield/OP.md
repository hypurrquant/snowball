# OP.md — Snowball Yield Vault Operations Guide

> Beefy V7 기반 Yield Optimizer 운영 가이드
> Last updated: 2026-02-25

---

## 1. 개요

Snowball Yield Vault는 Beefy Finance V7 패턴을 기반으로 한 Yield Optimizer입니다.
- **Vault** — ERC-20 share 토큰 (mooToken), 유저 입출금
- **Strategy** — 자동 수익 복리 (harvest → swap → re-deposit)
- **Locked Profit** — 반-샌드위치 보호 (24시간 선형 릴리스)

| 항목 | 값 |
|------|-----|
| Solidity | 0.8.24 |
| EVM | Cancun |
| 빌드 | Foundry (forge) |
| 의존성 | OpenZeppelin 5.4.0 |

---

## 2. 빌드 & 테스트

```bash
cd packages/yield

# 컴파일
forge build       # 또는 pnpm build

# 테스트
forge test        # 또는 pnpm test

# 클린
forge clean       # 또는 pnpm clean
```

---

## 3. 아키텍처

```
┌──────────────────────┐
│   SnowballYieldVault │   ← 유저 deposit/withdraw
│   (ERC-20 mooToken)  │
└──────────┬───────────┘
           │ earn()
           ▼
┌──────────────────────┐
│  SnowballStrategyBase│   ← harvest, fee 분배, lockedProfit
└──────────┬───────────┘
           │ _deposit / _withdraw / _claim
           ▼
┌──────────────────────────────────────────────┐
│  Concrete Strategies                          │
│  ┌──────────────────┐ ┌────────────────────┐ │
│  │ SbUSD→StabilityPool│ │ SbUSD→Morpho     │ │
│  └──────────────────┘ └────────────────────┘ │
│  ┌──────────────────┐ ┌────────────────────┐ │
│  │ wCTC→Morpho      │ │ USDC→Morpho       │ │
│  └──────────────────┘ └────────────────────┘ │
└──────────────────────────────────────────────┘
```

---

## 4. 컨트랙트 목록

### Core

| 파일 | 설명 |
|------|------|
| `SnowballYieldVault.sol` | Vault — deposit/withdraw, share math, strategy timelock |
| `SnowballStrategyBase.sol` | Base Strategy — harvest flow, fees, lockedProfit, swap |

### Strategies

| 파일 | Want 토큰 | 배치 대상 | 수익 소스 |
|------|-----------|-----------|-----------|
| `StrategySbUSDStabilityPool.sol` | sbUSD | Liquity StabilityPool | wCTC (청산 보상) + sbUSD (yield gain) |
| `StrategySbUSDMorpho.sol` | sbUSD | SnowballLend | 대출 이자 수익 |
| `StrategyWCTCMorpho.sol` | wCTC | SnowballLend | 대출 이자 수익 |
| `StrategyUSDCMorpho.sol` | USDC | SnowballLend | 대출 이자 수익 |

### Interfaces

| 파일 | 설명 |
|------|------|
| `ISnowballStrategy.sol` | Strategy 인터페이스 (vault ↔ strategy 통신) |
| `IStabilityPool.sol` | Liquity SP 최소 인터페이스 |
| `ISnowballLend.sol` | Morpho Blue 최소 인터페이스 |
| `ISwapRouter.sol` | Algebra DEX 스왑 인터페이스 |

---

## 5. 새 상품 출시 절차

### 5-1. 새 Strategy 작성

```solidity
contract StrategyNewToken is SnowballStrategyBase {
    constructor(
        address _vault,
        address _router,
        address _native,     // wCTC
        address[] memory _rewards
    ) SnowballStrategyBase(_vault, _router, _native) {
        // rewards 등록
        for (uint i; i < _rewards.length; i++) {
            rewards.push(_rewards[i]);
        }
    }

    function _deposit(uint256 amount) internal override { ... }
    function _withdraw(uint256 amount) internal override { ... }
    function _emergencyWithdraw() internal override { ... }
    function _claim() internal override { ... }
    function balanceOfPool() public view override returns (uint256) { ... }
    function _verifyRewardToken(address token) internal view override { ... }
}
```

### 5-2. Vault 배포

```
1. Strategy 배포: new StrategyNewToken(vault, router, native, rewards)
2. Vault 배포: new SnowballYieldVault(strategy, "mooSnowball-NEW", "mooNEW")
3. Strategy에서 vault() 확인 (자동 연결)
```

### 5-3. Strategy 교체 (Timelock)

기존 Vault에 새 Strategy 연결:
```
1. vault.proposeStrat(newStrategyAddress)    ← 48시간 타임락 시작
2. (48시간 대기)
3. vault.upgradeStrat()                      ← 새 Strategy 활성화
```

> `proposeStrat`은 새 Strategy의 `vault()` 반환값이 해당 Vault와 일치하는지 검증합니다.

---

## 6. Harvest 운영

### 수확 플로우

```
harvest(callFeeRecipient)
  │
  ├── 1. strategy._claim()          ← 외부 프로토콜에서 보상 수집
  ├── 2. _swapRewardsToNative()     ← 모든 reward 토큰 → wCTC 스왑
  ├── 3. _chargeFees()              ← 수익의 4.5% 수수료 분배
  │       ├── 0.5% → callFeeRecipient (harvest 호출자)
  │       ├── 0.5% → strategist
  │       └── 3.5% → treasury
  ├── 4. _swapNativeToWant()        ← wCTC → want 토큰 스왑
  └── 5. _deposit()                 ← want를 다시 프로토콜에 예치
```

### 자동 Harvest 설정

현재 수동 호출 필요. 자동화 옵션:

```bash
# Cron job (매 6시간)
0 */6 * * * cast send $STRATEGY "harvest(address)" $KEEPER_ADDRESS --private-key $KEEPER_PK

# 또는 Gelato/Chainlink Keeper 연동
```

### Harvest 수익성 확인

```bash
# 예상 호출 보상 확인
cast call $STRATEGY "callReward()" --rpc-url $RPC_URL

# 수집 가능한 보상 확인
cast call $STRATEGY "rewardsAvailable()" --rpc-url $RPC_URL
```

---

## 7. 수수료 구조

| 항목 | 비율 | 수령자 |
|------|------|--------|
| Call Fee | 0.5% | harvest 호출자 (봇/키퍼) |
| Strategist Fee | 0.5% | strategist 주소 |
| Treasury Fee | 3.5% | treasury 주소 |
| **총 수수료** | **4.5%** | (수익 대비) |
| Withdrawal Fee | 0.1% | vault 잔류 (기존 예치자에게 돌아감) |

> Withdrawal Fee 최대 캡: 0.5% (WITHDRAWAL_FEE_CAP)

---

## 8. 비상 절차

### Panic (긴급 출금)

모든 자금을 외부 프로토콜에서 즉시 회수 + 일시정지:
```bash
cast send $STRATEGY "panic()" --private-key $OWNER_PK
```

### Pause / Unpause

```bash
# 일시정지 (새 입금 차단, 출금은 가능)
cast send $STRATEGY "pause()" --private-key $OWNER_PK

# 재개 (자동으로 idle 자금 재예치)
cast send $STRATEGY "unpause()" --private-key $OWNER_PK
```

### Strategy 은퇴

기존 Strategy를 영구 퇴역:
```bash
# Vault에서만 호출 가능 (upgradeStrat 시 자동 호출)
# retireStrat() → 모든 자금을 vault로 반환
```

---

## 9. Locked Profit (Anti-Sandwich)

- Harvest 수익은 즉시 반영되지 않고 **24시간에 걸쳐 선형 릴리스**
- `lockedProfit()`으로 현재 잠긴 수익 조회
- `getPricePerFullShare()`는 lockedProfit을 차감한 실질 share 가격 반환
- `harvestOnDeposit = true` 설정 시 lockDuration은 0으로 설정됨

---

## 10. 주요 View 함수

| 함수 | 설명 |
|------|------|
| `vault.getPricePerFullShare()` | 1 share당 want 토큰 수량 |
| `vault.balance()` | vault 총 자산 (idle + pool) |
| `vault.available()` | vault에 남은 idle 자산 |
| `strategy.balanceOf()` | strategy 총 자산 (idle + pool) |
| `strategy.balanceOfPool()` | 외부 프로토콜에 예치된 자산 |
| `strategy.balanceOfWant()` | strategy가 보유한 idle 자산 |
| `strategy.lockedProfit()` | 아직 릴리스되지 않은 잠긴 수익 |
| `strategy.callReward()` | harvest 호출 시 예상 보상 |

---

## 11. 배포 주소

> ⚠️ 아직 배포 전. 배포 후 이 섹션 업데이트 필요.

| 컨트랙트 | 주소 |
|----------|------|
| Vault (mooSbUSD-SP) | TBD |
| StrategySbUSDStabilityPool | TBD |
| Vault (mooSbUSD-Morpho) | TBD |
| StrategySbUSDMorpho | TBD |
| Vault (mooWCTC-Morpho) | TBD |
| StrategyWCTCMorpho | TBD |
| Vault (mooUSDC-Morpho) | TBD |
| StrategyUSDCMorpho | TBD |

---

## 12. TODO

### 🔴 HIGH
- [ ] 배포 스크립트 작성 (`scripts/deploy-viem.ts`)
- [ ] Forge 테스트 작성 (deposit/withdraw/harvest 시나리오)
- [ ] 프론트엔드 Vault UI 구현 (snowball-app에 `/yield` 라우트)

### 🟡 MEDIUM
- [ ] Gelato/Keeper 자동 harvest 연동
- [ ] 멀티 reward 토큰 스왑 경로 설정 UI
- [ ] Vault 성과 대시보드 (APY 히스토리, TVL 차트)

### 🟢 LOW
- [ ] BeefyWrapper (ERC-4626) 래퍼 추가
- [ ] 수수료 동적 조정 (BeefyFeeConfigurator 패턴)
- [ ] 마이그레이션 Strategy 패턴 (V1 → V2 전환)
