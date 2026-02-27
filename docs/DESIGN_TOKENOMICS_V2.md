# Snowball 토크노믹스 — Buyback & Burn + Utility 모델

> HYPE-inspired: 전 프로토콜 수익 → SNOW 바이백 & 소각 + 소각 유틸리티
> Version: v0.3.0 | Status: Draft
> Last updated: 2026-02-27
> [INDEX](INDEX.md) | 이전 버전: [DESIGN_TOKENOMICS](legacy/DESIGN_TOKENOMICS.md) (v0.1.0, sSNOW 모델)
>
> **v0.3.0 변경사항**: AF:Treasury 비율 운영팀 점진 조정, 바이백 실행 특권화, 수수료 할인 티어 제거(향후 추가 예정)

---

## 0. 설계 철학

### 왜 Lock이 필요 없는가

| ve(3,3) 모델 | 이 모델 |
|-------------|---------|
| 토큰을 4년 잠가야 투표 가능 | 잠금 없음, 보유만으로 혜택 |
| 에미션으로 유동성 유치 | 프로토콜 자체 수익으로 유치 |
| 투표해야 수수료 수취 가능 | 바이백 & 번으로 전체 홀더 수혜 |
| 복잡 (veNFT, 게이지, 에폭) | 단순 (바이백, 소각) |

**핵심 논리:**

1. **Lock은 가두는 것이다** — 좋은 제품이면 유저가 알아서 남는다. Hyperliquid는 lock 없이 $20B+ TVL.
2. **에미션은 인플레이션이다** — 신규 토큰 발행은 기존 홀더 희석. 바이백 & 번은 공급 감소 = 가치 상승.
3. **유틸리티가 수요를 만든다** — 소각 유틸리티 + 향후 수수료 할인이 토큰 보유 동기.
4. **단순함이 확장성이다** — ve(3,3)의 복잡성은 유저 이탈 요인. HYPE의 성공은 단순한 구조.

---

## 1. 모델 개요

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│   DEX ─── swap fee ──┐                                           │
│   Morpho ─ interest ─┤                                           │
│   Vault ── harvest ──┼──→ Assistance Fund ──→ SNOW 바이백 & 번   │
│   Liquity ─ fee ─────┤     (단계적 비율)        ↓                │
│   Options ─ comm. ───┘                     공급 감소 = 가치 ↑    │
│                              │                                   │
│                              └──→ Treasury (운영비)              │
│                                                                  │
│   초기: 바이백 비율 극대화                                        │
│   이후: 운영팀이 점진적으로 Treasury 비율 확대                     │
│                                                                  │
│   SNOW 소각 ──→ Vault 생성, 마켓 생성, 프리미엄 기능              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**한 줄 요약**: 모든 프로토콜 수익이 SNOW를 사서 태운다. 바이백 비율은 운영팀이 점진 조정.

---

## 2. 토큰 설계

### 2-1. SNOW

| 항목 | 값 |
|------|-----|
| 이름 | Snowball Token |
| 심볼 | SNOW |
| 표준 | ERC-20 |
| 초기 발행량 | 1,000,000,000 (10억) |
| 추가 발행 | 불가 (cap 고정) |
| 소각 | Buyback & Burn으로 지속 감소 |
| 소수점 | 18 |

### 2-2. 토큰 배분

| 구분 | 비율 | 수량 | 베스팅 |
|------|------|------|--------|
| 커뮤니티 에어드랍 | 31% | 310,000,000 | 제네시스 에어드랍 (즉시) |
| 미래 에미션 & 보상 | 38.888% | 388,880,000 | 거버넌스 결정에 따라 |
| 핵심 기여자 | 23.8% | 238,000,000 | 1년 클리프 + 3년 선형 |
| 초기 유동성 | 6.312% | 63,120,000 | 즉시 (DEX LP 시딩) |

> HYPE 배분 비율 참고 (31/38.888/23.8/6.312). Snowball 생태계에 맞게 조정 가능.

### 2-3. 공급량 추이 (디플레이션)

