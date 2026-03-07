---
description: "시뮬레이션 계정의 종합 포지션 조회. 토큰 잔고 + Morpho(supply/borrow/collateral/HF) + Liquity(Trove collateral/debt/rate) + DEX LP 포지션 수. 잔고 확인, balance, 포지션 조회, position, 계정 상태, 토큰 보유량, HF 확인, trove 확인, morpho 포지션, defi 포지션 시 활성화."
user_invocable: check-balances
---

# Check Balances & Positions

> 시뮬레이션 계정의 토큰 잔고 + DeFi 포지션(Morpho, Liquity, DEX LP)을 종합 조회

---

## 실행

```bash
# 전체 계정 (Deployer + 8 페르소나)
NODE_PATH=apps/web/node_modules npx tsx scripts/sim-check-balances.ts

# 특정 계정만
NODE_PATH=apps/web/node_modules npx tsx scripts/sim-check-balances.ts 5        # #5만
NODE_PATH=apps/web/node_modules npx tsx scripts/sim-check-balances.ts 1 5 7    # #1, #5, #7
NODE_PATH=apps/web/node_modules npx tsx scripts/sim-check-balances.ts deployer # deployer만
```

---

## 조회 항목

### 1. 토큰 잔고

| 토큰 | 소스 |
|------|------|
| CTC (native) | `getBalance()` |
| wCTC, lstCTC, sbUSD, USDC | `ERC20.balanceOf()` |

### 2. Morpho (SnowballLend) 포지션

3개 마켓 각각에 대해:
- **Supply**: loanToken 공급량 (shares → assets 변환)
- **Collateral**: 담보 예치량
- **Borrow**: 대출량 (shares → assets 변환)
- **Health Factor**: `(collateral * oraclePrice / 1e36 * LLTV / 1e18) / borrowAssets`

| 마켓 | Loan | Collateral | LLTV |
|------|------|------------|------|
| wCTC/sbUSD | sbUSD | wCTC | 77% |
| lstCTC/sbUSD | sbUSD | lstCTC | 77% |
| sbUSD/USDC | USDC | sbUSD | 90% |

### 3. Liquity Trove

wCTC / lstCTC 브랜치 각각:
- **Collateral**: 담보량
- **Debt**: sbUSD 부채
- **Interest Rate**: 연 이자율

TroveNFT.balanceOf → tokenOfOwnerByIndex → TroveManager.getLatestTroveData 순서로 조회.

### 4. DEX LP (Uniswap V3)

- NonfungiblePositionManager.balanceOf로 LP 포지션 수만 표시

---

## 출력 예시

```
══════════════════════════════════════════════════════════════════════
  #5 Moderate Borrower  (0xdC810e6749C8D6c5108f0143845Bb61a3059bEb2)
══════════════════════════════════════════════════════════════════════

  Tokens:
    CTC: 499.92 | wCTC: 8.8K | lstCTC: 10K | sbUSD: 849.55 | USDC: 9.3K

  Morpho (SnowballLend):
    wCTC/sbUSD     supply=94.95 sbUSD | coll=464.99 wCTC | borrow=271.03 sbUSD | HF=6.60
    lstCTC/sbUSD   supply=44.98 sbUSD
    sbUSD/USDC     supply=490 USDC

  Liquity Troves:
    wCTC     coll=200 wCTC | debt=899.52 sbUSD | rate=5.0%

  DEX LP: 2 positions

══════════════════════════════════════════════════════════════════════
  MORPHO MARKET SUMMARY
══════════════════════════════════════════════════════════════════════
  wCTC/sbUSD     supply=  492.93 sbUSD | borrow=  271.11 sbUSD | util=55.0%
  lstCTC/sbUSD   supply=  492.93 sbUSD | borrow=  271.11 sbUSD | util=55.0%
  sbUSD/USDC     supply=   3.8K USDC   | borrow=   23.20 USDC  | util=0.6%
```

---

## 스크립트 위치

`scripts/sim-check-balances.ts`

## 계정 정보

`scripts/simulation-accounts.json` — Deployer + 8 페르소나

## 관련 주소 설정

- 토큰: `packages/core/src/config/addresses.ts` → `TOKENS`
- Morpho: `.claude/skills/defi-simulation/contracts.md` → Morpho 섹션
- Liquity: `.claude/skills/defi-simulation/contracts.md` → Liquity 섹션
