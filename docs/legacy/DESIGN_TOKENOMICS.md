# Snowball 통합 토크노믹스 설계

> **DEPRECATED** — 이 문서는 [DESIGN_TOKENOMICS_V2.md](DESIGN_TOKENOMICS_V2.md) (Buyback & Burn + Utility 모델)로 대체되었습니다.
> sSNOW 복리 모델은 폐기되었으며, 이 문서는 참고용으로만 보존됩니다.

> Snowball Revenue Union — 전 프로토콜 수익을 자동 복리로 공유하는 통합 DeFi 모델
> Version: v0.1.0 | Status: ~~Draft~~ Deprecated
> Last updated: 2026-02-25
> [INDEX](INDEX.md)

---

## 1. 배경 및 문제 정의

### 기존 DeFi의 구조적 문제

1. **프로토콜 파편화** — DEX, Lending, Vault 각각 별도 토큰, 별도 거버넌스. 유저는 3~5개 프로토콜에 분산 참여해야 전체 수익을 얻음.
2. **과도한 프로토콜 수취** — 대부분 프로토콜이 수수료의 50% 이상을 자체 유지. 유저에게 돌아가는 실질 수익률이 낮음.
3. **잠금 강제 (ve 모델)** — ve(3,3)는 최대 4년 잠금을 요구. 자본 비효율적이고 진입 장벽이 높음.
4. **인플레이션 의존** — 대부분의 수익이 신규 토큰 발행(emission)에 의존. 실질 수익(Real Yield)이 아님.

### Snowball의 기회

Snowball은 하나의 팀이 **DEX + Lending + Yield Vault + Stablecoin**을 모두 운영합니다.
이 통합 환경에서 **모든 프로토콜 수익을 하나로 모으고, 대부분을 유저에게 돌려주는** 새로운 모델이 가능합니다.

---

## 2. 핵심 원칙

| 원칙 | 설명 |
|------|------|
| **Revenue Union** | 전 프로토콜 수수료를 하나의 풀에 모음 |
| **Real Yield Only** | 토큰 인플레이션 아닌 실제 수익만 분배 |
| **Auto-Compound** | 수익이 자동으로 복리 — 유저 조작 불필요 |
| **No Lock** | 잠금 강제 없음. 자유 출입 + 7일 쿨다운 |
| **90%+ Share** | 수익의 90~95%를 참여자에게 분배 |

---

## 3. 토큰 구조

### 3-1. SNOW (거버넌스 토큰)

| 항목 | 값 |
|------|-----|
| 이름 | Snowball Token |
| 심볼 | SNOW |
| 표준 | ERC-20 |
| 총 발행량 | 100,000,000 SNOW (1억, 고정) |
| 인플레이션 | 없음 (추가 발행 불가) |
| 용도 | 스테이킹 (sSNOW), 거버넌스 투표, 유동성 페어 |

### 토큰 배분

| 구분 | 비율 | 수량 | 베스팅 |
|------|------|------|--------|
| 커뮤니티 / 에어드랍 | 40% | 40,000,000 | 6개월 선형 |
| 유동성 부트스트랩 | 20% | 20,000,000 | 즉시 (DEX LP) |
| 팀 / 개발 | 15% | 15,000,000 | 12개월 클리프 + 24개월 선형 |
| 재단 / 생태계 펀드 | 15% | 15,000,000 | 필요시 거버넌스 투표로 집행 |
| 초기 기여자 / 어드바이저 | 5% | 5,000,000 | 6개월 클리프 + 12개월 선형 |
| 보험 기금 | 5% | 5,000,000 | 프로토콜 사고 시 사용 |

> **핵심: 추가 발행(emission)이 없습니다.** 모든 보상은 프로토콜의 실제 수수료 수익입니다.

---

### 3-2. sSNOW (수익 복리 토큰)

| 항목 | 값 |
|------|-----|
| 이름 | Staked Snowball |
| 심볼 | sSNOW |
| 표준 | ERC-4626 (Tokenized Vault) |
| 기초 자산 | SNOW |
| 수익 소스 | 전 프로토콜 수수료 (Real Yield) |
| 잠금 | 없음 (7일 쿨다운) |

#### 작동 원리

```
유저 100 SNOW → stake → 100 sSNOW 수령 (교환비 1:1 시작)

시간 경과...
  Protocol Revenue → SNOW buyback → sSNOW Vault에 추가

1년 후:
  1 sSNOW = 1.12 SNOW (12% 수익 복리)
  유저의 100 sSNOW = 112 SNOW 가치

2년 후:
  1 sSNOW = 1.2544 SNOW (복리 누적)
  유저의 100 sSNOW = 125.44 SNOW 가치
```