```
Year 0:  1,000,000,000 SNOW (초기 발행)
         └── 유통: ~370M (에어드랍 + LP)
         └── 잠김: ~630M (베스팅 + 미래 보상)

Year 1:  ~970M (바이백 & 번 -30M 추정)
Year 2:  ~920M
Year 3:  ~850M
Year 5:  ~700M
         ...
         바이백 & 번이 계속되는 한 공급은 영원히 감소
```

---

## 3. 수익 흐름 — Assistance Fund

### 3-1. 수수료 소스

모든 프로토콜 수수료가 단일 **Assistance Fund**로 모인다.

| 프로토콜 | 수수료 유형 | 현재 수수료율 | 현재 수취 방식 | 변경 |
|----------|------------|-------------|--------------|------|
| **Algebra DEX** | 스왑 수수료 | 0.05~5% (동적) | CommunityVault → EOA | → Assistance Fund |
| **Morpho** | 이자 스프레드 | 마켓별 0~25% | feeRecipient EOA | → Assistance Fund |
| **Yield Vault** | 수확 수수료 | 4.5% | treasury EOA | → Assistance Fund |
| **Yield Vault** | 출금 수수료 | 0.1% | Strategy 잔류 | 변경 없음 (LP 환원) |
| **Liquity** | 대출 이자 | 0.5~25% APR | Stability Pool | 변경 없음 (SP 환원) |
| **Options** | 커미션 | 0~20% | ClearingHouse | → Assistance Fund |

> Liquity 이자는 Stability Pool 예치자에게 귀속 — 이건 프로토콜 핵심 인센티브이므로 유지.
> Yield Vault 출금 수수료도 LP에게 환원 — 이것도 유지.
> **나머지 전부 Assistance Fund로.**

### 3-2. 기존 컨트랙트 변경점

코드 수정 없이 **주소 설정만 변경**:

```
SnowballCommunityVault → communityFeeReceiver = AssistanceFund
SnowballLend           → feeRecipient          = AssistanceFund
SnowballStrategyBase   → treasury              = AssistanceFund
SnowballOptions        → fee collector          = AssistanceFund
```

모든 프로토콜의 수수료 수취자가 이미 configurable이므로 재배포 불필요.

### 3-3. Assistance Fund 분배 — 단계적 비율 조정

초기에는 바이백 비율을 극대화하고, 프로토콜 성장에 따라 운영팀이 Treasury 비율을 점진적으로 높인다.

> 비율 변경은 운영팀(owner/operator)이 결정.
> 초기에 공격적 바이백으로 토큰 가치를 확립한 뒤, 안정기에 운영비를 확보하는 전략.

```
Assistance Fund (모든 프로토콜 수수료 수집)
    │
    ├── Buyback % ──→ Buyback & Burn
    │                  │
    │                  ├── 수수료 토큰(sbUSD, wCTC, USDC)을
    │                  │   Snowball DEX에서 SNOW로 스왑
    │                  │
    │                  └── 매수한 SNOW를 burn(address(0))으로 영구 소각
    │
    └── Treasury % ──→ Treasury (멀티시그)
                       └── 운영, 감사, 인프라, 버그 바운티
```

### 3-4. 바이백 실행 방식

| 항목 | 값 |
|------|-----|
| 실행 주체 | **프로토콜 오퍼레이터 전용** (`onlyOperator`) |
| 실행 제한 | 외부 호출 불가 — 차익거래 방지 |
| 실행 주기 | 오퍼레이터 재량 (축적량 확인 후 수동/자동) |
| 매수 방식 | Snowball DEX (자체 DEX) 통해 스왑 |
| 가격 보호 | 오라클 가격 기준 최대 2% 슬리피지 |
| 소각 방식 | `SNOW.burn(amount)` — 영구 소각, totalSupply 감소 |
| 투명성 | 모든 바이백 & 번 on-chain 이벤트 발행 |

> **왜 permissionless가 아닌가?**
> 바이백이 공개되면 외부 봇이 선행매매(front-running)로 SNOW를 사서 바이백 직후 되팔 수 있다.
> 오퍼레이터 전용으로 제한하면 타이밍 예측이 불가능해져 차익거래를 방지할 수 있다.

