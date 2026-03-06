# Step 04: dex.ts ABI 추가 (deprecated → v0.4.0에서 Uniswap V3로 전환)

## 메타데이터
- **난이도**: 🟢 쉬움
- **롤백 가능**: ✅ (`git checkout -- apps/web/src/abis/dex.ts`)
- **선행 조건**: 없음 (Step 01~03과 독립)

---

## 1. 구현 내용 (design.md 기반)

### dex.ts 추가

| 조치 | 대상 | 변경 내용 |
|------|------|----------|
| 추가 | `NonfungiblePositionManagerABI` | `increaseLiquidity(IncreaseLiquidityParams)` |
| 추가 | `NonfungiblePositionManagerABI` | `burn(uint256)` |
| 추가 | `NonfungiblePositionManagerABI` | `multicall(bytes[])` |
| 추가 | `SnowballRouterABI` | `exactInput(ExactInputParams)` |
| 추가 | `SnowballRouterABI` | `multicall(bytes[])` |
| 추가 | `SnowballPoolABI` | `tickSpacing()` |

### 참고: struct 파라미터

```solidity
// IncreaseLiquidityParams
struct IncreaseLiquidityParams {
    uint256 tokenId;
    uint256 amount0Desired;
    uint256 amount1Desired;
    uint256 amount0Min;
    uint256 amount1Min;
    uint256 deadline;
}

// ExactInputParams
struct ExactInputParams {
    bytes path;
    address recipient;
    uint256 deadline;
    uint256 amountIn;
    uint256 amountOutMinimum;
}
```

## 2. 완료 조건

- [ ] `dex.ts`의 `NonfungiblePositionManagerABI`에 `increaseLiquidity` 존재 (IncreaseLiquidityParams tuple)
- [ ] `dex.ts`의 `NonfungiblePositionManagerABI`에 `burn(uint256)` 존재
- [ ] `dex.ts`의 `NonfungiblePositionManagerABI`에 `multicall(bytes[])` 존재
- [ ] `dex.ts`의 `SnowballRouterABI`에 `exactInput` 존재 (ExactInputParams tuple)
- [ ] `dex.ts`의 `SnowballRouterABI`에 `multicall(bytes[])` 존재
- [ ] `dex.ts`의 `SnowballPoolABI`에 `tickSpacing(view, returns int24)` 존재
- [ ] 기존 dex.ts 함수들 변경 없음 (추가만)

## 3. 롤백 방법
- `git checkout -- apps/web/src/abis/dex.ts`
- 영향 범위: DEX ABI만 (현재 호출부 없음, 향후 사용)

---

## Scope

### 수정 대상 파일
```
apps/web/src/
└── abis/dex.ts  # 수정 - 6개 함수 추가 (기존 함수 변경 없음)
```

### 참조 파일 (읽기 전용)
```
packages/integration/src/
├── NonfungiblePositionManager (Algebra)  # increaseLiquidity, burn, multicall
└── SnowballRouter.sol                    # exactInput, multicall

packages/integration/src/ 또는 node_modules/
└── IAlgebraPool.sol                      # tickSpacing
```

### Side Effect 위험
- 없음. 추가만 하므로 기존 코드에 영향 없음.

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| dex.ts | design.md dex.ts 섹션 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| increaseLiquidity, burn | ✅ dex.ts | OK |
| multicall (2곳) | ✅ dex.ts | OK |
| exactInput | ✅ dex.ts | OK |
| tickSpacing | ✅ dex.ts | OK |

### 검증 통과: ✅

---

→ 다음: [Step 05: 통합 검증](step-05-verify.md)