#### ERC-4626 인터페이스

```solidity
// 입금 (SNOW → sSNOW)
function deposit(uint256 snowAmount, address receiver) → uint256 sSNOWMinted
function mint(uint256 sSNOWAmount, address receiver) → uint256 snowDeposited

// 출금 (sSNOW → SNOW)
function withdraw(uint256 snowAmount, address receiver, address owner) → uint256 sSNOWBurned
function redeem(uint256 sSNOWAmount, address receiver, address owner) → uint256 snowReturned

// 조회
function convertToAssets(uint256 sSNOWAmount) → uint256 snowAmount   // 현재 교환비
function convertToShares(uint256 snowAmount) → uint256 sSNOWAmount
function totalAssets() → uint256                                      // Vault 총 SNOW 잔고
```

---

## 4. Revenue Union — 수익 수집 및 분배

### 4-1. 수익 소스

| 프로토콜 | 수수료 유형 | 수수료율 | 예상 비중 |
|----------|------------|----------|-----------|
| **DEX (Uniswap V3)** | 스왑 수수료 | 0.05% / 0.30% / 1.00% (tier별) | 35~45% |
| **Lending (Morpho)** | 이자 스프레드 | 대출 이자의 10% | 25~35% |
| **Yield Vault (Beefy)** | 수확 성과 수수료 | 수익의 4.5% | 10~15% |
| **StableSwap** | 스왑 수수료 | 0.04% | 5~10% |
| **Liquidation** | 청산 패널티 | 담보의 5% | 5~10% |
| **StabilityPool** | 청산 보상 수수료 | 청산 이득의 2% | 2~5% |

### 4-2. 수익 분배 비율

```
Total Protocol Revenue (100%)
    │
    ├── 92% → sSNOW Vault (유저 분배)
    │         │
    │         └── SNOW buyback → Vault에 추가 → sSNOW 가치 ↑
    │
    ├── 5% → 운영/개발 기금
    │         └── 팀 급여, 감사, 인프라 비용
    │
    └── 3% → 보험 기금
              └── 해킹, 오라클 실패 등 긴급 상황 대비
```

### 4-3. Buyback & Compound 메커니즘

수익 토큰(sbUSD, USDC, wCTC 등)을 SNOW로 변환하는 과정:

```
Step 1: FeeCollector가 각 프로토콜에서 수수료 토큰 수집
        │
        ▼
Step 2: RevenueDistributor가 수익 분배 비율에 따라 분리
        │
        ├── 92% → BuybackEngine
        ├── 5%  → Treasury (multisig)
        └── 3%  → InsuranceFund
        │
        ▼
Step 3: BuybackEngine이 DEX에서 SNOW 매수
        │
        ├── sbUSD → DEX swap → SNOW
        ├── USDC  → DEX swap → SNOW
        └── wCTC  → DEX swap → SNOW
        │
        ▼
Step 4: 매수한 SNOW를 sSNOW Vault에 추가
        │
        └── sSNOW 교환비 자동 상승
```

#### Buyback 실행 주기

| 옵션 | 주기 | 장점 | 단점 |
|------|------|------|------|
| **A. 매일 자동** | 24시간마다 | 가격 영향 분산 | 가스비 높음 |
| B. 매주 일괄 | 7일마다 | 가스 효율적 | 가격 변동 노출 |
| C. 임계치 기반 | 축적량 > $10K | 유연함 | 예측 어려움 |

**추천: A (매일)** — TWAP 기반으로 24시간 동안 분산 매수하여 가격 영향 최소화.

---

## 5. 쿨다운 및 조기 해제

### 5-1. 쿨다운 메커니즘

```
sSNOW unstake 요청
    │
    ├── 7일 쿨다운 시작
    │   (이 기간 동안 sSNOW는 수익 축적 계속)
    │
    ├── 7일 후: 쿨다운 완료
    │   └── SNOW 전액 출금 가능 (수수료 없음)
    │
    └── 7일 이전: 조기 해제
        └── 2% 패널티 (패널티 금액은 sSNOW Vault로 환입)
```

### 5-2. 파라미터

| 파라미터 | 값 | 조정 가능 |
|----------|-----|-----------|
| 쿨다운 기간 | 7일 | 거버넌스 투표 (3~14일 범위) |
| 조기 해제 패널티 | 2% | 거버넌스 투표 (1~5% 범위) |
| 패널티 행선지 | sSNOW Vault | 변경 불가 (기존 홀더에게 귀속) |

