# Deploy Scripts

> 컨트랙트 배포 및 검증 스크립트

## 실행 방법

```bash
cd /Users/mousebook/Documents/side-project/snowball
NODE_PATH=apps/web/node_modules npx tsx scripts/deploy/<script>.ts
```

## 파일 목록

| 파일 | 대상 체인 | 설명 | Phase |
|------|----------|------|-------|
| deploy-full.ts | CC Testnet | Liquity + DEX + Tokens 전체 재배포 (v2 Full Redeploy) | v0.12.0 |
| deploy-uniswap-v3.ts | CC Testnet | Uniswap V3 인프라 (Factory, Router, NPM, Quoter) + 4 풀 | v0.4.0 |
| deploy-morpho-fresh.ts | CC Testnet | SnowballLend + AdaptiveCurveIRM + Oracle 3개 + Market 3개 | v0.12.0 |
| deploy-phase9-12.ts | CC Testnet | Phase 9~12 증분 배포 (Liquity branches + tokens) | v0.9.0~v0.12.0 |
| deploy-agent-vault-v2.ts | CC Testnet | AgentVault V3 단독 배포 | v0.12.0 |
| deploy-dn-bridge.ts | Sepolia + CC + USC | DN Token(Sepolia) + BridgeVault(CC) 자동, DNBridgeUSC(USC) 수동 | v0.17.0 |
| deploy-yield.ts | CC Testnet | Yield Vault 4개 + Strategy 4개 + wCTC loan market 배포 | v0.20.0 |
| verify-agent-vault.ts | CC Testnet | AgentVault 온체인 검증 (eth_getCode + ABI 호출) | v0.18.0 |

## 배포 이력

전체 배포 주소는 `docs/guide/deploy-history.md` 참조.

## 상세

### deploy-full.ts (2026-03-07)

v2 Full Redeploy. 모든 토큰(wCTC, lstCTC, sbUSD, USDC) + Liquity 2 branches(wCTC, lstCTC) + DEX pools + Morpho를 한 번에 배포.
결과: `deployments/creditcoin-testnet/full-redeploy.json`

### deploy-uniswap-v3.ts (2026-03-06)

Uniswap V3 Core + Periphery 배포. `@uniswap/v3-core`, `@uniswap/v3-periphery` 바이트코드를 node_modules에서 로드.
초기 풀: wCTC/USDC(3000), wCTC/lstCTC(3000), lstCTC/USDC(3000), wCTC/sbUSD(3000).

### deploy-morpho-fresh.ts (2026-03-07)

Morpho Blue fork (SnowballLend) 신규 배포. CreditcoinOracle 3개 (1e36 scale), AdaptiveCurveIRM.
마켓: wCTC/sbUSD(77%), lstCTC/sbUSD(77%), sbUSD/USDC(90%).
결과: `scripts/morpho-deploy-result.json`

### deploy-phase9-12.ts (2026-03-07)

Phase 9~12 증분 배포. deploy-full.ts의 이전 버전으로, 각 phase별 컨트랙트를 순차 배포.

### deploy-agent-vault-v2.ts (2026-03-07)

AgentVault V3 단독 배포. ExecutionPermission + TokenAllowance 분리, nonce 기반 stale 방지.
forge out에서 바이트코드 로드 → deployer로 배포.

### deploy-dn-bridge.ts (2026-03-07)

3개 체인 크로스체인 브릿지 배포.
- DNToken v2 → Sepolia (자동)
- BridgeVault → CC Testnet (자동)
- EvmV1Decoder + DNBridgeUSC v2 → USC Testnet (수동, forge create --libraries 필요)

### verify-agent-vault.ts (2026-03-07)

배포된 AgentVault의 온체인 상태 검증. eth_getCode로 존재 확인 + getDelegatedUsers, getPermNonce 호출 테스트.
