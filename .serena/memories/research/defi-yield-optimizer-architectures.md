# DeFi Yield Optimizer / Aggregator Architecture Research

## Protocols Researched
1. Yearn V3 (Vyper vaults + Solidity tokenized strategies)
2. Beefy Finance (BeefyVaultV7 + IStrategyV7)
3. Sommelier Cellar (PeggyJV/cellar-contracts)
4. Enzyme Finance (enzymefinance/protocol)
5. Harvest Finance (harvest-finance/harvest)
6. Convex Finance (convex-eth/platform)
7. Concentrator / AladdinDAO (AladdinDAO/aladdin-v3-contracts)
8. Morpho MetaMorpho (morpho-org/metamorpho) -- already forked as SnowballVault

## Key Findings for Forkability
- **Simplest to fork**: Beefy (BeefyVaultV7 + strategy pattern), Yield Yak (YakStrategy + YakVault)
- **Best ERC-4626**: MetaMorpho (already forked), Yearn V3 tokenized-strategy
- **Too complex**: Enzyme (200+ contracts), Sommelier (adaptor system + Cosmos chain dependency)
- **Too specialized**: Convex (Curve-specific), Concentrator (Convex-specific)
- **Our environment**: Solidity 0.8.24, EVM cancun, Foundry, Creditcoin Testnet

## Recommendation
For a yield aggregator on our custom chain:
- Beefy's Vault+Strategy pattern is the simplest and most battle-tested
- Consider a hybrid: Beefy-style Vault+Strategy with ERC-4626 wrapper
- We already have the MetaMorpho vault fork for lending market allocation
