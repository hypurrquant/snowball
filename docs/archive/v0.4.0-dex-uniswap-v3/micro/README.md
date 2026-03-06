# 작업 티켓 - v0.4.0

## 전체 현황

| # | Step | 난이도 | 롤백 | Scope | FP/FN | 개발 | 완료일 |
|---|------|--------|------|-------|-------|------|--------|
| 01 | dex.ts ABI 전면 리라이트 | 🟠 | ✅ | ✅ | ✅ | ⏳ | - |
| 02 | index.ts + addresses.ts 정리 | 🟢 | ✅ | ✅ | ✅ | ⏳ | - |
| 03 | hooks/trade/ 3개 훅 마이그레이션 | 🟠 | ✅ | ✅ | ✅ | ⏳ | - |
| 04 | 문서 Algebra→Uniswap V3 업데이트 | 🟡 | ✅ | ✅ | ✅ | ⏳ | - |

## 의존성

```
01 (dex.ts) → 02 (index.ts + addresses.ts) → 03 (hooks) → 04 (docs)
```

## 커버리지 매트릭스

### PRD 목표 → 티켓

| PRD 목표 | 관련 티켓 | 커버 |
|----------|----------|------|
| 1. dex.ts ABI를 Uniswap V3 표준으로 전면 리라이트 | Step 01 | ✅ |
| 2. hooks/trade/ 3개 훅 Uniswap V3 인터페이스 수정 | Step 03 | ✅ |
| 3. config/addresses.ts DEX 섹션 변경 | Step 02 | ✅ |
| 4. 운영/구현 문서 Algebra 참조 업데이트 | Step 04 | ✅ |
| 5. tsc --noEmit + next build 통과 | Step 03 (검증) | ✅ |

### DoD → 티켓

| DoD 항목 | 관련 티켓 | 커버 |
|----------|----------|------|
| F1: UniswapV3FactoryABI getPool+createPool | Step 01 | ✅ |
| F2: UniswapV3PoolABI slot0 7반환값 | Step 01 | ✅ |
| F3: UniswapV3PoolABI fee()→uint24 | Step 01 | ✅ |
| F4: SwapRouterABI deployer 없음, fee+sqrtPriceLimitX96 | Step 01 | ✅ |
| F5: QuoterV2ABI outputs 4개 | Step 01 | ✅ |
| F6: positions deployer→fee, nonce uint96 | Step 01 | ✅ |
| F7: mint deployer→fee | Step 01 | ✅ |
| F8: DynamicFeePluginABI 삭제 | Step 01 | ✅ |
| F9: Snowball 키워드 0건 | Step 01 | ✅ |
| F10: index.ts re-export 변경 | Step 02 | ✅ |
| F11: addresses.ts 필드 삭제 | Step 02 | ✅ |
| F12: addresses.ts 필드명 변경 | Step 02 | ✅ |
| F13: addresses.ts Uniswap V3 주석 | Step 02 | ✅ |
| F14: usePool getPool 호출 | Step 03 | ✅ |
| F15: usePool slot0 호출 | Step 03 | ✅ |
| F16: usePool DynamicFeePlugin 제거 | Step 03 | ✅ |
| F17: useSwap deployer/limitSqrtPrice 제거 | Step 03 | ✅ |
| F18: useSwap sqrtPriceLimitX96+fee 사용 | Step 03 | ✅ |
| F19: useSwap quoteData[5] 제거 | Step 03 | ✅ |
| F20: useSwap SwapRouterABI import | Step 03 | ✅ |
| F21: useAddLiquidity deployer→fee | Step 03 | ✅ |
| F22: 문서 Algebra 0건 | Step 04 | ✅ |
| F23: ABI 소스 버전 주석 | Step 01 | ✅ |
| F24: 주소 값 불변 | Step 02 | ✅ |
| N1: tsc --noEmit 통과 | Step 03 | ✅ |
| N2: next build 통과 | Step 03, 04 | ✅ |
| N3: Algebra import 0건 | Step 01~03 | ✅ |
| N4: Algebra DEX 참조 0건 | Step 02~03 | ✅ |
| E1: useSwap fee 기본값 | Step 03 | ✅ |
| E2: usePool fee 기본값 | Step 03 | ✅ |
| E3: archive/ 변경 없음 | Step 04 | ✅ |
| E4: v0.3.0 deprecated 주석 | Step 04 | ✅ |
| E5: getPool address(0) 처리 | Step 03 | ✅ |

### 설계 결정 → 티켓

| 설계 결정 | 관련 티켓 | 커버 |
|----------|----------|------|
| ABI export 이름 변경 | Step 01, 02 | ✅ |
| DynamicFeePluginABI 삭제 | Step 01, 03 | ✅ |
| globalState→slot0 | Step 01, 03 | ✅ |
| poolByPair→getPool+fee | Step 01, 03 | ✅ |
| deployer 파라미터 제거 | Step 01, 03 | ✅ |
| limitSqrtPrice→sqrtPriceLimitX96 | Step 01, 03 | ✅ |
| addresses.ts 필드 이름 변경+주소값 유지 | Step 02 | ✅ |
| fee tier 기본값 3000 | Step 03 | ✅ |
| archive/ 제외 | Step 04 | ✅ |
| ABI 소스 버전 | Step 01 | ✅ |

## Step 상세
- [Step 01: dex.ts ABI 전면 리라이트](step-01-dex-abi-rewrite.md)
- [Step 02: index.ts + addresses.ts 정리](step-02-config-update.md)
- [Step 03: hooks/trade/ 3개 훅 마이그레이션](step-03-hooks-migration.md)
- [Step 04: 문서 Algebra→Uniswap V3 업데이트](step-04-docs-update.md)
