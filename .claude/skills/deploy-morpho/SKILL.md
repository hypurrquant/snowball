---
description: "Morpho(SnowballLend) 배포 및 검증 스킬. 컨트랙트 재배포, oracle 스케일 검증, 주소 업데이트를 체계적으로 수행. deploy morpho, morpho 배포, morpho 재배포, snowballlend 배포, 오라클 스케일 검증, oracle 검증, 마켓 생성, createMarket, enableLltv 시 활성화."
user_invocable: deploy-morpho
---

# Morpho (SnowballLend) 배포 스킬

> Morpho 코어 + IRM + Oracle + 마켓을 Creditcoin Testnet에 배포하고 검증한다.

---

## 배포 전 체크리스트

### 1. 사전 조건 확인

```bash
# deployer 잔액 확인 (최소 1 CTC 필요)
cast balance 0xE550Afa5f8C81D7c3219a4Ece9c2e58618C125c6 --rpc-url https://rpc.cc3-testnet.creditcoin.network

# forge 빌드 확인
cd packages/morpho && forge build --skip "src/metamorpho/**"
```

**필요 아티팩트**: `packages/morpho/out/` 하위
- `Morpho.sol/Morpho.json` — SnowballLend 코어
- `AdaptiveCurveIrm.sol/AdaptiveCurveIrm.json` — 금리 모델
- `CreditcoinOracle.sol/CreditcoinOracle.json` — 1e36 스케일 오라클

### 2. Deployer 정보

- **Key source**: `scripts/simulation-accounts.json` → deployer
- **Address**: `0xE550Afa5f8C81D7c3219a4Ece9c2e58618C125c6`

---

## 배포 순서

### Phase 1: 코어 배포

| 순서 | 컨트랙트 | Constructor Args |
|------|----------|-----------------|
| 1 | Morpho (SnowballLend) | `owner` (deployer address) |
| 2 | AdaptiveCurveIRM | `morpho` (Phase 1 주소) |

### Phase 2: Oracle 배포 (1e36 스케일 필수!)

| Oracle | Constructor Arg | 가격 |
|--------|----------------|------|
| wCTC | `5e36` = `5000000000000000000000000000000000000` | $5.00 |
| lstCTC | `5.2e36` = `5200000000000000000000000000000000000` | $5.20 |
| sbUSD | `1e36` = `1000000000000000000000000000000000000` | $1.00 |

**CRITICAL**: 반드시 `1e36` 스케일. `parseEther()`로 넣으면 `1e18`이 되어 borrow가 깨진다!

### Phase 3: 설정

```
enableIrm(irm_address)
enableLltv(770000000000000000)   // 77%
enableLltv(900000000000000000)   // 90%
```

### Phase 4: 마켓 생성

| 마켓 | Loan | Collateral | LLTV |
|------|------|------------|------|
| wCTC/sbUSD | sbUSD | wCTC | 77% |
| lstCTC/sbUSD | sbUSD | lstCTC | 77% |
| sbUSD/USDC | USDC | sbUSD | 90% |

토큰 주소: [contracts.md](../defi-simulation/contracts.md) 참조

---

## 배포 후 검증 (필수)

### 온체인 검증

```bash
RPC=https://rpc.cc3-testnet.creditcoin.network

# 1. Owner 확인 — deployer여야 함
cast call <MORPHO> "owner()(address)" --rpc-url $RPC

# 2. Oracle 스케일 확인 — 1e36이어야 함
cast call <WCTC_ORACLE> "price()(uint256)" --rpc-url $RPC
# 기대값: 5000000000000000000000000000000000000 [5e36]

# 3. 마켓 생성 확인 — lastUpdate > 0이어야 함
cast call <MORPHO> "market(bytes32)((uint128,uint128,uint128,uint128,uint128,uint128))" <MARKET_ID> --rpc-url $RPC

# 4. LLTV 활성화 확인
cast call <MORPHO> "isLltvEnabled(uint256)(bool)" 770000000000000000 --rpc-url $RPC
cast call <MORPHO> "isLltvEnabled(uint256)(bool)" 900000000000000000 --rpc-url $RPC
```

### 실패 시 진단

| 증상 | 원인 | 해결 |
|------|------|------|
| `not owner` 에러 | deployer가 owner 아님 | 재배포 필요 |
| oracle `5e18` 반환 | 1e18 스케일로 배포됨 | `setPrice(5e36)` 호출 또는 재배포 |
| `lastUpdate = 0` | 마켓 미생성 | `createMarket` 호출 |
| `isLltvEnabled = false` | LLTV 미활성화 | `enableLltv` 호출 |
| borrow 실패 | oracle 스케일 불일치 | oracle price 검증 |

---

## 배포 후 업데이트 파일 목록

배포 완료 후 아래 파일들의 주소를 **반드시** 업데이트:

### 필수 (코드)

| 파일 | 업데이트 내용 |
|------|-------------|
| `packages/core/src/config/addresses.ts` | LEND 객체 전체 (snowballLend, adaptiveCurveIRM, oracles, markets[].id) |
| `packages/agent-runtime/src/config.ts` | morpho.core, marketId, oracle, irm |
| `apps/web/src/domains/defi/morpho/hooks/useMorphoPosition.ts` | `ORACLE_SCALE = 10n ** 36n` 확인 |
| `scripts/deploy-full.ts` | EXISTING.snowballLend, EXISTING.adaptiveCurveIRM |

### 필수 (문서)

| 파일 | 업데이트 내용 |
|------|-------------|
| `docs/guide/deploy-history.md` | 새 배포 기록 추가 |
| `docs/ssot/SSOT_MORPHO.md` | Core Contracts, Oracles, Markets 섹션 |
| `.claude/skills/defi-simulation/contracts.md` | Morpho 섹션 주소 |
| `.claude/skills/defi-simulation/morpho-guide.md` | MARKETS 객체, MORPHO/IRM 상수 |

### 권장 (운영 문서)

| 파일 | 업데이트 내용 |
|------|-------------|
| `packages/morpho/OP.md` | Core/Oracles 테이블 |
| `docs/guide/OPERATIONS.md` | Morpho Blue 섹션 |
| `CLAUDE.md` | Oracle 스케일링 섹션 |

---

## 배포 스크립트

기존 스크립트: `scripts/deploy-morpho-fresh.ts`

```bash
# 실행 (packages/morpho에서 forge build 후)
cd packages/morpho && forge build --skip "src/metamorpho/**"
cd ../.. && npx tsx scripts/deploy-morpho-fresh.ts
```

결과 JSON: `scripts/morpho-deploy-result.json`

---

## 과거 교훈 (함정 주의)

1. **Oracle 1e18 vs 1e36**: `parseEther("5")` = `5e18`이고 이건 Morpho 표준이 아님. `5e36`이어야 함
2. **Owner 불일치**: `deploy-full.ts`가 EXISTING으로 구 배포를 재사용하면 owner가 달라질 수 있음
3. **OZ 의존성**: MetaMorpho가 OZ v5 필요하지만 core는 OZ v4.9 필요 → `--skip "src/metamorpho/**"` 필수
4. **forge create vs script**: `forge create`의 `--rpc-url`이 무시되는 버그 있음 → viem 스크립트 사용 권장
5. **sbUSD/USDC 마켓**: LLTV 90%를 `enableLltv`로 먼저 활성화해야 `createMarket` 가능
