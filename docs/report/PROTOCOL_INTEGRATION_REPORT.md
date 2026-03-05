# Snowball 프로토콜 통합 운영 최적화 보고서

> 작성일: 2026-03-04
> 대상: Snowball DeFi 생태계 (Creditcoin Testnet)
> 프로토콜: Liquity V2 (CDP) + Morpho Blue (Lending) + Uniswap V3 (DEX) + Yield Vault

---

## 1. 현재 아키텍처 분석

### 1.1 토큰 흐름도

```
Native CTC
    │
    ▼ deposit()
  wCTC (ERC20)
    ├──→ [Liquity] 담보 → sbUSD 발행
    ├──→ [Morpho]  담보 → sbUSD 대출
    ├──→ [DEX]     wCTC/sbUSD, wCTC/USDC 풀 유동성
    └──→ [Yield]   StrategyWCTCMorpho → Morpho에 공급

  sbUSD (CDP 스테이블코인)
    ├──→ [StabilityPool] 청산 흡수 → wCTC 보상 수령
    ├──→ [Morpho]  대출 토큰 (wCTC/sbUSD, lstCTC/sbUSD 마켓)
    ├──→ [DEX]     sbUSD/USDC, wCTC/sbUSD 풀 유동성
    └──→ [Yield]   StrategySbUSDStabilityPool + StrategySbUSDMorpho
```

### 1.2 발견된 비효율성

| # | 문제 | 영향 | 심각도 |
|---|------|------|--------|
| 1 | **이중 오라클 시스템** — Liquity(`CreditcoinPriceFeed`)와 Morpho(`CreditcoinOracle`)가 별도 컨트랙트, 별도 `setPrice()` 호출 | 가격 불일치 리스크, 운영 비용 2배 | 높음 |
| 2 | **IInterestRouter가 빈 구현** — sbUSD 이자의 25%가 ActivePool에 묶여있음 | 수익 누수 (사용되지 않는 자금) | 높음 |
| 3 | **수확 시 슬리피지 보호 없음** — `amountOutMinimum: 0` | 샌드위치 공격에 노출 | 높음 |
| 4 | **Morpho 전략의 이중 스왑** — sbUSD→wCTC→sbUSD (수수료 징수 위해) | 불필요한 가스비 + 슬리피지 | 중간 |
| 5 | **고아 오라클** — `BTCMockOracle` 배포됨, 어디에서도 미사용 | 혼란, 유지보수 부담 | 낮음 |
| 6 | **Uniswap V3 vs Algebra 병존** — 두 DEX 패키지가 동시 존재 | 유동성 분산, 코드 혼란 | 중간 |

---

## 2. 운영 비용 최소화 전략

### 2.1 통합 오라클 시스템 (핵심 권장)

**현재**: 가격 업데이트마다 2개 컨트랙트에 각각 `setPrice()` 호출 필요

**제안**: 단일 Canonical Oracle + 프로토콜별 어댑터 패턴

```
                  ┌─────────────────────┐
  오라클 운영자 → │  SnowballOracle      │ ← 가격 1회 업데이트
                  │  (단일 소스 of truth) │
                  └────┬────────┬───────┘
                       │        │
              ┌────────┘        └────────┐
              ▼                          ▼
   ┌──────────────────┐     ┌──────────────────┐
   │ LiquityAdapter   │     │ MorphoAdapter     │
   │ (IPriceFeed)     │     │ (IOracle)         │
   │ fetchPrice()     │     │ price() → 1e36    │
   │ → (price, false) │     │ 스케일 변환       │
   └──────────────────┘     └──────────────────┘
```

**효과**:
- 오라클 업데이트 트랜잭션 50% 절감 (2회→1회)
- 프로토콜 간 가격 불일치 제거
- 추후 Pyth/Chainlink 교체 시 어댑터만 수정

**참고 사례**: Sky Protocol(MakerDAO)은 Chainlink + Chronicle 오라클을 단일 Medianizer를 통해 여러 SubDAO에 공급

### 2.2 IInterestRouter 활성화 — 이자 수익 재활용

**현재**: Liquity V2의 sbUSD 이자 중 25%가 `ActivePool`에 잠겨 사용 불가 (75%만 StabilityPool로 이동)

**제안**: `IInterestRouter` 구현체를 만들어 25% 이자를 생태계에 재투자

```solidity
contract SnowballInterestRouter is IInterestRouter {
    address public morphoVault;   // MetaMorpho sbUSD 볼트
    address public treasury;

    receive() external payable {}

    // ActivePool이 sbUSD를 전송하면 자동으로 분배
    function routeInterest(uint256 amount) external {
        uint256 morphoShare = amount * 70 / 100;  // 70% → Morpho 유동성
        uint256 treasuryShare = amount - morphoShare; // 30% → 재무부

        sbUSD.transfer(morphoVault, morphoShare);
        sbUSD.transfer(treasury, treasuryShare);
    }
}
```