```solidity
event BuybackAndBurn(
    address indexed tokenIn,
    uint256 amountIn,
    uint256 snowBurned,
    uint256 newTotalSupply,
    uint256 timestamp
);
```

---

## 4. SNOW 유틸리티 — 수수료 할인 티어 *(향후 추가 예정)*

> **v0.3.0**: 수수료 할인 티어는 Phase 1에서는 구현하지 않는다.
> 프로토콜이 충분한 TVL과 유저 기반을 확보한 이후 거버넌스를 통해 도입 예정.
> 구현 시 SNOW 보유량 기반 수수료 할인(HYPE 모델 참고) 형태가 될 것.

---

## 5. SNOW 소각 유틸리티 — 프리미엄 기능

특정 기능 사용 시 SNOW를 **소각**하는 구조. 바이백 & 번과 함께 이중 디플레이션을 만든다.

### 5-1. 소각 기능 목록

| 기능 | 소각량 | 설명 |
|------|--------|------|
| **Yield Vault 전략 등록** | 10,000 SNOW | 신규 Strategy를 Vault에 등록 |
| **Morpho 마켓 부스트** | 5,000 SNOW | 마켓을 "추천 마켓"으로 프론트엔드 노출 |
| **DEX 풀 프로모션** | 5,000 SNOW | 풀을 "추천 풀"로 프론트엔드 노출 |
| **프리미엄 Analytics** | 1,000 SNOW/월 | 고급 대시보드, 수익률 분석 |
| **AI 에이전트 등록** | 2,000 SNOW | ERC-8004 에이전트 ID 발급 |
| **거버넌스 제안** | 50,000 SNOW | 거버넌스 제안 생성 (스팸 방지) |

> 소각된 SNOW는 영구 삭제 → totalSupply 감소 → 바이백 & 번과 이중 디플레이션.

### 5-2. 소각 vs 수수료의 차이

```
소각 (burn):  SNOW가 영구 삭제됨. 모든 SNOW 홀더에게 혜택 (희소성 증가)
수수료 (fee): SNOW가 Treasury로 이동. 프로토콜만 혜택

→ "소각"을 선택함으로써 프로토콜이 아니라 커뮤니티에 가치가 돌아간다
```

---

## 6. 전체 Value Accrual 구조

SNOW에 가치가 축적되는 두 가지 경로:

```
경로 1: Buyback & Burn (수동적)
  프로토콜 수수료 → SNOW 매수 → 소각
  → 공급 감소 → 가격 상승 압력
  → 모든 SNOW 홀더 수혜 (아무것도 안 해도)

경로 2: Burn Utility (소비적)
  SNOW 소각 → 프리미엄 기능 접근
  → 추가 공급 감소
  → 사용 = 소각 = 더 희소해짐

(향후) 경로 3: Utility Discount
  SNOW 보유 → 수수료 할인 → 비용 절약
  → 매도 압력 감소 (팔면 할인 잃음)
```

### 플라이휠

```
더 많은 유저
    │
    ▼
더 많은 거래/대출/예치
    │
    ▼
더 많은 프로토콜 수수료
    │
    ▼
더 많은 SNOW 바이백 & 번 ──→ 공급 ↓ 가격 ↑
    │
    ▼
SNOW 가치 상승
    │
    ▼
더 많은 유저 유입 ──→ 반복
```

---

## 7. 거버넌스

### 7-1. 투표권

```
투표권 = SNOW 보유량 (1 SNOW = 1 vote)
```

Lock 없음. 잔고 스냅샷 기반 투표.

### 7-2. 거버넌스 대상

| 카테고리 | 변경 가능 항목 |
|----------|---------------|
| 바이백 비율 | Buyback/Treasury 비율 조정 (운영팀) |
| 소각 기능 | 소각량 조정, 신규 소각 기능 추가 |
| DEX | 수수료율, 신규 풀 |
| Morpho | 신규 마켓 승인, LLTV 조정 |
| Vault | 신규 Strategy 승인, 수수료율 |
| 비상 | 보험 기금 사용, 컨트랙트 일시 정지 |
| 업그레이드 | 컨트랙트 업그레이드 (Timelock 필수) |

