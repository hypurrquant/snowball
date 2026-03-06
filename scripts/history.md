# Scripts 히스토리

> Creditcoin 테스트넷 배포, 시뮬레이션, 테스트 스크립트 관리 기록

---

## 현재 파일 목록

| 파일명 | 카테고리 | 생성일 | 설명 |
|--------|----------|--------|------|
| simulation-accounts.json | 설정 | 2026-03-06 | 시뮬레이션 계정 8개 + Deployer (페르소나, 주소, 키) |
| deploy-uniswap-v3.ts | 배포 | 2026-03-06 | Uniswap V3 전체 배포 + 4개 풀 초기화 |
| mint-multi-lp.ts | 시뮬레이션 | 2026-03-06 | Account 2로 wCTC/USDC LP 민팅 |
| swap-1usd-account2.ts | 시뮬레이션 | 2026-03-06 | Account 2로 wCTC→USDC 스왑 |
| check-pool-wctc-usdc.ts | 조회 | 2026-03-06 | wCTC/USDC 풀 상태 조회 |
| test-hint-fallback.ts | 테스트 | 2026-03-06 | Liquity hint fallback 검증 |
| test-tick-query.ts | 테스트 | 2026-03-06 | 온체인 tick bitmap 2-phase 조회 검증 |
| test-multicall3.ts | 테스트 | 2026-03-06 | Multicall3 aggregate3 + viem multicall 검증 |

---

## 상세 설명

### simulation-accounts.json

DeFi 시뮬레이션용 계정 설정 파일. 8개 계정(페르소나별: Whale LP, Active Trader, Arbitrageur, Conservative Lender, Moderate Borrower, Aggressive Borrower, Multi-Market, DeFi Maximalist) + 1 Deployer. 각 계정의 privateKey, address, 전략 설명 포함.

### deploy-uniswap-v3.ts

Uniswap V3 전체 인프라 배포: Factory, SwapRouter, NonfungiblePositionManager, QuoterV2. 배포 후 wCTC/USDC, wCTC/lstCTC, lstCTC/USDC, wCTC/sbUSD 4개 풀 생성 및 초기 가격 설정.

### mint-multi-lp.ts

Account 2 (Active Trader)가 wCTC/USDC 풀에 LP 포지션 민팅. approve → NonfungiblePositionManager.mint 호출.

### swap-1usd-account2.ts

Account 2 (Active Trader)가 wCTC → USDC 1달러 상당 스왑 실행. approve → SwapRouter.exactInputSingle 호출.

### check-pool-wctc-usdc.ts

wCTC/USDC 풀 상태 조회 스크립트. Factory.getPool → Pool.slot0, liquidity 읽기 + Account 2의 LP 포지션(tokenId) 조회.

### test-hint-fallback.ts

Liquity의 `getInsertPosition` 함수가 RPC 실패 시 `(0n, 0n)` 폴백을 반환하는지 단위 테스트.

### test-tick-query.ts

온체인 tick 데이터 조회 검증. 2-phase 패턴: Phase 1 tick bitmap 스캔 → Phase 2 liquidityNet 조회 → 유동성 분포 재구성. wCTC/USDC 풀 대상.

### test-multicall3.ts

배포된 Multicall3 동작 검증. aggregate3 직접 호출 + viem `client.multicall()` (wagmi가 내부적으로 사용하는 방식) 테스트. Pool의 slot0, liquidity, tickSpacing을 1번의 RPC call로 batch 조회.

---

## 삭제된 파일 (2026-03-06)

| 파일명 | 삭제 이유 |
|--------|-----------|
| extract-abi.sh | backend 디렉토리 대상, 현재 미사용 |
| merge-addresses.ts | 1회성, addresses.ts 수동 관리 중 |
| test-onchain.ts | Algebra DEX용, Uniswap V3 마이그레이션 후 무의미 |
| fix-vaults.ts | 1회성 핫픽스, 이미 적용 완료 |
| fix-dex-pools.ts | Algebra용, Uniswap V3 마이그레이션 후 무의미 |
| distribute-tokens.ts | 1회성 토큰 분배, 이미 완료 |
| distribute-remaining.ts | 1회성 토큰 추가 분배, 이미 완료 |
| deploy-multicall3.ts | 바이트코드 복붙 방식 실패, forge create로 대체 |

---

## Multicall3 배포 기록

- **주소**: `0xa943BE162b5036539017Ce9fcdF7295D41De80c1`
- **블록**: 4382268
- **방법**: `forge create` (solc 0.8.24, evm cancun, optimizer 200)
- **시행착오**: solc 0.8.30 PUSH0 → InvalidJump, 바이트코드 복붙 손상 → 최종 forge create 성공

---

## 실행 방법

모든 TypeScript 스크립트는 viem 의존성이 `apps/web/node_modules`에 있으므로:

```bash
cd /Users/mousebook/Documents/side-project/snowball
NODE_PATH=apps/web/node_modules npx tsx scripts/<script-name>.ts
```

---

**작성일**: 2026-03-06 23:30 KST
**수정일**: 2026-03-06 23:35 KST — 불필요 스크립트 8개 삭제
