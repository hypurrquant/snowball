# OP.md — Snowball Lend (Morpho Blue) Operations Guide

> Morpho Blue 포크 기반 Lending 프로토콜 운영 가이드
> Last updated: 2026-02-25

---

## 1. 개요

SnowballLend는 Morpho Blue의 포크로, 독립적인 lending market을 permissionless하게 생성할 수 있는 프로토콜입니다.

- **Isolated Markets** — 각 마켓이 독립적 (담보/대출/오라클/IRM/LLTV 조합)
- **Adaptive Curve IRM** — 이용률 기반 자동 이자율 조정
- **No Governance** — permissionless 마켓 생성

| 항목 | 값 |
|------|-----|
| Solidity | 0.8.24 |
| EVM | Cancun |
| 빌드 | Foundry (forge) |
| 배포 | Viem (TypeScript) |
| 의존성 | OpenZeppelin 5.4.0 |

---

## 2. 빌드 & 테스트

```bash
cd packages/morpho

# 컴파일
forge build       # 또는 pnpm build

# 테스트
forge test        # 또는 pnpm test

# 배포
pnpm deploy       # npx tsx scripts/deploy-viem.ts
```

---

## 3. 컨트랙트 구조

| 파일 | 설명 |
|------|------|
| `SnowballLend.sol` | 코어 렌딩 프로토콜 (supply, borrow, withdraw, repay, liquidate) |
| `AdaptiveCurveIRM.sol` | 이자율 모델 (이용률 ↑ → 이자율 ↑) |
| `SnowballVault.sol` | MetaMorpho 스타일 Vault (다중 마켓 자동 배분) |
| `SnowballVaultFactory.sol` | Vault 생성 팩토리 |
| `PublicAllocator.sol` | Vault 자산 배분기 |
| `interfaces/ISnowballLend.sol` | 코어 인터페이스 |
| `interfaces/ISnowballVault.sol` | Vault 인터페이스 |
| `mocks/MockERC20.sol` | 테스트 ERC20 토큰 |
| `mocks/MockOracle.sol` | 테스트 가격 오라클 |

---

## 4. 배포 절차

### 4-1. 환경 변수

`packages/morpho/.env`:
```env
DEPLOYER_PRIVATE_KEY=0x_your_private_key_here
```

### 4-2. 전체 배포 (초기)

```bash
cd packages/morpho
pnpm deploy
```

`scripts/deploy-viem.ts` 실행 순서:
1. SnowballLend 배포
2. AdaptiveCurveIRM 배포
3. IRM 활성화 + LLTV 활성화 (77%, 80%, 86%)
4. MockOracle 배포 (wCTC, lstCTC, sbUSD)
5. MockERC20 (USDC) 배포 + 1M 민트
6. SnowballVaultFactory 배포
7. PublicAllocator 배포
8. 3개 마켓 생성

### 4-3. 배포 결과

배포 주소는 자동 저장:
```
packages/morpho/deployments/creditcoin-testnet/morpho.json
```

---

## 5. 현재 배포 주소

### Core

| 컨트랙트 | 주소 |
|----------|------|
| SnowballLend | `0x7d604b31297b36aace73255931f65e891cf289d3` |
| AdaptiveCurveIRM | `0x0ac487d84507b2fbe9130acc080f2b554cb3fffe` |
| SnowballVaultFactory | `0x6e97df392462b8c2b8d13e2cd77a90168925edf6` |
| PublicAllocator | `0x35b35a8c835eaf78b43137a51c4adccfc5d653b4` |

### Oracles (Mock)

| 대상 | 주소 |
|------|------|
| wCTC Oracle | `0x42ca12a83c14e95f567afc940b0118166d8bd852` |
| lstCTC Oracle | `0x192f1feb36f319e79b3bba25a17359ee72266a14` |
| sbUSD Oracle | `0xc39f222e034f4bd4f3c858e6fde9ce4398400a26` |

### 토큰

| 토큰 | 주소 | Decimals |
|------|------|----------|
| wCTC | `0x8f7f60a0f615d828eafcbbf6121f73efcfb56969` | 18 |
| lstCTC | `0x72968ff9203dc5f352c5e42477b84d11c8c8f153` | 18 |
| sbUSD | `0x5772f9415b75ecca00e7667e0c7d730db3b29fbd` | 18 |
| USDC (Mock) | `0xbcaa46ef7a399fcdb64adf4520cdcc6d62fcaaed` | 6 |

### 마켓

| 마켓 | LLTV | 담보 | 대출 |
|------|------|------|------|
| wCTC / sbUSD | 77% | wCTC | sbUSD |
| lstCTC / sbUSD | 80% | lstCTC | sbUSD |
| sbUSD / USDC | 86% | sbUSD | USDC |

---

## 6. 새 마켓 생성

### 6-1. 사전 준비

새 마켓 생성 전 확인:
- **LLTV 활성화** — 사용할 LLTV 비율이 `SnowballLend.enableLltv()`로 활성화되어 있는지
- **IRM 활성화** — `SnowballLend.enableIrm(irmAddress)`로 활성화되어 있는지
- **Oracle** — 담보/대출 가격 비율을 반환하는 오라클 배포 완료