### 5-3. 왜 잠금이 아닌 쿨다운인가

| | ve 잠금 (4년) | sSNOW 쿨다운 (7일) |
|--|---------------|---------------------|
| 자본 효율 | 최악 (4년 묶임) | 높음 (7일이면 출금) |
| 진입 장벽 | 높음 (4년 약정 부담) | 낮음 (언제든 참여) |
| 유저 신뢰 | "내 돈 돌려받을 수 있나?" | "7일이면 됨" |
| 프로토콜 안정성 | 높음 (TVL 고정) | 충분 (7일 + 수익이 잔류 인센티브) |
| 실제 효과 | 잠금으로 강제 홀딩 | **수익률로 자발적 홀딩** |

> **핵심 철학**: 유저를 가두는 게 아니라, **떠날 이유가 없게** 만드는 것.

---

## 6. 거버넌스

### 6-1. 투표권

```
투표권 = sSNOW 보유량 (1 sSNOW = 1 vote)
```

ve(3,3)처럼 매주 emission 투표를 할 필요 없습니다.
거버넌스는 **프로토콜 파라미터 변경**에만 사용:

### 6-2. 거버넌스 대상

| 카테고리 | 변경 가능 항목 |
|----------|---------------|
| 수익 분배 | sSNOW 분배 비율 (88~95% 범위) |
| 쿨다운 | 기간 (3~14일), 패널티 (1~5%) |
| DEX | 수수료 tier 추가/제거, 풀 인센티브 |
| Lending | LLTV 추가 활성화, 신규 마켓 승인 |
| Vault | 신규 Strategy 등록, 수수료율 조정 |
| 보험 | 보험 기금 사용 승인 |
| 업그레이드 | 컨트랙트 업그레이드 (timelock 필수) |

### 6-3. 투표 파라미터

| 파라미터 | 값 |
|----------|-----|
| 제안 최소 sSNOW | 총 공급량의 1% |
| 쿼럼 (정족수) | 총 공급량의 10% |
| 투표 기간 | 5일 |
| Timelock | 2일 (실행 대기) |
| 총 소요 | 7일 (투표 5일 + 실행 대기 2일) |

---

## 7. Flywheel (선순환 구조)

### 7-1. 기본 플라이휠

```
더 많은 유저 유입
      │
      ▼
더 많은 TVL (DEX LP, Lending, Vault)
      │
      ▼
더 많은 거래량 / 대출 / 수확
      │
      ▼
더 많은 프로토콜 수수료
      │
      ▼
더 많은 SNOW buyback
      │
      ▼
sSNOW 가치 ↑ (수익률 ↑)
      │
      ▼
더 많은 유저 유입 ← 반복
```

### 7-2. Cross-Protocol 시너지

프로토콜 간 수익이 서로를 강화하는 구조:

```
┌─────────────┐     가격 발견      ┌─────────────┐
│  DEX        │ ──────────────────→│  Lending     │
│  swap fee ──│─┐                  │  (Morpho)    │
└─────────────┘ │   담보 유동성    │──interest──┐ │
                │ ←────────────────│            │ │
                │                  └────────────│─┘
                │                               │
                │  ┌─────────────┐              │
                │  │ Yield Vault │              │
                │  │  (Beefy)    │──harvest──┐  │
                │  │  ←LP 예치───│           │  │
                │  └─────────────┘           │  │
                │                            │  │
                │  ┌─────────────┐           │  │
                │  │ StableSwap  │           │  │
                │  │  sbUSD/USDC │─fee──┐    │  │
                │  └─────────────┘      │    │  │
                │                       │    │  │
                ▼                       ▼    ▼  ▼
           ┌────────────────────────────────────┐
           │        Revenue Pool                │
           │    ──→ SNOW buyback ──→ sSNOW ↑    │
           └────────────────────────────────────┘
```

**구체적 시너지 예시:**

1. **DEX → Lending**: DEX에서 거래 활발 → 토큰 가격 발견 → Morpho 오라클 신뢰도 ↑ → 대출 수요 ↑
2. **Lending → DEX**: 대출로 레버리지 → DEX 거래량 ↑ → swap fee ↑
3. **DEX → Vault**: DEX LP 토큰 → Yield Vault에 자동 복리 → LP 잔류 인센티브 ↑
4. **Vault → Lending**: Vault가 Morpho에 자동 공급 → Lending TVL ↑ → 이자 수익 ↑
5. **StableSwap → 전체**: sbUSD/USDC 페깅 안정 → sbUSD 신뢰도 ↑ → 대출/거래 수요 ↑