**효과**:
- 유휴 자금 제로화 — sbUSD 이자의 100% 활용
- Morpho 대출 시장 유동성 자동 보강
- CDP→Lending 간 자동 자금 순환 구축

**참고 사례**: Aave의 GHO 수수료가 Safety Module과 buyback에 자동 분배되는 구조와 동일

### 2.3 Keeper/Harvester 비용 최적화

**현재 수확 가스 비용 (추정)**:

| 전략 | 가스 사용량 | 주요 비용 |
|------|-----------|----------|
| SbUSD-StabilityPool | ~300K gas | SP인출 + DEX스왑 + SP재입금 |
| SbUSD-Morpho | ~500K gas | Morpho인출 + 이중스왑 + Morpho재입금 |
| WCTC-Morpho | ~250K gas | Morpho인출 + 수수료 + 재입금 (스왑 없음) |
| USDC-Morpho | ~500K gas | Morpho인출 + 이중스왑 + Morpho재입금 |

**최적화 방안**:

**A. 배치 수확 (Multicall Router)**

```solidity
contract HarvestRouter {
    function harvestAll(address[] calldata strategies) external {
        for (uint i; i < strategies.length; i++) {
            ISnowballStrategy(strategies[i]).harvest();
        }
    }
}
```
- 4개 전략 개별 수확 시 4 × 21,000 = 84,000 가스 절약 (기본 트랜잭션 비용)
- Keeper가 단일 트랜잭션으로 전체 수확 가능

**B. Morpho 전략 수수료 징수 방식 개선**

현재 `StrategySbUSDMorpho._claim()`의 흐름:
```
accrued sbUSD profit → swap sbUSD→wCTC → charge fees → swap wCTC→sbUSD → re-deposit
```
두 번의 DEX 스왑이 발생하며 슬리피지가 2회 적용됨.

**개선안**: 수수료를 sbUSD로 직접 징수하고 wCTC 스왑은 treasury/strategist가 별도 수행

```
accrued sbUSD profit → 4.5% sbUSD fee → treasury/strategist → 나머지 re-deposit
```
- DEX 스왑 2회 → 0회 (Morpho 전략에서)
- 가스 ~240K 절약, 슬리피지 제거
- 단, 수수료가 sbUSD로 모임 (treasury가 원하면 별도 스왑)

---

## 3. 프로토콜 간 상호 운용성 강화

### 3.1 ERC-4626 표준화 — 공유 유동성 레이어

**현재**: `SnowballYieldVault`는 커스텀 ERC20 share 토큰 (Beefy 스타일)
**제안**: ERC-4626 표준으로 업그레이드

```
SnowballYieldVault (ERC-4626)
    │
    ├── Morpho에서 담보로 사용 가능 (mooSbUSD → Morpho collateral)
    ├── DEX에서 유동성 페어로 사용 가능 (mooSbUSD/USDC)
    └── 외부 프로토콜 통합 자동 호환
```

**ERC-4626이 필요한 이유**:
- MetaMorpho는 이미 ERC-4626 — Snowball 볼트와 MetaMorpho를 동일 표준으로 통합 가능
- 2025년 12월 기준 ERC-4626 호환 볼트 1,300+개, TVL $15B+
- Balancer V3의 Boosted Pool은 ERC-4626 토큰만 지원

**구현 난이도**: 낮음 — OpenZeppelin v5에 `ERC4626` 베이스 컨트랙트 포함

### 3.2 유니버셜 라우터 — 원클릭 크로스 프로토콜 작업

**현재**: 사용자가 sbUSD 발행→Morpho 공급→DEX LP를 각각 별도 트랜잭션으로 실행

**제안**: Uniswap Universal Router 패턴으로 배치 실행

```solidity
contract SnowballRouter {
    enum Action { OPEN_TROVE, SUPPLY_MORPHO, ADD_LIQUIDITY, DEPOSIT_VAULT }

    function execute(Action[] calldata actions, bytes[] calldata data) external {
        for (uint i; i < actions.length; i++) {
            if (actions[i] == Action.OPEN_TROVE) _openTrove(data[i]);
            else if (actions[i] == Action.SUPPLY_MORPHO) _supplyMorpho(data[i]);
            else if (actions[i] == Action.ADD_LIQUIDITY) _addLiquidity(data[i]);
            else if (actions[i] == Action.DEPOSIT_VAULT) _depositVault(data[i]);
        }
    }
}
```