### 6-2. 마켓 생성

```bash
# cast로 직접 호출
cast send $SNOWBALL_LEND "createMarket((address,address,address,address,uint256))" \
  "($LOAN_TOKEN,$COLLATERAL_TOKEN,$ORACLE,$IRM,$LLTV)" \
  --private-key $DEPLOYER_PK \
  --rpc-url $RPC_URL
```

또는 deploy 스크립트에 추가:
```typescript
const marketParams = {
    loanToken: '0x...',
    collateralToken: '0x...',
    oracle: '0x...',
    irm: adaptiveCurveIrmAddress,
    lltv: parseEther('0.80'),  // 80%
}
await snowballLend.write.createMarket([marketParams])
```

### 6-3. 마켓 ID 확인

마켓 ID는 `MarketParams`의 keccak256 해시:
```bash
cast call $SNOWBALL_LEND "idToMarketParams(bytes32)" $MARKET_ID
```

---

## 7. 오라클 관리

### Mock Oracle 가격 변경

```bash
# 가격 설정 (36 decimals — Morpho 표준)
# 예: wCTC = $200 → 200 * 10^36
cast send $ORACLE "setPrice(uint256)" "200000000000000000000000000000000000000" \
  --private-key $DEPLOYER_PK
```

> Morpho Blue 오라클은 `collateral/loan` 가격 비율을 36 decimals로 반환합니다.

### 프로덕션 오라클

메인넷 전환 시 MockOracle → 실제 오라클로 교체 필요:
- Chainlink Price Feed 어댑터
- TWAP 오라클 (DEX 기반)
- Pyth Network 등

> 오라클 교체는 **새 마켓 생성**으로만 가능 (기존 마켓의 오라클은 변경 불가, Morpho 설계).

---

## 8. 이자율 모델 (AdaptiveCurveIRM)

```
이용률(U)에 따라 이자율 자동 조정:

U < target(90%) → 이자율 서서히 하락
U > target(90%) → 이자율 빠르게 상승
U = 100%        → 최대 이자율

곡선이 시간에 따라 적응 (adaptive):
- 높은 이용률 지속 → 기준 이자율 상승
- 낮은 이용률 지속 → 기준 이자율 하락
```

### 현재 이자율 확인

```bash
# 마켓의 현재 이자율 (초당)
cast call $SNOWBALL_LEND "market(bytes32)" $MARKET_ID
# 반환값 중 lastUpdate, fee 확인

# IRM에서 직접 조회
cast call $IRM "borrowRateView((address,address,address,address,uint256),(uint128,uint128,uint128,uint128,uint128,uint128))" \
  "$MARKET_PARAMS" "$MARKET_STATE"
```

---

## 9. 청산 (Liquidation)

Morpho Blue 청산 조건:
- `borrowValue > collateralValue * LLTV` 일 때 청산 가능

```bash
# 청산 실행
cast send $SNOWBALL_LEND \
  "liquidate((address,address,address,address,uint256),address,uint256,uint256,bytes)" \
  "$MARKET_PARAMS" "$BORROWER" "$SEIZE_ASSETS" "$REPAY_SHARES" "0x" \
  --private-key $LIQUIDATOR_PK
```

> 청산봇 운영 권장: 가격 변동 모니터링 → 청산 가능 포지션 감지 → 자동 청산

---

## 10. 트러블슈팅

### "unauthorized" 에러
- `enableLltv`, `enableIrm`은 owner만 호출 가능
- owner 확인: `cast call $SNOWBALL_LEND "owner()"`

### 마켓 생성 실패
- LLTV가 활성화되어 있는지 확인
- IRM이 활성화되어 있는지 확인
- 동일 파라미터 조합의 마켓이 이미 존재하는지 확인

### Supply/Borrow 실패
- ERC20 approve 먼저 필요 (SnowballLend 주소에 대해)
- 마켓에 충분한 유동성이 있는지 확인 (borrow 시)
- LLTV 초과 여부 확인 (borrow 시)

### 이자율이 비정상적으로 높음
- 이용률 100% 근접 → 정상 동작 (공급 추가 필요)
- `accrueInterest` 호출하여 최신 상태 갱신

---

## 11. TODO

### 🔴 HIGH
- [ ] 청산봇 구현 (가격 모니터링 → 자동 청산)
- [ ] 실제 오라클 연동 (Chainlink / Pyth)
- [ ] 배포 결과를 snowball-app/lendContracts.ts에 자동 동기화하는 스크립트

### 🟡 MEDIUM
- [ ] SnowballVault (MetaMorpho) 배포 + 운영
- [ ] PublicAllocator 설정 (Vault 자산 배분 전략)
- [ ] 다중 체인 배포 스크립트

### 🟢 LOW
- [ ] Gas 최적화 (batch operations)
- [ ] 이벤트 인덱싱 (subgraph / event listener)
- [ ] 마켓 생성 UI (관리자 대시보드)
