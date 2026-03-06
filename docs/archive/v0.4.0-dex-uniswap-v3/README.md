# Algebra V4 → Uniswap V3 DEX 전환 - v0.4.0

## 문제 정의

### 현상
- 프론트엔드 DEX 코드(ABI, hooks, config)가 **Algebra V4 Integral fork** 기준으로 작성되어 있음
- 프로젝트는 이미 **Uniswap V3로 전환을 결정**했으나 프론트엔드 코드와 운영/구현 문서가 미전환 상태
- 설계 문서(`DESIGN_FRONTEND.md`)는 Uniswap V3 기준이지만, 구현 문서(`OPERATIONS.md`, `SECURITY_AUDIT.md` 등)는 Algebra V4 기준
- v0.3.0-abi-correction에서 ABI 전수 교정을 완료했지만, DEX(dex.ts) 26개 함수는 Algebra V4 소스 부재로 **검증 불가** 판정

### 원인
- 초기 DEX 구현 시 Algebra V4 Integral fork를 채택
- 이후 Uniswap V3로 전환 결정이 내려졌으나, 프론트엔드/문서 마이그레이션이 수행되지 않음
- `packages/algebra` 서브모듈이 모노레포 정리 시 삭제되어 로컬 소스 검증도 불가능한 상태

### 영향
- **FE ↔ 컨트랙트 불일치**: DEX 관련 모든 온체인 호출이 실패할 수 있음 (Algebra ABI로 Uniswap 컨트랙트 호출)
- **문서 불일치**: 운영/보안/배포 문서가 더 이상 존재하지 않는 Algebra 아키텍처를 기술
- **개발자 혼란**: 새 기여자가 Algebra 문서를 보고 잘못된 가정을 할 수 있음
- **v0.3.0 검증 gap**: ABI audit에서 DEX 26개 함수가 UNVERIFIABLE로 남아있음

### 목표
1. **dex.ts ABI를 Uniswap V3 표준으로 전면 리라이트** — 모든 함수 시그니처가 Uniswap V3 canonical source와 일치
2. **hooks/trade/ 3개 훅을 Uniswap V3 인터페이스에 맞게 수정** — deployer 파라미터 제거, globalState→slot0, poolByPair→getPool 등
3. **config/addresses.ts DEX 섹션을 Uniswap V3 기준으로 변경** — Algebra 전용 필드(snowballPoolDeployer) 제거
4. **운영/구현 문서의 Algebra 참조를 Uniswap V3로 업데이트** — OPERATIONS.md, SECURITY_AUDIT.md, DEPLOY_ADDRESSES_UPDATE.md 등
5. **tsc --noEmit + next build 통과** — 마이그레이션 후 빌드 무결성 보장

### 비목표 (Out of Scope)
- **Uniswap V3 컨트랙트 배포** — 컨트랙트 배포는 별도 작업, 이 Phase는 FE + 문서만
- **DEX 주소 업데이트** — 새 Uniswap V3 컨트랙트 주소가 아직 없으므로 기존 주소 유지 또는 placeholder
- **DEX UI 페이지 기능 변경** — swap/pool 페이지의 비즈니스 로직은 유지, ABI/인터페이스만 교체
- **docs/archive/ 내부 수정** — frozen snapshot, 변경 불필요
- **packages/ 디렉토리 Solidity 코드** — FE와 docs만 대상

## 영향받는 파일

### FE 코드 (6파일)
| 파일 | 변경 내용 |
|------|----------|
| `apps/web/src/abis/dex.ts` | Algebra ABI → Uniswap V3 ABI 전면 리라이트 |
| `apps/web/src/abis/index.ts` | export 이름 변경 반영 (DynamicFeePluginABI 제거 등) |
| `apps/web/src/config/addresses.ts` | DEX 섹션 주석 변경, snowballPoolDeployer 제거 |
| `apps/web/src/hooks/trade/useSwap.ts` | deployer 제거, limitSqrtPrice→sqrtPriceLimitX96 |
| `apps/web/src/hooks/trade/usePool.ts` | poolByPair→getPool, globalState→slot0, DynamicFeePlugin 제거 |
| `apps/web/src/hooks/trade/useAddLiquidity.ts` | mint params에서 deployer 제거 |

