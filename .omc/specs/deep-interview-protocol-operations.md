# Deep Interview Spec: Snowball Protocol Operations Playbook

## Metadata
- Interview ID: protocol-operations-20260318
- Rounds: 9
- Final Ambiguity Score: 19.0%
- Type: brownfield
- Generated: 2026-03-18
- Threshold: 20%
- Status: PASSED

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.90 | 35% | 0.315 |
| Constraint Clarity | 0.75 | 25% | 0.188 |
| Success Criteria | 0.75 | 25% | 0.188 |
| Context Clarity | 0.80 | 15% | 0.120 |
| **Total Clarity** | | | **0.810** |
| **Ambiguity** | | | **19.0%** |

## Goal

Snowball Protocol의 운영 플레이북 문서를 작성한다. 4개 핵심 모듈(DEX, CDP, Lending, Market Making)의 운영 방침, 수익 배분 구조, 핵심 KPI를 명확히 정리하여 팀이 참고할 수 있는 단일 운영 가이드를 만든다.

## 운영 전략 요약

### 1. DEX (ve(3,3) 모델)
- **방식:** 기존 Staker 코드 활용 — emission + **fee 공유** (차별점)
- **Emission 방식:** 프로토콜 복합 수익(swap fee + lending 이자 + 기타)에서 특정 풀에 emission 배분
- **전략적 풀:** sbUSD/USDT, dnUSDT 풀 등 — sbUSD 민팅 장려 목적
- **수익 배분:** 70% LP / 30% 프로토콜

### 2. CDP (Liquity)
- **운영 철학:** sbUSD 발행량 목표 중심
- **왜:** sbUSD 유통량이 DEX 풀 유동성의 기반. 발행량 ↑ = 풀 깊이 ↑
- **방법:** 발행량 부족 시 → CDP 개설 인센티브(emission) 증가
- **핵심 지표:** sbUSD 총 유통량, 일일 신규 민팅량

### 3. Lending (Morpho)
- **운영 철학:** 사용자 예치 유도 (emission/인센티브)
- **현재 마켓:** wCTC/sbUSD (77%), lstCTC/sbUSD (77%), sbUSD/USDC (90%)
- **IRM:** AdaptiveCurveIRM 온체인 자동 조절
- **방법:** supply 인센티브로 예치 유도 → 대출 가능 유동성 확보

### 4. Market Making
- **방식:** 팀이 직접 LP 공급 (프로토콜 트레저리)
- **목적:** 초기 유동성 확보, 사용자 경험 보장
- **대상:** 주요 DEX 풀에 직접 유동성 제공

### 5. Oracle
- **운영:** 팀 직접 운영 (가격 업데이트 주체)
- **스케일:** 1e36 (Morpho Blue 표준)

## 수익 흐름 구조
```
[Protocol Revenue Sources]
├── DEX Swap Fees
├── Lending Interest (Morpho/Liquity)
└── Other Revenue
         │
         ▼
[Revenue Distribution]
├── 70% → LP Providers (emission + fee share)
└── 30% → Protocol Treasury
              │
              ▼
     [Protocol Treasury]
     ├── Market Making (direct LP)
     ├── Emission budget for strategic pools
     └── Operations cost
```

## 핵심 KPI (3대 지표)
1. **TVL (Total Value Locked):** 전체 예치 자산 규모
2. **DAU (Daily Active Users):** 일일 활성 사용자 수
3. **sbUSD Supply:** sbUSD 총 유통량

## Constraints
- 예산 제한 — 코드/자동화 기반 운영 우선
- 테스트넷 환경 (Creditcoin Testnet)
- 팀 직접 Oracle 운영
- 팀 직접 Market Making (트레저리)
- 대시보드는 후순위 — 문서 우선

## Non-Goals
- ve(3,3) 풀 컨트랙트 구현 (메인넷 단계)
- 거버넌스 투표 시스템 (메인넷 단계)
- 운영 대시보드 코드 구현 (이번 스코프 아님)
- 외부 Market Maker 유치
- bribe 마켓플레이스

## Acceptance Criteria
- [ ] 운영 플레이북 문서 작성 완료 (docs/guide/operations-playbook.md)
- [ ] 4개 모듈별 운영 방침 명시 (DEX, CDP, Lending, MM)
- [ ] 수익 배분 구조 도식화 (70/30 비율)
- [ ] 핵심 KPI 3개 정의 및 측정 방법 명시
- [ ] Emission 배분 전략 (어떤 풀에, 왜, 얼마나)
- [ ] Oracle 운영 가이드 포함
- [ ] 팀 MM LP 운영 가이드 포함

## Technical Context

### 기존 코드베이스
- **Staker:** `domains/defi/staker/` — emission + fee 공유에 활용
- **DEX:** Uniswap V3 포크, 5개 풀 (wCTC/USDC, lstCTC/USDC, wCTC/sbUSD, sbUSD/USDC, lstCTC/wCTC)
- **Liquity:** wCTC/lstCTC 두 branch, Stability Pool
- **Morpho:** 3개 마켓, AdaptiveCurveIRM
- **Yield Vaults:** Beefy V7, 4개 활성 vault
- **Oracle:** CreditcoinOracle, 팀 직접 운영, 1e36 스케일