---

## 8. 수익 시뮬레이션

### 8-1. 가정

| 항목 | 보수적 | 기본 | 낙관적 |
|------|--------|------|--------|
| DEX 일 거래량 | $100K | $500K | $2M |
| Lending TVL | $1M | $5M | $20M |
| Vault TVL | $500K | $2M | $10M |
| StableSwap 일 거래량 | $50K | $200K | $1M |
| DEX 평균 수수료 | 0.30% | 0.30% | 0.30% |
| Lending 이자 스프레드 | 10% | 10% | 10% |
| 평균 대출 이자율 | 5% | 8% | 12% |
| Vault 성과 수수료 | 4.5% | 4.5% | 4.5% |
| 평균 Vault APY | 10% | 15% | 25% |

### 8-2. 연간 수익 추정

| 수익 소스 | 보수적 | 기본 | 낙관적 |
|-----------|--------|------|--------|
| DEX swap fee | $109.5K | $547.5K | $2.19M |
| Lending spread | $50K | $400K | $2.4M |
| Vault performance | $2.25K | $13.5K | $112.5K |
| StableSwap fee | $7.3K | $29.2K | $146K |
| **Total Revenue** | **$169K** | **$990K** | **$4.85M** |
| sSNOW 분배 (92%) | $155K | $911K | $4.46M |

### 8-3. sSNOW 수익률

SNOW 시가총액 = $10M 가정, staking ratio 50% (= $5M staked):

| 시나리오 | 연간 sSNOW 분배 | sSNOW APY |
|----------|----------------|-----------|
| 보수적 | $155K | **3.1%** |
| 기본 | $911K | **18.2%** |
| 낙관적 | $4.46M | **89.2%** |

> 이 수익률은 **100% Real Yield** (토큰 인플레이션 0%)입니다.
> 같은 조건에서 대부분의 DeFi 프로토콜은 토큰 인플레이션으로 수익률을 부풀립니다.

---

## 9. 컨트랙트 아키텍처

### 9-1. 전체 구조

```
┌──────────────────────────────────────────────────────────┐
│                     User Layer                            │
│  SNOW.sol                sSNOW.sol                        │
│  (ERC-20)                (ERC-4626 Vault)                 │
│                          ┌─ deposit(SNOW)                 │
│                          ├─ withdraw(SNOW)                │
│                          ├─ convertToAssets()              │
│                          └─ cooldown / earlyExit           │
└──────────────────────────────┬───────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────┐
│                  Revenue Layer                            │
│                                                          │
│  RevenueDistributor.sol                                  │
│  ├─ collectAndDistribute()     ← keeper/bot 호출         │
│  ├─ 수익 비율 적용 (92% / 5% / 3%)                       │
│  └─ BuybackEngine 호출                                   │
│                                                          │
│  BuybackEngine.sol                                       │
│  ├─ executeBuyback()            ← TWAP 분산 매수         │
│  ├─ 수익 토큰 → DEX swap → SNOW                         │
│  └─ SNOW → sSNOW Vault 추가                             │
└──────────────────────────────┬───────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────┐
│                 Fee Collection Layer                      │
│                                                          │
│  FeeCollectorRegistry.sol                                │
│  ├─ registerCollector(protocol, collector)                │
│  ├─ removeCollector(protocol)                            │
│  └─ getAllCollectors() → address[]                        │
│                                                          │
│  ┌────────────────┐ ┌────────────────┐                   │
│  │DexFeeCollector │ │LendFeeCollector│                   │
│  │                │ │                │                   │
│  │ DEX pool에서   │ │ Morpho에서     │                   │
│  │ swap fee 수집  │ │ interest 수집  │                   │
│  └────────────────┘ └────────────────┘                   │
│  ┌────────────────┐ ┌────────────────────┐               │
│  │VaultFeeCollect.│ │StableSwapFeeCollect│               │
│  │                │ │                    │               │
│  │ Vault harvest  │ │ StableSwap pool    │               │
│  │ fee 수집       │ │ fee 수집           │               │
│  └────────────────┘ └────────────────────┘               │
└──────────────────────────────────────────────────────────┘
```

### 9-2. 컨트랙트 목록

