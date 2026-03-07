# Scripts

> 배포, 시뮬레이션, 테스트 스크립트 모음

## 디렉토리 구조

```
scripts/
├── README.md                    # 이 파일
├── simulation-accounts.json     # 8 페르소나 + deployer 계정 설정
├── morpho-deploy-result.json    # Morpho 배포 결과
├── deploy/                      # 컨트랙트 배포 스크립트 (7개)
│   ├── README.md
│   ├── deploy-full.ts           # Liquity + DEX + Tokens 전체 재배포
│   ├── deploy-uniswap-v3.ts     # Uniswap V3 인프라
│   ├── deploy-morpho-fresh.ts   # SnowballLend + Oracle + Market
│   ├── deploy-phase9-12.ts      # Phase 9~12 증분 배포
│   ├── deploy-agent-vault-v2.ts # AgentVault V3
│   ├── deploy-dn-bridge.ts      # DN Bridge (3 chains)
│   └── verify-agent-vault.ts    # AgentVault 온체인 검증
└── sim/                         # 시뮬레이션 + 테스트 (20개)
    ├── README.md
    ├── simulate-dn-bridge.ts    # Bridge E2E
    ├── simulate-dex-liquidity.ts
    ├── simulate-swap-volume.ts
    ├── simulate-sbUSD-pools.ts
    ├── simulate-lstCTC-pools.ts
    ├── simulate-morpho-supply.ts
    ├── simulate-morpho-borrow.ts
    ├── simulate-morpho-rebalance.ts
    ├── simulate-liquity.ts
    ├── sim-check-balances.ts
    ├── sim-check-state.ts
    ├── sim-check-ticks.ts
    ├── sim-multi-mint.ts
    ├── send-tokens.ts
    ├── mint-multi-lp.ts
    ├── swap-1usd-account2.ts
    ├── check-pool-wctc-usdc.ts
    ├── test-hint-fallback.ts
    ├── test-tick-query.ts
    └── test-multicall3.ts
```

## 실행 방법

```bash
cd /Users/mousebook/Documents/side-project/snowball
NODE_PATH=apps/web/node_modules npx tsx scripts/deploy/<script>.ts
NODE_PATH=apps/web/node_modules npx tsx scripts/sim/<script>.ts
```

## 상세

각 디렉토리의 README.md 참조:
- [deploy/README.md](deploy/README.md) — 배포 스크립트 상세
- [sim/README.md](sim/README.md) — 시뮬레이션/테스트 상세

## 삭제 이력

| 파일명 | 삭제일 | 이유 |
|--------|--------|------|
| extract-abi.sh | 2026-03-06 | backend 디렉토리 대상, 현재 미사용 |
| merge-addresses.ts | 2026-03-06 | 1회성, addresses.ts 수동 관리 중 |
| test-onchain.ts | 2026-03-06 | Algebra DEX용, Uniswap V3 마이그레이션 후 무의미 |
| fix-vaults.ts | 2026-03-06 | 1회성 핫픽스, 이미 적용 완료 |
| fix-dex-pools.ts | 2026-03-06 | Algebra용, Uniswap V3 마이그레이션 후 무의미 |
| distribute-tokens.ts | 2026-03-06 | 1회성 토큰 분배, 이미 완료 |
| distribute-remaining.ts | 2026-03-06 | 1회성 토큰 추가 분배, 이미 완료 |
| deploy-multicall3.ts | 2026-03-06 | 바이트코드 복붙 방식 실패, forge create로 대체 |