### 7-3. 거버넌스 파라미터

| 파라미터 | 값 |
|----------|-----|
| 제안 비용 | 50,000 SNOW 소각 |
| 쿼럼 | 유통량의 10% |
| 투표 기간 | 5일 |
| Timelock | 2일 (실행 대기) |
| 최소 투표 기간 | 3일 (긴급 시) |

> 제안 시 SNOW를 **소각**한다 → 스팸 방지 + 디플레이션.
> ve(3,3)처럼 매주 투표 의무 없음. 필요할 때만 참여.

---

## 8. 프로토콜별 수수료 상세

### 8-1. DEX (Algebra V4)

```
스왑 수수료 (0.05~5%, DynamicFeePlugin)
    │
    ├── LP 몫 ──→ 유동성 제공자 (기존 유지)
    │
    └── Community Fee ──→ Assistance Fund ──→ 바이백 & 번
```

**Community Fee 설정:**

| 파라미터 | 현재 | 변경 후 |
|----------|------|---------|
| communityFee | 설정 안 됨 | 스왑 수수료의 10~20% |
| communityFeeReceiver | EOA | AssistanceFund |

> LP 수익은 건드리지 않는다. Community Fee만 바이백으로.

### 8-2. Morpho (SnowballLend)

```
대출 이자
    │
    ├── 공급자 몫 ──→ 렌더 (기존 유지)
    │
    └── 프로토콜 수수료 (0~25%) ──→ Assistance Fund ──→ 바이백 & 번
```

| 파라미터 | 현재 | 변경 후 |
|----------|------|---------|
| fee (마켓별) | 0~25% | 마켓별 적정 수준 유지 |
| feeRecipient | EOA | AssistanceFund |

### 8-3. Yield Vault (Beefy V7)

```
수확 수익
    │
    ├── 95.5% ──→ 볼트 (재예치, 복리)
    │
    └── 4.5% 성과 수수료
        ├── Call fee (0.5%) ──→ 하비스터 (기존 유지)
        ├── Strategist (0.5%) ──→ 전략 개발자 (기존 유지)
        └── Treasury (3.5%) ──→ Assistance Fund ──→ 바이백 & 번
```

| 파라미터 | 현재 | 변경 후 |
|----------|------|---------|
| treasury | EOA | AssistanceFund |
| treasuryFee | 35 (3.5%) | 유지 |

### 8-4. Options (Binary Options)

```
옵션 정산
    │
    ├── 승자 보상 ──→ 유저 (기존 유지)
    │
    └── 커미션 (0~20%) ──→ Assistance Fund ──→ 바이백 & 번
```

| 파라미터 | 현재 | 변경 후 |
|----------|------|---------|
| commissionFee | 설정 가능 | 적정 수준 |
| fee collector | ClearingHouse | AssistanceFund |

---

## 9. 컨트랙트 아키텍처

### 9-1. 신규 컨트랙트

```
packages/tokenomics/ (신규 패키지)
│
├── SNOW.sol                   ← ERC-20 + burn 기능 (고정 발행, 소각만 가능)
│
├── AssistanceFund.sol         ← 수수료 수집 + 바이백 & 번 실행
│   ├── collectFees()          ← 축적된 수수료 토큰 확인
│   ├── executeBuybackAndBurn() ← DEX 스왑 + SNOW 소각 (onlyOperator)
│   ├── sweepToTreasury()      ← Treasury 비율만큼 운영비 전송
│   └── setRatio()             ← Buyback/Treasury 비율 변경 (onlyOwner)
│
├── BurnRegistry.sol           ← 소각 유틸리티 관리
│   ├── burnForFeature(feature, amount)  ← SNOW 소각 → 기능 해금
│   ├── isFeatureActive(user, feature)   ← 기능 활성화 여부
│   └── features                         ← 등록된 소각 기능 목록
│
└── SnowballGovernor.sol       ← OpenZeppelin Governor 기반
    └── SnowballTimelock.sol   ← TimelockController
```