| 컨트랙트 | 설명 | 예상 LOC |
|----------|------|----------|
| `SNOW.sol` | ERC-20 거버넌스 토큰 (고정 발행) | ~30 |
| `sSNOW.sol` | ERC-4626 수익 복리 Vault + 쿨다운 | ~200 |
| `RevenueDistributor.sol` | 수익 수집 + 비율 분배 | ~150 |
| `BuybackEngine.sol` | TWAP buyback + sSNOW 추가 | ~180 |
| `FeeCollectorRegistry.sol` | FeeCollector 등록/관리 | ~60 |
| `DexFeeCollector.sol` | DEX swap fee 수집 | ~80 |
| `LendFeeCollector.sol` | Morpho interest spread 수집 | ~80 |
| `VaultFeeCollector.sol` | Yield Vault harvest fee 수집 | ~60 |
| `StableSwapFeeCollector.sol` | StableSwap fee 수집 | ~60 |
| `CooldownManager.sol` | 쿨다운 기간/패널티 관리 | ~80 |
| `SnowballGovernor.sol` | OpenZeppelin Governor 기반 | ~100 |
| `SnowballTimelock.sol` | TimelockController | ~30 |
| **합계** | | **~1,110** |

### 9-3. 핵심 컨트랙트 인터페이스

#### sSNOW.sol

```solidity
interface IsSNOW is IERC4626 {
    // 쿨다운 관련
    function requestWithdraw(uint256 sSNOWAmount) external;
    function completeWithdraw() external returns (uint256 snowAmount);
    function cancelWithdraw() external;
    function earlyExit() external returns (uint256 snowAmount); // 패널티 적용

    // 조회
    function cooldownEnd(address user) external view returns (uint256 timestamp);
    function pendingWithdraw(address user) external view returns (uint256 sSNOWAmount);
    function pricePerShare() external view returns (uint256); // 1 sSNOW = ? SNOW

    // 이벤트
    event WithdrawRequested(address indexed user, uint256 sSNOWAmount, uint256 cooldownEnd);
    event WithdrawCompleted(address indexed user, uint256 snowAmount);
    event EarlyExitExecuted(address indexed user, uint256 snowAmount, uint256 penaltyAmount);
}
```

#### RevenueDistributor.sol

```solidity
interface IRevenueDistributor {
    // 수익 수집 + 분배 (keeper 호출)
    function collectAndDistribute() external;

    // 분배 비율 설정 (거버넌스)
    function setDistributionRatio(
        uint256 sSNOWBps,    // 기본 9200 (92%)
        uint256 treasuryBps, // 기본 500  (5%)
        uint256 insuranceBps // 기본 300  (3%)
    ) external; // onlyGovernance, sum must == 10000

    // 조회
    function totalDistributed() external view returns (uint256);
    function lastDistribution() external view returns (uint256 timestamp);
    function pendingRevenue() external view returns (uint256);

    // 이벤트
    event RevenueDistributed(
        uint256 toSSNOW,
        uint256 toTreasury,
        uint256 toInsurance,
        uint256 timestamp
    );
}
```

#### BuybackEngine.sol

```solidity
interface IBuybackEngine {
    // TWAP buyback 실행
    function executeBuyback(
        address tokenIn,    // 수익 토큰 (sbUSD, USDC, wCTC 등)
        uint256 amountIn,
        uint256 minSnowOut  // 최소 SNOW 수량 (슬리피지 보호)
    ) external returns (uint256 snowBought);

    // 매수한 SNOW를 sSNOW Vault에 추가
    function compoundToVault() external returns (uint256 snowCompounded);

    // 조회
    function totalBuybackVolume() external view returns (uint256);
    function pendingCompound() external view returns (uint256 snowAmount);

    // 이벤트
    event Buyback(address indexed tokenIn, uint256 amountIn, uint256 snowOut);
    event Compounded(uint256 snowAmount, uint256 newPricePerShare);
}
```

---

## 10. 보안 및 리스크

### 10-1. 컨트랙트 리스크

| 리스크 | 심각도 | 대응 |
|--------|--------|------|
| sSNOW Vault 해킹 | Critical | 감사 2회 이상, 보험 기금, 입금 한도 점진적 확대 |
| Buyback 가격 조작 | High | TWAP 분산 매수, 단일 거래 한도, 오라클 가격 검증 |
| FeeCollector 조작 | High | Timelock + 멀티시그 거버넌스 |
| Flash loan 공격 | Medium | sSNOW deposit 후 같은 블록 withdraw 방지 |
| 거버넌스 공격 | Medium | 쿼럼 10%, Timelock 2일 |