### 문서 (~10파일)
| 파일 | Algebra 언급 수 | 변경 내용 |
|------|----------------|----------|
| `docs/guide/OPERATIONS.md` | 6곳 | 아키텍처 다이어그램, 배포 명령어, 컨트랙트 목록 |
| `docs/ssot/DEPLOY_ADDRESSES_UPDATE.md` | 6곳 | 주소/검증 테이블 |
| `docs/security/SECURITY_AUDIT.md` | 12곳 | "Faithful Fork" 섹션 리라이트 |
| `docs/report/abi-audit.md` | 12곳 | DEX 섹션 교체 |
| `docs/design/DESIGN_TOKENOMICS_V2.md` | 2곳 | DEX 수수료 모델 |
| `docs/LAST_TASK.md` | 1곳 | DN Token DEX 풀 |
| `docs/INDEX.md` | 1곳 | SSOT_ALGEBRA 행 제거/교체 |
| `docs/CHANGELOG.md` | 1곳 | SSOT_ALGEBRA 참조 |
| `docs/phases/v0.3.0-abi-correction/micro/step-04-dex-abi.md` | 2곳 | Algebra 참조 |

## Uniswap V3 기준 컨트랙트 (ABI 소스)

| ABI export 이름 | Uniswap V3 컨트랙트 | GitHub 소스 |
|----------------|-------------------|------------|
| `UniswapV3FactoryABI` | UniswapV3Factory | `@uniswap/v3-core/contracts/UniswapV3Factory.sol` |
| `UniswapV3PoolABI` | UniswapV3Pool | `@uniswap/v3-core/contracts/UniswapV3Pool.sol` |
| `SwapRouterABI` | SwapRouter | `@uniswap/v3-periphery/contracts/SwapRouter.sol` |
| `QuoterV2ABI` | QuoterV2 | `@uniswap/v3-periphery/contracts/lens/QuoterV2.sol` |
| `NonfungiblePositionManagerABI` | NonfungiblePositionManager | `@uniswap/v3-periphery/contracts/NonfungiblePositionManager.sol` |
| `MockERC20ABI` | (변경 없음) | 표준 ERC20 |

> 참고: DynamicFeePluginABI는 Algebra 전용이므로 제거. Uniswap V3에 대응 없음.

## 제약사항
- Uniswap V3 컨트랙트가 아직 배포되지 않았을 수 있음 → **기존 Algebra 주소를 그대로 유지** (배포 후 교체)
- MockERC20ABI는 표준 ERC20이므로 변경 불필요
- Algebra 전용 기능(DynamicFeePlugin, deployer 파라미터)은 Uniswap V3에 대응 개념이 없으므로 제거

## 핵심 Algebra → Uniswap V3 매핑

| Algebra V4 | Uniswap V3 | 비고 |
|-----------|------------|------|
| `globalState()` → 6 returns | `slot0()` → 7 returns | sqrtPriceX96, tick, observationIndex, ... |
| `poolByPair(A, B)` | `getPool(A, B, fee)` | fee tier 파라미터 추가 |
| `deployer` param (router/quoter/NFT) | 없음 | 제거 |
| `limitSqrtPrice` | `sqrtPriceLimitX96` | 이름만 변경 |
| `DynamicFeePlugin` | 없음 | 정적 fee tier (500, 3000, 10000) |
| `positions()` 12 fields (deployer 포함) | `positions()` 12 fields (fee 포함) | deployer→fee |
| `nonce: uint88` | `nonce: uint96` | 타입 변경 |
| `snowballPoolDeployer` | 없음 | config에서 제거 |