## Ontology (Key Entities)

| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| DEX (ve(3,3)) | core domain | pools, swap fee, emission rate | receives emission from Treasury |
| CDP/Liquity | core domain | branches, sbUSD supply, CR | generates sbUSD for DEX pools |
| Lending/Morpho | core domain | markets, IRM, utilization | receives supply incentives |
| Market Making | core domain | LP positions, target pools | funded by Protocol Treasury |
| Emission | core domain | source (revenue), target (pools), amount | distributed to LP via Staker |
| Fee Sharing | core domain | fee %, LP share (70%), protocol share (30%) | split between LP and Treasury |
| Staker Contract | supporting | emission + fee distribution | manages LP rewards |
| Protocol Treasury | core domain | revenue sources, balance, allocation | funds MM + Emission |
| sbUSD Supply Target | core domain | total supply, daily minting | driven by CDP incentives |
| KPI Framework | core domain | TVL, DAU, sbUSD Supply | measures protocol health |
| Oracle | supporting | prices (1e36), tokens, update frequency | team-operated, used for valuation |

## Ontology Convergence

| Round | Entity Count | New | Changed | Stable | Stability Ratio |
|-------|-------------|-----|---------|--------|----------------|
| 1 | 5 | 5 | - | - | N/A |
| 2 | 8 | 3 | 0 | 5 | 63% |
| 3 | 9 | 1 | 0 | 8 | 89% |
| 4 | 10 | 1 | 0 | 9 | 90% |
| 5 | 10 | 0 | 0 | 10 | 100% |
| 6 | 11 | 1 | 0 | 10 | 91% |
| 7 | 11 | 0 | 0 | 11 | 100% |
| 8 | 11 | 0 | 0 | 11 | 100% |
| 9 | 11 | 0 | 0 | 11 | 100% |

## Interview Transcript
<details>
<summary>Full Q&A (9 rounds)</summary>

### Round 1
**Q:** "운영 전략을 정했다"고 하셨는데 — 문서화해서 팀이 참고할 수 있는 운영 플레이북을 만들고 싶은 건가요? 아니면 코드/대시보드로 구현하고 싶은 건가요?
**A:** 둘 다
**Ambiguity:** 82.5% (Goal: 0.30, Constraints: 0.05, Criteria: 0.05, Context: 0.30)

### Round 2
**Q:** ve(3,3) DEX 운영을 구체적으로 어떻게?
**A:** Staker 코드 활용, emission + fee 공유. 프로토콜 수익에서 특정 풀(sbUSD/USDT, dnUSDT)에 emission 배분.
**Ambiguity:** 70.3% (Goal: 0.50, Constraints: 0.15, Criteria: 0.10, Context: 0.40)

### Round 3
**Q:** CDP(Liquity) 운영 전략은? (4가지 옵션 설명 후)
**A:** sbUSD 발행량 목표 중심
**Ambiguity:** 64.5% (Goal: 0.55, Constraints: 0.20, Criteria: 0.15, Context: 0.50)

### Round 4 (CONTRARIAN MODE)
**Q:** Lending + Market Making 운영은? 테스트넷에서 MM이 진짜 필요한가?
**A:** 팀이 직접 LP 공급
**Ambiguity:** 56.0% (Goal: 0.70, Constraints: 0.25, Criteria: 0.20, Context: 0.55)

### Round 5
**Q:** Lending(Morpho) 운영은?
**A:** 사용자 예치 유도 (emission/인센티브)
**Ambiguity:** 49.3% (Goal: 0.80, Constraints: 0.30, Criteria: 0.25, Context: 0.60)

### Round 6 (SIMPLIFIER MODE)
**Q:** 핵심 KPI 3개를 고른다면?
**A:** TVL + DAU + sbUSD 유통량
**Ambiguity:** 36.8% (Goal: 0.85, Constraints: 0.35, Criteria: 0.60, Context: 0.65)

### Round 7
**Q:** Emission 재원은 구체적으로?
**A:** 복합 수익원 (swap fee + lending 이자 + 기타 수익 통합)
**Ambiguity:** 31.0% (Goal: 0.85, Constraints: 0.50, Criteria: 0.65, Context: 0.70)

### Round 8
**Q:** 수익 배분 비율은?
**A:** 70% LP / 30% 프로토콜
**Ambiguity:** 24.0% (Goal: 0.85, Constraints: 0.70, Criteria: 0.70, Context: 0.75)

### Round 9
**Q:** 대시보드를 어떻게 구현? 기존 /analytics 확장 vs 새 페이지?
**A:** 문서만 — 대시보드는 나중에
**Ambiguity:** 19.0% (Goal: 0.90, Constraints: 0.75, Criteria: 0.75, Context: 0.80)

</details>