### 9-2. 전체 컨트랙트 상호작용

```
┌─ 수수료 생성 (기존 프로토콜, 변경 없음) ─────────────────────┐
│                                                              │
│  DEX swap ──→ CommunityVault ──┐                             │
│  Morpho interest ──────────────┤                             │
│  Vault harvest ────────────────┼──→ Assistance Fund          │
│  Options commission ───────────┘         │                   │
│                                          │                   │
└──────────────────────────────────────────┼───────────────────┘
                                           │
                    ┌──────────────────────┤
                    │                      │
                    ▼                      ▼
           ┌───────────────┐      ┌──────────────┐
           │  Buyback %    │      │  Treasury %   │
           │  & Burn       │      │  (multisig)   │
           │ (onlyOperator)│      └──────────────┘
           │               │
           │  sbUSD ─→ DEX ─→ SNOW ─→ burn()
           │  wCTC  ─→ DEX ─→ SNOW ─→ burn()
           │  USDC  ─→ DEX ─→ SNOW ─→ burn()
           └───────────────┘
                    │
                    ▼
            totalSupply 감소
            (영구 디플레이션)


┌─ SNOW 유틸리티 ──────────────────────────────────────────────┐
│                                                              │
│  ┌──────────────────┐                                        │
│  │  BurnRegistry    │                                        │
│  │                  │                                        │
│  │ SNOW 소각 →      │                                        │
│  │ 프리미엄 기능    │                                        │
│  │ → 추가 디플레이션│                                        │
│  └────────┬─────────┘                                        │
│           │                                                  │
│           ▼                                                  │
│  Vault 등록, 에이전트 발급, 거버넌스 제안 등                 │
│                                                              │
│  (향후) FeeDiscount: SNOW 보유량 → 수수료 할인 티어          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 9-3. 컨트랙트 예상 규모

| 컨트랙트 | 설명 | 예상 LOC |
|----------|------|----------|
| `SNOW.sol` | ERC-20 + burn (고정 발행) | ~50 |
| `AssistanceFund.sol` | 수수료 수집 + 바이백 & 번 + 비율 관리 | ~220 |
| `BurnRegistry.sol` | 소각 유틸리티 관리 | ~100 |
| `SnowballGovernor.sol` | OZ Governor + Timelock | ~130 |
| **합계** | | **~500** |

> ve(3,3) 대비 LOC 72% 감소 (~1,800 → ~500). 감사 비용과 공격 표면 최소화.
> 향후 `FeeDiscount.sol` (~250 LOC) 추가 시 ~750.

---

## 10. 핵심 인터페이스

### 10-1. SNOW.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/// @title SNOW — Snowball Protocol Token
/// @notice Fixed supply, burn-only. No mint after deployment.
contract SNOW is ERC20, ERC20Burnable, ERC20Permit {
    constructor(address treasury, uint256 totalSupply_)
        ERC20("Snowball Token", "SNOW")
        ERC20Permit("Snowball Token")
    {
        _mint(treasury, totalSupply_);
    }
    // No mint function. Supply can only decrease via burn().
}
```

### 10-2. AssistanceFund.sol

```solidity
interface IAssistanceFund {
    /// @notice 축적된 수수료를 SNOW로 바이백 후 소각 (오퍼레이터 전용)
    /// @param tokenIn 수수료 토큰 주소 (sbUSD, wCTC, USDC 등)
    /// @param minSnowOut 최소 SNOW 수량 (슬리피지 보호)
    function executeBuybackAndBurn(
        address tokenIn,
        uint256 minSnowOut
    ) external returns (uint256 snowBurned);  // onlyOperator

    /// @notice Treasury 비율만큼 운영비 전송 (오퍼레이터 전용)
    function sweepToTreasury(address token) external;  // onlyOperator

    /// @notice 바이백 & 번 통계 조회
    function totalSnowBurned() external view returns (uint256);
    function totalBuybackValue() external view returns (uint256);  // USD 환산 누적

    /// @notice 현재 축적된 수수료 잔고
    function pendingFees(address token) external view returns (uint256);

    // 설정 (onlyOwner)
    function setBuybackRatio(uint256 buybackBps) external;  // 운영팀 조정
    function setTreasury(address newTreasury) external;
    function setOperator(address newOperator) external;

    event BuybackAndBurn(
        address indexed tokenIn,
        uint256 amountIn,
        uint256 snowBurned,
        uint256 newTotalSupply
    );

    event RatioUpdated(uint256 buybackBps, uint256 treasuryBps);
}
```