**사용 예시 — "1클릭 레버리지 수익 농사"**:
1. wCTC 담보로 sbUSD 발행 (Liquity)
2. sbUSD를 Morpho에 공급 (이자 수익)
3. 남은 sbUSD/USDC를 DEX LP에 투입

→ 3개 트랜잭션이 1개로 통합

**참고 사례**:
- Uniswap Universal Router: 단일 `execute()`로 V2+V3+V4+NFT 작업 배치
- Balancer V3: 단일 `PoolManager`로 모든 풀 관리

### 3.3 플래시론 기반 일회 청산/차익거래

```
[하나의 트랜잭션]
1. Morpho에서 sbUSD 플래시론
2. Liquity에서 under-collateralized 트로브 청산 → wCTC 획득
3. DEX에서 wCTC → sbUSD 스왑
4. 플래시론 상환 + 수수료
5. 이익 인출
→ 실패 시 전체 롤백 (무위험)
```

**효과**:
- 청산 봇에 자본 불필요 (플래시론으로 즉시 차입)
- 프로토콜 건강성 자동 유지
- 차익거래가 DEX 가격을 오라클 가격에 수렴시킴

### 3.4 수익 루프 (Yield Loop) — DeFi 성장 엔진

**2025년 가장 성공적인 DeFi 성장 패턴**: Ethena-Pendle-Aave 루프 ($12B USDe 공급량 달성)

**Snowball 버전**:

```
[수익 루프]
1. wCTC → Liquity에 담보 → sbUSD 발행 (3% 이자)
2. sbUSD → Yield Vault 입금 → mooSbUSD 수령 (SP 수익 ~5-8%)
3. mooSbUSD → Morpho에 담보 → USDC 대출
4. USDC → DEX에서 wCTC로 스왑
5. wCTC → 1로 돌아감 (루프 완성)

순이익 = SP 수익률 - Liquity 이자율 - Morpho 대출 이자
```

**전제 조건**:
- mooSbUSD가 Morpho 담보로 인정되려면 ERC-4626 표준 필요 (3.1 참조)
- 오라클이 mooSbUSD의 가격을 인식해야 함
- 건전한 청산 메커니즘 필수

**참고 사례**: Ethena sUSDe → Pendle PT-sUSDe → Aave 담보 → USDe 대출 → 재스테이킹 루프가 Aave 예치금 $6.6B 기여

---

## 4. 거버넌스 & 토큰 모델 제안

### 4.1 추천 모델: ve(3,3) + SubDAO 하이브리드

**업계 사례 분석**:

| 모델 | 프로젝트 | 장점 | 단점 |
|------|---------|------|------|
| SubDAO (Stars) | Sky/MakerDAO | 프로토콜 독립성 유지 | 복잡한 거버넌스 |
| ve(3,3) | Aerodrome/Velodrome | DEX 유동성 인센티브 최적 | CDP/Lending에 부적합 |
| veCRV | Curve | 검증된 게이지 투표 | 거버넌스 공격 (Curve Wars) |
| 통합 토큰 | Frax (FXS→FRAX) | 심플, 가스 토큰 겸용 | 모든 리스크가 하나로 집중 |

**Snowball 권장안**: 단일 `SNOW` 토큰 + 게이지 투표

```
SNOW 토큰
    │
    ▼ 락업 (1주~4년)
  veSNOW (투표력 = 잠금량 × 기간)
    │
    ├── 게이지 투표 → 어떤 Yield Vault에 인센티브 배분할지 결정
    │     ├── sbUSD-StabilityPool 볼트: 30%
    │     ├── sbUSD-Morpho 볼트: 25%
    │     ├── wCTC-Morpho 볼트: 25%
    │     └── DEX LP 보상: 20%
    │
    ├── 프로토콜 수수료 수령 (Yield Vault 수수료의 일부)
    │
    └── 거버넌스 투표
          ├── 오라클 가격 피드 소스 변경
          ├── Morpho 마켓 파라미터 (LLTV, IRM)
          ├── Liquity 파라미터 조정
          └── 새 전략/볼트 승인
```

**왜 이 모델인가**:
- ve(3,3)의 유동성 인센티브 정렬 + SubDAO의 프로토콜 독립성
- Yield Vault가 이미 존재하므로 게이지 투표 대상이 명확
- 수수료 분배로 토큰 가치 뒷받침 (프로토콜 수익 → veSNOW 보유자)

---

## 5. 구현 우선순위 로드맵

### Phase 1: 즉시 실행 (1-2주) — 비용 절감

| 작업 | 효과 | 난이도 |
|------|------|--------|
| **통합 오라클 구현** | 오라클 운영비 50%↓, 가격 불일치 제거 | 중간 |
| **슬리피지 보호 추가** (`amountOutMinimum`) | 샌드위치 공격 방지 | 낮음 |
| **배치 수확 라우터** | Keeper 가스비 ~20%↓ | 낮음 |
| **고아 오라클/목 정리** | 코드베이스 명확화 | 낮음 |

