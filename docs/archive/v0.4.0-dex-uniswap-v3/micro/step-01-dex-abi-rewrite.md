# Step 01: dex.ts ABI 전면 리라이트

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: ✅ (git revert)
- **선행 조건**: 없음

---

## 1. 구현 내용 (design.md 기반)

- `SnowballFactoryABI` → `UniswapV3FactoryABI`: `poolByPair` 제거, `getPool(address,address,uint24)` + `createPool(address,address,uint24)` 추가
- `SnowballPoolABI` → `UniswapV3PoolABI`: `globalState()` 제거, `slot0()` (7 returns) + `fee()→uint24` 추가
- `SnowballRouterABI` → `SwapRouterABI`: `exactInputSingle` params에서 `deployer` 제거, `fee` 추가, `limitSqrtPrice` → `sqrtPriceLimitX96`
- `QuoterV2ABI`: `deployer` 제거, `limitSqrtPrice` → `sqrtPriceLimitX96`, `fee` 추가, outputs 6개→4개
- `DynamicFeePluginABI`: 완전 삭제
- `NonfungiblePositionManagerABI`: `positions` outputs에서 `deployer`→`fee`, `nonce uint88`→`uint96`; `mint` params에서 `deployer`→`fee`
- `MockERC20ABI`: 변경 없음
- 파일 상단 주석: `"Algebra V4 Integral Fork"` → `"Uniswap V3 — @uniswap/v3-core@1.0.1, @uniswap/v3-periphery@1.4.4"`

## 2. 완료 조건
- [ ] `UniswapV3FactoryABI`가 `getPool` + `createPool` 시그니처 포함 (F1)
- [ ] `UniswapV3PoolABI`가 `slot0()` 7개 반환값 포함 (F2)
- [ ] `UniswapV3PoolABI`가 `fee()→uint24` 포함 (F3)
- [ ] `SwapRouterABI.exactInputSingle` params에 `fee`+`sqrtPriceLimitX96` 포함, `deployer` 없음 (F4)
- [ ] `QuoterV2ABI.quoteExactInputSingle` outputs 4개, `deployer` 없음 (F5)
- [ ] `NonfungiblePositionManagerABI.positions` outputs에 `fee`(uint24), `nonce`(uint96), `deployer` 없음 (F6)
- [ ] `NonfungiblePositionManagerABI.mint` params에 `fee`(uint24), `deployer` 없음 (F7)
- [ ] `DynamicFeePluginABI` export 없음 (F8)
- [ ] `Snowball` 키워드 0건 (F9)
- [ ] 주석에 ABI 소스 버전 명시 (F23)

## 3. 롤백 방법
- `git checkout -- apps/web/src/abis/dex.ts`
- 영향 범위: dex.ts 단일 파일

---

## Scope

### 수정 대상 파일
```
apps/web/src/abis/
└── dex.ts  # 전면 리라이트 — 7 ABI export → 6 ABI export (DynamicFeePlugin 삭제)
```

### 신규 생성 파일
없음

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| `apps/web/src/abis/index.ts` | 간접 영향 | dex.ts에서 re-export — Step 02에서 수정 |
| `apps/web/src/hooks/trade/*.ts` | 간접 영향 | ABI import — Step 03에서 수정 |

### Side Effect 위험
- dex.ts export 이름 변경 후 index.ts/hooks에서 import 에러 발생 → Step 02, 03에서 해결

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| dex.ts | ABI 전면 리라이트 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| Factory ABI 변경 | ✅ dex.ts | OK |
| Pool ABI 변경 | ✅ dex.ts | OK |
| Router ABI 변경 | ✅ dex.ts | OK |
| QuoterV2 ABI 변경 | ✅ dex.ts | OK |
| NFT PM ABI 변경 | ✅ dex.ts | OK |
| DynamicFeePlugin 삭제 | ✅ dex.ts | OK |

### 검증 통과: ✅

---

→ 다음: [Step 02: config 업데이트](step-02-config-update.md)