### 10-3. BurnRegistry.sol

```solidity
interface IBurnRegistry {
    /// @notice SNOW를 소각하여 기능 해금
    /// @param featureId 기능 식별자 (keccak256)
    /// @param amount 소각할 SNOW 수량
    function burnForFeature(bytes32 featureId, uint256 amount) external;

    /// @notice 유저의 기능 활성화 여부
    function isFeatureActive(address user, bytes32 featureId) external view returns (bool);

    /// @notice 기능별 필요 소각량 조회
    function getFeatureCost(bytes32 featureId) external view returns (uint256);

    /// @notice 기능 등록/수정 (거버넌스)
    function registerFeature(
        bytes32 featureId,
        uint256 burnAmount,
        uint256 duration        // 0 = 영구, >0 = 기간제 (초)
    ) external;

    event FeatureActivated(
        address indexed user,
        bytes32 indexed featureId,
        uint256 snowBurned,
        uint256 expiresAt
    );
}
```

---

## 11. 수익 시뮬레이션

### 11-1. 수익 가정

| 항목 | 보수적 | 기본 | 낙관적 |
|------|--------|------|--------|
| DEX 일 거래량 | $100K | $500K | $2M |
| DEX 커뮤니티 수수료 | 0.05% | 0.05% | 0.05% |
| Morpho TVL | $1M | $5M | $20M |
| Morpho 평균 이자 | 5% | 8% | 12% |
| Morpho 프로토콜 수수료 | 10% | 10% | 10% |
| Vault TVL | $500K | $2M | $10M |
| Vault 평균 APY | 10% | 15% | 25% |
| Vault Treasury 수수료 | 3.5% | 3.5% | 3.5% |
| Options 일 거래량 | $10K | $50K | $200K |
| Options 커미션 | 5% | 5% | 5% |

### 11-2. 연간 프로토콜 수수료 (Assistance Fund 유입)

| 수익 소스 | 보수적 | 기본 | 낙관적 |
|-----------|--------|------|--------|
| DEX community fee | $18.3K | $91.3K | $365K |
| Morpho protocol fee | $5K | $40K | $240K |
| Vault treasury fee | $1.75K | $10.5K | $87.5K |
| Options commission | $182.5K | $912.5K | $3.65M |
| **Total** | **$207K** | **$1.05M** | **$4.34M** |
| 바이백 & 번 (대부분) | ~$201K | ~$1.02M | ~$4.21M |
| Treasury (소량) | ~$6.2K | ~$31.5K | ~$130K |

> 초기 기준 추정. 비율 변경에 따라 바이백 금액이 줄고 Treasury가 늘어남.

### 11-3. SNOW 바이백 & 번 임팩트

SNOW 가격 = $0.01 가정:

| 시나리오 | 연간 바이백 | 연간 소각량 | 초기 대비 |
|----------|-----------|-----------|----------|
| 보수적 | $201K | 20.1M SNOW | 2.01% |
| 기본 | $1.02M | 102M SNOW | **10.2%** |
| 낙관적 | $4.21M | 421M SNOW | **42.1%** |

> 기본 시나리오에서 **연간 10% 공급 소각**. HYPE와 유사한 디플레이션 속도.

### 11-4. HYPE와의 비교

| | HYPE | SNOW (기본 시나리오) |
|--|------|---------------------|
| 연 바이백 | ~$1.2B | ~$1M (초기 기준) |
| 공급 대비 연 소각율 | ~8% | ~10% (초기 기준) |
| 수익 소스 | 선물 거래 수수료 | 멀티 프로토콜 통합 |
| Lock | 없음 | 없음 |
| 바이백 실행 | 프로토콜 운영 | 오퍼레이터 전용 |
| 유틸리티 | 수수료 할인 | 소각 기능 (할인은 향후) |