### Phase 2: 단기 (2-4주) — 수익 극대화

| 작업 | 효과 | 난이도 |
|------|------|--------|
| **IInterestRouter 구현** | sbUSD 이자 25% 재활용 | 중간 |
| **Morpho 전략 수수료 개선** (이중 스왑 제거) | 가스 ~240K/수확 절약 | 중간 |
| **ERC-4626 볼트 업그레이드** | 외부 통합 호환성 확보 | 중간 |

### Phase 3: 중기 (1-2개월) — 상호 운용성

| 작업 | 효과 | 난이도 |
|------|------|--------|
| **SnowballRouter (유니버셜 라우터)** | 크로스 프로토콜 1클릭 작업 | 높음 |
| **플래시론 청산 봇** | 프로토콜 건강성 자동 유지 | 중간 |
| **수익 루프 구현** | TVL 성장 핵심 동력 | 높음 |

### Phase 4: 장기 (2-3개월) — 거버넌스

| 작업 | 효과 | 난이도 |
|------|------|--------|
| **SNOW 토큰 + veSNOW** | 통합 거버넌스 + 인센티브 | 높음 |
| **게이지 투표 시스템** | 유동성 배분 최적화 | 높음 |
| **메인넷 오라클 통합** (Pyth/Chainlink) | 프로덕션 준비 | 중간 |

---

## 6. 경쟁 생태계 벤치마크

| 생태계 | CDP | Lending | DEX | 통합 수준 | TVL |
|--------|-----|---------|-----|----------|-----|
| **Sky (MakerDAO)** | USDS | Spark (Morpho 기반) | Uni/Curve | SubDAO 구조, 부분 통합 | $10B+ |
| **Curve** | crvUSD | Curve Lending | Curve AMM | 완전 통합 (LLAMMA=AMM+CDP) | $2B+ |
| **Frax** | frxUSD | FraxLend | FraxSwap | 수직 통합 + 자체 L2 | $1.5B+ |
| **Aave+GHO** | GHO | Aave V3/V4 | 외부 DEX | Hub-and-Spoke, 크로스체인 | $20B+ |
| **Snowball** | sbUSD | Morpho Blue | Uniswap V3 | Yield Vault로 느슨한 통합 | 테스트넷 |

**Snowball의 강점**: 3개 검증된 원본 포크를 보유하며 Yield Vault가 이미 통합 레이어 역할 수행
**Snowball의 약점**: 프로토콜 간 직접적인 온체인 연결 부재, 통합 거버넌스 없음

---

## 7. 핵심 요약

1. **오라클 통합이 가장 시급** — 운영 비용 절감과 보안 모두에 직결
2. **IInterestRouter 활성화로 유휴 자금 제거** — 이자의 25%를 Morpho로 재순환
3. **ERC-4626 표준화가 상호 운용성의 기반** — 볼트 토큰을 담보/LP로 재사용
4. **수익 루프가 TVL 성장의 핵심** — Ethena+Pendle+Aave 패턴이 $12B 규모 증명
5. **veSNOW 거버넌스로 인센티브 정렬** — 유동성 배분을 토큰 보유자가 결정

---

## 참고 자료

- [Morpho Blue Architecture](https://www.cache256.com/ecosystem/morpho-blue-modular-lending-infrastructure-analysis/)
- [EulerSwap — DEX+Lending 통합](https://www.euler.finance/blog/introducing-eulerswap)
- [Ethena Yield Loops ($12B)](https://www.theblock.co/post/368677)
- [Balancer V3 Boosted Pools (ERC-4626)](https://docs.balancer.fi/concepts/explore-available-balancer-pools/boosted-pool.html)
- [Uniswap Universal Router](https://docs.uniswap.org/contracts/universal-router/overview)
- [Sky Protocol SubDAO 모델](https://messari.io/project/sky-protocol/profile)
- [Aerodrome ve(3,3) 합병](https://thedefiant.io/news/defi/dromos-labs-merges-aerodrome-and-velodrome-into-new-dex-aero)
- [Frax North Star — 수직 통합](https://docs.frax.finance)
- [Aave V4 + GHO 로드맵](https://cryptoadventure.com/aave-aave-review-2026-lending-gho-safety-and-v4-roadmap/)
- [Pyth vs Chainlink 비용 비교](https://onekey.so/blog/ecosystem/pyth-vs-link-a-comparative-analysis-of-two-oracle-giants-in-2025/)
- [ERC-4626 DeFi 생태계 ($15B TVL)](https://medium.com/@smileycrypt/why-erc-4626-changed-defi-forever)