### 10-2. 경제적 리스크

| 리스크 | 설명 | 대응 |
|--------|------|------|
| SNOW 가격 하락 | buyback 효율 저하 | 수익은 실제 수수료이므로 토큰 가격 무관하게 축적 |
| TVL 이탈 | 수수료 감소 → APY 하락 | 쿨다운 7일이 급격한 이탈 방지, 높은 수익 분배율이 잔류 인센티브 |
| 프로토콜 수익 감소 | 거래량/대출 감소 | 다중 수익 소스로 분산, 단일 프로토콜 의존도 낮음 |
| 경쟁 프로토콜 등장 | 유저 이탈 | 통합 DeFi 경험 + 높은 분배율이 경쟁 우위 |

### 10-3. 보안 조치

1. **감사**: 최소 2개 감사 업체 (Certik, Trail of Bits, OpenZeppelin 중 택)
2. **버그 바운티**: Immunefi에 $100K+ 바운티 등록
3. **점진적 배포**: 입금 한도 $100K → $1M → 무제한 (2주 간격)
4. **비상 정지**: Guardian 멀티시그(3/5)가 sSNOW 입출금 일시 정지 가능
5. **Timelock**: 모든 거버넌스 실행에 2일 대기

---

## 11. 배포 로드맵

### Phase 1: 토큰 런칭 (Week 1-2)
- [ ] SNOW.sol 배포 (고정 발행)
- [ ] 유동성 부트스트랩 (DEX에 SNOW/wCTC, SNOW/sbUSD 풀)
- [ ] 커뮤니티 에어드랍 시작

### Phase 2: sSNOW 런칭 (Week 3-4)
- [ ] sSNOW.sol 배포 (ERC-4626 Vault)
- [ ] CooldownManager 배포
- [ ] 입금 한도 $100K로 시작

### Phase 3: Revenue Union 연결 (Week 5-6)
- [ ] FeeCollector 4종 배포 (DEX, Lending, Vault, StableSwap)
- [ ] RevenueDistributor 배포
- [ ] BuybackEngine 배포
- [ ] 첫 수익 분배 실행

### Phase 4: 거버넌스 활성화 (Week 7-8)
- [ ] SnowballGovernor 배포
- [ ] SnowballTimelock 배포
- [ ] 첫 거버넌스 제안 (테스트)
- [ ] 입금 한도 제거

---

## 12. 기존 모델과의 비교

| | Curve ve | Velodrome ve(3,3) | Aave stkAAVE | **Snowball sSNOW** |
|--|---------|-------------------|-------------|---------------------|
| 수익 소스 | DEX fee | DEX fee + bribes | Lending spread | **전 프로토콜 통합** |
| 잠금 | 4년 | 4년 | 10일 쿨다운 | **7일 쿨다운** |
| 인플레이션 | CRV emission | VELO emission | AAVE (보험용) | **없음 (Real Yield)** |
| 수익 분배 | ~50% | ~70% | ~0% (보험만) | **92%** |
| 자동 복리 | X (수동 claim) | X (수동) | X | **O (자동)** |
| 투표 의무 | O (매주) | O (매주) | X | **X (불필요)** |
| 교차 프로토콜 | X | X | X | **O (DEX+Lend+Vault)** |
| 진입 장벽 | 높음 | 높음 | 중간 | **낮음** |

---

## 13. 용어 정리

| 용어 | 설명 |
|------|------|
| SNOW | Snowball 거버넌스 토큰 (ERC-20, 고정 발행 1억개) |
| sSNOW | Staked SNOW. ERC-4626 Vault 토큰. 보유만 해도 수익 자동 복리 |
| Revenue Union | 전 프로토콜 수수료를 하나로 모으는 구조 |
| Buyback | 수익 토큰으로 DEX에서 SNOW를 매수하는 행위 |
| Compound | 매수한 SNOW를 sSNOW Vault에 추가하여 교환비를 높이는 행위 |
| Cooldown | sSNOW unstake 요청 후 출금까지 대기 기간 (7일) |
| Early Exit | 쿨다운 완료 전 출금. 2% 패널티 적용 |
| Real Yield | 토큰 인플레이션 없이 실제 프로토콜 수수료에서 발생하는 수익 |
| Flywheel | 수익 → buyback → 가치 상승 → 유저 유입 → 수익 ↑ 선순환 |
| FeeCollector | 각 프로토콜에서 수수료를 수집하는 컨트랙트 |
| Guardian | 비상 정지 권한을 가진 멀티시그 (3/5) |