---

## 12. 기존 모델과 최종 비교

| | Curve ve | ve(3,3) | HYPE | **SNOW (이 모델)** |
|--|---------|---------|------|---------------------|
| Lock | 4년 | 4년 | 없음 | **없음** |
| 에미션 | O (인플레이션) | O (인플레이션) | X | **X** |
| 바이백 & 번 | X | X | O (97%) | **O (운영팀 조정)** |
| 바이백 실행 | - | - | 프로토콜 | **오퍼레이터 전용** |
| 수수료 할인 | X | X | O (5~40%) | *(향후 예정)* |
| 소각 유틸리티 | X | X | X | **O (Vault/에이전트 등록)** |
| 수익 소스 | DEX only | DEX only | Perp only | **멀티 프로토콜** |
| 복잡도 | 높음 | 매우 높음 | 낮음 | **매우 낮음** |
| 컨트랙트 LOC | ~2,000 | ~1,800 | - | **~500** |

---

## 13. 보안 및 리스크

### 13-1. 컨트랙트 리스크

| 리스크 | 심각도 | 대응 |
|--------|--------|------|
| AssistanceFund 해킹 | Critical | 감사, 멀티시그 admin, 일일 바이백 한도 |
| 바이백 가격 조작 | High | 오라클 가격 대비 최대 2% 슬리피지, TWAP |
| 오퍼레이터 키 유출 | High | 멀티시그 또는 HSM, 오퍼레이터 교체 함수 |
| 거버넌스 공격 | Medium | 50K SNOW 소각 (제안 비용), 쿼럼 10% |

### 13-2. 경제 리스크

| 리스크 | 대응 |
|--------|------|
| SNOW 가격 하락 | 바이백이 더 많은 수량 소각 → 디플레이션 가속 |
| TVL 감소 | 멀티 프로토콜 분산으로 단일 의존도 낮음 |
| 토큰 매도 압력 | 바이백 매수 압력 + 소각 유틸리티 수요로 상쇄 |
| 바이백 비율 감소 리스크 | 운영팀 결정, Timelock 적용 |

### 13-3. 보안 조치

1. **감사**: 최소 2개 감사 업체
2. **버그 바운티**: Immunefi $100K+
3. **AssistanceFund 일일 한도**: 최대 소각량 cap (급격한 가격 영향 방지)
4. **비상 정지**: Guardian 멀티시그(3/5)
5. **Timelock**: 모든 거버넌스 실행 2일 대기

---

## 14. 구현 로드맵

### Phase 1: SNOW 토큰 + 바이백 (Week 1-3)

- [ ] `SNOW.sol` 배포 (고정 발행, burn 가능)
- [ ] 초기 유동성 시딩 (SNOW/wCTC, SNOW/sbUSD 풀)
- [ ] `AssistanceFund.sol` 배포 (초기 비율 설정, onlyOperator)
- [ ] 기존 프로토콜 수수료 수취자 → AssistanceFund로 변경
- [ ] 첫 바이백 & 번 실행
- [ ] 커뮤니티 에어드랍

### Phase 2: 소각 유틸리티 (Week 4-5)

- [ ] `BurnRegistry.sol` 배포
- [ ] Vault 전략 등록 소각 기능
- [ ] AI 에이전트 등록 소각 기능
- [ ] 기타 프리미엄 기능 소각

### Phase 3: 거버넌스 (Week 6-7)

- [ ] `SnowballGovernor.sol` + `SnowballTimelock.sol` 배포
- [ ] 첫 거버넌스 제안 (테스트)
- [ ] 프론트엔드 거버넌스 UI
- [ ] 바이백 비율 첫 조정 제안

### Phase 4: 수수료 할인 *(향후)*

- [ ] `FeeDiscount.sol` 설계 및 배포
- [ ] SNOW 보유량 기반 할인 티어 적용
- [ ] 프론트엔드 티어 표시

