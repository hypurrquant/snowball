# 페르소나별 시뮬레이션 시나리오

## 활동 요약

| # | Label | DEX | Morpho Supply | Morpho Borrow | 비고 |
|---|-------|-----|---------------|---------------|------|
| 1 | Whale LP | LP 5풀 | 3 마켓 supply | - | DEX 메인 |
| 2 | Active Trader | 스왑 볼륨 | 3 마켓 supply | - | DEX 메인 |
| 3 | Arbitrageur | 스왑 볼륨 | 3 마켓 supply | - | DEX 메인 |
| 4 | Conservative Lender | - | 3 마켓 supply | - | Supply only |
| 5 | Moderate Borrower | sbUSD풀 LP | 3 마켓 supply + rebalance | wCTC/sbUSD (HF 7.26) | 안전 대출 |
| 6 | Aggressive Borrower | - | 3 마켓 supply + rebalance | wCTC/sbUSD (HF 78.1) | 유동성 부족 |
| 7 | Multi-Market | - | 3 마켓 supply + rebalance | lstCTC/sbUSD + sbUSD/USDC | 분산 대출 |
| 8 | DeFi Maximalist | sbUSD풀 LP | 3 마켓 supply | lstCTC/sbUSD (HF 81.2) | 복합 전략 |

5% 제한 = 잔고 ~10,000 기준 1회 최대 ~500.

---

## #1 Whale LP — DEX 유동성 공급

**목표**: 넓은 범위 LP로 수수료 수익 확보

**시나리오**:
1. wCTC/USDC 풀에 LP 추가 (wCTC 50, USDC 50)
2. lstCTC/USDC 풀에 LP 추가 (lstCTC 50, USDC 50)
3. 수수료 발생 후 collect

**tick range**: 현재 tick ± 60000 (넓은 범위)

---

## #2 Active Trader — 빈번한 스왑

**목표**: 토큰 간 회전매매로 가격 영향 생성

**시나리오** (5회 반복):
1. wCTC → USDC swap (50 wCTC)
2. USDC → lstCTC swap (받은 USDC)
3. lstCTC → wCTC swap (받은 lstCTC)
4. 잔고 확인

---

## #3 Arbitrageur — 풀 간 차익거래

**목표**: 두 풀 가격 비교 후 저평가 매수

**시나리오**:
1. wCTC/USDC 풀 가격 조회 (QuoterV2)
2. lstCTC/USDC 풀 가격 조회
3. wCTC vs lstCTC 가격 비교 (mock price wCTC=$2.50, lstCTC=$2.60)
4. 가격 괴리 발견 시 저평가 토큰 매수

---

## #4 Conservative Lender — 순수 Supply

**목표**: 리스크 없는 이자 수익

**시나리오**:
1. wCTC/sbUSD 마켓에 USDC로... 아니, sbUSD가 없으니:
   - 먼저 USDC 50을 sbUSD/USDC 마켓에 supply
   - 또는 wCTC 50을 wCTC/sbUSD 마켓에 supply (collateral로)
2. 실질적으로 USDC 50을 sbUSD/USDC 마켓에 supply (loan token = USDC)

**주의**: sbUSD 보유량이 0이므로 USDC 마켓 위주로 운용

---

## #5 Moderate Borrower — 안전한 대출

**목표**: HF 2.0+ 유지하며 대출

**시나리오**:
1. wCTC/sbUSD 마켓에 담보(wCTC) 50 예치
2. sbUSD 대출 — HF 2.0 유지하려면: 50 * 0.77 / HF(2.0) = ~19.25 sbUSD
3. position 확인 (HF >= 2.0)

---

## #6 Aggressive Borrower — 공격적 대출

**목표**: HF 1.3 목표 (위험!)

**시나리오**:
1. wCTC/sbUSD 마켓에 담보(wCTC) 50 예치
2. sbUSD 대출 — HF 1.3: 50 * 0.77 / HF(1.3) = ~29.6 sbUSD
3. position 확인 (HF ~1.3)

---

## #7 Multi-Market — 분산 전략

**목표**: 여러 마켓에 분산

**시나리오**:
1. wCTC/sbUSD 마켓: wCTC 20 supply collateral
2. lstCTC/sbUSD 마켓: lstCTC 20 supply collateral
3. sbUSD/USDC 마켓: USDC 50 supply (loan token)
4. wCTC/sbUSD 마켓에서 sbUSD 소액 borrow (HF 3.0+)

---

## #8 DeFi Maximalist — 복합 전략

**목표**: DEX LP + Morpho supply 동시 운용

**시나리오**:
1. Morpho: USDC 50을 sbUSD/USDC 마켓에 supply
2. DEX: wCTC 50 + lstCTC 50으로 wCTC/lstCTC 풀 LP
3. 포지션 확인 (Morpho position + LP NFT)