---

## 15. FAQ

### Q: Lock이 없으면 토큰 매도 압력이 너무 크지 않나?

**A:** 바이백 매수 압력이 상쇄한다:
1. **바이백 압력** — 프로토콜 수익의 대부분이 상시 매수 → 매도와 매수가 자연 균형.
2. **소각 유틸리티** — Vault 등록, 에이전트 발급 등에 SNOW 소각 필요 → 수요 발생.
3. 향후 수수료 할인 티어 도입 시 보유 인센티브 추가.

Hyperliquid가 증명했다: lock 없이도 바이백만으로 토큰 가치 유지 가능.

### Q: 에미션이 없으면 초기 유동성 유치는 어떻게?

**A:** 에어드랍 + LP 시딩으로 초기 부트스트랩. 이후에는:
1. 프로토콜 자체 수익률 (Morpho 이자, Vault 수확, DEX LP 수수료)이 충분한 유인
2. 바이백 & 번으로 토큰 가치 상승 → 자연스러운 유저 유입
3. 필요 시 "미래 에미션 & 보상" 풀(38.888%)에서 거버넌스 결정으로 인센티브 집행 가능

### Q: HYPE와 뭐가 다른가?

**A:** 3가지 차이:
1. **멀티 프로토콜** — HYPE는 선물 거래소 단일 수익. SNOW는 DEX + 렌딩 + 볼트 + 옵션 통합.
2. **소각 유틸리티** — HYPE는 바이백 & 번만. SNOW는 기능 소각도 추가 (이중 디플레이션).
3. **점진적 비율 조정** — 운영팀이 바이백/Treasury 비율 조정. HYPE는 고정 비율.

### Q: 기존 DESIGN_TOKENOMICS.md의 sSNOW는 폐기인가?

**A:** 폐기. 이 모델에서는 sSNOW(ERC-4626 복리 볼트)가 불필요하다.
바이백 & 번이 모든 홀더에게 자동으로 가치를 환원하므로 스테이킹 자체가 필요 없다.
"보유만 해도 가치 상승" = sSNOW의 목적을 더 단순하게 달성.

---

## 16. 용어 정리

| 용어 | 설명 |
|------|------|
| **SNOW** | Snowball 프로토콜 토큰. ERC-20, 고정 발행, 소각만 가능 |
| **Assistance Fund** | 전 프로토콜 수수료를 수집하는 컨트랙트 (HYPE의 AF 차용) |
| **Buyback & Burn** | 수수료 토큰으로 SNOW를 DEX에서 매수 후 영구 소각 |
| **Fee Discount** | *(향후 예정)* SNOW 보유량 기반 수수료 할인 |
| **Burn Utility** | SNOW를 소각하여 프리미엄 기능 해금 |
| **Operator** | 바이백 실행 권한을 가진 프로토콜 운영자 (차익거래 방지) |
| **Revenue Union** | 전 프로토콜 수수료를 하나로 모으는 구조 |
| **Real Yield** | 토큰 인플레이션 없이 실제 수수료에서 발생하는 수익 |
| **Flywheel** | 수수료 → 바이백 → 공급 감소 → 가치 ↑ → 유저 ↑ → 수수료 ↑ 선순환 |
| **Guardian** | 비상 정지 권한을 가진 멀티시그 (3/5) |

---

## Appendix A: 이전 설계 변경 이력

| 버전 | 모델 | 상태 | 비고 |
|------|------|------|------|
| v0.1.0 | sSNOW (ERC-4626 복리 볼트) | Deprecated | `DESIGN_TOKENOMICS.md`에 보존 |
| v0.1.0-ve33 | ve(3,3) (Lock + 게이지 + 에미션) | Rejected | Lock/에미션 없는 모델이 적합 |
| v0.2.0 | Buyback & Burn + Utility (고정 비율) | Superseded | 할인 티어 포함, 고정 비율 |
| **v0.3.0** | **Buyback & Burn (간소화)** | **Active** | 할인 티어 제거, 비율 운영팀 조정, 바이백 특권화 |
